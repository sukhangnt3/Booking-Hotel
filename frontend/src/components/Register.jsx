import React, { useState } from 'react';

const Register = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu nhập lại không trùng khớp!' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, phoneNumber }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Đăng ký thất bại.');

      setMessage({ type: 'success', text: '🚀 Đăng ký thành công! Đang chuyển sang Đăng nhập...' });
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegisterSubmit} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200/60">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Đăng ký</h2>
      
      {message.text && (
        <div className={`mb-4 text-sm p-3 rounded-lg text-center font-medium ${
          message.type === 'success' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Họ tên</label>
          <input
            type="text"
            placeholder="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu *</label>
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Nhập lại mật khẩu *</label>
          <input
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-700 outline-none focus:ring-1 ${
              confirmPassword && password !== confirmPassword 
                ? 'border-red-400 focus:ring-red-500' 
                : 'border-gray-200 focus:border-blue-500'
            }`}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Điện thoại</label>
          <input
            type="tel"
            placeholder="Điện thoại"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
          />
        </div>

        <div className="text-xs text-center text-gray-600 pt-1">
          Đã có tài khoản?{' '}
          <button type="button" onClick={onSwitchToLogin} className="text-blue-600 hover:underline font-medium cursor-pointer">
            Đăng nhập
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1A62B6] hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold mt-4 cursor-pointer disabled:bg-blue-400"
        >
          {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
      </div>
    </form>
  );
};

export default Register;