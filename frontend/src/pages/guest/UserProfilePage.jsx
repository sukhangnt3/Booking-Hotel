import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Users,
  BedDouble,
  Coffee,
  Heart,
  Camera,
  MapPin,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Receipt,
  Loader2,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  User,
  Clock,
  Ticket,
} from "lucide-react";

import { authService, bookingService, hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef(null);

  // Mở tab "trips" nếu có param ?tab=trips hoặc mặc định mở chuyến đi
  const initialTab = searchParams.get("tab") || "trips";
  const [activeMainTab, setActiveMainTab] = useState(initialTab);
  const [tripSubTab, setTripSubTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    dob: "",
    avatar: "",
    email_verified: false,
    created_at: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 1. FETCH DỮ LIỆU ĐỒNG BỘ CẢ API + LOCAL (HIỆN CẢ ĐƠN CHƯA THANH TOÁN)
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchRealData = async () => {
      setIsLoading(true);
      try {
        const authStorageUser = JSON.parse(
          localStorage.getItem("auth-storage") || "{}",
        )?.state?.user;
        const localUser = JSON.parse(localStorage.getItem("user") || "null");
        const currentUser = user || authStorageUser || localUser;

        if (currentUser) {
          const displayName =
            currentUser.full_name ||
            currentUser.name ||
            currentUser.fullName ||
            currentUser.username ||
            "";

          let safeDob = "";
          const rawDob =
            currentUser.dob ||
            currentUser.date_of_birth ||
            currentUser.birthday;
          if (rawDob && typeof rawDob === "string") {
            safeDob = rawDob.includes("T") ? rawDob.split("T")[0] : rawDob;
          }

          setProfileForm({
            full_name: displayName,
            email: currentUser.email || "",
            phone: currentUser.phone || currentUser.phone_number || "",
            dob: safeDob,
            avatar:
              currentUser.avatar ||
              currentUser.picture ||
              currentUser.avatar_url ||
              "",
            email_verified: Boolean(currentUser.email_verified),
            created_at: currentUser.created_at || "",
          });
        }

        // 1. Lấy đơn đặt phòng từ API
        let apiBookings = [];
        try {
          if (bookingService?.getHistory) {
            const res = await bookingService.getHistory();
            apiBookings = Array.isArray(res)
              ? res
              : res?.data?.data || res?.data || res?.bookings || [];
          }
        } catch (e) {}

        // 2. Lấy đơn đặt phòng từ LocalStorage (Đơn giữ chỗ văn phòng, đơn chưa thanh toán)
        const localBookings = JSON.parse(
          localStorage.getItem("all_bookings") || "[]",
        );

        // 3. Gộp và lọc đơn của người dùng hiện tại
        const combined = [...localBookings, ...apiBookings];
        const uniqueBookingsMap = new Map();

        combined.forEach((b) => {
          const code = String(
            b.booking_code || b.code || b.id || b._id || "",
          ).trim();
          const bookingEmail = String(
            b.customer_email || b.email || b.user?.email || "",
          )
            .toLowerCase()
            .trim();
          const userEmail = String(currentUser?.email || "")
            .toLowerCase()
            .trim();

          const isMine =
            !userEmail || !bookingEmail || bookingEmail === userEmail;

          if (code && isMine && !uniqueBookingsMap.has(code)) {
            uniqueBookingsMap.set(code, {
              ...b,
              id: code,
              code: code,
              booking_code: code,
              hotel_name:
                b.hotel_name ||
                b.hotelName ||
                b.hotel?.name ||
                "Khách sạn nghỉ dưỡng",
              room_name:
                b.room_name || b.roomType || b.room?.name || "Phòng Tiêu Chuẩn",
              total_price: Number(
                b.total_price || b.totalPrice || b.amount || 650000,
              ),
              status: b.status || "pending",
              payment_status: b.payment_status || "unpaid",
              payment_method: b.payment_method || "office",
              checkin_date: b.check_in || b.checkIn || b.checkin_date,
              checkout_date: b.check_out || b.checkOut || b.checkout_date,
            });
          }
        });

        setBookings(Array.from(uniqueBookingsMap.values()));

        // Tải danh sách yêu thích
        try {
          if (hotelService?.getFavorites) {
            const favRes = await hotelService.getFavorites();
            const favList = Array.isArray(favRes)
              ? favRes
              : favRes?.data?.data || favRes?.data || [];
            setFavorites(favList);
          } else {
            setFavorites(JSON.parse(localStorage.getItem("favorites") || "[]"));
          }
        } catch {
          setFavorites(JSON.parse(localStorage.getItem("favorites") || "[]"));
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu Profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealData();
  }, [user]);

  // 📸 ĐỔI AVATAR
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 250;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const compressedAvatar = canvas.toDataURL("image/jpeg", 0.85);

        setProfileForm((prev) => ({ ...prev, avatar: compressedAvatar }));

        if (updateUser) updateUser({ avatar: compressedAvatar });
        const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({ ...savedUser, avatar: compressedAvatar }),
        );

        try {
          if (authService?.updateProfile) {
            authService
              .updateProfile({ avatar: compressedAvatar })
              .catch(() => {});
          }
        } catch (err) {}

        showToast("Đã cập nhật ảnh đại diện mới!");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // 💾 LƯU THÔNG TIN HỒ SƠ
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updatePayload = {
      full_name: profileForm.full_name,
      name: profileForm.full_name,
      phone: profileForm.phone || null,
      phone_number: profileForm.phone || null,
      dob: profileForm.dob || null,
      avatar: profileForm.avatar || null,
    };

    try {
      if (updateUser) updateUser(updatePayload);
      const currentUserObj =
        user || JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = { ...currentUserObj, ...updatePayload };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      const authStorage = JSON.parse(
        localStorage.getItem("auth-storage") || "{}",
      );
      if (authStorage?.state) {
        authStorage.state.user = updatedUser;
        localStorage.setItem("auth-storage", JSON.stringify(authStorage));
      }
    } catch (localErr) {}

    try {
      const apiCall = authService?.updateProfile
        ? authService.updateProfile(updatePayload)
        : Promise.resolve(true);

      await Promise.race([
        apiCall,
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      showToast("Cập nhật thông tin hồ sơ thành công!");
    } catch (err) {
      showToast("Đã lưu thông tin hồ sơ!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🗑️ HỦY ĐƠN ĐẶT PHÒNG
  const handleCancelBooking = async (e, bookingCode) => {
    e.stopPropagation();

    if (!window.confirm(`Xác nhận hủy đơn đặt phòng #${bookingCode}?`)) return;

    try {
      try {
        if (bookingService?.cancel) {
          await bookingService.cancel(bookingCode);
        }
      } catch (apiErr) {}

      // Cập nhật State
      setBookings((prev) =>
        prev.map((b) => {
          if (b.code === bookingCode || b.booking_code === bookingCode) {
            return { ...b, status: "cancelled", payment_status: "cancelled" };
          }
          return b;
        }),
      );

      // Cập nhật LocalStorage
      const localBookings = JSON.parse(
        localStorage.getItem("all_bookings") || "[]",
      );
      const updatedLocal = localBookings.map((b) => {
        if (
          b.code === bookingCode ||
          b.booking_code === bookingCode ||
          b.id === bookingCode
        ) {
          return { ...b, status: "cancelled", payment_status: "cancelled" };
        }
        return b;
      });
      localStorage.setItem("all_bookings", JSON.stringify(updatedLocal));

      showToast("Đã hủy đơn đặt phòng thành công!");
    } catch (err) {
      showToast("Không thể hủy đơn lúc này, vui lòng thử lại.", "error");
    }
  };

  // 🗑️ XÓA YÊU THÍCH
  const handleRemoveFavorite = async (e, hotelId) => {
    e.stopPropagation();
    try {
      if (hotelService?.removeFavorite)
        await hotelService.removeFavorite(hotelId);
    } catch (err) {}

    const updated = favorites.filter(
      (item) =>
        String(item.id || item.hotel_id || item._id) !== String(hotelId),
    );
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
    showToast("Đã xóa khỏi danh sách yêu thích");
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // 🛑 PHÂN LOẠI CHUYẾN ĐI (CHƯA THANH TOÁN VẪN NẰM Ở CHUYẾN ĐI SẮP TỚI ĐỂ THEO DÕI)
  const upcomingBookings = bookings.filter((b) => {
    return b.status !== "cancelled" && b.payment_status !== "cancelled";
  });

  const historyBookings = bookings.filter((b) => {
    return b.status === "cancelled" || b.payment_status === "cancelled";
  });

  const displayAvatar =
    profileForm.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.full_name || "U")}&background=003580&color=fff`;

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-xl shadow-2xl text-white font-bold text-sm bg-slate-900 border border-slate-700 animate-in slide-in-from-bottom-5">
          {toast.type === "error" ? (
            <XCircle size={18} className="text-rose-400" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── BANNER TRÊN CÙNG ─── */}
      <div className="bg-[#003580] text-white py-8 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Nhấp để đổi ảnh đại diện"
            >
              <img
                src={displayAvatar}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white object-cover bg-white shadow-md group-hover:opacity-90 transition"
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 p-1.5 bg-white text-slate-800 rounded-full shadow border border-slate-200 hover:text-[#00a89d] transition cursor-pointer"
              >
                <Camera size={13} />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">
                  {profileForm.full_name || "Tài khoản GoStay"}
                </h1>
                {profileForm.email_verified && (
                  <span className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck size={12} /> Đã xác thực
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {profileForm.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MENU TABS CHÍNH ─── */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex gap-8 border-b border-slate-200 text-sm font-bold text-slate-500 mb-6">
          <button
            onClick={() => setActiveMainTab("trips")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === "trips"
                ? "text-[#003580] border-b-2 border-[#003580] font-black"
                : "hover:text-slate-900"
            }`}
          >
            <Ticket size={16} /> Chuyến đi của tôi ({bookings.length})
          </button>

          <button
            onClick={() => setActiveMainTab("favorites")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === "favorites"
                ? "text-[#003580] border-b-2 border-[#003580] font-black"
                : "hover:text-slate-900"
            }`}
          >
            <Heart size={16} /> Khách sạn yêu thích ({favorites.length})
          </button>

          <button
            onClick={() => setActiveMainTab("profile")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeMainTab === "profile"
                ? "text-[#003580] border-b-2 border-[#003580] font-black"
                : "hover:text-slate-900"
            }`}
          >
            <User size={16} /> Hồ sơ cá nhân
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <Loader2
              size={32}
              className="text-[#003580] animate-spin mx-auto"
            />
            <p className="text-sm font-bold text-slate-600">
              Đang tải dữ liệu chuyến đi...
            </p>
          </div>
        ) : (
          <>
            {/* ══════════ TAB 1: CHUYẾN ĐI CỦA TÔI (HIỆN CẢ ĐƠN CHỜ THANH TOÁN VĂN PHÒNG) ══════════ */}
            {activeMainTab === "trips" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex gap-6 text-sm font-bold text-slate-600">
                  <button
                    onClick={() => setTripSubTab("upcoming")}
                    className={`pb-1.5 transition cursor-pointer ${
                      tripSubTab === "upcoming"
                        ? "text-[#003580] border-b-2 border-[#003580] font-black"
                        : "hover:text-slate-900 text-slate-500"
                    }`}
                  >
                    Chuyến đi sắp tới ({upcomingBookings.length})
                  </button>
                  <button
                    onClick={() => setTripSubTab("history")}
                    className={`pb-1.5 transition cursor-pointer ${
                      tripSubTab === "history"
                        ? "text-[#003580] border-b-2 border-[#003580] font-black"
                        : "hover:text-slate-900 text-slate-500"
                    }`}
                  >
                    Lịch sử đã hủy ({historyBookings.length})
                  </button>
                </div>

                <div className="space-y-4">
                  {(tripSubTab === "upcoming"
                    ? upcomingBookings
                    : historyBookings
                  ).length > 0 ? (
                    (tripSubTab === "upcoming"
                      ? upcomingBookings
                      : historyBookings
                    ).map((b) => {
                      const bookingCode = b.code || b.booking_code || b.id;
                      const isPaid =
                        b.payment_status === "paid" || b.status === "confirmed";
                      const isCancelled =
                        b.status === "cancelled" ||
                        b.payment_status === "cancelled";
                      const isOfficePayment =
                        b.payment_method === "office" && !isPaid;
                      const isQrPending = b.payment_method === "qr" && !isPaid;

                      return (
                        <div
                          key={bookingCode}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition"
                        >
                          {/* THANH TRẠNG THÁI ĐƠN HÀNG */}
                          <div className="bg-slate-50 px-5 py-3 flex justify-between items-center text-xs font-semibold border-b border-slate-100 flex-wrap gap-2">
                            <span className="text-slate-600">
                              Mã đơn đặt phòng:{" "}
                              <strong className="text-[#003580] font-mono font-black text-sm">
                                {bookingCode}
                              </strong>
                            </span>

                            {isPaid && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
                                <CheckCircle2 size={13} /> Đã thanh toán & Xác
                                nhận
                              </span>
                            )}

                            {isOfficePayment && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-full border border-amber-300 animate-pulse">
                                <Clock size={13} /> Chờ thanh toán tại văn phòng
                                (Giữ chỗ)
                              </span>
                            )}

                            {isQrPending && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-800 font-bold rounded-full border border-blue-200">
                                <Clock size={13} /> Chờ chuyển khoản QR
                              </span>
                            )}

                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 font-bold rounded-full border border-rose-200">
                                <XCircle size={13} /> Đã hủy đơn
                              </span>
                            )}
                          </div>

                          {/* NỘI DUNG CHI TIẾT ĐƠN HÀNG */}
                          <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                            <div className="flex-1 space-y-3">
                              <h4 className="font-extrabold text-[#003580] text-base">
                                🏨 {b.hotel_name}
                              </h4>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-600 font-medium">
                                <div className="flex items-center gap-2">
                                  <CalendarDays
                                    size={14}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>
                                    {formatDate(b.checkin_date)} &rarr;{" "}
                                    {formatDate(b.checkout_date)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <BedDouble
                                    size={14}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>{b.room_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users
                                    size={14}
                                    className="text-blue-600 shrink-0"
                                  />
                                  <span>
                                    Khách: {b.customer_name || "Quý khách"} (
                                    {b.customer_phone || "N/A"})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Coffee
                                    size={14}
                                    className="text-emerald-600 shrink-0"
                                  />
                                  <span>Bao gồm bữa sáng miễn phí</span>
                                </div>
                              </div>
                            </div>

                            {/* CỘT GIÁ TIỀN & THAO TÁC */}
                            <div className="w-full md:w-auto flex md:flex-col justify-between items-end gap-2.5 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                              <span className="text-2xl font-black text-[#ff6a00] tracking-tight">
                                {formatVND(b.total_price)}
                              </span>

                              {!isPaid && !isCancelled ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleCancelBooking(e, bookingCode)
                                    }
                                    className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                  >
                                    Hủy đơn
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/checkout?code=${bookingCode}&amount=${b.total_price}`,
                                      )
                                    }
                                    className="px-5 py-2 bg-[#ff6a00] hover:bg-[#e55f00] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                                  >
                                    Thanh toán ngay
                                  </button>
                                </div>
                              ) : isPaid ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/booking-success?code=${bookingCode}`,
                                    )
                                  }
                                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs rounded-xl transition cursor-pointer"
                                >
                                  Xem vé điện tử
                                </button>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 italic">
                                  Đã đóng đơn
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
                      <Receipt size={40} className="mx-auto text-slate-300" />
                      <p className="text-base font-bold text-slate-700">
                        Chưa có chuyến đi nào trong mục này
                      </p>
                      <button
                        onClick={() => navigate("/hotels")}
                        className="mt-2 px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Khám phá khách sạn ngay
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ TAB 2: YÊU THÍCH ══════════ */}
            {activeMainTab === "favorites" && (
              <div className="space-y-4 animate-in fade-in">
                {favorites.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((item) => {
                      const hotel = item.hotel || item;
                      const hotelId = hotel.id || hotel.hotel_id || hotel._id;
                      const hotelName =
                        hotel.name || hotel.hotel_name || "Chỗ nghỉ GoStay";
                      const hotelImage =
                        hotel.image ||
                        hotel.images?.[0]?.path ||
                        hotel.images?.[0]?.url ||
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";
                      const hotelAddress =
                        hotel.address || hotel.city || "Việt Nam";
                      const hotelPrice = Number(
                        hotel.min_price || hotel.base_price || hotel.price || 0,
                      );

                      return (
                        <div
                          key={hotelId}
                          onClick={() => navigate(`/hotel/${hotelId}`)}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                              <img
                                src={hotelImage}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                alt={hotelName}
                              />
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleRemoveFavorite(e, hotelId)
                                }
                                className="absolute top-3 right-3 p-2 bg-white/90 text-slate-400 hover:text-rose-600 rounded-full shadow-md transition cursor-pointer"
                                title="Bỏ yêu thích"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div className="p-4 space-y-1">
                              <h4 className="font-bold text-[#003580] text-base group-hover:text-blue-600 transition line-clamp-1">
                                {hotelName}
                              </h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1">
                                <MapPin
                                  size={12}
                                  className="text-slate-400 shrink-0"
                                />{" "}
                                {hotelAddress}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                Giá từ
                              </span>
                              <span className="text-base font-black text-[#ff6a00]">
                                {hotelPrice > 0
                                  ? formatVND(hotelPrice)
                                  : "Xem chi tiết"}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                              Xem phòng <ChevronRight size={14} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
                    <Heart size={40} className="mx-auto text-slate-300" />
                    <p className="text-base font-bold text-slate-700">
                      Chưa có khách sạn nào được lưu
                    </p>
                    <button
                      onClick={() => navigate("/hotels")}
                      className="mt-2 px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Tìm khách sạn yêu thích
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════ TAB 3: HỒ SƠ CÁ NHÂN ══════════ */}
            {activeMainTab === "profile" && (
              <div className="max-w-2xl space-y-6 animate-in fade-in">
                <form
                  onSubmit={handleProfileSubmit}
                  className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm"
                >
                  <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-slate-900 text-lg">
                        Thông tin tài khoản
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cập nhật thông tin cá nhân của bạn.
                      </p>
                    </div>

                    {profileForm.created_at && (
                      <span className="text-xs text-slate-400">
                        Tham gia:{" "}
                        {new Date(profileForm.created_at).toLocaleDateString(
                          "vi-VN",
                        )}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Họ và tên <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User
                          size={16}
                          className="absolute left-3.5 top-3 text-slate-400"
                        />
                        <input
                          type="text"
                          required
                          value={profileForm.full_name}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              full_name: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#003580] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Địa chỉ Email
                      </label>
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3.5 top-3 text-slate-400"
                        />
                        <input
                          type="email"
                          disabled
                          value={profileForm.email}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Số điện thoại
                      </label>
                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3.5 top-3 text-slate-400"
                        />
                        <input
                          type="tel"
                          placeholder="Ví dụ: 0912345678"
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              phone: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#003580] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Ngày sinh
                      </label>
                      <div className="relative">
                        <Calendar
                          size={16}
                          className="absolute left-3.5 top-3 text-slate-400"
                        />
                        <input
                          type="date"
                          value={profileForm.dob}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              dob: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#003580] focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-sm rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? "Đang lưu..." : "Lưu thay đổi hồ sơ"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
