// src/pages/reception/components/ChangeRoomModal.jsx
import React, { useState, useMemo } from "react";
import {
  X,
  ArrowRightLeft,
  DoorOpen,
  Check,
  AlertCircle,
  Calendar,
  Split,
  Layers,
} from "lucide-react";

export default function ChangeRoomModal({
  isOpen,
  onClose,
  currentRoom,
  allRooms = [],
  onConfirmChange,
}) {
  const [selectedNewRoomNumber, setSelectedNewRoomNumber] = useState("");
  const [switchMode, setSwitchMode] = useState("split_stay");
  const [applyNewPrice, setApplyNewPrice] = useState(true);
  const [loading, setLoading] = useState(false);

  const availableRooms = useMemo(() => {
    if (!isOpen || !currentRoom) return [];
    return allRooms.filter(
      (r) =>
        r.room_number !== currentRoom.room_number &&
        (r.status === "available" || !r.booking) &&
        r.status !== "occupied" &&
        r.status !== "incoming",
    );
  }, [isOpen, currentRoom, allRooms]);

  const targetRoom = useMemo(() => {
    return availableRooms.find((r) => r.room_number === selectedNewRoomNumber);
  }, [availableRooms, selectedNewRoomNumber]);

  const stayCalculations = useMemo(() => {
    if (!currentRoom?.booking) {
      return { totalDays: 1, stayedDays: 1, remainingDays: 0 };
    }
    const checkin = new Date(currentRoom.booking.checkin_date || Date.now());
    const checkout = new Date(currentRoom.booking.checkout_date || Date.now());
    const now = new Date();

    const diffTotalMs = Math.max(0, checkout.getTime() - checkin.getTime());
    const totalDays = Math.max(
      1,
      Math.ceil(diffTotalMs / (1000 * 60 * 60 * 24)),
    );

    let stayedDays = 1;
    if (currentRoom.status === "occupied") {
      const diffStayedMs = Math.max(0, now.getTime() - checkin.getTime());
      stayedDays = Math.max(
        1,
        Math.min(totalDays, Math.ceil(diffStayedMs / (1000 * 60 * 60 * 24))),
      );
    }
    const remainingDays = Math.max(1, totalDays - stayedDays);

    return { totalDays, stayedDays, remainingDays };
  }, [currentRoom]);

  if (!isOpen || !currentRoom) return null;

  const currentBooking = currentRoom.booking;
  const oldDailyPrice = Number(currentRoom.daily_price || 0);
  const newDailyPrice = Number(targetRoom?.daily_price || oldDailyPrice);

  let calculatedLegs = [];
  let calculatedTotalPrice = 0;

  if (targetRoom) {
    if (switchMode === "split_stay" && currentRoom.status === "occupied") {
      const leg1Amount = stayCalculations.stayedDays * oldDailyPrice;
      const leg2Daily = applyNewPrice ? newDailyPrice : oldDailyPrice;
      const leg2Amount = stayCalculations.remainingDays * leg2Daily;

      calculatedLegs = [
        {
          room_number: currentRoom.room_number,
          type_name: currentRoom.type_name,
          duration_text: `${stayCalculations.stayedDays} ngày (Đã ở)`,
          unit_price: oldDailyPrice,
          amount: leg1Amount,
          is_closed: true,
        },
        {
          room_number: targetRoom.room_number,
          type_name: targetRoom.type_name,
          duration_text: `${stayCalculations.remainingDays} ngày (Chuyển sang)`,
          unit_price: leg2Daily,
          amount: leg2Amount,
          is_current: true,
        },
      ];
      calculatedTotalPrice = leg1Amount + leg2Amount;
    } else {
      const finalDaily = applyNewPrice ? newDailyPrice : oldDailyPrice;
      const totalAmount = stayCalculations.totalDays * finalDaily;

      calculatedLegs = [
        {
          room_number: targetRoom.room_number,
          type_name: targetRoom.type_name,
          duration_text: `${stayCalculations.totalDays} ngày (Toàn bộ)`,
          unit_price: finalDaily,
          amount: totalAmount,
          is_current: true,
        },
      ];
      calculatedTotalPrice = totalAmount;
    }
  }

  const handleConfirm = async () => {
    if (!selectedNewRoomNumber) {
      alert("Vui lòng chọn phòng trống muốn chuyển tới!");
      return;
    }
    setLoading(true);
    try {
      await onConfirmChange({
        newRoomNumber: selectedNewRoomNumber,
        mode: switchMode,
        newTotalPrice: calculatedTotalPrice,
        roomLegs: calculatedLegs,
      });
      setSelectedNewRoomNumber("");
      onClose();
    } catch (err) {
      // Bắt lỗi từ hàm cha
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn backdrop-blur-2xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1b6a38] text-white">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Đổi phòng cho khách (Chuẩn KiotViet)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[82vh] overflow-y-auto">
          {/* Thông tin phòng hiện tại */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-emerald-800 font-bold uppercase">
                Phòng đang ở
              </div>
              <div className="text-base font-black text-emerald-950">
                {currentRoom.room_number} - {currentRoom.type_name}
              </div>
              <div className="text-slate-600 mt-0.5">
                Khách:{" "}
                <strong className="text-slate-800">
                  {currentBooking?.customer_name || "Khách lẻ"}
                </strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">
                Đơn giá gốc
              </span>
              <span className="text-sm font-bold text-slate-900">
                {oldDailyPrice.toLocaleString("vi-VN")} đ/ngày
              </span>
            </div>
          </div>

          {/* Chọn phòng mới */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <DoorOpen size={14} className="text-[#1b6a38]" />
              <span>
                Chọn phòng chuyển sang ({availableRooms.length} phòng trống khả
                dụng):
              </span>
            </label>

            {availableRooms.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Hiện không còn phòng trống nào khác để đổi!</span>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {availableRooms.map((room) => {
                  const isSelected = selectedNewRoomNumber === room.room_number;
                  const diff = Number(room.daily_price || 0) - oldDailyPrice;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedNewRoomNumber(room.room_number)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "bg-emerald-100/70 border-l-4 border-[#1b6a38]"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <span>{room.room_number}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-semibold">
                            {room.area || "Tầng 1"}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {room.type_name} •{" "}
                          <strong className="text-slate-800">
                            {Number(room.daily_price || 0).toLocaleString(
                              "vi-VN",
                            )}{" "}
                            đ/ngày
                          </strong>
                        </div>
                      </div>

                      <div className="text-right">
                        {diff > 0 && (
                          <span className="text-[11px] font-bold text-rose-600 block">
                            +{diff.toLocaleString("vi-VN")} đ (Nâng hạng)
                          </span>
                        )}
                        {diff < 0 && (
                          <span className="text-[11px] font-bold text-emerald-600 block">
                            -{Math.abs(diff).toLocaleString("vi-VN")} đ (Hạ
                            hạng)
                          </span>
                        )}
                        {diff === 0 && (
                          <span className="text-[11px] font-bold text-slate-500 block">
                            Cùng giá
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hai tùy chọn tính thời gian & giá phòng */}
          {targetRoom && currentRoom.status === "occupied" && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#1b6a38]" />
                <span>Phương án tính thời gian & tiền phòng:</span>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-[#1b6a38] transition">
                  <input
                    type="radio"
                    name="kiot_switch_mode"
                    checked={switchMode === "split_stay"}
                    onChange={() => setSwitchMode("split_stay")}
                    className="accent-[#1b6a38] mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block flex items-center gap-1">
                      <Split size={13} className="text-[#1b6a38]" />
                      Tính thời gian sử dụng ở CẢ HAI PHÒNG (Khuyên dùng)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Ở phòng cũ {stayCalculations.stayedDays} ngày (tính giá
                      cũ) + phòng mới {stayCalculations.remainingDays} ngày
                      (tính giá mới).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-[#1b6a38] transition">
                  <input
                    type="radio"
                    name="kiot_switch_mode"
                    checked={switchMode === "transfer_all"}
                    onChange={() => setSwitchMode("transfer_all")}
                    className="accent-[#1b6a38] mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block flex items-center gap-1">
                      <Layers size={13} className="text-slate-600" />
                      Chuyển toàn bộ thời gian sang phòng mới
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Áp dụng khi khách vừa vào nhận phòng đổi ngay hoặc phòng
                      cũ bị sự cố.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  Chính sách giá phòng mới:
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="kiot_price_mode"
                      checked={applyNewPrice === true}
                      onChange={() => setApplyNewPrice(true)}
                      className="accent-[#1b6a38]"
                    />
                    <span>Áp dụng giá phòng mới</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="kiot_price_mode"
                      checked={applyNewPrice === false}
                      onChange={() => setApplyNewPrice(false)}
                      className="accent-[#1b6a38]"
                    />
                    <span>Giữ giá cũ</span>
                  </label>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-2">
                <div className="font-bold text-emerald-900 flex justify-between">
                  <span>Tạm tính hoá đơn sau khi đổi:</span>
                  <span className="text-sm font-black text-[#1b6a38]">
                    {calculatedTotalPrice.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="space-y-1 text-[11px] divide-y divide-emerald-100">
                  {calculatedLegs.map((leg, idx) => (
                    <div key={idx} className="flex justify-between pt-1">
                      <span className="text-slate-700">
                        • Phòng <strong>{leg.room_number}</strong>:{" "}
                        {leg.duration_text} x{" "}
                        {leg.unit_price.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="font-bold text-slate-900">
                        {leg.amount.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !selectedNewRoomNumber}
            className="px-5 py-2 bg-[#1b6a38] hover:bg-[#14532d] disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer transition text-xs flex items-center gap-1.5 shadow-sm"
          >
            <ArrowRightLeft size={14} />
            <span>{loading ? "Đang xử lý..." : "Xác nhận đổi phòng"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
