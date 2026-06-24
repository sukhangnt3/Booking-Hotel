import React, { useState } from 'react';
import Register from './Register';

const Login = ({ isOpen, onClose }) => {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const switchMode = (mode) => {
    setAuthMode(mode);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');

      alert('🎉 Đăng nhập thành công!');
      if (data.token) localStorage.setItem('token', data.token);
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[460px] rounded-2xl bg-[#f0f4f9] p-8 shadow-2xl">
        
        {/* Nút đóng bằng chữ X thuần túy */}
        <button 
          onClick={onClose} 
          className="absolute right-5 top-5 text-gray-400 hover:text-gray-700 font-bold cursor-pointer text-xl"
        >
          &times;
        </button>

        {errorMessage && (
          <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded-lg text-center border border-red-100">
            {errorMessage}
          </div>
        )}

        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200/60">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Đăng nhập</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <a href="#" className="text-blue-600 hover:underline">Quên mật khẩu</a>
                <div className="text-gray-600">
                  Chưa có tài khoản?{' '}
                  <button 
                    type="button" 
                    onClick={() => switchMode('register')} 
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Đăng ký
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1A62B6] hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold mt-4 cursor-pointer disabled:bg-blue-400"
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        ) : (
          <Register onSwitchToLogin={() => switchMode('login')} />
        )}

        {/* Các nút mạng xã hội dạng chữ thuần */}
        {authMode === 'login' && (
          <>
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <span className="relative bg-[#f0f4f9] px-4 text-xs text-gray-400 font-medium">hoặc</span>
            </div>

            <div className="space-y-2">
              <button type="button" className="w-full bg-[#4285F4] hover:bg-blue-600 text-white font-semibold rounded-xl py-2.5 text-sm cursor-pointer">
                Tiếp tục với Google
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  Apple
                </button>
                <button type="button" className="bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  Facebook
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Login;