import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import GuestLayout from '../components/layout/GuestLayout';
import HomePage from '../pages/guest/HomePage';
import HotelListPage from '../pages/guest/HotelListPage';
import HotelDetailPage from '../pages/guest/HotelDetailPage';
import UserProfilePage from '../pages/guest/UserProfilePage';
import BookingConfirmPage from '../pages/guest/BookingConfirmPage';
import LoginPage from '../pages/auth/LoginPage';

const router = createBrowserRouter([
  // ── NHÓM 1: CÁC TRANG DÙNG GUEST LAYOUT (Có Header + Footer) ──
  {
    path: '/',
    element: <GuestLayout />, 
    children: [
      {
        index: true, // Trang chủ (/)
        element: <HomePage />,
      },
      {
        path: 'hotels', // Trang danh sách khách sạn (/hotels)
        element: <HotelListPage />,
      },
      {
        path: 'hotel/:id', // Trang chi tiết khách sạn (/hotel/:id)
        element: <HotelDetailPage />,
      },
      {
        // 2. BỔ SUNG ROUTE USER PROFILE TẠI ĐÂY
        path: '/UserProfilePage', 
        element: <UserProfilePage />,
      },
      {
        path: 'booking', // 🚀 Đã đưa /booking vào trong GuestLayout
        element: <BookingConfirmPage />,
      },
      
    ],
  },

  // ── NHÓM 2: TRANG RIÊNG BIỆT (Không dùng Layout chung) ──
  {
    path: '/login',
    element: <LoginPage />,
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;