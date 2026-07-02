import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GuestLayout } from '../components/layout';
import HomePage from '../pages/guest/HomePage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <GuestLayout />, // Gọi layout bọc bên ngoài
    children: [
      {
        index: true, // Đường dẫn mặc định (/)
        element: <HomePage /> // Kết nối HomePage vào đây
      },
      // Sau này có thêm trang chi tiết khách sạn bạn chỉ cần thêm dòng dưới:
      // { path: 'hotel/:id', element: <HotelDetailPage /> }
    ]
  }
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;