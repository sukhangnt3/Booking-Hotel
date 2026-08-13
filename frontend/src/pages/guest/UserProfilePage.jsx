import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Thêm useNavigate để điều hướng
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import hotelService from "../../services/hotelService";
import { LoadingSpinner } from "../../components/common";

export default function UserProfilePage() {
  const navigate = useNavigate(); // Hook chuyển trang

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
    gender: "male",
    dob: "",
    address: "",
    avatar: "",
  });

  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // TẢI DỮ LIỆU THẬT TỪ DATABASE
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoadingData(true);
      const currentUser =
        (authService.getCurrentUser && authService.getCurrentUser()) ||
        JSON.parse(localStorage.getItem("user") || "null");

      if (currentUser) {
        setUser(currentUser);
        setProfileForm({
          full_name: currentUser.full_name || currentUser.name || "",
          email: currentUser.email || "",
          phone: currentUser.phone || currentUser.phone_number || "",
          gender: currentUser.gender || "male",
          dob: currentUser.dob || "",
          address: currentUser.address || "",
          avatar: currentUser.avatar || "https://via.placeholder.com/150",
        });
      }

      if (bookingService && bookingService.getMyBookings) {
        const myBookings = await bookingService.getMyBookings();
        setBookings(myBookings || []);
      }

      // Tải danh sách yêu thích từ Database
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let updatedUser = profileForm;
      if (authService.updateProfile) {
        updatedUser = await authService.updateProfile(profileForm);
      }
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify({ ...user, ...profileForm }));
      showToast("Cập nhật thông tin cá nhân thành công!");
    } catch (error) {
      showToast("Cập nhật thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // HÀM XÓA YÊU THÍCH CHUẨN XÁC (GỌI HÀM removeFavorite DÙNG DELETE)
  const handleRemoveFavorite = async (e, hotel) => {
    e.stopPropagation(); // Ngăn chuyển trang khi bấm nút "Bỏ yêu thích"

    const targetHotelId = hotel.id || hotel.hotel_id;
    const favoriteRecordId = hotel.favorite_record_id || hotel.favorite_id;

    if (!targetHotelId) {
      showToast("Không tìm thấy ID khách sạn!", "error");
      return;
    }

    try {
      setDeletingId(targetHotelId);

      // 1. Gọi API removeFavorite (DELETE)
      await hotelService.removeFavorite(targetHotelId, favoriteRecordId);

      // 2. Kéo lại danh sách mới nhất từ Database
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
          {/* SIDEBAR */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border h-fit">
            <div className="flex flex-col items-center text-center pb-6 border-b">
              <img
                src={profileForm.avatar || "https://via.placeholder.com/150"}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover shadow"
              />
              <h2 className="font-bold text-slate-900 text-lg mt-3">
                {profileForm.full_name || "Người dùng"}
              </h2>
              <p className="text-xs text-slate-500">{profileForm.email}</p>
            </div>

            <nav className="mt-6 flex flex-col gap-2">
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
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 text-slate-500 text-sm outline-none"
                    />
                  </div>
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
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-indigo-500"
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

            {/* TAB YÊU THÍCH (BẤM VÀO CHUYỂN SANG TRANG CHI TIẾT) */}
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
                          onClick={() => navigate(`/hotel/${hotelId}`)} // CHUYỂN TỚI TRANG CHI TIẾT
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
