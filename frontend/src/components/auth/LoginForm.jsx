import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("EMAIL"); // 'EMAIL' hoặc 'PASSWORD'
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  // --- XỬ LÝ ĐĂNG NHẬP GOOGLE ---
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // 1. Gửi token sang Backend qua authService
        const response = await authService.googleLogin(
          tokenResponse.access_token,
        );

        // 2. Nhận kết quả (apiClient đã trả về response.data nên ta lấy trực tiếp)
        const { user, systemToken } = response;

        // 3. Lưu vào Zustand Store
        loginStore(user, systemToken);

        alert(`Chào mừng ${user.name} quay trở lại!`);
        navigate("/");
      } catch (error) {
        console.error("Lỗi đăng nhập Google:", error);
        alert(error.message || "Xác thực với hệ thống thất bại");
      } finally {
        setLoading(false);
      }
    },
    onError: () => alert("Đăng nhập Google thất bại!"),
  });

  // --- XỬ LÝ ĐĂNG NHẬP EMAIL THỦ CÔNG ---
  const handleEmailNext = (e) => {
    e.preventDefault();
    if (!email) return;
    setStep("PASSWORD");
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      loginStore(response.user, response.systemToken);
      navigate("/");
    } catch (error) {
      alert(error.message || "Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto text-left py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        Đăng nhập hoặc tạo tài khoản
      </h1>
      <p className="text-xs text-gray-600 mb-6">
        Bạn có thể đăng nhập tài khoản Booking.com của mình để truy cập các dịch
        vụ của chúng tôi.
      </p>

      {step === "EMAIL" ? (
        /* --- BƯỚC 1: NHẬP EMAIL --- */
        <form onSubmit={handleEmailNext} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Địa chỉ email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập địa chỉ email của bạn"
              className="w-full px-3 py-2.5 border border-gray-400 rounded-md text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#006ce4] hover:bg-[#0057b8] text-white font-semibold py-3 rounded-md text-sm transition"
          >
            Tiếp tục với email
          </button>
        </form>
      ) : (
        /* --- BƯỚC 2: NHẬP MẬT KHẨU --- */
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Địa chỉ email
            </label>
            <div className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded-md border border-gray-300">
              <span className="text-sm text-gray-700">{email}</span>
              <button
                type="button"
                onClick={() => setStep("EMAIL")}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Thay đổi
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn"
              className="w-full px-3 py-2.5 border border-gray-400 rounded-md text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006ce4] hover:bg-[#0057b8] text-white font-semibold py-3 rounded-md text-sm transition disabled:bg-gray-400"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      )}

      {/* --- ĐƯỜNG PHÂN CÁCH --- */}
      <div className="relative my-8 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <span className="relative bg-white px-3 text-xs text-gray-500 italic">
          hoặc sử dụng một trong các lựa chọn này
        </span>
      </div>

      {/* --- NÚT ĐĂNG NHẬP GOOGLE THẬT --- */}
      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={() => handleGoogleLogin()}
          disabled={loading}
          className="w-full h-12 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 transition gap-3 shadow-sm active:scale-[0.98]"
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
          <span className="text-sm font-semibold text-gray-700">
            Tiếp tục với Google
          </span>
        </button>
      </div>

      <div className="text-center">
        <a
          href="#"
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          Bạn mất quyền truy cập vào email? Khôi phục tài khoản của bạn
        </a>
      </div>

      <p className="mt-10 text-[11px] text-center text-gray-500 leading-relaxed">
        Bằng cách đăng nhập hoặc tạo tài khoản, bạn đồng ý với các{" "}
        <span className="text-blue-600 cursor-pointer">
          Điều khoản và Điều kiện
        </span>{" "}
        cũng như{" "}
        <span className="text-blue-600 cursor-pointer">
          Chính sách An toàn và Bảo mật
        </span>{" "}
        của chúng tôi.
      </p>
    </div>
  );
};

export default LoginForm;
