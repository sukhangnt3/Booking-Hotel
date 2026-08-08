import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function GuestRoute() {
  // Thay token/isLoggedIn bằng state Auth thực tế từ Redux / Context API của bạn
  const isAuthenticated = Boolean(localStorage.getItem('token'));

  // Nếu ĐÃ đăng nhập => Đá về trang chủ
  // Nếu CHƯA đăng nhập => Cho phép vào tiếp (Outlet)
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}