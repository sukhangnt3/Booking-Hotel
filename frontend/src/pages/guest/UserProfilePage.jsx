import React, { useState, useEffect } from "react";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import hotelService from "../../services/hotelService";
import { LoadingSpinner } from "../../components/common";

export default function UserProfilePage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

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

        if (bookingService.getMyBookings) {
          const myBookings = await bookingService.getMyBookings();
          setBookings(myBookings || []);
        }

        // TẢI DANH SÁCH YÊU THÍCH TỪ DATABASE (BẢNG 24)
        if (hotelService.getFavoriteHotels) {
          const myFavorites = await hotelService.getFavoriteHotels();
          setFavorites(myFavorites || []);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu tài khoản:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchUserData();
  }, []);

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

  // XÓA YÊU THÍCH TRỰC TIẾP KHỎI DATABASE
  const handleRemoveFavorite = async (hotelId) => {
    try {
      if (hotelService.toggleFavorite) {
        await hotelService.toggleFavorite(hotelId);
      }
      setFavorites((prev) =>
        prev.filter((item) => (item.id || item.hotel_id) !== hotelId),
      );
      showToast("Đã xóa khỏi danh sách yêu thích", "info");
    } catch (err) {
      showToast("Lỗi khi xóa khỏi danh sách yêu thích!", "error");
    }
  };

  if (loadingData) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8 font-sans">
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
                className={`px-4 py-3 rounded-xl text-sm font-medium text-left ${activeTab === "profile" ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-600"}`}
              >
                Thông tin cá nhân
              </button>
              <button
                onClick={() => setActiveTab("bookings")}
                className={`px-4 py-3 rounded-xl text-sm font-medium text-left ${activeTab === "bookings" ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-600"}`}
              >
                Đơn đặt của tôi ({bookings.length})
              </button>
              <button
                onClick={() => setActiveTab("favorites")}
                className={`px-4 py-3 rounded-xl text-sm font-medium text-left ${activeTab === "favorites" ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-600"}`}
              >
                Khách sạn yêu thích ({favorites.length})
              </button>
            </nav>
          </div>

          {/* CONTENT */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border">
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
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
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
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow"
                  >
                    {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB YÊU THÍCH TỪ DATABASE */}
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
                    {favorites.map((hotel) => (
                      <div
                        key={hotel.id || hotel.hotel_id}
                        className="border rounded-2xl overflow-hidden shadow-sm bg-white p-4 relative"
                      >
                        <img
                          src={
                            hotel.image ||
                            hotel.images?.[0]?.path ||
                            "https://via.placeholder.com/300"
                          }
                          alt={hotel.name || hotel.hotel_name}
                          className="w-full h-40 object-cover rounded-xl mb-3"
                        />
                        <h3 className="font-bold text-slate-900">
                          {hotel.name || hotel.hotel_name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {hotel.address || hotel.location}
                        </p>
                        <button
                          onClick={() =>
                            handleRemoveFavorite(hotel.id || hotel.hotel_id)
                          }
                          className="mt-3 text-rose-600 font-bold text-xs hover:underline"
                        >
                          Bỏ yêu thích
                        </button>
                      </div>
                    ))}
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
