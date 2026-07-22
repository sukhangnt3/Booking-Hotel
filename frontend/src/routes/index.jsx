import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import GuestLayout from '../components/layout/GuestLayout';
import HomePage from '../pages/guest/HomePage';
import HotelListPage from '../pages/guest/HotelListPage';
const router = createBrowserRouter([
  {
    path: '/',
    element: <GuestLayout />, // Gọi layout bọc bên ngoài
    children: [
      {
        index: true, // Đường dẫn mặc định (/)
        element: <HomePage /> // Kết nối HomePage vào đây
      },
      {
        path: '/hotels',
        element: <HotelListPage />, // Trang danh sách sẽ tự động có Header cũ!
      },
    ]
  }
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;