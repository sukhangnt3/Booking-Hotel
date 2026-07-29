import React from "react";
import AppRoutes from "./routes";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
  // Thay cái dãy số dưới đây bằng Client ID thật bạn vừa lấy từ Google Console
  const clientId =
    "170029124079-qdlosvmne9limip29lfah50u2h9edf57.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {/* 
         Bọc AppRoutes ở đây để tất cả các trang bên trong (bao gồm LoginForm) 
         đều có thể sử dụng được tính năng đăng nhập Google 
      */}
      <AppRoutes />
    </GoogleOAuthProvider>
  );
}

export default App;
