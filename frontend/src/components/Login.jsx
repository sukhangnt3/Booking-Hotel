import React, { useState } from "react";

const Login = ({ setUser, onClose }) => {
  const [isLogin, setIsLogin] = useState(true); // true: Login, false: Register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [full_Name, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // KIỂM TRA MẬT KHẨU NHẬP LẠI (Chỉ check khi Đăng ký)
    if (!isLogin && password !== confirmPassword) {
      alert("Mật khẩu nhập lại không trùng khớp! Vui lòng kiểm tra lại.");
      return; // Dừng lại, không gửi API nữa
    }

    const endpoint = isLogin ? "/api/login" : "/api/register";
    const payload = isLogin ? { email, password } : { full_Name, email, password, phone };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem("token", data.token);
          setUser(data.user);
          onClose();
        } else {
          alert("Đăng ký thành công! Hãy đăng nhập.");
          setIsLogin(true); // Chuyển về màn hình đăng nhập
          // Xóa trắng dữ liệu mật khẩu cũ cho an toàn
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        alert(data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Lỗi kết nối Backend:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-[440px] relative font-sans">
        {/* Nút X để đóng form */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>

        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isLogin ? "Đăng nhập" : "Đăng ký"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Họ tên</label>
              <input type="text" placeholder="Họ và tên" value={full_Name} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#005cb8]" />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email {!isLogin && "*"}</label>
            <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#005cb8]" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu {!isLogin && "*"}</label>
            <input type="password" placeholder="Mật khẩu" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#005cb8]" />
          </div>

          {/* Ô NHẬP LẠI MẬT KHẨU (Chỉ hiển thị khi !isLogin) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nhập lại mật khẩu *</label>
              <input 
                type="password" 
                placeholder="Nhập lại mật khẩu" 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:border-[#005cb8] ${
                  confirmPassword && password !== confirmPassword ? "border-red-400 bg-red-50" : "border-gray-200"
                }`} 
              />
              {/* Thông báo đỏ nhỏ dưới ô input nếu gõ sai */}
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Mật khẩu không khớp!</p>
              )}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Điện thoại</label>
              <input type="tel" placeholder="Điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#005cb8]" />
            </div>
          )}

          <div className="flex justify-between items-center text-xs pt-1">
            {isLogin ? (
              <>
                <a href="#forgot" className="text-[#005cb8] hover:underline">Quên mật khẩu</a>
                <span className="text-gray-500">Chưa có tài khoản ? <span onClick={() => setIsLogin(false)} className="text-[#005cb8] font-semibold cursor-pointer hover:underline">Đăng ký</span></span>
              </>
            ) : (
              <span className="text-gray-500 w-full text-right">Đã có tài khoản? <span onClick={() => { setIsLogin(true); setConfirmPassword(""); }} className="text-[#005cb8] font-semibold cursor-pointer hover:underline">Đăng nhập</span></span>
            )}
          </div>

          <button type="submit" className="w-full py-3 bg-[#005cb8] text-white font-bold rounded-lg hover:bg-[#004ba0] transition-colors duration-200 mt-2">
            {isLogin ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;