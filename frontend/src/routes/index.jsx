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
import UserManagementPage from "@/pages/admin/UserManagementPage";

// Owner Pages
import OwnerDashboardPage from "@/pages/owner/DashboardPage";
import HotelManagementPage from "@/pages/owner/HotelManagementPage";
import RoomManagementPage from "@/pages/owner/RoomManagementPage";
import RoomTimeSettingsPage from "@/pages/owner/RoomTimeSettingsPage";
import RoomPricingPage from "@/pages/owner/RoomPricingPage";
import BookingListPage from "@/pages/owner/BookingListPage";

// 👉 1. IMPORT TRANG SƠ ĐỒ PHÒNG LỄ TÂN
import ReceptionRoomMapPage from "@/pages/owner/ReceptionRoomMapPage";

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

  // ── 3. PHÂN HỆ CHỦ KHÁCH SẠN & LỄ TÂN (PMS) ──
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

          // 👉 2. ROUTE SƠ ĐỒ PHÒNG LỄ TÂN (KIOTVIET STYLE)
          { path: "reception-map", element: <ReceptionRoomMapPage /> },

          { path: "hotels", element: <HotelManagementPage /> },
          { path: "hotels/register", element: <RegisterForm /> },
          { path: "rooms", element: <RoomManagementPage /> },
          { path: "room-time-settings", element: <RoomTimeSettingsPage /> },
          { path: "pricing", element: <RoomPricingPage /> },
          { path: "bookings", element: <BookingListPage /> },
        ],
      },
    ],
  },

  // ── 4. PHÂN HỆ SUPER ADMIN ──
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
