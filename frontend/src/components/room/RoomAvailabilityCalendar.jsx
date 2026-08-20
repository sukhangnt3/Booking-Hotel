import React, { useState, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  startOfDay,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
} from "lucide-react";
import { cn } from "@/utils/cn";

const RoomAvailabilityCalendar = ({ rooms = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 1. Tính toán danh sách các ngày trong tháng hiện tại
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 2. Hàm giả lập lấy màu sắc theo trạng thái
  // Trong thực tế, bạn sẽ map dữ liệu từ API (availability table) vào đây
  const getStatusColor = (day, roomId) => {
    // Giả lập một vài ngày đã đặt hoặc hết phòng
    const dayValue = day.getDate();
    if (dayValue % 7 === 0) return "bg-rose-100 text-rose-600 border-rose-200"; // Hết phòng
    if (dayValue % 5 === 0)
      return "bg-amber-100 text-amber-600 border-amber-200"; // Sắp hết
    return "bg-emerald-50 text-emerald-600 border-emerald-100"; // Còn trống
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* HEADER: Điều hướng tháng */}
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" size={24} />
            Tình trạng phòng trống
          </h3>
          <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider font-bold">
            Tháng {format(currentMonth, "MM / yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-1.5 text-xs font-bold bg-white rounded-lg shadow-sm"
          >
            Hôm nay
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* CHÚ THÍCH (LEGEND) */}
      <div className="px-6 py-3 bg-gray-50 flex flex-wrap gap-6 border-b border-gray-100">
        <LegendItem
          color="bg-emerald-50 border-emerald-100"
          label="Còn trống"
        />
        <LegendItem
          color="bg-rose-100 border-rose-200"
          label="Hết phòng / Khóa"
        />
        <LegendItem
          color="bg-amber-100 border-amber-200"
          label="Sắp hết (< 3 phòng)"
        />
      </div>

      {/* BẢNG LỊCH (GRID VIEW) */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr>
              {/* Cột cố định tên phòng */}
              <th className="sticky left-0 z-20 bg-white border-r border-b border-gray-200 px-6 py-4 text-left text-xs font-black text-gray-400 uppercase min-w-[200px]">
                Loại phòng
              </th>
              {/* Danh sách ngày */}
              {daysInMonth.map((day) => (
                <th
                  key={day.toString()}
                  className={cn(
                    "border-b border-gray-200 px-2 py-3 text-center min-w-[45px]",
                    isToday(day) ? "bg-blue-50" : "",
                  )}
                >
                  <span className="block text-[10px] text-gray-400 uppercase">
                    {format(day, "eee", { locale: vi })}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isToday(day) ? "text-blue-600" : "text-gray-700",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rooms.map((room) => (
              <tr
                key={room.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {/* Tên phòng (Sticky) */}
                <td className="sticky left-0 z-20 bg-white border-r border-b border-gray-100 px-6 py-4">
                  <p className="font-bold text-sm text-gray-900 leading-tight">
                    {room.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {room.room_count} phòng tổng
                  </p>
                </td>

                {/* Các ô trạng thái theo ngày */}
                {daysInMonth.map((day) => {
                  const statusClass = getStatusColor(day, room.id);
                  return (
                    <td
                      key={day.toString()}
                      className="border-b border-gray-100 p-1"
                    >
                      <div
                        className={cn(
                          "h-10 w-full rounded-lg border flex items-center justify-center text-[10px] font-black transition-all hover:scale-105 cursor-pointer",
                          statusClass,
                        )}
                        title={`Ngày ${format(day, "dd/MM")}: ${room.name}`}
                      >
                        {/* Ví dụ hiện số phòng còn lại */}
                        {day.getDate() % 7 === 0 ? "0" : "5"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-gray-50 flex items-center gap-2 text-xs text-gray-500 italic">
        <Info size={14} />
        Mẹo: Nhấp vào một ô để chỉnh sửa nhanh giá hoặc đóng/mở phòng cho ngày
        đó.
      </div>
    </div>
  );
};

// Component phụ cho chú thích
const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={cn("w-4 h-4 rounded border", color)} />
    <span className="text-xs font-bold text-gray-600">{label}</span>
  </div>
);

export default RoomAvailabilityCalendar;
