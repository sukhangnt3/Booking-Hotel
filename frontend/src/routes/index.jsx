import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

// Layouts & Route Protections
import GuestLayout from "../components/layout/GuestLayout";
import AdminLayout from "../components/layout/AdminLayout";
import AdminRoutes from "./AdminRoutes";

// Trang Khách hàng & Auth
import HomePage from "../pages/guest/HomePage";
import HotelListPage from "../pages/guest/HotelListPage";
import HotelDetailPage from "../pages/guest/HotelDetailPage";
import UserProfilePage from "../pages/guest/UserProfilePage";
import BookingConfirmPage from "../pages/guest/BookingConfirmPage";
import BookingSuccessPage from "../pages/guest/BookingSuccessPage";
import CheckoutPage from "../pages/guest/CheckoutPage";
import LoginPage from "../pages/auth/LoginPage";

// Trọn bộ 6 trang Admin
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import HotelApprovalPage from "../pages/admin/HotelApprovalPage";
import UserManagementPage from "../pages/admin/UserManagementPage";
import BookingManagementPage from "../pages/admin/BookingManagementPage";
import GlobalPromotionPage from "../pages/admin/GlobalPromotionPage";
import SystemReviewPage from "../pages/admin/SystemReviewPage";

const router = createBrowserRouter([
  // 1. DÀNH CHO KHÁCH HÀNG
  {
    path: "/",
    element: <GuestLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "hotels", element: <HotelListPage /> },
      { path: "hotel/:id", element: <HotelDetailPage /> },
      { path: "UserProfilePage", element: <UserProfilePage /> },
      { path: "booking", element: <BookingConfirmPage /> },
      { path: "booking-success", element: <BookingSuccessPage /> },
      { path: "checkout", element: <CheckoutPage /> },
    ],
  },

  // 2. DÀNH CHO ĐĂNG NHẬP / DĂNG KÝ
  {
    path: "/login",
    element: <LoginPage />,
  },

  // 3. DÀNH CHO QUẢN TRỊ VIÊN (ADMIN) - ĐÃ BỔ SUNG ĐẦY ĐỦ
  {
    path: "/admin",
    element: <AdminRoutes />, // Kiểm tra quyền Admin
    children: [
      {
        element: <AdminLayout />, // Khung Giao diện Admin
        children: [
          // Mặc định /admin sẽ điều hướng tới /admin/dashboard
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

  // 4. TRANG BÁO LỖI 404 (Nếu gõ sai URL sẽ tự về trang chủ)
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;
