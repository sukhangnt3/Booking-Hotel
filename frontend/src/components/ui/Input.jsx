import React from 'react';

const Input = ({ 
  label, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  required = false, 
  hasError = false,
  errorText, // Thêm prop để truyền thẳng text báo lỗi bên dưới ô nhập
  className = '', // Cho phép ghi đè các class CSS từ bên ngoài (như Header/Filter)
  ...props 
}) => {
  return (
    <div className="w-full flex flex-col justify-center">
      {/* 1. Hiển thị Label nếu được truyền vào */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1 select-none">
          {label}
        </label>
      )}
      
      {/* 2. Ô nhập liệu chính */}
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        // Kết hợp linh hoạt class mặc định và class truyền thêm từ ngoài vào
        className={`w-full bg-transparent text-gray-800 text-sm outline-none transition-all placeholder-gray-500 ${
          hasError 
            ? "border-red-500 bg-red-50 focus:border-red-500" 
            : ""
        } ${className}`}
        {...props}
      />

      {/* 3. Hiển thị dòng chữ báo lỗi màu đỏ (nếu có) */}
      {hasError && errorText && (
        <span className="text-xs text-red-500 mt-1 select-none font-medium">
          {errorText}
        </span>
      )}
    </div>
  );
};

export default Input;