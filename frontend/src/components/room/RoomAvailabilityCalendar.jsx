// src/components/room/RoomAvailabilityCalendar.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  X,
  Check,
  Edit3,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { cn } from "@/utils/cn";

export default function RoomAvailabilityCalendar({ rooms = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [inventoryMap, setInventoryMap] = useState({}); // { `${roomId}_${dateStr}`: item }
  const [selectedCell, setSelectedCell] = useState(null); // Modal chỉnh sửa nhanh ngày

  const [editForm, setEditForm] = useState({
    availableCount: 5,
    sellPrice: 650000,
    status: "active",
  });

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Tải dữ liệu inventory thật từ PostgreSQL cho các phòng
  const fetchMonthInventory = async () => {
    if (!rooms || rooms.length === 0) return;

    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();

    const newMap = {};
    for (const r of rooms) {
      try {
        const res = await apiClient.get(`/rooms/${r.id}/inventory`, {
          params: { month, year },
        });
        const list = res?.data || res?.inventory || [];
        list.forEach((item) => {
          const dStr = item.inventory_date.split("T")[0];
          newMap[`${r.id}_${dStr}`] = item;
        });
      } catch (e) {}
    }
    setInventoryMap(newMap);
  };

  useEffect(() => {
    fetchMonthInventory();
  }, [rooms, currentMonth]);

  const handleOpenEdit = (room, day) => {
    const dStr = format(day, "yyyy-MM-dd");
    const inv = inventoryMap[`${room.id}_${dStr}`];

    setSelectedCell({
      room,
      day,
      dStr,
      inv,
    });

    setEditForm({
      availableCount: inv ? inv.available_count : room.amount || 5,
      sellPrice: inv ? inv.sell_price : room.base_price || 650000,
      status: inv ? inv.status : "active",
    });
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    if (!selectedCell) return;

    try {
      await apiClient.patch(`/rooms/${selectedCell.room.id}/inventory`, {
        date: selectedCell.dStr,
        availableCount: Number(editForm.availableCount),
        sellPrice: Number(editForm.sellPrice),
        status: editForm.status,
      });

      alert(
        `✓ Đã cập nhật giá & tồn kho ngày ${selectedCell.dStr} thành công!`,
      );
      setSelectedCell(null);
      fetchMonthInventory();
    } catch (err) {
      alert(`Lỗi cập nhật: ${err?.response?.data?.message || err.message}`);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden font-sans">
      {/* HEADER: ĐIỀU HƯỚNG THÁNG */}
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <CalendarIcon className="text-[#003580]" size={24} />
            Lịch Tồn Kho & Giá Phòng Thực Tế (Bảng Room_Inventory)
          </h3>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">
            Tháng {format(currentMonth, "MM / yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-1.5 text-xs font-bold bg-white rounded-xl shadow-xs cursor-pointer"
          >
            Hôm nay
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* CHÚ THÍCH MÀU SẮC THẬT */}
      <div className="px-6 py-3 bg-gray-50 flex flex-wrap gap-6 border-b border-gray-100 text-xs font-bold text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" />
          <span>Còn trống</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300" />
          <span>Hết phòng / Đã khóa</span>
        </div>
      </div>

      {/* BẢNG LỊCH CHI TIẾT */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-white border-r border-b border-gray-200 px-6 py-4 text-left text-xs font-black text-gray-400 uppercase min-w-[220px]">
                Loại phòng
              </th>
              {daysInMonth.map((day) => (
                <th
                  key={day.toString()}
                  className={cn(
                    "border-b border-gray-200 px-2 py-3 text-center min-w-[50px]",
                    isToday(day) ? "bg-blue-50/70" : "",
                  )}
                >
                  <span className="block text-[10px] text-gray-400 uppercase">
                    {format(day, "eee", { locale: vi })}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isToday(day) ? "text-blue-700" : "text-gray-800",
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
                <td className="sticky left-0 z-20 bg-white border-r border-b border-gray-100 px-6 py-4">
                  <p className="font-bold text-sm text-gray-900 leading-tight">
                    {room.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tổng kho: {room.amount} phòng
                  </p>
                </td>

                {daysInMonth.map((day) => {
                  const dStr = format(day, "yyyy-MM-dd");
                  const inv = inventoryMap[`${room.id}_${dStr}`];

                  // Đọc số lượng phòng trống thật
                  const available = inv
                    ? inv.available_count
                    : room.amount || 5;
                  const isClosed =
                    inv && (inv.status === "closed" || available <= 0);

                  return (
                    <td
                      key={day.toString()}
                      className="border-b border-gray-100 p-1"
                    >
                      <div
                        onClick={() => handleOpenEdit(room, day)}
                        className={cn(
                          "h-11 w-full rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105 select-none",
                          isClosed
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200",
                        )}
                        title={`Bấm để sửa: Ngày ${dStr} - Phòng ${room.name}`}
                      >
                        <span className="font-black text-xs leading-none">
                          {isClosed ? "0" : available}
                        </span>
                        <span className="text-[9px] opacity-70 font-medium mt-0.5">
                          {inv
                            ? `${Math.round(inv.sell_price / 1000)}k`
                            : "Giá gốc"}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-5 bg-gray-50 flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Info size={15} className="text-blue-600 shrink-0" />
        <span>
          Mẹo quản trị: Nhấp vào bất kỳ ô ngày nào để điều chỉnh giá bán đặc
          biệt (cuối tuần, lễ tết) hoặc đóng/mở bán phòng cho ngày đó.
        </span>
      </div>

      {/* MODAL CHỈNH SỬA NHANH TỒN KHO THEO NGÀY */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <Edit3 size={16} className="text-blue-600" /> Cập Nhật Ngày{" "}
                  {selectedCell.dStr}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {selectedCell.room.name}
                </p>
              </div>
              <button onClick={() => setSelectedCell(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">
                  Số phòng mở bán trong ngày
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editForm.availableCount}
                  onChange={(e) =>
                    setEditForm({ ...editForm, availableCount: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-black text-emerald-700 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Giá bán thực tế ngày này (VNĐ)
                </label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={editForm.sellPrice}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sellPrice: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-black text-[#ff6a00] text-sm"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Trạng thái phòng</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold bg-white"
                >
                  <option value="active">✓ Mở bán bình thường (Active)</option>
                  <option value="closed">⛔ Đóng bán ngày này (Closed)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer"
                >
                  Lưu Vào Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
