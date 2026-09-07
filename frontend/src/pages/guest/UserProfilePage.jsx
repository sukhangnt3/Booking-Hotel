// src/pages/guest/UserProfilePage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  CalendarDays,
  Users,
  BedDouble,
  Heart,
  MapPin,
  Trash2,
  CheckCircle2,
  XCircle,
  Receipt,
  Loader2,
  User,
  Clock,
  Ticket,
  Printer,
  X,
  KeyRound,
  Star,
  Send,
  MessageSquare,
} from "lucide-react";

import { authService, hotelService } from "@/services";
import apiClient from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

const SCORE_LABELS = {
  1: "Rất tệ",
  2: "Tệ",
  3: "Không hài lòng",
  4: "Dưới trung bình",
  5: "Trung bình",
  6: "Tạm ổn",
  7: "Hài lòng",
  8: "Rất tốt",
  9: "Tuyệt vời",
  10: "Xuất sắc tuyệt đối",
};

export default function UserProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();

  const initialTab = searchParams.get("tab") || "trips";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [tripFilter, setTripFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // 🌟 STATE CHO MODAL ĐÁNH GIÁ (CÁCH 2)
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewPoint, setReviewPoint] = useState(10);
  const [reviewComment, setReviewComment] = useState("");
  const [isSendingReview, setIsSendingReview] = useState(false);

  // ==================================================
  // XỬ LÝ URL ẢNH ĐẠI DIỆN CHUẨN XÁC
  // ==================================================
  const resolveAvatarUrl = (url) => {
    if (!url) return "";

    const avatarUrl = String(url).trim();

    if (
      avatarUrl.startsWith("http://") ||
      avatarUrl.startsWith("https://") ||
      avatarUrl.startsWith("data:") ||
      avatarUrl.startsWith("blob:")
    ) {
      return avatarUrl;
    }

    const cleanPath = avatarUrl.replace(/\\/g, "/").replace(/^\/+/, "");
    const backendBase = (
      import.meta.env.VITE_API_URL ||
      apiClient.defaults?.baseURL ||
      "http://localhost:5000"
    )
      .replace(/\/api\/?$/, "")
      .replace(/\/+$/, "");

    return `${backendBase}/${cleanPath}`;
  };

  // ==================================================
  // FORM THÔNG TIN CÁ NHÂN
  // ==================================================
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dob: user?.dob ? user.dob.split("T")[0] : "",
  });

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        full_name: user.full_name || user.name || prev.full_name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        dob: user.dob ? user.dob.split("T")[0] : prev.dob,
      }));
    }
  }, [user]);

  // ==================================================
  // FORM ĐỔI MẬT KHẨU
  // ==================================================
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const formatStayDateTime = (dateStr, defaultHour = "14:00") => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${defaultHour} • ${new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)}`;
    } catch {
      return dateStr;
    }
  };

  const formatBookingCreatedTime = (dateStr) => {
    if (!dateStr) return "Mới đây";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const syncGlobalUser = (updatedData) => {
    if (!updatedData) return;

    const finalAvatar =
      updatedData.avatar ||
      updatedData.avatar_url ||
      updatedData.picture ||
      updatedData.image ||
      "";

    const updatedUser = {
      ...user,
      ...updatedData,
      avatar: finalAvatar,
      avatar_url: finalAvatar,
      picture: finalAvatar,
    };

    useAuthStore.setState({ user: updatedUser });
    if (updateUser) updateUser(updatedUser);

    setProfileForm({
      full_name:
        updatedData.full_name ||
        updatedData.name ||
        updatedUser.full_name ||
        "",
      email: updatedData.email || updatedUser.email || "",
      phone: updatedData.phone || updatedUser.phone || "",
      dob: updatedData.dob ? updatedData.dob.split("T")[0] : "",
    });
  };

  const fetchProfileFromDB = async () => {
    try {
      const response = await apiClient.get(`/auth/profile?t=${Date.now()}`);
      const databaseUser =
        response?.data?.user ||
        response?.data?.data?.user ||
        response?.data ||
        response?.user;

      if (databaseUser) {
        syncGlobalUser(databaseUser);
      }
    } catch (error) {
      console.error("❌ Lỗi lấy thông tin người dùng từ Database:", error);
    }
  };

  const fetchDatabaseBookings = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        `/bookings/my-bookings?_t=${Date.now()}`,
      );
      const databaseBookings =
        response?.data?.data ||
        response?.data?.bookings ||
        (Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []);
      setBookings(databaseBookings);
    } catch (error) {
      console.error("❌ Lỗi lấy đơn đặt phòng từ Database:", error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileFromDB();
    fetchDatabaseBookings();

    if (hotelService?.getFavorites) {
      hotelService
        .getFavorites()
        .then((response) => {
          setFavorites(
            Array.isArray(response) ? response : response?.data || [],
          );
        })
        .catch(() => setFavorites([]));
    }
  }, []);

  // ==================================================
  // LƯU THÔNG TIN HỒ SƠ
  // ==================================================
  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (!profileForm.full_name.trim()) {
      showToast("Vui lòng nhập họ và tên.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone ? profileForm.phone.trim() : null,
        dob: profileForm.dob || null,
      };

      const response = await authService.updateProfile(payload);
      const updatedUser =
        response?.data?.user ||
        response?.data?.data?.user ||
        response?.data ||
        response?.user;

      if (updatedUser) {
        syncGlobalUser(updatedUser);
      }

      showToast("Đã lưu thông tin vào Database thành công!");
    } catch (error) {
      const errorMsg =
        error?.message ||
        error?.response?.data?.message ||
        "Cập nhật thông tin thất bại.";
      showToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================================================
  // ĐỔI MẬT KHẨU
  // ==================================================
  const handleChangePasswordSubmit = async (event) => {
    event.preventDefault();
    const { oldPassword, newPassword, confirmNewPassword } = passwordForm;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      showToast("Vui lòng nhập đầy đủ thông tin.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự.", "error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }

    if (oldPassword === newPassword) {
      showToast("Mật khẩu mới phải khác mật khẩu hiện tại.", "error");
      return;
    }

    try {
      setIsChangingPassword(true);
      await authService.changePassword(oldPassword, newPassword);
      showToast("Đổi mật khẩu thành công!");
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      const errorMsg =
        error?.message ||
        error?.response?.data?.message ||
        "Đổi mật khẩu thất bại.";
      showToast(errorMsg, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ==================================================
  // HỦY BOOKING
  // ==================================================
  const handleCancelBooking = async (event, bookingCode) => {
    event.stopPropagation();
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn hủy đơn đặt phòng #${bookingCode}?`,
      )
    )
      return;

    try {
      await apiClient.patch(`/bookings/${bookingCode}/cancel`);
      showToast("Đã hủy đơn đặt phòng thành công!");
      fetchDatabaseBookings();
    } catch (error) {
      showToast("Không thể hủy đơn lúc này.", "error");
    }
  };

  // ==================================================
  // XÓA KHÁCH SẠN YÊU THÍCH
  // ==================================================
  const handleRemoveFavorite = async (event, hotelId) => {
    event.stopPropagation();
    try {
      if (hotelService?.removeFavorite) {
        await hotelService.removeFavorite(hotelId);
      }
      setFavorites((prev) =>
        prev.filter(
          (item) => String(item.id || item.hotel_id) !== String(hotelId),
        ),
      );
      showToast("Đã xóa khỏi danh sách yêu thích");
    } catch (error) {
      showToast("Không thể xóa khách sạn yêu thích.", "error");
    }
  };

  // ==================================================
  // 🌟 GỬI ĐÁNH GIÁ TRỰC TIẾP TỪ ĐƠN ĐÃ ĐẶT (CÁCH 2)
  // ==================================================
  const handleOpenReviewModal = (booking) => {
    setReviewingBooking(booking);
    setReviewPoint(10);
    setReviewComment("");
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showToast("Vui lòng nhập nhận xét kỳ nghỉ.", "error");
      return;
    }

    setIsSendingReview(true);
    try {
      const hotelId = reviewingBooking.hotel_id;
      await apiClient.post(`/hotels/${hotelId}/reviews`, {
        hotelId,
        bookingId: reviewingBooking.id,
        point: Number(reviewPoint),
        description: reviewComment.trim(),
      });

      showToast("✓ Đã gửi đánh giá thành công!");
      setReviewingBooking(null);

      // Cập nhật lại đơn này thành đã đánh giá trên giao diện
      setBookings((prev) =>
        prev.map((item) =>
          item.id === reviewingBooking.id
            ? { ...item, is_reviewed: true, reviewed_point: reviewPoint }
            : item,
        ),
      );
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Không thể gửi đánh giá lúc này.",
        "error",
      );
    } finally {
      setIsSendingReview(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (tripFilter === "upcoming") return b.status !== "cancelled";
    if (tripFilter === "cancelled") return b.status === "cancelled";
    return true;
  });

  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profileForm.full_name || profileForm.email || "User",
  )}&background=003580&color=fff&bold=true`;

  const finalAvatarSrc = resolveAvatarUrl(user?.avatar || user?.picture || "");
  const displayAvatarUrl = finalAvatarSrc || fallbackAvatarUrl;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-24">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm bg-slate-900 border border-slate-700 animate-in fade-in">
          {toast.type === "error" ? (
            <XCircle size={18} className="text-rose-400" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-[#003580] text-white py-8 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-5">
          <div className="relative shrink-0 block">
            <img
              src={displayAvatarUrl}
              alt="Avatar"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackAvatarUrl;
              }}
              className="w-20 h-20 rounded-full border-2 border-white object-cover bg-slate-200 shadow"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profileForm.full_name || "Tài khoản của tôi"}
            </h1>
            <p className="text-sm text-blue-200 mt-0.5">{profileForm.email}</p>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        <div className="flex flex-wrap border-b border-slate-200 text-sm font-semibold text-slate-600 gap-8">
          <button
            type="button"
            onClick={() => handleTabChange("trips")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "trips"
                ? "text-[#003580] border-b-2 border-[#003580] font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Ticket size={17} />
            Chuyến đi của tôi ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("favorites")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "favorites"
                ? "text-[#003580] border-b-2 border-[#003580] font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Heart size={17} />
            Khách sạn yêu thích ({favorites.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("profile")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "profile"
                ? "text-[#003580] border-b-2 border-[#003580] font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <User size={17} />
            Thông tin tài khoản & Bảo mật
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <Loader2
              size={30}
              className="text-[#003580] animate-spin mx-auto"
            />
            <p className="text-sm text-slate-500 font-medium">
              Đang nạp dữ liệu từ Database...
            </p>
          </div>
        ) : (
          <>
            {/* TAB 1: CHUYẾN ĐI CỦA TÔI (CÓ NÚT VIẾT ĐÁNH GIÁ CHUẨN AGODA) */}
            {activeTab === "trips" && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: `Tất cả (${bookings.length})` },
                    {
                      id: "upcoming",
                      label: `Sắp tới (${bookings.filter((b) => b.status !== "cancelled").length})`,
                    },
                    {
                      id: "cancelled",
                      label: `Đã hủy (${bookings.filter((b) => b.status === "cancelled").length})`,
                    },
                  ].map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setTripFilter(f.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        tripFilter === f.id
                          ? "bg-[#003580] text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map((b) => {
                      const bookingCode = b.booking_code || b.id;
                      const isPaid =
                        b.payment_status === "paid" || b.status === "confirmed";
                      const isCancelled = b.status === "cancelled";
                      const isReviewed = b.is_reviewed || Boolean(b.review_id);

                      return (
                        <div
                          key={bookingCode}
                          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-blue-300 transition"
                        >
                          <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-100 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">
                                Mã đơn:{" "}
                                <strong className="text-[#003580] font-mono font-bold text-sm">
                                  #{bookingCode}
                                </strong>
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                (Đặt: {formatBookingCreatedTime(b.created_at)})
                              </span>
                            </div>
                            {isCancelled ? (
                              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-md border border-rose-200 flex items-center gap-1">
                                <XCircle size={13} /> Đã hủy
                              </span>
                            ) : isPaid ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 size={13} /> Đã xác nhận
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold rounded-md border border-amber-200 flex items-center gap-1">
                                <Clock size={13} /> Chờ thanh toán
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-2">
                              <h4
                                onClick={() => navigate(`/hotel/${b.hotel_id}`)}
                                className="font-bold text-[#003580] text-base hover:underline cursor-pointer flex items-center gap-1"
                              >
                                🏨 {b.hotel_name || "Khách sạn GoStay"}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-600">
                                <div className="flex items-center gap-2">
                                  <CalendarDays
                                    size={15}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>
                                    Nhận:{" "}
                                    <strong className="text-slate-800">
                                      {formatStayDateTime(
                                        b.checkin_date,
                                        "14:00",
                                      )}
                                    </strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CalendarDays
                                    size={15}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>
                                    Trả:{" "}
                                    <strong className="text-slate-800">
                                      {formatStayDateTime(
                                        b.checkout_date,
                                        "12:00",
                                      )}
                                    </strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <BedDouble
                                    size={14}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>
                                    Phòng:{" "}
                                    <strong className="text-slate-800">
                                      {b.room_name || "Phòng tiêu chuẩn"}
                                    </strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users
                                    size={14}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>
                                    Khách: {b.customer_name || "Quý khách"} (
                                    {b.guest_phone || "Đã lưu"})
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="w-full md:w-auto flex md:flex-col justify-between items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                              <div className="text-left md:text-right">
                                <span className="text-[10px] text-slate-400 block font-medium">
                                  Tổng tiền
                                </span>
                                <strong className="text-xl font-bold text-[#ff6a00]">
                                  {formatVND(b.total_price)}
                                </strong>
                              </div>

                              {/* 🌟 KHU VỰC CÁC NÚT THAO TÁC CÓ NÚT VIẾT ĐÁNH GIÁ */}
                              <div className="flex flex-wrap items-center gap-2">
                                {!isCancelled && (
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleCancelBooking(e, bookingCode)
                                    }
                                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  >
                                    Hủy phòng
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedTicket(b)}
                                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
                                >
                                  Phiếu đặt phòng
                                </button>

                                {/* NÚT ĐÁNH GIÁ CHUẨN AGODA */}
                                {!isCancelled &&
                                  (isReviewed ? (
                                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg flex items-center gap-1">
                                      <CheckCircle2 size={13} /> Đã đánh giá
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewModal(b)}
                                      className="px-4 py-1.5 bg-[#2e7d32] hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                                    >
                                      <Star size={13} fill="currentColor" />
                                      Viết đánh giá
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
                      <Receipt size={36} className="mx-auto text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">
                        Chưa có chuyến đi nào trong mục này
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/hotels")}
                        className="px-5 py-2 bg-[#003580] text-white font-semibold text-xs rounded-lg cursor-pointer"
                      >
                        Khám phá khách sạn
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: KHÁCH SẠN YÊU THÍCH */}
            {activeTab === "favorites" && (
              <div>
                {favorites.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {favorites.map((item) => {
                      const hotel = item.hotel || item;
                      const hotelId = hotel.id || hotel.hotel_id || hotel._id;
                      const hotelImage =
                        hotel.image ||
                        hotel.images?.[0]?.path ||
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";
                      const hotelPrice = Number(
                        hotel.min_price || hotel.base_price || 500000,
                      );

                      return (
                        <div
                          key={hotelId}
                          onClick={() => navigate(`/hotel/${hotelId}`)}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md cursor-pointer transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative aspect-[16/10] bg-slate-100">
                              <img
                                src={hotelImage}
                                alt={hotel.name || "Khách sạn"}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleRemoveFavorite(e, hotelId)
                                }
                                className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 text-slate-400 hover:text-rose-600 rounded-full shadow cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="p-4 space-y-1">
                              <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                                {hotel.name || "Khách sạn GoStay"}
                              </h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1">
                                <MapPin size={12} className="text-slate-400" />
                                {hotel.address || hotel.city}
                              </p>
                            </div>
                          </div>
                          <div className="p-4 pt-2 border-t border-slate-100 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] text-slate-400 block">
                                Giá từ
                              </span>
                              <strong className="text-sm font-bold text-[#ff6a00]">
                                {formatVND(hotelPrice)}
                              </strong>
                            </div>
                            <span className="text-xs font-semibold text-blue-600 flex items-center">
                              Xem phòng →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                    <Heart size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">
                      Chưa có khách sạn nào trong danh sách yêu thích
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: THÔNG TIN TÀI KHOẢN & ĐỔI MẬT KHẨU */}
            {activeTab === "profile" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="border-b border-slate-100 pb-4 mb-5">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <User size={18} className="text-[#003580]" /> Hồ sơ cá
                      nhân
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đồng bộ trực tiếp với Database
                    </p>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Họ và tên *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.full_name}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Địa chỉ Email (Định danh tài khoản)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={profileForm.email}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        placeholder="Ví dụ: 0912345678"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Ngày sinh (dob)
                      </label>
                      <input
                        type="date"
                        value={profileForm.dob}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            dob: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div className="pt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting
                          ? "Đang lưu vào Database..."
                          : "Lưu thay đổi"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs h-fit">
                  <div className="border-b border-slate-100 pb-4 mb-5">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <KeyRound size={18} className="text-amber-600" /> Đổi mật
                      khẩu
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cập nhật mật khẩu mã hóa trong cơ sở dữ liệu
                    </p>
                  </div>

                  <form
                    onSubmit={handleChangePasswordSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Mật khẩu hiện tại *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordForm.oldPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            oldPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Mật khẩu mới (Tối thiểu 6 ký tự) *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Xác nhận mật khẩu mới *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordForm.confirmNewPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            confirmNewPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div className="pt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isChangingPassword
                          ? "Đang xử lý..."
                          : "Cập nhật mật khẩu"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 🌟 MODAL ĐÁNH GIÁ THANG ĐIỂM 10 (CÁCH 2: VIẾT ĐÁNH GIÁ TỪ ĐƠN ĐÃ ĐẶT) */}
      {reviewingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-[#2e7d32] text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black text-emerald-100 tracking-wider block">
                  Đánh Giá Kỳ Nghỉ Đã Đặt
                </span>
                <h3 className="font-bold text-base mt-0.5">
                  {reviewingBooking.hotel_name || "Chỗ nghỉ"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingBooking(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-5">
              {/* CHỌN ĐIỂM TỪ 1 ĐẾN 10 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">
                    Bạn chấm điểm kỳ nghỉ này mấy điểm? *
                  </span>
                  <span className="text-xs font-black text-[#2e7d32] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    {reviewPoint}/10 • {SCORE_LABELS[reviewPoint]}
                  </span>
                </div>

                <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setReviewPoint(num)}
                      className={`h-9 rounded-xl font-black text-xs transition cursor-pointer border flex items-center justify-center ${
                        reviewPoint === num
                          ? "bg-[#2e7d32] border-[#2e7d32] text-white shadow-sm scale-105"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-emerald-50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* NHẬP BÌNH LUẬN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Chia sẻ nhận xét của bạn *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Dịch vụ tốt, đồ ăn ngon, khách sạn đẹp, nhân viên chu đáo..."
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs outline-none focus:border-[#2e7d32] transition bg-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingBooking(null)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSendingReview}
                  className="px-6 py-2.5 bg-[#2e7d32] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  {isSendingReview ? "Đang gửi..." : "Gửi đánh giá ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PHIẾU ĐẶT PHÒNG */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-[#003580] text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-blue-200 block font-semibold uppercase">
                  Phiếu Đặt Phòng Điện Tử (Voucher)
                </span>
                <h3 className="font-bold text-base">
                  {selectedTicket.hotel_name || "Khách sạn GoStay"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500 font-medium block">
                    Mã đặt phòng:
                  </span>
                  <span className="font-mono font-bold text-sm text-[#003580]">
                    #{selectedTicket.booking_code || selectedTicket.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">
                    Ngày đặt:
                  </span>
                  <strong className="text-slate-700 text-[11px]">
                    {formatBookingCreatedTime(selectedTicket.created_at)}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-slate-500 block font-medium">
                    Nhận phòng (Check-in)
                  </span>
                  <strong className="text-slate-900 text-xs block mt-0.5">
                    {formatStayDateTime(selectedTicket.checkin_date, "14:00")}
                  </strong>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-slate-500 block font-medium">
                    Trả phòng (Check-out)
                  </span>
                  <strong className="text-slate-900 text-xs block mt-0.5">
                    {formatStayDateTime(selectedTicket.checkout_date, "12:00")}
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hạng phòng:</span>
                  <strong className="text-slate-800">
                    {selectedTicket.room_name || "Phòng tiêu chuẩn"}
                  </strong>
                </div>
                {selectedTicket.room_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số phòng bàn giao:</span>
                    <strong className="text-blue-700 font-bold">
                      {selectedTicket.room_number}
                    </strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng thanh toán:</span>
                  <strong className="text-[#ff6a00] font-bold text-sm">
                    {formatVND(selectedTicket.total_price)}
                  </strong>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} /> In phiếu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-2.5 bg-[#003580] text-white font-semibold rounded-xl hover:bg-blue-900 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
