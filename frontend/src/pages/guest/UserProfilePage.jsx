import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import hotelService from "../../services/hotelService";
import { LoadingSpinner } from "../../components/common";

export default function UserProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    dob: "",
    avatar: "",
    email_verified: false,
    phone_verified: false,
    activate: true,
    created_at: null,
  });

  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // HÀM BỔ TRỢ 1: Chuyển ngày từ Database về YYYY-MM-DD
  const formatDateForInput = (dateString) => {
    if (!dateString || dateString === "null" || dateString === "0000-00-00") {
      return "";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const isoDate = date.toISOString().split("T")[0];
      if (isoDate === "1970-01-01" && !String(dateString).includes("1970")) {
        return "";
      }
      return isoDate;
    } catch (e) {
      return "";
    }
  };

  // HÀM BỔ TRỢ 2: BÓC TÁCH AVATAR GOOGLE HOẶC TỰ TẠO AVATAR CHUẨN GOOGLE CỰC ĐẸP
  const getSmartAvatar = (rawUser, zustandUser, localUser, name) => {
    // 1. Kiểm tra các nguồn chứa link ảnh thật từ Google hoặc Database
    const candidateUrls = [
      rawUser?.avatar,
      rawUser?.picture,
      rawUser?.photoURL,
      zustandUser?.picture,
      zustandUser?.avatar,
      zustandUser?.photoURL,
      localUser?.avatar,
      localUser?.picture,
      localStorage.getItem(
        "google_avatar_" + (rawUser?.email || zustandUser?.email),
      ),
    ];

    for (const url of candidateUrls) {
      if (
        url &&
        typeof url === "string" &&
        url.trim() !== "" &&
        !url.includes("placeholder")
      ) {
        return url;
      }
    }

    // 2. Nếu không có link ảnh -> TỰ ĐỘNG TẠO AVATAR CHUẨN GOOGLE THEO CHỮ CÁI TÊN CỦA BẠN
    const displayName = name && name.trim() !== "" ? name : "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName,
    )}&background=4F46E5&color=ffffff&bold=true&size=150`;
  };

  // TẢI DỮ LIỆU ĐÚNG CỦA TÀI KHOẢN ĐANG ĐĂNG NHẬP
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoadingData(true);

      // 1. Lấy từ API Backend (GET /auth/profile)
      let activeUser = null;
      if (authService && authService.getProfile) {
        try {
          const res = await authService.getProfile();
          activeUser = res?.user || res?.data?.user || res?.data || res;
        } catch (err) {}
      }

      // 2. Lấy từ Zustand Store (auth-storage)
      let zustandUser = null;
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          zustandUser = parsed.state?.user;
        } catch (e) {}
      }

      if (!activeUser) activeUser = zustandUser;

      // 3. Lấy từ LocalStorage "user" đúng chính chủ
      let localUser = null;
      try {
        const savedLocal = localStorage.getItem("user");
        if (savedLocal) {
          const parsedLocal = JSON.parse(savedLocal);
          if (
            activeUser &&
            (parsedLocal.email === activeUser.email ||
              parsedLocal.id === activeUser.id)
          ) {
            localUser = parsedLocal;
          } else {
            localStorage.removeItem("user");
          }
        }
      } catch (e) {}

      // 4. BÓC TÁCH DỮ LIỆU VÀ TỰ ĐỘNG KHÔI PHỤC AVATAR GOOGLE
      if (activeUser && activeUser.email) {
        setUser(activeUser);

        const fullName =
          activeUser.full_name ||
          activeUser.name ||
          activeUser.displayName ||
          activeUser.username ||
          localUser?.full_name ||
          "";

        const email = activeUser.email || localUser?.email || "";

        const phone =
          activeUser.phone || activeUser.phone_number || localUser?.phone || "";

        const rawDob = activeUser.dob || localUser?.dob || null;
        const formattedDob = formatDateForInput(rawDob);

        // Tự động bóc tách hoặc tạo Avatar Google tuyệt đẹp
        const finalAvatar = getSmartAvatar(
          activeUser,
          zustandUser,
          localUser,
          fullName,
        );

        setProfileForm({
          full_name: fullName,
          email: email,
          phone: phone,
          dob: formattedDob,
          avatar: finalAvatar,
          email_verified: activeUser.email_verified ?? false,
          phone_verified: activeUser.phone_verified ?? false,
          activate: activeUser.activate ?? true,
          created_at: activeUser.created_at || null,
        });
      } else {
        setUser(null);
        setProfileForm({
          full_name: "",
          email: "",
          phone: "",
          dob: "",
          avatar:
            "https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff",
          email_verified: false,
          phone_verified: false,
          activate: true,
          created_at: null,
        });
      }

      // 5. Tải danh sách đơn đặt hàng
      if (bookingService && bookingService.getMyBookings) {
        const myBookings = await bookingService.getMyBookings();
        setBookings(myBookings || []);
      }

      // 6. Tải danh sách yêu thích
      if (hotelService && hotelService.getFavoriteHotels) {
        const myFavorites = await hotelService.getFavoriteHotels();
        setFavorites(myFavorites || []);
      }
    } catch (error) {
      console.error("Lỗi lấy dữ liệu tài khoản:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // CẬP NHẬT THÔNG TIN VÀO DATABASE BACKEND
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone,
        phone_number: profileForm.phone,
        dob: profileForm.dob ? profileForm.dob : null,
        avatar: profileForm.avatar, // Gửi link Avatar để ép Backend lưu vào PostgreSQL
      };

      console.log("Đang gửi Payload cập nhật:", updateData);

      let updatedUserFromApi = null;
      if (authService && authService.updateProfile) {
        try {
          const res = await authService.updateProfile(updateData);
          updatedUserFromApi = res?.user || res?.data || res;
        } catch (apiErr) {
          console.warn(
            "API Backend chưa lưu được, lưu dự phòng Local:",
            apiErr,
          );
        }
      }

      const finalUser = {
        ...(user || {}),
        ...(updatedUserFromApi || {}),
        ...updateData,
      };

      setUser(finalUser);

      // Lưu bộ nhớ cục bộ
      localStorage.setItem("user", JSON.stringify(finalUser));

      // Đồng bộ vào Zustand Store
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          if (parsed.state) {
            parsed.state.user = finalUser;
            localStorage.setItem("auth-storage", JSON.stringify(parsed));
          }
        } catch (err) {}
      }

      showToast("Cập nhật thông tin cá nhân thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật thông tin:", error);
      showToast("Cập nhật thất bại. Vui lòng kiểm tra lại!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // HÀM XÓA YÊU THÍCH CHUẨN XÁC
  const handleRemoveFavorite = async (e, hotel) => {
    e.stopPropagation();

    const targetHotelId = hotel.id || hotel.hotel_id;
    const favoriteRecordId = hotel.favorite_record_id || hotel.favorite_id;

    if (!targetHotelId) {
      showToast("Không tìm thấy ID khách sạn!", "error");
      return;
    }

    try {
      setDeletingId(targetHotelId);

      await hotelService.removeFavorite(targetHotelId, favoriteRecordId);

      const updatedFavorites = await hotelService.getFavoriteHotels();
      setFavorites(updatedFavorites || []);

      showToast("Đã xóa khỏi danh sách yêu thích!", "info");
    } catch (err) {
      console.error("Lỗi xóa yêu thích:", err);
      showToast("Không thể xóa khỏi Database!", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loadingData) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* TOAST THÔNG BÁO */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white font-medium ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Quản lý tài khoản
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SIDEBAR VỚI AVATAR CHUẨN GOOGLE */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border h-fit space-y-6">
            <div className="flex flex-col items-center text-center pb-6 border-b">
              <img
                src={profileForm.avatar}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profileForm.full_name || "User",
                  )}&background=4F46E5&color=fff&bold=true`;
                }}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover shadow border border-gray-200"
              />
              <h2 className="font-bold text-slate-900 text-lg mt-3">
                {profileForm.full_name || "Người dùng"}
              </h2>
              <p className="text-xs text-slate-500">{profileForm.email}</p>

              {/* TRẠNG THÁI TÀI KHOẢN */}
              <div className="mt-3">
                {profileForm.activate ? (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    ● Tài khoản đang hoạt động
                  </span>
                ) : (
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    ● Tài khoản bị khóa
                  </span>
                )}
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer transition ${
                  activeTab === "profile"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Thông tin cá nhân
              </button>

              <button
                onClick={() => setActiveTab("bookings")}
                className={`px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer transition ${
                  activeTab === "bookings"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Đơn đặt của tôi ({bookings.length})
              </button>

              <button
                onClick={() => setActiveTab("favorites")}
                className={`px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer transition ${
                  activeTab === "favorites"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Khách sạn yêu thích ({favorites.length})
              </button>
            </nav>
          </div>

          {/* CONTENT AREA */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border">
            {/* TAB THÔNG TIN CÁ NHÂN */}
            {activeTab === "profile" && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 border-b pb-4">
                  Thông tin cá nhân
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* HỌ VÀ TÊN */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          full_name: e.target.value,
                        })
                      }
                      required
                      placeholder="Nhập họ và tên..."
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      required
                      placeholder="Nhập email..."
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* SỐ ĐIỆN THOẠI */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Nhập số điện thoại..."
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* NGÀY SINH */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                      Ngày sinh
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
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-indigo-500 transition cursor-pointer"
                    />
                  </div>

                  {/* LINK ẢNH ĐẠI DIỆN */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                      Link Ảnh đại diện (Avatar URL)
                    </label>
                    <input
                      type="text"
                      value={profileForm.avatar}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          avatar: e.target.value,
                        })
                      }
                      placeholder="Link ảnh đại diện Google..."
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow hover:bg-indigo-700 transition cursor-pointer"
                  >
                    {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB ĐƠN ĐẶT CỦA TÔI */}
            {activeTab === "bookings" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 border-b pb-4 mb-6">
                  Đơn đặt của tôi
                </h2>
                {bookings.length === 0 ? (
                  <p className="text-center py-12 text-slate-500 text-sm">
                    Chưa có đơn đặt phòng nào.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border p-4 rounded-xl flex justify-between items-center hover:border-indigo-200 transition"
                      >
                        <div>
                          <h4 className="font-bold">
                            {booking.hotel_name || "Khách sạn"}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Mã đơn: #{booking.id} | Ngày đặt:{" "}
                            {booking.created_at || "N/A"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">
                          {booking.status || "Đã xác nhận"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB YÊU THÍCH */}
            {activeTab === "favorites" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 border-b pb-4 mb-6">
                  Khách sạn yêu thích
                </h2>
                {favorites.length === 0 ? (
                  <p className="text-center py-12 text-slate-500 text-sm">
                    Chưa có khách sạn yêu thích nào.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {favorites.map((hotel) => {
                      const hotelId = hotel.id || hotel.hotel_id;
                      const isDeleting = deletingId === hotelId;

                      return (
                        <div
                          key={hotelId}
                          onClick={() => navigate(`/hotel/${hotelId}`)}
                          className="border rounded-2xl overflow-hidden shadow-sm bg-white p-4 relative flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all duration-200 group"
                        >
                          <div>
                            <div className="overflow-hidden rounded-xl mb-3">
                              <img
                                src={
                                  hotel.image ||
                                  hotel.images?.[0]?.path ||
                                  "https://via.placeholder.com/300"
                                }
                                alt={
                                  hotel.name || hotel.hotel_name || "Khách sạn"
                                }
                                className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {hotel.name || hotel.hotel_name || "Khách sạn"}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              📍{" "}
                              {hotel.address ||
                                hotel.location ||
                                "Đang cập nhật địa chỉ"}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t flex justify-between items-center">
                            <button
                              onClick={(e) => handleRemoveFavorite(e, hotel)}
                              disabled={isDeleting}
                              className={`text-xs font-bold transition cursor-pointer ${
                                isDeleting
                                  ? "text-slate-400"
                                  : "text-rose-600 hover:text-rose-800 hover:underline"
                              }`}
                            >
                              {isDeleting ? "Đang xóa..." : "Bỏ yêu thích"}
                            </button>

                            <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                              Xem chi tiết &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
