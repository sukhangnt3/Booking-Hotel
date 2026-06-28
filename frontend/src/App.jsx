import React, { useState } from "react";
import GuestLayout from "./components/layout/GuestLayout";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null); // 'login' | 'register' | null

  return (
    <GuestLayout 
      user={user} 
      onAuthClick={(mode) => setAuthMode(mode)} 
      onLogout={() => setUser(null)}
    >
      {/* Nội dung danh sách phòng chính trên website */}
      <div className="py-4">
        <h2 className="text-2xl font-bold text-gray-800">Các chỗ nghỉ nổi bật</h2>
        <p className="text-gray-500 text-sm mt-1">Lựa chọn hàng đầu của chúng tôi dành cho chuyến đi của bạn</p>
      </div>

      {authMode === "login" && (
        <LoginForm 
          onClose={() => setAuthMode(null)} 
          onSwitchToRegister={() => setAuthMode("register")}
          onLoginSuccess={(userData) => setUser(userData)}
        />
      )}

      {authMode === "register" && (
        <RegisterForm 
          onClose={() => setAuthMode(null)} 
          onSwitchToLogin={() => setAuthMode("login")}
        />
      )}
    </GuestLayout>
  );
}

export default App;