import React, { useState } from "react";
import Input from "../ui/Input";

const RegisterForm = ({ onClose, onSwitchToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  const isPasswordMismatched = confirmPassword && password !== confirmPassword;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isPasswordMismatched) return;
    alert("Đăng ký thành công!");
    onSwitchToLogin();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-[420px] relative font-sans text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        <h2 className="text-2xl font-bold text-center mb-6">Đăng ký</h2>
        
        <form onSubmit={handleSubmit} className="space-y-3">
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