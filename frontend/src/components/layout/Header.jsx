import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui";
import { useAuthStore } from "@/stores/authStore";

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Trạng thái đóng/mở menu hồ sơ
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- KIỂM TRA TÀI KHOẢN CÓ PHẢI LÀ ADMIN HAY KHÔNG ---
  const rawRole =
    user?.role ||
    user?.role_name ||
    (Array.isArray(user?.roles) ? user.roles[0] : "");
  const role = String(rawRole).toLowerCase();
  const isAdmin =
    role === "admin" || role === "role_admin" || user?.role_id === 1;

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="bg-[#003580] text-white px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="text-2xl font-bold cursor-pointer"
        >
          Booking.com
        </div>

        {/* Khu vực thao tác góc phải */}
        <div className="flex items-center gap-4">
          <Button
            variant="text"
            className="text-white hover:bg-blue-700 hidden sm:block font-semibold"
          >
            VND
          </Button>
          <Button
            variant="text"
            className="text-white hover:bg-blue-700 hidden sm:flex items-center"
          >
            <span className="fi fi-vn" />
          </Button>

          <Button
            variant="text"
            className="text-white hover:bg-blue-700 hidden lg:block text-sm"
          >
            Đăng chỗ nghỉ của Quý vị
          </Button>

          {isAuthenticated ? (
            /* --- GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP --- */
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 p-1 hover:bg-blue-700 rounded-md transition border border-transparent hover:border-white/30"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold leading-none">{user?.name}</p>
                  <p className="text-[11px] text-yellow-400 font-medium mt-1">
                    {isAdmin
                      ? "⚡ Quản trị viên (Admin)"
                      : "Khách hàng thân thiết"}
                  </p>
                </div>
                <img
                  src={
                    user?.picture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.name || user?.email || "User",
                    )}`
                  }
                  alt="Ảnh đại diện"
                  className="w-9 h-9 rounded-full border-2 border-white object-cover"
                />
              </button>

              {/* --- MENU THẢ XUỐNG (TIẾNG VIỆT 100%) --- */}
              {isMenuOpen && (
                <>
                  {/* Click ra ngoài để đóng menu */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-2xl z-50 py-2 border border-gray-200 text-gray-800">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">
                        Tài khoản
                      </p>
                      <p className="text-sm font-semibold truncate mt-1">
                        {user?.email}
                      </p>
                    </div>

                    {/* MỤC TRANG QUẢN TRỊ ADMIN (HIỂN THỊ NẾU LÀ ADMIN) */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/admin/dashboard");
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 flex items-center gap-3 transition"
                      >
                        <span className="w-5 text-center">⚡</span> Trang quản
                        trị Admin
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/UserProfilePage");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 flex items-center gap-3"
                    >
                      <span className="w-5 text-center text-gray-400">👤</span>{" "}
                      <span>Quản lý tài khoản</span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-3"
                    >
                      <span className="w-5 text-center">🚪</span> Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* --- GIAO DIỆN KHI CHƯA ĐĂNG NHẬP (BỎ NÚT ĐĂNG KÝ) --- */
            <Button
              variant="outline"
              className="bg-white text-blue-700 border-none hover:bg-gray-100 font-bold px-5"
              onClick={() => navigate("/login")}
            >
              Đăng nhập
            </Button>
          )}
        </div>
      </div>

      {/* Banner tìm kiếm */}
      <div className="relative w-full bg-[#003580] text-white"></div>
    </header>
  );
};

export default Header;
