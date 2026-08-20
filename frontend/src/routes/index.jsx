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

// ─── 2. TRANG DÀNH CHO KHÁCH HÀNG & AUTH ───
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

// ─── 3. TRỌN BỘ 6 TRANG ADMIN (QUẢN TRỊ VIÊN) ───
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import HotelApprovalPage from "@/pages/admin/HotelApprovalPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import BookingManagementPage from "@/pages/admin/BookingManagementPage";
import GlobalPromotionPage from "@/pages/admin/GlobalPromotionPage";
import SystemReviewPage from "@/pages/admin/SystemReviewPage";

// ─── 4. TRỌN BỘ 9 TRANG OWNER (CHỦ KHÁCH SẠN) ───
import OwnerDashboardPage from "@/pages/owner/DashboardPage";
import HotelManagementPage from "@/pages/owner/HotelManagementPage";
import HotelEditPage from "@/pages/owner/HotelEditPage";
import RoomManagementPage from "@/pages/owner/RoomManagementPage";
import RoomEditPage from "@/pages/owner/RoomEditPage";
import RoomNumberPage from "@/pages/owner/RoomNumberPage";
import BookingListPage from "@/pages/owner/BookingListPage";
import BookingDetailPage from "@/pages/owner/BookingDetailPage";
import ServiceManagementPage from "@/pages/owner/ServiceManagementPage";
import OwnerPromotionPage from "@/pages/owner/OwnerPromotionPage";
import ReviewManagementPage from "@/pages/owner/ReviewManagementPage";

// ─── 5. TRANG BÁO LỖI ───
import { NotFoundPage, ServerErrorPage } from "@/pages/error";

const router = createBrowserRouter([
  // ========================================================
  // 1. PHÂN HỆ KHÁCH HÀNG (GUEST & CUSTOMER)
  // ========================================================
  {
    path: "/",
    element: <GuestLayout />,
    errorElement: <ServerErrorPage />, // Tự động bắt lỗi nếu render trang sập
    children: [
      { index: true, element: <HomePage /> },
      { path: "hotels", element: <HotelListPage /> },
      { path: "hotel/:id", element: <HotelDetailPage /> },
      { path: "promotions", element: <PromotionPage /> },
      { path: "booking", element: <BookingConfirmPage /> },
      { path: "booking-confirm", element: <BookingConfirmPage /> },
      { path: "booking-success", element: <BookingSuccessPage /> },
      { path: "checkout", element: <CheckoutPage /> },

      // Route yêu cầu đăng nhập đối với Khách hàng
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile", element: <UserProfilePage /> },
          { path: "UserProfilePage", element: <UserProfilePage /> },
        ],
      },
    ],
  },

  // ========================================================
  // 2. PHÂN HỆ ĐĂNG NHẬP / ĐĂNG KÝ
  // ========================================================
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterForm />,
  },
  {
    path: "/register-owner",
    element: <RegisterForm />,
  },

  // ========================================================
  // 3. PHÂN HỆ DÀNH CHO CHỦ KHÁCH SẠN (OWNER PORTAL)
  // ========================================================
  {
    path: "/owner",
    element: <OwnerRoutes />, // Bảo vệ quyền Chủ nhà
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <OwnerLayout />, // Khung giao diện Sidebar Xanh Lá
        children: [
          { index: true, element: <Navigate to="/owner/dashboard" replace /> },
          { path: "dashboard", element: <OwnerDashboardPage /> },

          // Quản lý Khách sạn
          { path: "hotels", element: <HotelManagementPage /> },
          { path: "hotels/edit/:id", element: <HotelEditPage /> },
          { path: "register-hotel", element: <HotelEditPage /> },

          // Quản lý Loại phòng & Sơ đồ số phòng
          { path: "rooms", element: <RoomManagementPage /> },
          { path: "rooms/new", element: <RoomEditPage /> },
          { path: "rooms/edit/:id", element: <RoomEditPage /> },
          { path: "room-numbers", element: <RoomNumberPage /> },

          // Vận hành Đặt phòng & Check-in/out
          { path: "bookings", element: <BookingListPage /> },
          { path: "bookings/:id", element: <BookingDetailPage /> },

          // Dịch vụ gia tăng, Khuyến mãi, Đánh giá
          { path: "services", element: <ServiceManagementPage /> },
          { path: "promotions", element: <OwnerPromotionPage /> },
          { path: "reviews", element: <ReviewManagementPage /> },
        ],
      },
    ],
  },

  // ========================================================
  // 4. PHÂN HỆ DÀNH CHO QUẢN TRỊ VIÊN TỐI CAO (ADMIN PORTAL)
  // ========================================================
  {
    path: "/admin",
    element: <AdminRoutes />, // Bảo vệ quyền Admin
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <AdminLayout />, // Khung giao diện Sidebar Xanh Dương
        children: [
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

  // ========================================================
  // 5. TRANG BÁO LỖI 404 (KHI GÕ SAI ĐƯỜNG DẪN URL)
  // ========================================================
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;
