import React, { useState, useEffect } from "react";
import GuestLayout from "./components/layout/GuestLayout";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null); // 'login' | 'register' | null

  // 🔄 TỰ ĐỘNG KHÔI PHỤC ĐĂNG NHẬP BẰNG FETCH KHI F5
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        // Gọi API lấy profile bằng fetch
        const response = await fetch("http://localhost:5000/api/auth/profile", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data.user); // Nạp lại user nếu token hợp lệ
        } else {
          localStorage.removeItem("token"); // Token giả/hết hạn thì xóa đi
        }
      } catch (error) {
        console.error("Lỗi kết nối API xác thực:", error);
      }
    };

    checkLoggedIn();
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <GuestLayout 
      user={user} 
      onAuthClick={(mode) => setAuthMode(mode)} 
      onLogout={handleLogout}
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