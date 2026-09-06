// src/pages/guest/UserProfilePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Users,
  BedDouble,
  Heart,
  Camera,
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
  UploadCloud,
} from "lucide-react";

import { authService, hotelService, uploadService } from "@/services";
import apiClient from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef(null);

  const initialTab = searchParams.get("tab") || "trips";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tripFilter, setTripFilter] = useState("all");

  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [imgTimestamp, setImgTimestamp] = useState(Date.now());

  // Key đánh dấu ảnh đã đổi theo email
  const getCustomAvatarKey = (email) =>
    email
      ? `has_custom_avatar_${email.toLowerCase().trim()}`
      : "has_custom_avatar";

  // HÀM LỌC ẢNH CHUẨN: LẦN ĐẦU LẤY GOOGLE, ĐÃ ĐỔI ẢNH THÌ VĨNH VIỄN LẤY ẢNH ĐÃ ĐỔI
  const determineUserAvatar = (u) => {
    if (!u) return "";
    const email = u.email || user?.email || "";
    const customAvatarUrl = localStorage.getItem(getCustomAvatarKey(email));

    // 1. NẾU NGƯỜI DÙNG ĐÃ TỪNG ĐỔI ẢNH -> BẮT BUỘC LẤY ẢNH ĐÃ ĐỔI
    if (customAvatarUrl) {
      return customAvatarUrl;
    }

    // 2. NẾU TRONG DATABASE ĐÃ CÓ ẢNH RIÊNG (KHÔNG PHẢI LINK GOOGLE) -> LẤY ẢNH RIÊNG
    const dbAvatar = u.avatar || u.avatar_url || "";
    if (dbAvatar && !dbAvatar.includes("googleusercontent.com")) {
      return dbAvatar;
    }

    // 3. LẦN ĐẦU TIÊN (CHƯA ĐỔI ẢNH): LẤY ẢNH MẶC ĐỊNH TỪ GOOGLE
    return dbAvatar || u.picture || u.image || "";
  };

  const resolveAvatarUrl = (url) => {
    if (!url) return "";
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return url;
    }
    const cleanPath = url.replace(/\\/g, "/").replace(/^\/+/, "");
    const backendBase =
      apiClient.defaults?.baseURL?.replace(/\/api\/?$/, "") ||
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000";

    return `${backendBase}/${cleanPath}`;
  };

  // Khởi tạo state Profile
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dob: user?.dob ? user.dob.split("T")[0] : "",
    avatar: determineUserAvatar(user),
  });

  // Form Đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const formatStayDateTime = (dateStr, defaultHour = "14:00") => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const formatter = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return `${defaultHour} • ${formatter.format(d)}`;
    } catch {
      return dateStr;
    }
  };

  const formatBookingCreatedTime = (dateStr) => {
    if (!dateStr) return "Mới đây";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ĐỒNG BỘ TOÀN HỆ THỐNG
  const syncGlobalUser = (u, forceAvatar) => {
    if (!u) return;
    const finalAvatar = forceAvatar || determineUserAvatar(u);

    const updatedUser = {
      ...user,
      ...u,
      avatar: finalAvatar,
      avatar_url: finalAvatar,
      picture: finalAvatar,
      image: finalAvatar,
    };

    useAuthStore.setState({ user: updatedUser });
    if (updateUser) updateUser(updatedUser);

    try {
      const cur = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...cur, ...updatedUser }));
    } catch (e) {}

    setProfileForm({
      full_name: u.full_name || u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      dob: u.dob ? u.dob.split("T")[0] : "",
      avatar: finalAvatar,
    });
    setImgTimestamp(Date.now());
  };

  // LẤY DỮ LIỆU TỪ DATABASE
  const fetchProfileFromDB = async () => {
    try {
      const res = await authService.getProfile();
      const u =
        res?.data?.user ||
        res?.data?.data?.user ||
        res?.data?.data ||
        (res?.data &&
        typeof res.data === "object" &&
        (res.data.id || res.data.email)
          ? res.data
          : null) ||
        res?.user;

      if (u) {
        const email = u.email || user?.email || "";
        const customSaved = localStorage.getItem(getCustomAvatarKey(email));

        // Nếu người dùng đã từng đổi ảnh, nhưng Database bị Google đè lại link google -> Ghi đè lại ảnh đã đổi vào DB
        if (
          customSaved &&
          u.avatar &&
          u.avatar.includes("googleusercontent.com")
        ) {
          authService
            .updateProfile({
              full_name: u.full_name || u.name,
              avatar: customSaved,
              avatar_url: customSaved,
              picture: customSaved,
            })
            .catch(() => {});
        }

        syncGlobalUser(u);
      }
    } catch (err) {
      console.error("❌ Lỗi lấy thông tin từ Database:", err);
    }
  };

  const fetchDatabaseBookings = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/bookings/my-bookings");
      const dbList =
        res?.data?.data ||
        res?.data?.bookings ||
        (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      setBookings(dbList);
    } catch (err) {
      console.error("❌ Lỗi lấy đơn từ Database:", err);
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
        .then((res) => setFavorites(Array.isArray(res) ? res : res?.data || []))
        .catch(() => {});
    }
  }, []);

  // XỬ LÝ ĐỔI ẢNH: ĐÁNH DẤU LÀ ẢNH RIÊNG VÀ LƯU DATABASE
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước file ảnh không được vượt quá 5MB.", "error");
      e.target.value = null;
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setProfileForm((prev) => ({ ...prev, avatar: localPreviewUrl }));
    setImgTimestamp(Date.now());

    try {
      showToast("Đang tải ảnh lên máy chủ...", "info");
      let uploadedUrl = "";

      // 1. Thử qua uploadService
      if (uploadService) {
        for (const fn of [
          "uploadSingle",
          "uploadImage",
          "upload",
          "uploadFile",
        ]) {
          if (typeof uploadService[fn] === "function") {
            try {
              const res = await uploadService[fn](file, "avatars");
              uploadedUrl =
                res?.url ||
                res?.path ||
                res?.secure_url ||
                res?.data?.url ||
                res?.data?.path ||
                (typeof res === "string" ? res : "");
              if (uploadedUrl) break;
            } catch (err) {}
          }
        }
      }

      // 2. Thử qua các API upload multipart
      if (!uploadedUrl) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("avatar", file);
        formData.append("image", file);

        const endpoints = [
          "/upload",
          "/uploads",
          "/upload/single",
          "/users/avatar",
          "/auth/avatar",
        ];
        for (const ep of endpoints) {
          try {
            const res = await apiClient.post(ep, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            uploadedUrl =
              res?.data?.url ||
              res?.data?.data?.url ||
              res?.data?.secure_url ||
              res?.data?.path ||
              res?.url ||
              "";
            if (uploadedUrl) break;
          } catch (err) {}
        }
      }

      // 3. Nếu backend nhận FormData trực tiếp trong updateProfile
      if (!uploadedUrl) {
        try {
          const profileFormData = new FormData();
          profileFormData.append("avatar", file);
          profileFormData.append("file", file);
          profileFormData.append(
            "full_name",
            profileForm.full_name || user?.full_name || "",
          );
          const updateRes = await authService.updateProfile(profileFormData);
          const u = updateRes?.data?.user || updateRes?.user || updateRes?.data;

          const email = profileForm.email || user?.email;
          if (email)
            localStorage.setItem(getCustomAvatarKey(email), localPreviewUrl);

          syncGlobalUser(u || user, localPreviewUrl);
          showToast("Đã lưu ảnh đại diện vào Database thành công!");
          return;
        } catch (err) {}
      }

      if (!uploadedUrl) {
        showToast(
          "Máy chủ chưa hỗ trợ upload file. Bạn có thể dán link URL ảnh ở ô bên dưới nhé.",
          "error",
        );
        return;
      }

      // ĐÁNH DẤU ĐÂY LÀ ẢNH RIÊNG ĐÃ ĐỔI (CHỐNG GOOGLE GHI ĐÈ LẦN SAU)
      const userEmail = profileForm.email || user?.email;
      if (userEmail) {
        localStorage.setItem(getCustomAvatarKey(userEmail), uploadedUrl);
      }

      // 4. Lưu URL vào Database
      showToast("Đang lưu vào Database...", "info");
      const payload = {
        full_name: profileForm.full_name?.trim() || user?.full_name || "",
        phone: profileForm.phone ? profileForm.phone.trim() : null,
        dob: profileForm.dob || null,
        avatar: uploadedUrl,
        avatar_url: uploadedUrl,
        picture: uploadedUrl,
        image: uploadedUrl,
      };

      const res = await authService.updateProfile(payload);
      const updatedUser = res?.data?.user || res?.user || res?.data || payload;

      syncGlobalUser(updatedUser, uploadedUrl);

      showToast("Đã lưu ảnh đại diện vào Database thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật ảnh:", error);
      showToast(
        error?.response?.data?.message ||
          "Lỗi lưu vào Database, vui lòng thử lại.",
        "error",
      );
    } finally {
      if (e.target) e.target.value = null;
    }
  };

  // Lưu hồ sơ
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const imgVal = profileForm.avatar ? profileForm.avatar.trim() : null;

      // Đánh dấu ảnh riêng
      const userEmail = profileForm.email || user?.email;
      if (userEmail && imgVal) {
        localStorage.setItem(getCustomAvatarKey(userEmail), imgVal);
      }

      const payload = {
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone ? profileForm.phone.trim() : null,
        dob: profileForm.dob || null,
        avatar: imgVal,
        avatar_url: imgVal,
        picture: imgVal,
        image: imgVal,
      };

      const res = await authService.updateProfile(payload);
      const updatedUser = res?.data?.user || res?.user || res?.data || payload;

      syncGlobalUser(updatedUser, imgVal);

      showToast("Đã lưu thông tin vào Database thành công!");
    } catch (err) {
      showToast(
        err?.response?.data?.message || err?.message || "Cập nhật thất bại.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      showToast("Mật khẩu mới phải từ 6 ký tự trở lên.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      showToast("Mật khẩu xác nhận không trùng khớp.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(
        passwordForm.oldPassword,
        passwordForm.newPassword,
      );
      showToast("Đã đổi mật khẩu thành công!");
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Đổi mật khẩu thất bại.",
        "error",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelBooking = async (e, bookingCode) => {
    e.stopPropagation();
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
    } catch (err) {
      showToast("Không thể hủy đơn lúc này.", "error");
    }
  };

  const handleRemoveFavorite = async (e, hotelId) => {
    e.stopPropagation();
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
    } catch (err) {}
  };

  const filteredBookings = bookings.filter((b) => {
    if (tripFilter === "upcoming") return b.status !== "cancelled";
    if (tripFilter === "cancelled") return b.status === "cancelled";
    return true;
  });

  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profileForm.full_name || profileForm.email || "User",
  )}&background=003580&color=fff&bold=true`;

  const finalAvatarSrc = resolveAvatarUrl(profileForm.avatar);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-24">
      {/* File input ẩn */}
      <input
        type="file"
        id="avatar-file-input"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm bg-slate-900 border border-slate-700 animate-in slide-in-from-bottom-5">
          {toast.type === "error" ? (
            <XCircle size={18} className="text-rose-400" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER: HIỂN THỊ ẢNH THEO ĐÚNG QUY TẮC */}
      <div className="bg-[#003580] text-white py-8 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-5">
          <label
            htmlFor="avatar-file-input"
            className="relative group cursor-pointer shrink-0 block"
            title="Nhấp để đổi ảnh đại diện vào Database"
          >
            <img
              key={`${finalAvatarSrc}-${imgTimestamp}`}
              src={
                finalAvatarSrc
                  ? finalAvatarSrc.startsWith("blob:") ||
                    finalAvatarSrc.startsWith("data:")
                    ? finalAvatarSrc
                    : `${finalAvatarSrc}${finalAvatarSrc.includes("?") ? "&" : "?"}t=${imgTimestamp}`
                  : fallbackAvatarUrl
              }
              alt="Avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackAvatarUrl;
              }}
              className="w-20 h-20 rounded-full border-2 border-white object-cover bg-slate-200 group-hover:opacity-90 transition shadow"
            />
            <span className="absolute bottom-0 right-0 p-1.5 bg-white text-slate-700 rounded-full shadow hover:bg-slate-100 transition flex items-center justify-center border border-slate-200">
              <Camera size={13} />
            </span>
          </label>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profileForm.full_name || "Tài khoản của tôi"}
            </h1>
            <p className="text-sm text-blue-200 mt-0.5">{profileForm.email}</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* TABS */}
        <div className="flex border-b border-slate-200 text-sm font-semibold text-slate-600 gap-8">
          <button
            onClick={() => handleTabChange("trips")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "trips"
                ? "text-[#003580] border-b-2 border-[#003580] font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Ticket size={17} /> Chuyến đi của tôi ({bookings.length})
          </button>

          <button
            onClick={() => handleTabChange("favorites")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "favorites"
                ? "text-[#003580] border-b-2 border-[#003580] font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Heart size={17} /> Khách sạn yêu thích ({favorites.length})
          </button>

          <button
            onClick={() => handleTabChange("profile")}
            className={`pb-3 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "profile"
                ? "text-[#003580] border-b-2 border-[#003580] font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <User size={17} /> Thông tin tài khoản & Bảo mật
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
            {/* ══════════ TAB 1: CHUYẾN ĐI CỦA TÔI ══════════ */}
            {activeTab === "trips" && (
              <div className="space-y-5">
                <div className="flex gap-2">
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

                      return (
                        <div
                          key={bookingCode}
                          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition space-y-4"
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
                              <h4 className="font-bold text-[#003580] text-base">
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

                              <div className="flex items-center gap-2">
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
                                  className="px-4 py-1.5 bg-[#003580] hover:bg-blue-900 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
                                >
                                  Xem phiếu đặt phòng
                                </button>
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

            {/* ══════════ TAB 2: KHÁCH SẠN YÊU THÍCH ══════════ */}
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
                                alt={hotel.name}
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
                                {hotel.name}
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
                              Xem phòng &rarr;
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

            {/* ══════════ TAB 3: THÔNG TIN TÀI KHOẢN & ĐỔI MẬT KHẨU ══════════ */}
            {activeTab === "profile" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Form Cập nhật Hồ sơ */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="border-b border-slate-100 pb-4 mb-5">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <User size={18} className="text-[#003580]" /> Hồ sơ cá
                      nhân
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đồng bộ 100% với bảng <code>users</code> trong Database
                    </p>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Ảnh đại diện (Link URL hoặc Tải từ máy)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Dán link ảnh https://... hoặc bấm nút Tải ảnh"
                          value={profileForm.avatar}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              avatar: e.target.value,
                            })
                          }
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 cursor-pointer shrink-0 transition"
                        >
                          <UploadCloud size={15} /> Tải ảnh
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Sau khi chọn file hoặc dán link ảnh, bấm{" "}
                        <strong>Lưu thay đổi</strong> để cập nhật Database.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Họ và tên *
                      </label>
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Địa chỉ Email (Định danh)
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
                          setProfileForm({
                            ...profileForm,
                            phone: e.target.value,
                          })
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
                          setProfileForm({
                            ...profileForm,
                            dob: e.target.value,
                          })
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

                {/* 2. Form Đổi Mật Khẩu */}
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
                          setPasswordForm({
                            ...passwordForm,
                            oldPassword: e.target.value,
                          })
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
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
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
                          setPasswordForm({
                            ...passwordForm,
                            confirmNewPassword: e.target.value,
                          })
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

      {/* MODAL PHIẾU ĐẶT PHÒNG */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
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
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} /> In phiếu
                </button>
                <button
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
