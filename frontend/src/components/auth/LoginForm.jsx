import React, { useState } from "react";
import Input from "../ui/Input";

const LoginForm = ({ onClose, onSwitchToRegister, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Giả lập login thành công
    onLoginSuccess({ name: "Nhat Linh", email });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-[420px] relative font-sans text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        <h2 className="text-2xl font-bold text-center mb-6">Đăng nhập</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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