import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

// ─── 1. LAYOUTS & ROUTE GUARDS ───
import { GuestLayout, AdminLayout, OwnerLayout } from "@/components/layout";
import AdminRoutes from "./AdminRoutes";
import OwnerRoutes from "./OwnerRoutes";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// ─── 2. GUEST & AUTH ───
import HomePage from "@/pages/guest/HomePage";
import HotelListPage from "@/pages/guest/HotelListPage";
import HotelDetailPage from "@/pages/guest/HotelDetailPage";
import UserProfilePage from "@/pages/guest/UserProfilePage";
import BookingConfirmPage from "@/pages/guest/BookingConfirmPage";
import BookingSuccessPage from "@/pages/guest/BookingSuccessPage";
import CheckoutPage from "@/pages/guest/CheckoutPage";
import PromotionPage from "@/pages/guest/PromotionPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterForm from "@/components/auth/RegisterForm";

// ─── 3. ADMIN (3 TRANG) ───
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import HotelApprovalPage from "@/pages/admin/HotelApprovalPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";

// ─── 4. CHỦ KHÁCH SẠN OWNER (4 TRANG) ───
import OwnerDashboardPage from "@/pages/owner/DashboardPage";
import HotelManagementPage from "@/pages/owner/HotelManagementPage";
import RoomManagementPage from "@/pages/owner/RoomManagementPage";
import BookingListPage from "@/pages/owner/BookingListPage";

// ─── 5. TRANG BÁO LỖI ───
import { NotFoundPage, ServerErrorPage } from "@/pages/error";

const router = createBrowserRouter([
  // ========================================================
  // 1. PHÂN HỆ KHÁCH HÀNG (GUEST)
  // ========================================================
  {
    path: "/",
    element: <GuestLayout />,
    errorElement: <ServerErrorPage />,
    children: [
      { index: true, element: <HomePage /> },

      // Hỗ trợ tất cả link tìm kiếm
      { path: "hotels", element: <HotelListPage /> },
      { path: "search", element: <HotelListPage /> },
      { path: "search-results", element: <HotelListPage /> },
      { path: "hotels/search", element: <HotelListPage /> },

      { path: "hotel/:id", element: <HotelDetailPage /> },
      { path: "promotions", element: <PromotionPage /> },
      { path: "booking", element: <BookingConfirmPage /> },
      { path: "booking-confirm", element: <BookingConfirmPage /> },
      { path: "booking-success", element: <BookingSuccessPage /> },
      { path: "checkout", element: <CheckoutPage /> },

      // Trang cá nhân & Lịch sử đặt phòng (Có đủ các route dự phòng)
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile", element: <UserProfilePage /> },
          { path: "userprofile", element: <UserProfilePage /> },
          { path: "user-profile", element: <UserProfilePage /> },
          { path: "my-bookings", element: <UserProfilePage /> },
          { path: "bookings", element: <UserProfilePage /> },
          { path: "user/bookings", element: <UserProfilePage /> },
        ],
      },
    ],
  },

  // ========================================================
  // 2. PHÂN HỆ AUTH (ĐĂNG NHẬP / ĐĂNG KÝ)
  // ========================================================
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterForm /> },
  { path: "/register-owner", element: <RegisterForm /> },

  // ========================================================
  // 3. PHÂN HỆ OWNER (CHỦ CƠ SỞ)
  // ========================================================
  {
    path: "/owner",
    element: <OwnerRoutes />,
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <OwnerLayout />,
        children: [
          { index: true, element: <Navigate to="/owner/dashboard" replace /> },
          { path: "dashboard", element: <OwnerDashboardPage /> },
          { path: "hotels", element: <HotelManagementPage /> },
          { path: "rooms", element: <RoomManagementPage /> },
          { path: "bookings", element: <BookingListPage /> },
        ],
      },
    ],
  },

  // ========================================================
  // 4. PHÂN HỆ ADMIN (QUẢN TRỊ VIÊN)
  // ========================================================
  {
    path: "/admin",
    element: <AdminRoutes />,
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboardPage /> },
          { path: "hotels", element: <HotelApprovalPage /> },
          { path: "users", element: <UserManagementPage /> },
        ],
      },
    ],
  },

  // ========================================================
  // 5. TRANG LỖI 404
  // ========================================================
  { path: "*", element: <NotFoundPage /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
