import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- CHUYỂN HƯỚNG TRỰC TIẾP VÀO KÊNH QUẢN LÝ CHO OWNER ---
  const redirectOwner = () => {
    window.location.href = "/owner/DashboardPage";
  };

  // --- ĐĂNG KÝ / ĐĂNG NHẬP GOOGLE DÀNH CHO OWNER ---
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        let googlePicture = null;
        let googleName = null;
        try {
          const googleUserRes = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            }
          );
          const googleUserInfo = await googleUserRes.json();
          googlePicture = googleUserInfo.picture;
          googleName = googleUserInfo.name;
        } catch (err) {
          console.warn("Lỗi lấy Google UserInfo:", err);
        }

        // Gọi API đăng nhập Google và gán Role OWNER
        const response = await authService.googleLogin(
          tokenResponse.access_token,
          { role: "owner" }
        );

        const user = response?.user || response?.data?.user || response?.data;
        const systemToken =
          response?.systemToken || response?.token || response?.data?.token;

        if (!user) {
          alert("Xác thực Google thành công nhưng không lấy được thông tin User!");
          return;
        }

        const finalUser = {
          ...user,
          role: user.role || "owner",
          full_name: user.full_name || user.name || googleName,
          avatar: user.avatar || googlePicture,
          picture: googlePicture || user.picture,
        };

        // Lưu vào Zustand Store
        loginStore(finalUser, systemToken);

        // Cập nhật ảnh đại diện & quyền Owner lên Database
        if (authService.updateProfile) {
          try {
            await authService.updateProfile({
              avatar: googlePicture,
              role: "owner",
            });
          } catch (e) {}
        }

        alert(`Chào mừng đối tác ${finalUser.full_name || finalUser.email}!`);
        redirectOwner();
      } catch (error) {
        console.error("Lỗi đăng ký Google Owner:", error);
        alert(error.message || "Xác thực với hệ thống thất bại");
      } finally {
        setLoading(false);
      }
    },
    onError: () => alert("Đăng ký Google thất bại!"),
  });

  // --- XỬ LÝ ĐĂNG KÝ EMAIL THỦ CÔNG KHÁCH SẠN / OWNER ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Mật khẩu xác nhận không trùng khớp!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: "owner", // Thiết lập quyền Chủ chỗ nghỉ mặc định
      };

      const response = authService.register
        ? await authService.register(payload)
        : await authService.login(formData.email, formData.password);

      const user = response?.user || response?.data?.user || response?.data || {
        email: formData.email,
        name: formData.fullName,
        role: "owner",
      };
      const systemToken =
        response?.systemToken || response?.token || response?.data?.token;

      loginStore({ ...user, role: "owner" }, systemToken);

      alert("Đăng ký tài khoản Đối tác chỗ nghỉ thành công!");
      redirectOwner();
    } catch (error) {
      console.error("Lỗi đăng ký tài khoản Owner:", error);
      alert(error.message || "Đăng ký thất bại. Email có thể đã tồn tại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto text-left py-8 px-4 font-sans">
      {/* HEADER ĐĂNG KÝ OWNER */}
      <div className="mb-6">
        <span className="bg-blue-100 text-[#003580] text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
          🏢 Kênh Đối Tác GoStay
        </span>
        <h1 className="text-2xl font-black text-gray-900 mt-2">
          Đăng ký tài khoản Chủ chỗ nghỉ
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          Tạo tài khoản đối tác để bắt đầu đăng bán và quản lý phòng trên GoStay.
        </p>
      </div>

      {/* FORM ĐĂNG KÝ THÔNG TIN */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1">
            Họ và tên người đại diện *
          </label>
          <input
            type="text"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Ví dụ: Nguyễn Văn A"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1">
            Địa chỉ Email kinh doanh *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="hotel-contact@domain.com"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1">
            Số điện thoại liên hệ *
          </label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            placeholder="0905 xxx xxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Mật khẩu *
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Xác nhận mật khẩu *
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#003580] hover:bg-blue-900 text-white font-bold py-3 rounded-lg text-sm transition disabled:bg-gray-400 cursor-pointer shadow-md mt-2"
        >
          {loading ? "Đang tạo tài khoản đối tác..." : "🚀 Đăng Ký Làm Chủ Chỗ Nghỉ"}
        </button>
      </form>

      {/* ĐƯỜNG PHÂN CÁCH */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <span className="relative bg-white px-3 text-xs text-gray-500 italic">
          hoặc đăng ký nhanh bằng
        </span>
      </div>

      {/* NÚT GOOGLE */}
      <button
        type="button"
        onClick={() => handleGoogleRegister()}
        disabled={loading}
        className="w-full h-11 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition gap-3 shadow-sm active:scale-[0.98] cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="text-xs font-bold text-gray-700">
          Đăng ký đối tác với Google
        </span>
      </button>

      {/* CHUYỂN TRANG ĐĂNG NHẬP */}
      <div className="mt-6 text-center text-xs text-gray-600">
        Bạn đã có tài khoản chỗ nghỉ?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-blue-700 font-bold hover:underline"
        >
          Đăng nhập tại đây
        </button>
      </div>
    </div>
  );
};

export default RegisterForm;