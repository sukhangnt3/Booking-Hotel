import React, { forwardRef } from "react";
import ReactDatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale"; // Import ngôn ngữ tiếng Việt
import { Calendar, X } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker-custom.css"; // File CSS để ghi đè style mặc định

registerLocale("vi", vi);

// 1. Tạo Custom Input để đồng bộ giao diện
const CustomInput = forwardRef(
  ({ value, onClick, placeholder, clearable, onClear }, ref) => (
    <div className="relative w-full group" onClick={onClick} ref={ref}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#006ce4] transition-colors">
        <Calendar size={18} />
      </div>
      <input
        readOnly
        value={value}
        placeholder={placeholder}
        className="w-full h-12 pl-10 pr-10 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer outline-none focus:border-[#006ce4] focus:ring-4 focus:ring-[#006ce4]/10 transition-all"
      />
      {clearable && value && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  ),
);

const DatePicker = ({
  startDate,
  endDate,
  onChange,
  placeholderText = "Chọn ngày nhận - trả phòng",
  className = "",
  ...props
}) => {
  return (
    <div className={`w-full ${className}`}>
      <ReactDatePicker
        selectsRange={true}
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        locale="vi"
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholderText}
        minDate={new Date()} // Không cho chọn ngày trong quá khứ
        monthsShown={2} // Hiển thị 2 tháng cùng lúc (giống các trang đặt phòng)
        isClearable={false}
        // Sử dụng Custom Input đã tạo ở trên
        customInput={
          <CustomInput
            placeholder={placeholderText}
            clearable={!!startDate}
            onClear={() => onChange([null, null])}
          />
        }
        {...props}
      />
    </div>
  );
};

export default DatePicker;
