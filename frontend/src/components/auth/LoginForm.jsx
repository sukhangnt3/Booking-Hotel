import React, { useState } from "react";
import Input from "../ui/Input";

const LoginForm = ({ onClose, onSwitchToRegister, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 🚨 Thêm trạng thái để quản lý và hiển thị thông báo lỗi từ Backend
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Xóa thông báo lỗi cũ trước khi bấm gửi lại

    try {
      // 🚀 Gửi tài khoản/mật khẩu sang Backend bằng fetch
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json(); // Đọc dữ liệu JSON trả về

      if (response.ok) {
        // --- TRƯỜNG HỢP 1: ĐĂNG NHẬP THÀNH CÔNG ---
        // 1. Lưu JWT Token vào bộ nhớ trình duyệt để giữ trạng thái đăng nhập
        localStorage.setItem("token", data.token);

        // 2. Đẩy thông tin user thực tế từ database (data.user) lên App.jsx
        onLoginSuccess(data.user);

        // 3. Đóng modal đăng nhập lại
        onClose();
      } else {
        // --- TRƯỜNG HỢP 2: THẤT BẠI (Sai mật khẩu, tài khoản không tồn tại...) ---
        // Lấy câu báo lỗi từ Backend trả về, nếu không có thì hiện câu mặc định
        setError(data.message || "Email hoặc mật khẩu không chính xác!");
      }
    } catch (err) {
      // --- TRƯỜNG HỢP 3: LỖI KẾT NỐI (Mất mạng, Server backend chưa bật) ---
      setError("Không thể kết nối đến máy chủ Backend. Vui lòng thử lại sau!");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-[420px] relative font-sans text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        <h2 className="text-2xl font-bold text-center mb-6">Đăng nhập</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 🔥 HIỂN THỊ DÒNG CHỮ BÁO LỖI MÀU ĐỎ NẾU ĐĂNG NHẬP THẤT BẠI */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200">
              ⚠️ {error}
            </div>
          )}

          <Input label="Email" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Mật khẩu" type="password" placeholder="Mật khẩu" required value={password} onChange={e => setPassword(e.target.value)} />
          
          <div className="flex justify-between items-center text-xs pt-1">
            <a href="#forgot" className="text-[#005cb8] hover:underline">Quên mật khẩu</a>
            <span className="text-gray-500">Chưa có tài khoản? <span onClick={onSwitchToRegister} className="text-[#005cb8] font-semibold cursor-pointer hover:underline">Đăng ký</span></span>
          </div>

          <button type="submit" className="w-full py-2.5 bg-[#005cb8] text-white font-bold rounded-lg hover:bg-[#004ba0] transition-colors duration-200">
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;