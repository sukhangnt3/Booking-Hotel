import React, { useState, useEffect } from "react";
import { Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/utils/cn";

const CountdownTimer = ({ initialMinutes = 15, onExpire, className = "" }) => {
  const [seconds, setSeconds] = useState(initialMinutes * 60);

  useEffect(() => {
    if (seconds <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timerId = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [seconds, onExpire]);

  // Chuyển đổi giây sang định dạng MM:SS
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Trạng thái khẩn cấp (dưới 2 phút)
  const isUrgent = seconds < 120;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border transition-all duration-500",
        isUrgent
          ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
          : "bg-blue-50 border-blue-100 text-blue-700",
        className,
      )}
    >
      <div
        className={cn(
          "p-2 rounded-full",
          isUrgent ? "bg-red-100" : "bg-blue-100",
        )}
      >
        {isUrgent ? <AlertTriangle size={20} /> : <Timer size={20} />}
      </div>

      <div className="flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 leading-none mb-1">
          Thời gian hoàn tất đặt phòng
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black tabular-nums">
            {formatTime(seconds)}
          </span>
          <span className="text-[10px] font-medium opacity-70">
            {isUrgent
              ? "Hãy nhanh tay, phòng sắp bị mở lại!"
              : "Chúng tôi đang giữ giá này cho bạn"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
