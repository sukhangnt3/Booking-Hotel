import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import GuestLayout from "../components/layout/GuestLayout";
import HomePage from "../pages/guest/HomePage";
import HotelListPage from "../pages/guest/HotelListPage";
import HotelDetailPage from "../pages/guest/HotelDetailPage";
import UserProfilePage from "../pages/guest/UserProfilePage";
import BookingConfirmPage from "../pages/guest/BookingConfirmPage";
import BookingSuccessPage from "../pages/guest/BookingSuccessPage";
import LoginPage from "../pages/auth/LoginPage";
import CheckoutPage from "../pages/guest/CheckoutPage";
const router = createBrowserRouter([
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
  {
    path: "/login",
    element: <LoginPage />,
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes; // ĐÂY LÀ DÒNG EXPORT DUY NHẤT VÀ ĐÚNG
