import React, { useState, useMemo } from 'react';

// --- HELPER FORMATTERS ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

// --- SVG ICONS ---
const UserIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CalendarIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const HeartIcon = ({ className = "w-5 h-5", filled = false }) => (
  <svg className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-4.5-4.5M12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const LockIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const StarIcon = ({ className = "w-5 h-5", filled = true }) => (
  <svg className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const MapPinIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CameraIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// --- MOCK DATA ---
const INITIAL_USER = {
  id: 'usr_101',
  full_name: 'Nguyễn Văn An',
  email: 'nguyenvanan@gmail.com',
  phone: '0987654321',
  gender: 'male',
  dob: '1995-08-15',
  address: 'Quận 1, Thành phố Hồ Chí Minh',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
  is_verified: true,
};

const INITIAL_BOOKINGS = [
  {
    id: 'bk_8801',
    booking_code: 'HTL-2026-8801',
    hotel_id: 'htl_01',
    hotel_name: 'Vinpearl Luxury Landmark 81',
    hotel_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600',
    address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    room_type: 'Premier Ocean View King Room',
    check_in: '2026-08-10',
    check_out: '2026-08-12',
    nights: 2,
    total_price: 6850000,
    status: 'confirmed', // confirmed, pending, completed, cancelled
    can_cancel: true,
  },
  {
    id: 'bk_8802',
    booking_code: 'HTL-2026-8802',
    hotel_id: 'htl_02',
    hotel_name: 'JW Marriott Hotel Hanoi',
    hotel_image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600',
    address: '08 Đỗ Đức Dục, Nam Từ Liêm, Hà Nội',
    room_type: 'Deluxe City View Room',
    check_in: '2026-06-20',
    check_out: '2026-06-22',
    nights: 2,
    total_price: 5200000,
    status: 'completed',
    is_reviewed: false,
    can_cancel: false,
  },
  {
    id: 'bk_8803',
    booking_code: 'HTL-2026-8803',
    hotel_id: 'htl_03',
    hotel_name: 'Furama Resort Đà Nẵng',
    hotel_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=600',
    address: '105 Võ Nguyên Giáp, Khuê Mỹ, Ngũ Hành Sơn, Đà Nẵng',
    room_type: 'Garden View Villa 2-Bedrooms',
    check_in: '2026-08-15',
    check_out: '2026-08-18',
    nights: 3,
    total_price: 12400000,
    status: 'pending',
    can_cancel: true,
  },
  {
    id: 'bk_8804',
    booking_code: 'HTL-2026-8804',
    hotel_id: 'htl_04',
    hotel_name: 'InterContinental Phu Quoc Long Beach Resort',
    hotel_image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=600',
    address: 'Bãi Trường, Dương Tơ, Phú Quốc, Kiên Giang',
    room_type: 'Classic Ocean View Suite',
    check_in: '2026-04-10',
    check_out: '2026-04-12',
    nights: 2,
    total_price: 8900000,
    status: 'cancelled',
    can_cancel: false,
  }
];

const INITIAL_FAVORITES = [
  {
    id: 'htl_01',
    name: 'Vinpearl Luxury Landmark 81',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600',
    location: 'Bình Thạnh, TP. Hồ Chí Minh',
    rating: 4.9,
    reviews_count: 320,
    price_per_night: 3425000,
  },
  {
    id: 'htl_05',
    name: 'Hôtel des Arts Saigon - MGallery',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=600',
    location: 'Quận 3, TP. Hồ Chí Minh',
    rating: 4.8,
    reviews_count: 215,
    price_per_night: 2850000,
  },
  {
    id: 'htl_06',
    name: 'Pao\'s Sapa Leisure Hotel',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600',
    location: 'Sapa, Lào Cai',
    rating: 4.7,
    reviews_count: 184,
    price_per_night: 1950000,
  },
];

export default function UserProfilePage() {
  // --- STATES ---
  const [user, setUser] = useState(INITIAL_USER);
  const [activeTab, setActiveTab] = useState('profile'); // profile, bookings, favorites, security
  const [bookingFilter, setBookingFilter] = useState('all'); // all, pending, confirmed, completed, cancelled
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [favorites, setFavorites] = useState(INITIAL_FAVORITES);

  // Forms
  const [profileForm, setProfileForm] = useState({ ...user });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Modals & Feedback
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- HANDLERS ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setUser({ ...profileForm });
      setIsLoading(false);
      showToast('Cập nhật thông tin cá nhân thành công!');
    }, 600);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileForm((prev) => ({ ...prev, avatar: imageUrl }));
      showToast('Đã tải ảnh đại diện mới!');
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Mật khẩu mới không trùng khớp!', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Đổi mật khẩu thành công!');
    }, 600);
  };

  const handleRemoveFavorite = (hotelId) => {
    setFavorites((prev) => prev.filter((item) => item.id !== hotelId));
    showToast('Đã xóa khỏi danh sách yêu thích', 'info');
  };

  const handleCancelBooking = (bookingId) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đơn đặt phòng này?')) {
      setBookings((prev) =>
        prev.map((bk) =>
          bk.id === bookingId ? { ...bk, status: 'cancelled', can_cancel: false } : bk
        )
      );
      showToast('Đã hủy đơn đặt phòng thành công!', 'info');
    }
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewData.comment.trim()) {
      showToast('Vui lòng điền nội dung đánh giá', 'error');
      return;
    }

    setBookings((prev) =>
      prev.map((bk) =>
        bk.id === reviewModalBooking.id ? { ...bk, is_reviewed: true } : bk
      )
    );
    showToast('Cảm ơn bạn đã gửi đánh giá!');
    setReviewModalBooking(null);
    setReviewData({ rating: 5, comment: '' });
  };

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    if (bookingFilter === 'all') return bookings;
    return bookings.filter((b) => b.status === bookingFilter);
  }, [bookings, bookingFilter]);

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const config = {
      confirmed: { label: 'Sắp đi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      pending: { label: 'Chờ thanh toán', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      completed: { label: 'Đã hoàn thành', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      cancelled: { label: 'Đã hủy', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    };
    const item = config[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${item.color}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white font-medium transition-all transform animate-bounce ${
          toast.type === 'error' ? 'bg-rose-600' : toast.type === 'info' ? 'bg-slate-700' : 'bg-emerald-600'
        }`}>
          <CheckCircleIcon className="w-5 h-5 text-white" />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Quản lý tài khoản</h1>
          <p className="text-sm text-slate-500 mt-1">Cập nhật thông tin cá nhân và quản lý các chuyến đi của bạn</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ================= SIDEBAR NAVIGATION ================= */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-fit">
            <div>
              {/* User Avatar Summary */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                <div className="relative group mb-3">
                  <img
                    src={profileForm.avatar}
                    alt={user.full_name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-50 shadow-md"
                  />
                  <label className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full cursor-pointer shadow transition-transform hover:scale-110">
                    <CameraIcon className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
                <h2 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                  {user.full_name}
                  {user.is_verified && (
                    <span title="Tài khoản đã xác thực">
                      <ShieldCheckIcon className="w-4 h-4 text-indigo-600 inline-block" />
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
              </div>

              {/* Navigation Links */}
              <nav className="mt-6 flex flex-col gap-1.5">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'profile'
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Thông tin cá nhân</span>
                </button>

                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all justify-between ${
                    activeTab === 'bookings'
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5" />
                    <span>Đơn đặt của tôi</span>
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                    {bookings.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all justify-between ${
                    activeTab === 'favorites'
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HeartIcon className="w-5 h-5" />
                    <span>Khách sạn yêu thích</span>
                  </div>
                  {favorites.length > 0 && (
                    <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                      {favorites.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'security'
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <LockIcon className="w-5 h-5" />
                  <span>Bảo mật & Mật khẩu</span>
                </button>
              </nav>
            </div>
          </div>

          {/* ================= MAIN CONTENT AREA ================= */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
            {/* ---------------- TAB 1: THÔNG TIN CÁ NHÂN ---------------- */}
            {activeTab === 'profile' && (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Thông tin cá nhân</h2>
                  <p className="text-xs text-slate-500 mt-1">Cập nhật chi tiết hồ sơ cá nhân của bạn để nhận dịch vụ tốt nhất</p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Họ và tên</label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Email</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm outline-none cursor-not-allowed"
                        />
                        <span className="absolute right-3 top-2.5 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                          Đã xác thực
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Số điện thoại</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Ngày sinh</label>
                      <input
                        type="date"
                        value={profileForm.dob}
                        onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Giới tính</label>
                      <select
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                      >
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Địa chỉ</label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 hover:shadow-lg transition disabled:opacity-50"
                    >
                      {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------- TAB 2: ĐƠN ĐẶT PHÒNG CỦA TÔI ---------------- */}
            {activeTab === 'bookings' && (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Lịch sử đặt phòng</h2>
                    <p className="text-xs text-slate-500 mt-1">Danh sách các phòng khách sạn bạn đã đặt</p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'confirmed', label: 'Sắp đi' },
                      { id: 'pending', label: 'Chờ thanh toán' },
                      { id: 'completed', label: 'Hoàn thành' },
                      { id: 'cancelled', label: 'Đã hủy' },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setBookingFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          bookingFilter === filter.id ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Booking List */}
                <div className="space-y-4">
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CalendarIcon className="w-8 h-8" />
                      </div>
                      <p className="text-slate-600 font-medium text-sm">Không tìm thấy đơn đặt phòng nào</p>
                    </div>
                  ) : (
                    filteredBookings.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-slate-300 transition bg-white flex flex-col md:flex-row gap-5"
                      >
                        {/* Hotel Thumbnail */}
                        <div className="w-full md:w-48 h-36 rounded-xl overflow-hidden shrink-0 relative">
                          <img src={item.hotel_image} alt={item.hotel_name} className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 md:hidden">
                            {renderStatusBadge(item.status)}
                          </div>
                        </div>

                        {/* Booking Details */}
                        <div className="flex-grow flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <div>
                                <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">{item.booking_code}</span>
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug">{item.hotel_name}</h3>
                              </div>
                              <div className="hidden md:block">
                                {renderStatusBadge(item.status)}
                              </div>
                            </div>

                            <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                              <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{item.address}</span>
                            </p>

                            <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs mb-3">
                              <div>
                                <span className="text-slate-400 block mb-0.5">Loại phòng</span>
                                <span className="font-semibold text-slate-700">{item.room_type}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-0.5">Thời gian ở ({item.nights} đêm)</span>
                                <span className="font-semibold text-slate-700">{formatDate(item.check_in)} - {formatDate(item.check_out)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Price & Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            <div>
                              <span className="text-xs text-slate-400 block">Tổng tiền</span>
                              <span className="text-base font-bold text-indigo-600">{formatCurrency(item.total_price)}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.status === 'pending' && (
                                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
                                  Thanh toán ngay
                                </button>
                              )}

                              {item.status === 'completed' && !item.is_reviewed && (
                                <button
                                  onClick={() => setReviewModalBooking(item)}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1"
                                >
                                  <StarIcon className="w-4 h-4" />
                                  <span>Viết đánh giá</span>
                                </button>
                              )}

                              {item.can_cancel && (
                                <button
                                  onClick={() => handleCancelBooking(item.id)}
                                  className="px-4 py-2 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 rounded-xl text-xs font-medium transition"
                                >
                                  Hủy đơn
                                </button>
                              )}

                              <button className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition">
                                Chi tiết
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ---------------- TAB 3: KHÁCH SẠN YÊU THÍCH ---------------- */}
            {activeTab === 'favorites' && (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Khách sạn yêu thích</h2>
                  <p className="text-xs text-slate-500 mt-1">Danh sách các địa điểm nghỉ dưỡng bạn đã lưu lại</p>
                </div>

                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <HeartIcon className="w-8 h-8" />
                    </div>
                    <p className="text-slate-600 font-medium text-sm">Bạn chưa lưu khách sạn yêu thích nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {favorites.map((hotel) => (
                      <div
                        key={hotel.id}
                        className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition bg-white flex flex-col justify-between"
                      >
                        <div className="relative h-44">
                          <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleRemoveFavorite(hotel.id)}
                            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-rose-500 rounded-full shadow transition"
                            title="Bỏ yêu thích"
                          >
                            <HeartIcon className="w-4 h-4" filled={true} />
                          </button>
                        </div>

                        <div className="p-4 flex-grow flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mb-1">
                              <StarIcon className="w-4 h-4" />
                              <span>{hotel.rating}</span>
                              <span className="text-slate-400 font-normal">({hotel.reviews_count} đánh giá)</span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base line-clamp-1">{hotel.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 mb-3">
                              <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span>{hotel.location}</span>
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-400 block">Giá từ</span>
                              <span className="font-bold text-indigo-600 text-sm">
                                {formatCurrency(hotel.price_per_night)} <span className="text-slate-400 text-xs font-normal">/đêm</span>
                              </span>
                            </div>
                            <button className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-semibold text-xs rounded-xl transition">
                              Đặt phòng
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---------------- TAB 4: BẢO MẬT & MẬT KHẨU ---------------- */}
            {activeTab === 'security' && (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Bảo mật & Mật khẩu</h2>
                  <p className="text-xs text-slate-500 mt-1">Quản lý mật khẩu và quyền bảo mật tài khoản của bạn</p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 hover:shadow-lg transition disabled:opacity-50"
                    >
                      {isLoading ? 'Đang lưu...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </form>

                <div className="mt-10 pt-6 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm mb-2">Phiên đăng nhập hiện tại</h3>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                        PC
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Chrome trên Windows - TP. Hồ Chí Minh</p>
                        <p className="text-[11px] text-slate-400">Đang hoạt động</p>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL VIẾT ĐÁNH GIÁ ================= */}
      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setReviewModalBooking(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Đánh giá khách sạn</h3>
            <p className="text-xs text-slate-500 mb-4">{reviewModalBooking.hotel_name}</p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Số sao đánh giá</label>
                <div className="flex gap-2 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="p-1 hover:scale-110 transition"
                    >
                      <StarIcon className="w-7 h-7" filled={star <= reviewData.rating} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Trải nghiệm của bạn</label>
                <textarea
                  rows={4}
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="Chia sẻ cảm nhận về phòng nghỉ, thái độ phục vụ, dịch vụ đi kèm..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalBooking(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
                >
                  Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}