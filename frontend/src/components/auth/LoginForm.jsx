import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";
import { Button, Input } from "../ui"; // 👈 Sử dụng bộ UI đã tạo
import { ArrowLeft } from "lucide-react";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("EMAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // 👈 Quản lý lỗi trực quan

  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  // --- ĐIỀU HƯỚNG THEO ROLE (Dùng navigate thay vì window.location) ---
  const redirectByUserRole = (user) => {
    const rawRole =
      user?.role ||
      user?.role_name ||
      (Array.isArray(user?.roles) ? user.roles[0] : "");
    const role = String(rawRole).toLowerCase();

    if (role.includes("admin")) {
      navigate("/admin/dashboard");
    } else if (role.includes("owner") || role.includes("hotel_owner")) {
      navigate("/owner/dashboard");
    } else {
      navigate("/");
    }
  };

  // --- ĐĂNG NHẬP GOOGLE ---
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        // 1. Lấy thông tin Google thật
        const googleUserRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );
        const googleUserInfo = await googleUserRes.json();

        // 2. Gọi API Backend
        const response = await authService.googleLogin(
          tokenResponse.access_token,
        );
        const user = response?.user || response?.data?.user || response?.data;
        const systemToken =
          response?.systemToken || response?.token || response?.data?.token;

        if (!user) throw new Error("Không thể xác thực tài khoản");

        const finalUser = {
          ...user,
          full_name: user.full_name || googleUserInfo.name,
          avatar: user.avatar || googleUserInfo.picture,
          picture: googleUserInfo.picture,
        };

        loginStore(finalUser, systemToken);

        // Cập nhật ảnh đại diện lên server nếu cần
        if (googleUserInfo.picture && authService.updateProfile) {
          authService
            .updateProfile({ avatar: googleUserInfo.picture })
            .catch(() => {});
        }

        redirectByUserRole(finalUser);
      } catch (err) {
        setError(err.message || "Đăng nhập Google thất bại");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Xác thực Google bị hủy bỏ"),
  });

  // --- ĐĂNG NHẬP EMAIL ---
  const handleEmailNext = (e) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setStep("PASSWORD");
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authService.login(email, password);
      const user = response?.user || response?.data?.user || response?.data;
      const systemToken =
        response?.systemToken || response?.token || response?.data?.token;

      if (!user) throw new Error("Sai tài khoản hoặc mật khẩu");

      loginStore(user, systemToken);
      redirectByUserRole(user);
    } catch (err) {
      setError(err.message || "Tài khoản hoặc mật khẩu không chính xác");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto py-12 px-4">
      {/* Nút quay lại khi ở bước nhập mật khẩu */}
      {step === "PASSWORD" && (
        <button
          onClick={() => setStep("EMAIL")}
          className="flex items-center gap-2 text-blue-600 mb-4 text-sm font-bold hover:bg-blue-50 w-fit p-2 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {step === "EMAIL" ? "Đăng nhập hoặc tạo tài khoản" : "Nhập mật khẩu"}
      </h1>
      <p className="text-sm text-gray-600 mb-8 leading-relaxed">
        Sử dụng tài khoản GoStay của bạn để trải nghiệm các dịch vụ tốt nhất.
      </p>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg font-medium animate-in fade-in slide-in-from-top-1">
          ⚠️ {error}
        </div>
      )}

      {step === "EMAIL" ? (
        <form onSubmit={handleEmailNext} className="space-y-6">
          <Input
            label="Địa chỉ email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập địa chỉ email của bạn"
            clearable
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            Tiếp tục với email
          </Button>
        </form>
      ) : (
        <form onSubmit={handleFinalSubmit} className="space-y-6">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">{email}</span>
            <button
              type="button"
              onClick={() => setStep("EMAIL")}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Sửa
            </button>
          </div>
          <Input
            label="Mật khẩu"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            Đăng nhập
          </Button>
        </form>
      )}

      {/* Đường phân cách */}
      <div className="relative my-10 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <span className="relative bg-white px-4 text-xs text-gray-400 font-medium uppercase tracking-widest">
          Hoặc
        </span>
      </div>

      {/* Nút Google */}
      <button
        type="button"
        onClick={() => handleGoogleLogin()}
        disabled={loading}
        className="w-full h-12 border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all gap-3 shadow-sm active:scale-[0.98] cursor-pointer group"
      >
        <svg
          className="w-5 h-5 transition-transform group-hover:scale-110"
          viewBox="0 0 24 24"
        >
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
        <span className="text-sm font-bold text-gray-700">
          Tiếp tục với Google
        </span>
      </button>

      <p className="mt-12 text-[11px] text-center text-gray-400 leading-relaxed">
        Bằng cách đăng nhập, bạn đồng ý với{" "}
        <span className="text-blue-600 underline cursor-pointer">
          Điều khoản
        </span>{" "}
        và{" "}
        <span className="text-blue-600 underline cursor-pointer">
          Chính sách bảo mật
        </span>{" "}
        của GoStay.
      </p>
    </div>
  );
};

export default LoginForm;
