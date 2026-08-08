import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import GuestLayout from "../components/layout/GuestLayout";
import AdminLayout from "../components/layout/AdminLayout";
import AdminRoutes from "./AdminRoutes";

// Trang Khách hàng & Auth
import HomePage from "../pages/guest/HomePage";
import HotelListPage from "../pages/guest/HotelListPage";
import HotelDetailPage from "../pages/guest/HotelDetailPage";
import UserProfilePage from "../pages/guest/UserProfilePage";
import BookingConfirmPage from "../pages/guest/BookingConfirmPage";
import LoginPage from "../pages/auth/LoginPage";

// Import trọn bộ 6 trang Admin
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import HotelApprovalPage from "../pages/admin/HotelApprovalPage";
import UserManagementPage from "../pages/admin/UserManagementPage";
import BookingManagementPage from "../pages/admin/BookingManagementPage";
import GlobalPromotionPage from "../pages/admin/GlobalPromotionPage";
import SystemReviewPage from "../pages/admin/SystemReviewPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <GuestLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "hotels", element: <HotelListPage /> },
      { path: "hotel/:id", element: <HotelDetailPage /> },
      { path: "profile", element: <UserProfilePage /> },
      { path: "booking", element: <BookingConfirmPage /> },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/admin",
    element: <AdminRoutes />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          // Mặc định truy cập /admin sẽ điều hướng đến /admin/dashboard
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboardPage /> },
          { path: "hotels", element: <HotelApprovalPage /> },
          { path: "users", element: <UserManagementPage /> },
          { path: "bookings", element: <BookingManagementPage /> },
          { path: "promotions", element: <GlobalPromotionPage /> },
          { path: "reviews", element: <SystemReviewPage /> },
        ],
      },
    ],
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;