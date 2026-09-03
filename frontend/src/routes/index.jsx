// src/routes/AppRoutes.jsx
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

// Guest & Auth Pages
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

// Admin & PMS Pages
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import HotelApprovalPage from "@/pages/admin/HotelApprovalPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import PaymentVerificationPage from "@/pages/admin/PaymentVerificationPage";
import HousekeepingManagementPage from "@/pages/admin/HousekeepingManagementPage";
import GuestManagementPage from "@/pages/admin/GuestManagementPage";
import ReportsAnalyticsPage from "@/pages/admin/ReportsAnalyticsPage";
import SystemSettingsPage from "@/pages/admin/SystemSettingsPage";
import AdminFinancialReportPage from "@/pages/admin/AdminFinancialReportPage";
// Owner / Frontdesk PMS Pages
import OwnerDashboardPage from "@/pages/owner/DashboardPage";
import HotelManagementPage from "@/pages/owner/HotelManagementPage";
import RoomManagementPage from "@/pages/owner/RoomManagementPage";
import BookingListPage from "@/pages/owner/BookingListPage";

import { NotFoundPage, ServerErrorPage } from "@/pages/error";

const router = createBrowserRouter([
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
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterForm /> },
  { path: "/register-owner", element: <RegisterForm /> },

  // Phân hệ Quản trị Admin & Manager (Đầy đủ 8 nghiệp vụ PMS)
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
          { path: "bookings", element: <BookingListPage /> },
          { path: "rooms", element: <RoomManagementPage /> },
          { path: "housekeeping", element: <HousekeepingManagementPage /> },
          { path: "payments", element: <PaymentVerificationPage /> },
          { path: "guests", element: <GuestManagementPage /> },
          { path: "hotels", element: <HotelApprovalPage /> },
          { path: "users", element: <UserManagementPage /> },
          { path: "settings", element: <SystemSettingsPage /> },
          { path: "reports", element: <AdminFinancialReportPage /> },
        ],
      },
    ],
  },

  // Phân hệ Vận hành Khách sạn (Owner / Receptionist)
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
          { path: "payments", element: <PaymentVerificationPage /> },
          { path: "guests", element: <GuestManagementPage /> },
          { path: "reports", element: <ReportsAnalyticsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
