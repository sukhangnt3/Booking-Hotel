import React from "react";
import { Check, BedDouble, User, CreditCard } from "lucide-react";
import { cn } from "@/utils/cn";

const steps = [
  {
    id: 1,
    label: "Chọn phòng",
    icon: <BedDouble size={20} />,
  },
  {
    id: 2,
    label: "Thông tin",
    icon: <User size={20} />,
  },
  {
    id: 3,
    label: "Thanh toán",
    icon: <CreditCard size={20} />,
  },
];

const BookingStepper = ({ currentStep = 1, className = "" }) => {
  return (
    <div className={cn("w-full max-w-4xl mx-auto px-4 py-8", className)}>
      <div className="relative flex justify-between items-center">
        {/* THANH NỀN (BACKGROUND LINE) */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0" />

        {/* THANH TIẾN TRÌNH CHẠY (PROGRESS LINE) */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-[#006ce4] -translate-y-1/2 z-0 transition-all duration-500 ease-in-out"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {/* CÁC BƯỚC (STEPS) */}
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center group"
            >
              {/* Vòng tròn Icon */}
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 shadow-sm",
                  isCompleted
                    ? "bg-[#006ce4] border-[#006ce4] text-white"
                    : isActive
                      ? "bg-white border-[#006ce4] text-[#006ce4] ring-4 ring-blue-50"
                      : "bg-white border-gray-300 text-gray-400",
                )}
              >
                {isCompleted ? (
                  <Check
                    size={24}
                    strokeWidth={3}
                    className="animate-in zoom-in"
                  />
                ) : (
                  <div
                    className={cn(
                      "transition-colors",
                      isActive ? "text-[#006ce4]" : "text-gray-400",
                    )}
                  >
                    {step.icon}
                  </div>
                )}
              </div>

              {/* Nhãn chữ (Label) */}
              <div className="absolute top-full mt-3 flex flex-col items-center min-w-[100px]">
                <span
                  className={cn(
                    "text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors duration-500",
                    isCompleted || isActive ? "text-gray-900" : "text-gray-400",
                  )}
                >
                  {step.label}
                </span>

                {/* Trạng thái chữ phụ (Chỉ hiện trên desktop) */}
                {isActive && (
                  <span className="hidden sm:block text-[10px] text-[#006ce4] font-bold animate-pulse">
                    Đang thực hiện
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingStepper;
