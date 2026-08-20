import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";
import { Button, Input, Badge } from "../ui"; // Sử dụng UI Kit
import { Building2, ArrowLeft, ShieldCheck } from "lucide-react";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(""); // Xóa lỗi khi người dùng nhập lại
  };

  // --- ĐIỀU HƯỚNG VÀO DASHBOARD OWNER ---
  const redirectOwner = () => {
    navigate("/owner/dashboard"); // Đồng bộ với route trong Layout
  };

  // --- ĐĂNG KÝ GOOGLE CHO OWNER ---
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        // Lấy thông tin Google
        const googleUserRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );
        const googleUserInfo = await googleUserRes.json();

        // Đăng nhập Google với role owner
        const response = await authService.googleLogin(
          tokenResponse.access_token,
          { role: "owner" },
        );
        const user = response?.user || response?.data?.user || response?.data;
        const systemToken =
          response?.systemToken || response?.token || response?.data?.token;

        if (!user)
          throw new Error("Xác thực thành công nhưng không tạo được tài khoản");

        const finalUser = {
          ...user,
          role: "owner",
          full_name: user.full_name || googleUserInfo.name,
          avatar: user.avatar || googleUserInfo.picture,
        };

        loginStore(finalUser, systemToken);

        // Cập nhật role owner lên DB nếu cần
        if (authService.updateProfile) {
          authService
            .updateProfile({ avatar: googleUserInfo.picture, role: "owner" })
            .catch(() => {});
        }

        redirectOwner();
      } catch (err) {
        setError(err.message || "Đăng ký với Google thất bại");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Xác thực Google bị hủy bỏ"),
  });

  // --- ĐĂNG KÝ EMAIL THỦ CÔNG ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp!");
      return;
    }
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: "owner",
      };

      const response = await authService.register(payload);
      const user = response?.user || response?.data?.user || response?.data;
      const systemToken =
        response?.systemToken || response?.token || response?.data?.token;

      loginStore({ ...user, role: "owner" }, systemToken);
      redirectOwner();
    } catch (err) {
      setError(err.message || "Email đã tồn tại hoặc thông tin không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-10 px-6 font-sans">
      {/* HEADER */}
      <div className="mb-8 flex flex-col items-center text-center">
        <Badge variant="primary" className="mb-3 px-4 py-1" showDot>
          Kênh Đối Tác GoStay
        </Badge>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Đăng ký Chủ chỗ nghỉ
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          Tham gia cùng 1.000+ đối tác để bắt đầu kinh doanh chỗ nghỉ trên toàn
          cầu.
        </p>
      </div>

      {/* ERROR BOX */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium animate-in fade-in">
          {error}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
      >
        <Input
          label="Họ và tên người đại diện *"
          name="fullName"
          required
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Ví dụ: Nguyễn Văn A"
          leftIcon={<Building2 size={18} />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email kinh doanh *"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="hotel@domain.com"
          />
          <Input
            label="Số điện thoại *"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            placeholder="0905 xxx xxx"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Mật khẩu *"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
          <Input
            label="Xác nhận mật khẩu *"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-bold shadow-blue-200 shadow-lg"
          isLoading={loading}
        >
          🚀 Đăng Ký Làm Đối Tác
        </Button>

        {/* GOOGLE REGISTER */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <span className="relative bg-white px-4 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
            Hoặc đăng ký nhanh
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleGoogleRegister()}
          disabled={loading}
          className="w-full h-12 border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all gap-3 active:scale-[0.98] group"
        >
          <svg
            className="w-5 h-5 group-hover:scale-110 transition-transform"
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
      </form>

      {/* FOOTER */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Bạn đã là đối tác của GoStay?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-blue-600 font-bold hover:underline"
        >
          Đăng nhập ngay
        </button>
      </div>

      <div className="mt-10 flex items-center justify-center gap-2 text-gray-400">
        <ShieldCheck size={16} />
        <span className="text-[11px] font-medium italic">
          Hệ thống bảo mật dữ liệu doanh nghiệp tiêu chuẩn quốc tế
        </span>
      </div>
    </div>
  );
};

export default RegisterForm;
