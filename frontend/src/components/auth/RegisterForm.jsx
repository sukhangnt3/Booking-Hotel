import React, { useState } from "react";
import Input from "../ui/Input";

const RegisterForm = ({ onClose, onSwitchToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // 🚨 Thêm trạng thái để hiển thị lỗi từ Backend gửi về
  const [error, setError] = useState("");

  const isPasswordMismatched = confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Xóa thông báo lỗi cũ

    // Chặn không cho gửi dữ liệu nếu mật khẩu nhập lại chưa khớp
    if (isPasswordMismatched) return;

    try {
      // 🚀 Gửi toàn bộ thông tin đăng ký sang Backend bằng fetch
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone, // Gửi thêm cả số điện thoại
        }),
      });

      const data = await response.json(); // Đọc dữ liệu phản hồi từ Backend

      if (response.ok) {
        // --- TRƯỜNG HỢP 1: ĐĂNG KÝ THÀNH CÔNG ---
        alert("🎉 Đăng ký tài khoản thành công! Hãy đăng nhập.");
        onSwitchToLogin(); // Tự động chuyển người dùng về form Đăng nhập
      } else {
        // --- TRƯỜNG HỢP 2: THẤT BẠI (Ví dụ: Email đã được sử dụng trước đó) ---
        setError(data.message || "Đăng ký thất bại. Vui lòng thử lại!");
      }
    } catch (err) {
      // --- TRƯỜNG HỢP 3: LỖI KẾT NỐI (Mất mạng, Server chưa bật) ---
      setError("Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại!");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-[420px] relative font-sans text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        <h2 className="text-2xl font-bold text-center mb-6">Đăng ký</h2>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          
          {/* 🔥 HIỂN THỊ THÔNG BÁO LỖI TỪ BACKEND NẾU CÓ */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200">
              ⚠️ {error}
            </div>
          )}

          <Input label="Họ tên" placeholder="Họ và tên" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email *" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Mật khẩu *" type="password" placeholder="Mật khẩu" required value={password} onChange={e => setPassword(e.target.value)} />
          
          <Input 
            label="Nhập lại mật khẩu *" 
            type="password" 
            placeholder="Nhập lại mật khẩu" 
            required 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)}
            hasError={isPasswordMismatched}
          />
          {isPasswordMismatched && <p className="text-red-500 text-xs -mt-1">Mật khẩu không trùng khớp!</p>}
          
          <Input label="Điện thoại" placeholder="Điện thoại" value={phone} onChange={e => setPhone(e.target.value)} />

          <div className="text-xs pt-1 text-right">
            <span className="text-gray-500">Đã có tài khoản? <span onClick={onSwitchToLogin} className="text-[#005cb8] font-semibold cursor-pointer hover:underline">Đăng nhập</span></span>
          </div>

          <button type="submit" className="w-full py-2.5 bg-[#005cb8] text-white font-bold rounded-lg hover:bg-[#004ba0] transition-colors duration-200">
            Đăng ký
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;