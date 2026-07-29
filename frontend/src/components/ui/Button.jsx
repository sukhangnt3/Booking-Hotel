import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  className = '', 
  disabled = false,
  isLoading = false, // Hỗ trợ hiển thị xoay xoay khi đang tải dữ liệu
  ...props 
}) => {
  
  // 1. Style cốt lõi bắt buộc nút nào cũng phải có
  const baseStyles = "inline-flex items-center justify-center font-medium text-sm transition-all duration-200 select-none outline-none focus:outline-none";
  
  // 2. Map chuẩn các loại nút theo đúng giao diện Booking.com bạn cần
  const variants = {
    // Nút "Tìm" (màu xanh dương đậm, chữ to, bo góc vừa)
    primary: "bg-[#006ce4] text-white hover:bg-[#0052b4] active:bg-[#004394] rounded-md text-lg px-8 py-3", 
    
    // Nút "Đăng ký / Đăng nhập" (nền trắng hẳn, chữ xanh Booking, viền sắc nét)
    outline: "bg-white text-[#003580] hover:bg-[#f0f6ff] border border-transparent rounded-sm px-4 py-1.5", 
    
    // Nút chữ trắng hoàn toàn (VND, Cờ Việt Nam, Đăng chỗ nghỉ)
    text: "text-white hover:bg-white/10 rounded-sm px-3 py-2", 
    
    // Nút Menu tròn bên dưới (Lưu trú, Chuyến bay...)
    ghost: "border border-white/50 text-white bg-white/10 hover:bg-white/20 rounded-full px-4 py-2" 
  };

  // 3. Trạng thái khi nút bị khóa (disabled hoặc đang loading)
  const disabledStyles = (disabled || isLoading) 
    ? "opacity-50 cursor-not-allowed pointer-events-none" 
    : "cursor-pointer";

  return (
    <button 
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${disabledStyles} ${className}`} 
      {...props}
    >
      {/* Nếu đang loading thì hiển thị vòng xoay nhỏ, ngược lại hiển thị chữ/icon bình thường */}
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang tải...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;