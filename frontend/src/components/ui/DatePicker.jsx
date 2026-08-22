import React, { forwardRef } from "react";
import ReactDatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import { Calendar, X } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker-custom.css";

registerLocale("vi", vi);

const formatDateVN = (date) => {
  if (!date) return "";
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return `${days[date.getDay()]}, ${date.getDate()} thg ${date.getMonth() + 1}`;
};

const CustomInput = forwardRef(
  ({ onClick, startDate, endDate, placeholder, clearable, onClear }, ref) => {
    const hasValue = startDate || endDate;

    const renderText = () => {
      if (startDate && endDate) {
        return `${formatDateVN(startDate)} – ${formatDateVN(endDate)}`;
      }
      if (startDate) {
        return `${formatDateVN(startDate)} – chọn ngày trả`;
      }
      return placeholder;
    };

    return (
      <div
        ref={ref}
        onClick={onClick}
        className="relative w-full h-14 bg-white rounded-lg flex items-center px-3 cursor-pointer select-none border border-transparent hover:border-gray-200 transition-all"
      >
        <Calendar size={22} className="text-gray-500 mr-3 shrink-0" />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <span className="text-[11px] text-blue-600 font-medium leading-none mb-1 truncate">
            Ngày nhận phòng — Ngày trả phòng
          </span>
          <span
            className={`text-sm font-bold truncate ${
              hasValue ? "text-gray-800" : "text-gray-400"
            }`}
          >
            {renderText()}
          </span>
        </div>

        {clearable && hasValue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 ml-1 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
);

CustomInput.displayName = "CustomInput";

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
        minDate={new Date()}
        monthsShown={2}
        showOutsideDays={false} // <-- TẮT NGÀY DƯ CỦA THÁNG KHÁC Ở ĐÂY
        isClearable={false}
        customInput={
          <CustomInput
            startDate={startDate}
            endDate={endDate}
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