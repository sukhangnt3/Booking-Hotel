import React, { useState } from 'react';
import authService from '../../services/authService';

const LoginForm = ({ isOpen, onClose, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authService.login(email, password);
      if (res.token) {
        localStorage.setItem('token', res.token);
      }
      alert('Đăng nhập thành công!');
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-[420px] shadow-2xl relative text-gray-800">
        
        {/* Nút đóng X */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          ✕
        </button>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Đăng nhập
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2.5 rounded-md mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#166534]"
            />
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#166534]"
            />
          </div>

          {/* Dòng link hỗ trợ */}
          <div className="flex items-center justify-between text-xs mt-1">
            <a href="#" className="text-blue-600 hover:underline">Quên mật khẩu</a>
            <div>
              Chưa có tài khoản ?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-blue-600 font-medium hover:underline"
              >
                Đăng ký
              </button>
            </div>
          </div>

          {/* Nút submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1d61c8] hover:bg-[#164ea5] text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-3 disabled:bg-gray-400"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default LoginForm;