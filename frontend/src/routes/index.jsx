// src/routes/index.jsx
import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

// Layouts & Guards
import { GuestLayout, AdminLayout, OwnerLayout } from "@/components/layout";
import AdminRoutes from "./AdminRoutes";
import OwnerRoutes from "./OwnerRoutes";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Guest Pages
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

// Admin Pages
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import HotelApprovalPage from "@/pages/admin/HotelApprovalPage";
import AdminFinancialReportPage from "@/pages/admin/AdminFinancialReportPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import SystemSettingsPage from "@/pages/admin/SystemSettingsPage";

// Owner Pages
import OwnerDashboardPage from "@/pages/owner/DashboardPage";
import HotelManagementPage from "@/pages/owner/HotelManagementPage";
import RoomManagementPage from "@/pages/owner/RoomManagementPage";
import BookingListPage from "@/pages/owner/BookingListPage";
import StaffManagementPage from "@/pages/owner/StaffManagementPage";
import ReportsAnalyticsPage from "@/pages/admin/ReportsAnalyticsPage";

// Đã cập nhật lại đúng đường dẫn thư mục owner
import HousekeepingManagementPage from "@/pages/owner/HousekeepingManagementPage";
import GuestManagementPage from "@/pages/owner/GuestManagementPage";

import { NotFoundPage, ServerErrorPage } from "@/pages/error";

const router = createBrowserRouter([
  // 1. Phân hệ Khách hàng
  {
    path: "/",
    element: <GuestLayout />,
    errorElement: <ServerErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "hotels", element: <HotelListPage /> },
      { path: "hotel/:id", element: <HotelDetailPage /> },
      { path: "promotions", element: <PromotionPage /> },
      { path: "booking", element: <BookingConfirmPage /> },
      { path: "booking-success", element: <BookingSuccessPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: "profile", element: <UserProfilePage /> }],
      },
    ],
  },

  // 2. Phân hệ Auth
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterForm /> },
  { path: "/register-owner", element: <RegisterForm /> },

  // 3. Phân hệ Owner / PMS
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
          { path: "housekeeping", element: <HousekeepingManagementPage /> },
          { path: "staff", element: <StaffManagementPage /> },
          { path: "guests", element: <GuestManagementPage /> },
          { path: "reports", element: <ReportsAnalyticsPage /> },
        ],
      },
    ],
  },

  // 4. Phân hệ Super Admin
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
          { path: "reports", element: <AdminFinancialReportPage /> },
          { path: "users", element: <UserManagementPage /> },
          { path: "settings", element: <SystemSettingsPage /> },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
