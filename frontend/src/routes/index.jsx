// src/routes/index.jsx
import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

// Layouts & Guards
import { GuestLayout, AdminLayout, OwnerLayout } from "@/components/layout";
import ReceptionLayout from "@/components/layout/ReceptionLayout";
import AdminRoutes from "./AdminRoutes";
import OwnerRoutes from "./OwnerRoutes";
import ReceptionRoutes from "./ReceptionRoutes";
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
import UserManagementPage from "@/pages/admin/UserManagementPage";

// Owner Pages
import OwnerDashboardPage from "@/pages/owner/DashboardPage";
import HotelManagementPage from "@/pages/owner/HotelManagementPage";
import StaffManagementPage from "@/pages/owner/StaffManagementPage";
import RoomManagementPage from "@/pages/owner/RoomManagementPage";
import RoomTimeSettingsPage from "@/pages/owner/RoomTimeSettingsPage";
import RoomPricingPage from "@/pages/owner/RoomPricingPage";
import BookingListPage from "@/pages/owner/BookingListPage";

// 👉 TRANG RIÊNG CỦA LỄ TÂN TRONG FOLDER RECEPTION
import ReceptionMapPage from "@/pages/reception/ReceptionMapPage";

import { NotFoundPage, ServerErrorPage } from "@/pages/error";

const router = createBrowserRouter([
  // ── 1. PHÂN HỆ KHÁCH HÀNG (STOREFRONT) ──
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
        path: "my-bookings",
        element: <Navigate to="/profile?tab=trips" replace />,
      },
      {
        element: <ProtectedRoute />,
        children: [{ path: "profile", element: <UserProfilePage /> }],
      },
    ],
  },

  // ── 2. PHÂN HỆ AUTHENTICATION ──
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterForm /> },
  { path: "/register-owner", element: <RegisterForm /> },

  // ── 3. PHÂN HỆ DÀNH RIÊNG CHO LỄ TÂN (RECEPTION DESK) ──
  {
    path: "/reception",
    element: <ReceptionRoutes />,
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <ReceptionLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/reception/room-map" replace />,
          },
          // 👉 SƠ ĐỒ PHÒNG TẠI THƯ MỤC RECEPTION RIÊNG
          { path: "room-map", element: <ReceptionMapPage /> },
          // 👉 TIẾP NHẬN ĐƠN & CHECK-IN / CHECK-OUT
          { path: "bookings", element: <BookingListPage /> },
        ],
      },
    ],
  },

  // ── 4. PHÂN HỆ DÀNH CHO CHỦ KHÁCH SẠN (HOTEL OWNER) ──
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
          { path: "hotels/register", element: <RegisterForm /> },
          { path: "staff", element: <StaffManagementPage /> },
          { path: "rooms", element: <RoomManagementPage /> },
          { path: "room-time-settings", element: <RoomTimeSettingsPage /> },
          { path: "pricing", element: <RoomPricingPage /> },
          { path: "bookings", element: <BookingListPage /> },
        ],
      },
    ],
  },

  // ── 5. PHÂN HỆ SUPER ADMIN ──
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

  { path: "*", element: <NotFoundPage /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
