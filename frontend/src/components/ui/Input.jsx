import React from "react";

const Input = ({ label, type = "text", placeholder, value, onChange, required = false, hasError = false }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-2.5 border rounded-lg outline-none text-gray-800 text-sm transition-all focus:border-[#005cb8] ${
          hasError ? "border-red-500 bg-red-50 focus:border-red-500" : "border-gray-200"
        }`}
      />
    </div>
  );
};

export default Input;