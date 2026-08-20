import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Image as ImageIcon,
  Receipt,
  Heart,
  CheckCircle2,
  Building2,
  CalendarDays,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Clock,
  Filter,
} from "lucide-react";

// UI Kit & Common Components
import { Button, Input, Badge } from "@/components/ui";
import { LoadingSpinner, EmptyState, Breadcrumb } from "@/components/common";
import { PaymentStatusBadge } from "@/components/payment";

// Services & Stores
import { authService, bookingService, hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'bookings' | 'favorites'
  const [bookingFilter, setBookingFilter] = useState("all"); // 'all' | 'paid' | 'unpaid'
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    dob: "",
    avatar: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── 1. LOAD DỮ LIỆU BAN ĐẦU ───
  useEffect(() => {
    const initData = async () => {
      setLoadingData(true);
      try {
        if (user) {
          setProfileForm({
            full_name: user.full_name || user.name || "",
            email: user.email || "",
            phone: user.phone || user.phone_number || "",
            dob: user.dob ? user.dob.split("T")[0] : "",
            avatar:
              user.avatar ||
              user.picture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || "U")}&background=006ce4&color=fff`,
          });
        }

        // Gọi song song API lấy Đơn đặt phòng & Yêu thích
        const [bookingsRes, favoritesRes] = await Promise.all([
          bookingService.getHistory?.() || [],
          hotelService.getFavorites?.() || [],
        ]);

        setBookings(
          Array.isArray(bookingsRes)
            ? bookingsRes
            : bookingsRes?.data || bookingsRes?.bookings || [],
        );
        setFavorites(
          Array.isArray(favoritesRes) ? favoritesRes : favoritesRes?.data || [],
        );
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu trang cá nhân:", err);
      } finally {
        setLoadingData(false);
      }
    };

    initData();
  }, [user]);

  // ─── 2. CẬP NHẬT THÔNG TIN CÁ NHÂN ───
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updateData = {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone,
        dob: profileForm.dob || null,
        avatar: profileForm.avatar,
      };

      if (authService?.updateProfile) {
        await authService.updateProfile(updateData);
      }

      updateUser(updateData);
      showToast("Cập nhật thông tin cá nhân thành công!");
    } catch (error) {
      showToast("Cập nhật thất bại, vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 3. XÓA KHÁCH SẠN YÊU THÍCH ───
  const handleRemoveFavorite = async (e, hotelId) => {
    e.stopPropagation();
    try {
      await hotelService.removeFavorite(hotelId);
      setFavorites((prev) =>
        prev.filter((item) => (item.id || item.hotel_id) !== hotelId),
      );
      showToast("Đã xóa khỏi danh sách yêu thích!");
    } catch (err) {
      showToast("Không thể xóa lúc này.", "error");
    }
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN");
    } catch {
      return dateStr;
    }
  };

  // Lọc danh sách booking theo tab con
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === "paid")
      return b.payment_status === "paid" || b.status === "confirmed";
    if (bookingFilter === "unpaid")
      return b.payment_status === "unpaid" || b.payment_status === "pending";
    return true;
  });

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Tài khoản của tôi" },
  ];

  if (loadingData)
    return <LoadingSpinner fullPage label="Đang tải dữ liệu tài khoản..." />;

  return (
    <div className="min-h-screen bg-gray-50/60 text-gray-800 pb-20 font-sans">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 ${
            toast.type === "error"
              ? "bg-rose-600 shadow-rose-200"
              : "bg-emerald-600 shadow-emerald-200"
          }`}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Breadcrumb items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          {/* ─── CỘT TRÁI: SIDEBAR USER (4 COLS) ─── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 text-center space-y-4">
              {/* Avatar & Thông tin */}
              <div className="relative w-24 h-24 mx-auto">
                <img
                  src={profileForm.avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                />
                <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white">
                  <ShieldCheck size={14} />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="font-black text-gray-900 text-xl">
                  {profileForm.full_name || "Khách hàng GoStay"}
                </h2>
                <p className="text-xs text-gray-500 font-medium truncate">
                  {profileForm.email}
                </p>
                <Badge variant="primary" size="sm" className="mt-2">
                  Thành viên thân thiết
                </Badge>
              </div>

              {/* Menu Tabs */}
              <nav className="space-y-1.5 pt-4 border-t border-gray-100 text-left">
                {[
                  {
                    id: "profile",
                    label: "Thông tin cá nhân",
                    icon: <User size={18} />,
                  },
                  {
                    id: "bookings",
                    label: `Đơn đặt của tôi (${bookings.length})`,
                    icon: <Receipt size={18} />,
                  },
                  {
                    id: "favorites",
                    label: `Khách sạn yêu thích (${favorites.length})`,
                    icon: <Heart size={18} />,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-[#006ce4] text-white shadow-lg shadow-blue-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* ─── CỘT PHẢI: NỘI DUNG TỪNG TAB (8 COLS) ─── */}
          <div className="lg:col-span-8">
            {/* ─── TAB 1: THÔNG TIN CÁ NHÂN ─── */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6 animate-in fade-in">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-black text-gray-900">
                    Thông tin cá nhân
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Cập nhật hồ sơ để nhận được trải nghiệm đặt phòng tốt nhất
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      label="Họ và tên *"
                      required
                      placeholder="Nguyễn Văn A"
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          full_name: e.target.value,
                        })
                      }
                      leftIcon={<User size={18} className="text-gray-400" />}
                    />

                    <Input
                      label="Địa chỉ Email *"
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      leftIcon={<Mail size={18} className="text-gray-400" />}
                    />

                    <Input
                      label="Số điện thoại"
                      type="tel"
                      placeholder="0912 345 678"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value,
                        })
                      }
                      leftIcon={<Phone size={18} className="text-gray-400" />}
                    />

                    <Input
                      label="Ngày sinh"
                      type="date"
                      value={profileForm.dob}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, dob: e.target.value })
                      }
                      leftIcon={
                        <Calendar size={18} className="text-gray-400" />
                      }
                    />
                  </div>

                  <Input
                    label="Link ảnh đại diện (Avatar URL)"
                    placeholder="https://example.com/avatar.jpg"
                    value={profileForm.avatar}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, avatar: e.target.value })
                    }
                    leftIcon={<ImageIcon size={18} className="text-gray-400" />}
                  />

                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      className="px-8 h-12 text-sm font-black rounded-xl bg-[#006ce4] shadow-md shadow-blue-100"
                    >
                      Lưu thay đổi
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ─── TAB 2: ĐƠN ĐẶT CỦA TÔI (CÓ BỘ LỌC & NÚT THANH TOÁN TIẾP) ─── */}
            {activeTab === "bookings" && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-gray-100 gap-3">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">
                      Lịch sử đặt phòng
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Danh sách tất cả các chuyến đi bạn đã đặt trên GoStay
                    </p>
                  </div>

                  {/* Bộ lọc con */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl self-start">
                    <button
                      onClick={() => setBookingFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        bookingFilter === "all"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Tất cả ({bookings.length})
                    </button>
                    <button
                      onClick={() => setBookingFilter("paid")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        bookingFilter === "paid"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Đã thanh toán
                    </button>
                    <button
                      onClick={() => setBookingFilter("unpaid")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        bookingFilter === "unpaid"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Chưa thanh toán
                    </button>
                  </div>
                </div>

                {filteredBookings.length > 0 ? (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                      const isPaid =
                        booking.payment_status === "paid" ||
                        booking.status === "confirmed";

                      return (
                        <div
                          key={booking.id}
                          onClick={() =>
                            navigate(
                              `/booking/success?code=${booking.booking_code || booking.id}`,
                            )
                          }
                          className="border border-gray-200 rounded-2xl p-5 hover:border-[#006ce4] hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group bg-gray-50/30"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-gray-900 text-base group-hover:text-[#006ce4] transition-colors">
                                {booking.hotel_name ||
                                  booking.hotel?.name ||
                                  "Khách sạn nghỉ dưỡng"}
                              </h4>
                              <PaymentStatusBadge
                                status={booking.payment_status || "paid"}
                              />
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium flex-wrap">
                              <span className="flex items-center gap-1 font-mono font-bold text-gray-700">
                                Mã đơn: #{booking.booking_code || booking.id}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CalendarDays
                                  size={13}
                                  className="text-[#006ce4]"
                                />
                                {formatDate(booking.checkin_date)} —{" "}
                                {formatDate(booking.checkout_date)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right w-full md:w-auto flex md:flex-col justify-between items-center md:items-end pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 gap-2">
                            <p className="text-lg font-black text-rose-600">
                              {formatVND(
                                booking.total_price || booking.totalPrice,
                              )}
                            </p>

                            {/* Nút hành động */}
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/checkout?code=${booking.booking_code || booking.id}&amount=${booking.total_price || booking.totalPrice}`,
                                  );
                                }}
                                className="bg-[#006ce4] hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                              >
                                <CreditCard size={14} /> Thanh toán ngay
                              </button>
                            ) : (
                              <span className="text-xs text-blue-600 font-bold flex items-center gap-1 group-hover:underline">
                                Xem vé điện tử <ExternalLink size={12} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Receipt}
                    title="Không có đơn đặt phòng nào trong mục này"
                    description="Hãy khám phá hàng ngàn khách sạn ưu đãi và lên kế hoạch cho chuyến đi tiếp theo."
                    actionLabel="Tìm chỗ nghỉ ngay"
                    onAction={() => navigate("/")}
                  />
                )}
              </div>
            )}

            {/* ─── TAB 3: KHÁCH SẠN YÊU THÍCH ─── */}
            {activeTab === "favorites" && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6 animate-in fade-in">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-black text-gray-900">
                    Danh sách yêu thích
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Các chỗ nghỉ bạn đã lưu để đặt phòng sau
                  </p>
                </div>

                {favorites.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {favorites.map((hotel) => {
                      const hotelId = hotel.id || hotel.hotel_id;
                      return (
                        <div
                          key={hotelId}
                          onClick={() => navigate(`/hotel/${hotelId}`)}
                          className="border border-gray-200 rounded-2xl overflow-hidden hover:border-[#006ce4] hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                              <img
                                src={
                                  hotel.image ||
                                  hotel.images?.[0]?.path ||
                                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400"
                                }
                                alt={hotel.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                              <button
                                onClick={(e) =>
                                  handleRemoveFavorite(e, hotelId)
                                }
                                className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors shadow-md"
                                title="Xóa khỏi yêu thích"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="p-4 space-y-1">
                              <h3 className="font-extrabold text-gray-900 text-base group-hover:text-[#006ce4] transition-colors line-clamp-1">
                                {hotel.name}
                              </h3>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {hotel.address}, {hotel.city}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 pt-0 flex justify-between items-center border-t border-gray-50 mt-2">
                            <span className="text-xs text-blue-600 font-bold">
                              Xem phòng ngay
                            </span>
                            <span className="text-sm font-black text-rose-600">
                              {formatVND(
                                hotel.min_price || hotel.price || 1200000,
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Heart}
                    title="Chưa có chỗ nghỉ nào được lưu"
                    description="Nhấn vào biểu tượng trái tim ở bất kỳ khách sạn nào để lưu lại và xem lại tại đây."
                    actionLabel="Khám phá khách sạn"
                    onAction={() => navigate("/")}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
