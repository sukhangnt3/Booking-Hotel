import React, { useState } from 'react';
import authService from '../../services/authService';

const RegisterForm = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate trùng mật khẩu
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu nhập lại không trùng khớp!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      });

      if (res.token) {
        localStorage.setItem('token', res.token);
      }
      alert('Đăng ký thành công!');
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPasswordMismatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-[420px] shadow-2xl relative text-gray-800">
        
        {/* Nút đóng X */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          ✕
        </button>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Đăng ký
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2.5 rounded-md mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Họ tên */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Họ tên</label>
            <input
              type="text"
              name="fullName"
              placeholder="Họ và tên"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1d61c8]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1d61c8]"
            />
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu *</label>
            <input
              type="password"
              required
              name="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1d61c8]"
            />
          </div>

          {/* Nhập lại mật khẩu */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nhập lại mật khẩu *</label>
            <div className="relative">
              <input
                type="password"
                required
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                  isPasswordMismatch ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-[#1d61c8]'
                }`}
              />
              {isPasswordMismatch && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-xs">ⓘ</span>
              )}
            </div>
          </div>

          {/* Điện thoại */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Điện thoại</label>
            <input
              type="tel"
              name="phone"
              placeholder="Điện thoại"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1d61c8]"
            />
          </div>

          {/* Dòng link chuyển hướng */}
          <div className="text-xs text-gray-600 mt-1">
            Đã có tài khoản?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 font-medium hover:underline"
            >
              Đăng nhập
            </button>
          </div>

          {/* Nút đăng ký */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1d61c8] hover:bg-[#164ea5] text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2 disabled:bg-gray-400"
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default RegisterForm;