import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import GuestLayout from '../components/layout/GuestLayout';
import HomePage from '../pages/guest/HomePage';
import HotelListPage from '../pages/guest/HotelListPage';
import HotelDetailPage from '../pages/guest/HotelDetailPage'; // 🚀 1. Import trang HotelDetailPage
import LoginPage from '../pages/auth/LoginPage';

const router = createBrowserRouter([
  // ── NHÓM 1: CÁC TRANG DÙNG GUEST LAYOUT (Có Header lớn + Footer chung) ──
  {
    path: '/',
    element: <GuestLayout />, 
    children: [
      {
        index: true, // Trang chủ (/)
        element: <HomePage />,
      },
      {
        path: '/hotels', // Trang danh sách (/hotels)
        element: <HotelListPage />,
      },
      {
        // 🚀 2. THÊM ROUTE NÀY ĐỂ KHẮC PHỤC LỖI 404
        path: '/hotel/:id', 
        element: <HotelDetailPage />,
      },
    ],
  },

  // ── NHÓM 2: TRANG ĐĂNG NHẬP RIÊNG (Hoàn toàn tách biệt) ──
  {
    path: '/login',
    element: <LoginPage />,
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;