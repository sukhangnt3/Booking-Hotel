// src/components/auth/LoginForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";
import { Button, Input } from "../ui";
import { ArrowLeft } from "lucide-react";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("EMAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  // ─── 🎯 ĐIỀU HƯỚNG CHÍNH XÁC THEO ROLE ───
  const redirectByUserRole = (user) => {
    const rawRole =
      user?.role ||
      user?.role_name ||
      (Array.isArray(user?.roles) ? user.roles[0] : "");
    const role = String(rawRole).toLowerCase();

    // 1. Kiểm tra Lễ tân: vào thẳng Kênh sơ đồ phòng
    let staffEmails = [];
    try {
      staffEmails = JSON.parse(
        localStorage.getItem("staff_emails") || "[]",
      ).map((e) => String(e).toLowerCase().trim());
    } catch {}

    const isStaff =
      role === "staff" ||
      role === "receptionist" ||
      (user?.email && staffEmails.includes(user.email.toLowerCase().trim()));

    if (isStaff) {
      navigate("/owner/bookings");
      return;
    }

    // 2. Admin
    if (role.includes("admin")) {
      navigate("/admin/dashboard");
      return;
    }

    // 3. Chủ nhà (Owner)
    if (role.includes("owner") || role.includes("hotel_owner")) {
      navigate("/owner/dashboard");
      return;
    }

    // 4. Khách hàng thông thường
    navigate("/");
  };

  // ─── 🌐 ĐĂNG NHẬP GOOGLE ───
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const googleUserRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );
        const googleUserInfo = await googleUserRes.json();

        // Lấy thông tin user từ Backend
        const response = await authService.googleLogin(
          tokenResponse.access_token,
        );
        const user = response?.user || response?.data?.user || response?.data;
        const systemToken =
          response?.systemToken || response?.token || response?.data?.token;

        if (!user) throw new Error("Không thể xác thực tài khoản");

        // Ép link ảnh từ Google vào avatar
        const finalUser = {
          ...user,
          full_name: user.full_name || googleUserInfo.name,
          avatar: user.avatar || googleUserInfo.picture,
        };

        if (loginStore) loginStore(finalUser, systemToken);
        redirectByUserRole(finalUser);
      } catch (err) {
        setError(err.message || "Đăng nhập Google thất bại");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Xác thực Google bị hủy bỏ"),
  });

  // ─── 🔑 XÁC THỰC EMAIL Ở BƯỚC 1 ───
  const handleEmailNext = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Định dạng email không hợp lệ. Vui lòng kiểm tra lại!");
      return;
    }

    setError("");
    setStep("PASSWORD");
  };

  // ─── 🔑 ĐĂNG NHẬP MẬT KHẨU Ở BƯỚC 2 ───
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cleanEmail = email.toLowerCase().trim();

    try {
      // 1. Kiểm tra tài khoản lễ tân cấp tại quầy PMS
      let pmsUsers = [],
        regUsers = [],
        staffEmails = [];
      try {
        pmsUsers = JSON.parse(localStorage.getItem("pms_users_master") || "[]");
        regUsers = JSON.parse(localStorage.getItem("registered_users") || "[]");
        staffEmails = JSON.parse(
          localStorage.getItem("staff_emails") || "[]",
        ).map((e) => String(e).toLowerCase().trim());
      } catch {}

      const allUsers = [...pmsUsers, ...regUsers];
      const matchedStaff = allUsers.find(
        (u) => u.email?.toLowerCase().trim() === cleanEmail,
      );
      const isStaffAccount =
        matchedStaff?.role === "receptionist" ||
        matchedStaff?.role === "staff" ||
        staffEmails.includes(cleanEmail);

      if (matchedStaff && isStaffAccount) {
        if (matchedStaff.active === false) {
          throw new Error(
            "Tài khoản lễ tân đã bị Chủ khách sạn tạm khóa quyền truy cập!",
          );
        }
        if (matchedStaff.password && matchedStaff.password !== password) {
          throw new Error("Mật khẩu tài khoản lễ tân không chính xác!");
        }

        const nowTime = `${new Date().toLocaleTimeString("vi-VN")} ${new Date().toLocaleDateString("vi-VN")}`;
        const staffUserObj = {
          ...matchedStaff,
          role: "receptionist",
          role_name: "receptionist",
          last_login: nowTime,
        };
        const staffToken = `receptionist-session-token-${Date.now()}`;

        if (loginStore) loginStore(staffUserObj, staffToken);
        localStorage.setItem("user", JSON.stringify(staffUserObj));
        localStorage.setItem("token", staffToken);

        const updatedPms = pmsUsers.map((u) =>
          u.email?.toLowerCase().trim() === cleanEmail
            ? { ...u, last_login: nowTime }
            : u,
        );
        localStorage.setItem("pms_users_master", JSON.stringify(updatedPms));

        redirectByUserRole(staffUserObj);
        return;
      }

      // 2. Đăng nhập qua API Backend
      let user = null;
      let systemToken = null;

      try {
        const response = await authService.login(cleanEmail, password);
        user = response?.user || response?.data?.user || response?.data;
        systemToken =
          response?.systemToken || response?.token || response?.data?.token;
      } catch (apiErr) {
        const localMatched = allUsers.find(
          (u) => u.email?.toLowerCase().trim() === cleanEmail,
        );
        if (localMatched) {
          if (localMatched.password && localMatched.password !== password) {
            throw new Error("Mật khẩu không chính xác!");
          }
          user = localMatched;
          systemToken = `local-session-token-${Date.now()}`;
        } else {
          throw new Error(
            apiErr.message || "Tài khoản hoặc mật khẩu không chính xác",
          );
        }
      }

      if (!user) throw new Error("Tài khoản hoặc mật khẩu không chính xác");

      if (loginStore) loginStore(user, systemToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", systemToken);

      redirectByUserRole(user);
    } catch (err) {
      setError(err.message || "Tài khoản hoặc mật khẩu không chính xác");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto py-12 px-4 font-sans">
      {step === "PASSWORD" && (
        <button
          type="button"
          onClick={() => setStep("EMAIL")}
          className="flex items-center gap-1.5 text-blue-600 mb-4 text-xs font-bold hover:bg-blue-50 w-fit px-2.5 py-1.5 rounded-lg transition cursor-pointer"
        >
          <ArrowLeft size={15} /> Quay lại
        </button>
      )}

      <h1 className="text-2xl font-black text-gray-900 mb-1.5 tracking-tight">
        {step === "EMAIL" ? "Đăng nhập hoặc tạo tài khoản" : "Nhập mật khẩu"}
      </h1>
      <p className="text-xs text-gray-500 mb-6 leading-relaxed font-medium">
        Sử dụng tài khoản GoStay của bạn để trải nghiệm các dịch vụ tốt nhất.
      </p>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-bold animate-in fade-in">
          ⚠️ {error}
        </div>
      )}

      {step === "EMAIL" ? (
        <form onSubmit={handleEmailNext} className="space-y-4">
          <Input
            label="Địa chỉ email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="Nhập địa chỉ email của bạn"
            clearable
          />
          <Button
            type="submit"
            className="w-full font-bold h-11 text-xs cursor-pointer"
            isLoading={loading}
          >
            Tiếp tục với email
          </Button>
        </form>
      ) : (
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center text-xs">
            <span className="font-bold text-gray-700 truncate">{email}</span>
            <button
              type="button"
              onClick={() => setStep("EMAIL")}
              className="text-blue-600 font-bold hover:underline cursor-pointer shrink-0 ml-2"
            >
              Sửa
            </button>
          </div>
          <Input
            label="Mật khẩu"
            type="password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Nhập mật khẩu"
          />
          <Button
            type="submit"
            className="w-full font-bold h-11 text-xs cursor-pointer"
            isLoading={loading}
          >
            Đăng nhập
          </Button>
        </form>
      )}

      <div className="relative my-8 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <span className="relative bg-white px-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Hoặc
        </span>
      </div>

      <button
        type="button"
        onClick={() => handleGoogleLogin()}
        disabled={loading}
        className="w-full h-11 border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 transition gap-2.5 shadow-2xs active:scale-[0.98] cursor-pointer group"
      >
        <svg
          className="w-4 h-4 transition-transform group-hover:scale-110"
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
        <span className="text-xs font-bold text-gray-700">
          Tiếp tục với Google
        </span>
      </button>

      <p className="mt-8 text-[11px] text-center text-gray-400 leading-relaxed">
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
