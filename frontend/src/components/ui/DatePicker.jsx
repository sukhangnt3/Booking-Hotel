import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Import file CSS mặc định của thư viện

const DatePicker = ({ selected, onChange, placeholderText, className = '', ...props }) => {
  return (
    <div className="w-full relative custom-datepicker">
      <ReactDatePicker
        selected={selected}
        onChange={onChange}
        placeholderText={placeholderText}
        selectsRange // Cho phép chọn từ ngày - đến ngày trên thanh ngang
        startDate={props.startDate}
        endDate={props.endDate}
        dateFormat="dd/MM/yyyy"
        className={`w-full bg-transparent text-black placeholder-gray-500 font-normal py-2 px-1 border-none outline-none focus:outline-none focus:ring-0 cursor-pointer ${className}`}
        {...props}
      />
    </div>
  );
};

export default DatePicker;