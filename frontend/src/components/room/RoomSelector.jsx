import React, { useState, useMemo } from "react";
import {
  Users,
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Info,
} from "lucide-react";
import { Button, Badge } from "../ui";
import { cn } from "@/utils/cn";

const RoomSelector = ({ rooms = [], onSelectionChange }) => {
  // 1. State lưu số lượng chọn cho từng loại phòng: { [roomId]: quantity }
  const [selections, setSelections] = useState({});

  // 2. Tính toán tổng tiền và tổng số phòng đã chọn
  const summary = useMemo(() => {
    let totalMoney = 0;
    let totalRooms = 0;

    Object.entries(selections).forEach(([roomId, qty]) => {
      const room = rooms.find((r) => r.id.toString() === roomId);
      if (room && qty > 0) {
        totalMoney += (room.sell_price || 0) * qty;
        totalRooms += qty;
      }
    });

    return { totalMoney, totalRooms };
  }, [selections, rooms]);

  // 3. Hàm thay đổi số lượng
  const updateQuantity = (roomId, delta, stock) => {
    setSelections((prev) => {
      const currentQty = prev[roomId] || 0;
      const newQty = currentQty + delta;

      if (newQty < 0 || newQty > stock) return prev;

      const newSelections = { ...prev, [roomId]: newQty };

      // Gửi dữ liệu ra ngoài cho component cha
      if (onSelectionChange) {
        const selectedData = Object.entries(newSelections)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => ({ roomId: id, quantity: qty }));
        onSelectionChange(selectedData, summary.totalMoney);
      }

      return newSelections;
    });
  };

  const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm font-sans">
      {/* HEADER BẢNG (Desktop) */}
      <div className="hidden md:grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500">
        <div className="col-span-5">Loại phòng</div>
        <div className="col-span-2 text-center">Sức chứa</div>
        <div className="col-span-3 text-right">Giá mỗi đêm</div>
        <div className="col-span-2 text-center">Số lượng</div>
      </div>

      {/* DANH SÁCH PHÒNG */}
      <div className="divide-y divide-gray-100">
        {rooms.map((room) => {
          const qty = selections[room.id] || 0;
          const isSelected = qty > 0;
          const stock = room.stock || 5; // Giả sử tồn kho là 5 nếu không có dữ liệu
          const isSoldOut = stock <= 0;

          return (
            <div
              key={room.id}
              className={cn(
                "grid grid-cols-1 md:grid-cols-12 px-4 md:px-6 py-6 gap-4 items-center transition-colors",
                isSelected ? "bg-blue-50/30" : "hover:bg-gray-50/50",
                isSoldOut && "opacity-50 grayscale",
              )}
            >
              {/* Cột 1: Thông tin phòng */}
              <div className="col-span-1 md:col-span-5 space-y-2">
                <h4 className="font-bold text-base text-blue-900 leading-tight">
                  {room.name}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <BedDouble size={14} className="text-gray-400" />
                    <span>{room.bed_type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <CheckCircle2 size={14} />
                    <span>Miễn phí hủy phòng</span>
                  </div>
                </div>
                {stock <= 2 && !isSoldOut && (
                  <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1">
                    <AlertTriangle size={12} /> Chỉ còn {stock} phòng trống!
                  </p>
                )}
              </div>

              {/* Cột 2: Sức chứa */}
              <div className="col-span-1 md:col-span-2 flex justify-start md:justify-center">
                <div className="flex items-center gap-1 text-gray-700">
                  {[...Array(Math.min(room.capacity, 4))].map((_, i) => (
                    <Users key={i} size={16} />
                  ))}
                  {room.capacity > 4 && (
                    <span className="text-xs font-bold">
                      +{room.capacity - 4}
                    </span>
                  )}
                </div>
              </div>

              {/* Cột 3: Giá */}
              <div className="col-span-1 md:col-span-3 text-left md:text-right">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-gray-900">
                    {formatPrice(room.sell_price)} VND
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Gồm thuế và phí
                  </span>
                </div>
              </div>

              {/* Cột 4: Chọn số lượng */}
              <div className="col-span-1 md:col-span-2 flex justify-center">
                {isSoldOut ? (
                  <Badge variant="default">Hết phòng</Badge>
                ) : (
                  <div className="flex items-center gap-4 bg-white border border-gray-300 rounded-lg p-1 px-2 shadow-sm">
                    <button
                      type="button"
                      disabled={qty === 0}
                      onClick={() => updateQuantity(room.id, -1, stock)}
                      className="text-blue-600 disabled:text-gray-300 transition-colors p-1"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="font-bold text-sm min-w-[20px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={qty >= stock}
                      onClick={() => updateQuantity(room.id, 1, stock)}
                      className="text-blue-600 disabled:text-gray-300 transition-colors p-1"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER: TỔNG KẾT & NÚT ĐẶT */}
      {summary.totalRooms > 0 && (
        <div className="bg-[#003580] text-white px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium opacity-80">
              Bạn đã chọn{" "}
              <span className="font-bold underline">
                {summary.totalRooms} phòng
              </span>
            </p>
            <h3 className="text-2xl font-black">
              {formatPrice(summary.totalMoney)} VND
            </h3>
          </div>
          <Button
            className="w-full md:w-auto bg-white text-blue-900 hover:bg-gray-100 font-black px-12 h-14 text-lg rounded-xl shadow-xl"
            onClick={() => console.log("Tiến hành đặt:", selections)}
          >
            Tôi sẽ đặt
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoomSelector;
