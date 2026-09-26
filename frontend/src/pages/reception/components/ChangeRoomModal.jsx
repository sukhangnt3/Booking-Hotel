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
  Clock,
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

  // 🌟 TÍNH TOÁN THỜI GIAN LƯU TRÚ (GHÉP CẢ NGÀY + GIỜ ĐỂ KHÔNG BỊ = 0 KHI CÙNG NGÀY)
  const stayCalculations = useMemo(() => {
    if (!currentRoom?.booking) {
      return {
        isHourly: false,
        totalUnits: 1,
        stayedUnits: 1,
        remainingUnits: 0,
        unitLabel: "ngày",
      };
    }
    const b = currentRoom.booking;
    const isHourly = b.rental_type === "HOUR";

    const inDate = String(b.checkin_date || "").slice(0, 10);
    const outDate = String(b.checkout_date || inDate).slice(0, 10);
    const inTime = String(b.checkin_time || "14:00").slice(0, 5);
    const outTime = String(b.checkout_time || "12:00").slice(0, 5);

    const startMs = new Date(`${inDate}T${inTime}:00`).getTime();
    const endMs = new Date(`${outDate}T${outTime}:00`).getTime();
    const nowMs = Date.now();

    if (isHourly) {
      const diffTotalMs = Math.max(0, endMs - startMs);
      const totalHours = Math.max(
        1,
        Math.round(diffTotalMs / (1000 * 60 * 60)),
      );
      const diffStayedMs = Math.max(0, nowMs - startMs);
      const stayedHours = Math.max(
        1,
        Math.min(totalHours, Math.ceil(diffStayedMs / (1000 * 60 * 60))),
      );
      const remainingHours = Math.max(1, totalHours - stayedHours);

      return {
        isHourly: true,
        totalUnits: totalHours,
        stayedUnits: stayedHours,
        remainingUnits: remainingHours,
        unitLabel: "giờ",
      };
    }

    const diffTotalMs = Math.max(0, endMs - startMs);
    const totalDays = Math.max(
      1,
      Math.ceil(diffTotalMs / (1000 * 60 * 60 * 24)),
    );
    let stayedDays = 1;
    if (currentRoom.status === "occupied") {
      const diffStayedMs = Math.max(0, nowMs - startMs);
      stayedDays = Math.max(
        1,
        Math.min(totalDays, Math.ceil(diffStayedMs / (1000 * 60 * 60 * 24))),
      );
    }
    const remainingDays = Math.max(1, totalDays - stayedDays);

    return {
      isHourly: false,
      totalUnits: totalDays,
      stayedUnits: stayedDays,
      remainingUnits: remainingDays,
      unitLabel: "ngày",
    };
  }, [currentRoom]);

  if (!isOpen || !currentRoom) return null;

  const currentBooking = currentRoom.booking;
  const isHourly = stayCalculations.isHourly;

  const oldRate = Number(
    isHourly
      ? currentRoom.hourly_price ||
          Math.round((currentRoom.daily_price || 200000) * 0.25)
      : currentRoom.daily_price || 0,
  );

  const newRate = Number(
    targetRoom
      ? isHourly
        ? targetRoom.hourly_price ||
          Math.round((targetRoom.daily_price || 200000) * 0.25)
        : targetRoom.daily_price || oldRate
      : oldRate,
  );

  let calculatedLegs = [];
  let calculatedTotalPrice = 0;

  if (targetRoom) {
    if (switchMode === "split_stay" && currentRoom.status === "occupied") {
      const leg1Amount = stayCalculations.stayedUnits * oldRate;
      const leg2Rate = applyNewPrice ? newRate : oldRate;
      const leg2Amount = stayCalculations.remainingUnits * leg2Rate;

      calculatedLegs = [
        {
          room_number: currentRoom.room_number,
          type_name: currentRoom.type_name,
          duration_text: `${stayCalculations.stayedUnits} ${stayCalculations.unitLabel} (Đã ở)`,
          unit_price: oldRate,
          amount: leg1Amount,
          is_closed: true,
        },
        {
          room_number: targetRoom.room_number,
          type_name: targetRoom.type_name,
          duration_text: `${stayCalculations.remainingUnits} ${stayCalculations.unitLabel} (Chuyển sang)`,
          unit_price: leg2Rate,
          amount: leg2Amount,
          is_current: true,
        },
      ];
      calculatedTotalPrice = leg1Amount + leg2Amount;
    } else {
      const finalRate = applyNewPrice ? newRate : oldRate;
      const totalAmount = stayCalculations.totalUnits * finalRate;

      calculatedLegs = [
        {
          room_number: targetRoom.room_number,
          type_name: targetRoom.type_name,
          duration_text: `${stayCalculations.totalUnits} ${stayCalculations.unitLabel} (Toàn bộ)`,
          unit_price: finalRate,
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
      // Bắt lỗi ngoại lệ
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 animate-fadeIn backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-200 text-xs text-gray-900 animate-scaleUp my-auto">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-7 py-4.5 bg-[#003580] text-white shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight leading-none text-white">
                  Đổi Phòng Cho Khách Lưu Trú
                </h2>
                <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 font-bold border border-white/15">
                  ROOM SWITCH
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Tự động phân tách thời gian ở và tính chênh lệch đơn giá
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* NỘI DUNG */}
        <div className="p-7 space-y-5 text-xs max-h-[82vh] overflow-y-auto bg-white">
          {/* Thông tin phòng hiện tại */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4.5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-[10px] text-[#006ce4] font-black uppercase tracking-wider">
                Phòng đang lưu trú (
                {isHourly ? "Thuê theo giờ" : "Thuê theo ngày"})
              </div>
              <div className="text-base font-black text-[#0a2540] mt-0.5">
                Phòng {currentRoom.room_number} • {currentRoom.type_name}
              </div>
              <div className="text-gray-600 mt-1 font-medium">
                Khách hàng:{" "}
                <strong className="text-gray-900 font-bold">
                  {currentBooking?.customer_name || "Khách lẻ"}
                </strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">
                Đơn giá phòng cũ
              </span>
              <span className="text-sm font-black text-[#003580] tabular-nums">
                {oldRate.toLocaleString("vi-VN")} ₫/{stayCalculations.unitLabel}
              </span>
            </div>
          </div>

          {/* Chọn phòng chuyển sang */}
          <div className="space-y-2">
            <label className="font-black text-[#0a2540] flex items-center gap-1.5 text-xs">
              <DoorOpen size={16} className="text-[#006ce4]" />
              <span>
                Chọn phòng chuyển sang ({availableRooms.length} phòng trống khả
                dụng):
              </span>
            </label>

            {availableRooms.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-center gap-2 font-bold">
                <AlertCircle size={18} className="shrink-0" />
                <span>Hiện không còn phòng trống nào khác để đổi!</span>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100 bg-white shadow-2xs">
                {availableRooms.map((r) => {
                  const isSelected = selectedNewRoomNumber === r.room_number;
                  const rRate = isHourly
                    ? Number(
                        r.hourly_price ||
                          Math.round((r.daily_price || 200000) * 0.25),
                      )
                    : Number(r.daily_price || 0);
                  const diff = rRate - oldRate;

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedNewRoomNumber(r.room_number)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-50/80 border-l-4 border-[#003580]"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span
                            className={
                              isSelected ? "text-[#003580] font-black" : ""
                            }
                          >
                            Phòng {r.room_number}
                          </span>
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-semibold">
                            {r.area || "Tầng 1"}
                          </span>
                        </div>
                        <div className="text-gray-500 mt-0.5 text-xs">
                          {r.type_name} •{" "}
                          <strong className="text-gray-900 tabular-nums">
                            {rRate.toLocaleString("vi-VN")} ₫/
                            {stayCalculations.unitLabel}
                          </strong>
                        </div>
                      </div>

                      <div className="text-right">
                        {diff > 0 && (
                          <span className="text-[11px] font-black text-rose-600 block tabular-nums">
                            +{diff.toLocaleString("vi-VN")} ₫ (Nâng hạng)
                          </span>
                        )}
                        {diff < 0 && (
                          <span className="text-[11px] font-black text-emerald-700 block tabular-nums">
                            -{Math.abs(diff).toLocaleString("vi-VN")} ₫ (Hạ
                            hạng)
                          </span>
                        )}
                        {diff === 0 && (
                          <span className="text-[11px] font-bold text-gray-400 block">
                            Cùng mức giá
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phương án phân tách thời gian */}
          {targetRoom && currentRoom.status === "occupied" && (
            <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-5 space-y-3.5">
              <div className="font-black text-[#0a2540] flex items-center gap-1.5 text-xs">
                <Calendar size={15} className="text-[#006ce4]" />
                <span>Phương án phân tách thời gian & tiền phòng:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                    switchMode === "split_stay"
                      ? "bg-white border-[#003580] shadow-xs"
                      : "bg-white/60 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="modal_switch_mode"
                    checked={switchMode === "split_stay"}
                    onChange={() => setSwitchMode("split_stay")}
                    className="accent-[#003580] mt-1 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                      <Split size={14} className="text-[#006ce4]" />
                      Tính thời gian cả 2 phòng (Khuyên dùng)
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-1">
                      Phòng cũ {stayCalculations.stayedUnits}{" "}
                      {stayCalculations.unitLabel} + Phòng mới{" "}
                      {stayCalculations.remainingUnits}{" "}
                      {stayCalculations.unitLabel}.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                    switchMode === "transfer_all"
                      ? "bg-white border-[#003580] shadow-xs"
                      : "bg-white/60 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="modal_switch_mode"
                    checked={switchMode === "transfer_all"}
                    onChange={() => setSwitchMode("transfer_all")}
                    className="accent-[#003580] mt-1 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                      <Layers size={14} className="text-gray-600" />
                      Chuyển toàn bộ sang phòng mới
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-1">
                      Áp dụng khi khách vừa nhận phòng muốn đổi ngay do sự cố.
                    </span>
                  </div>
                </label>
              </div>

              {/* Tạm tính hóa đơn */}
              <div className="bg-white border border-blue-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                <div className="font-black text-[#003580] flex justify-between items-center text-xs">
                  <span>Tạm tính hoá đơn sau khi đổi:</span>
                  <span className="text-base font-black text-[#003580] tabular-nums">
                    {calculatedTotalPrice.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="space-y-1 text-[11px] divide-y divide-blue-50 pt-1">
                  {calculatedLegs.map((leg, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between pt-1.5 font-medium"
                    >
                      <span className="text-gray-700">
                        • Phòng <strong>{leg.room_number}</strong>:{" "}
                        {leg.duration_text} x{" "}
                        {leg.unit_price.toLocaleString("vi-VN")} ₫
                      </span>
                      <span className="font-bold text-gray-900 tabular-nums">
                        {leg.amount.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 px-7 py-4.5 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-gray-700 font-bold cursor-pointer transition shadow-2xs"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !selectedNewRoomNumber}
            className="px-7 py-2.5 bg-[#003580] hover:bg-blue-900 disabled:opacity-40 text-white rounded-xl font-black cursor-pointer transition flex items-center gap-2 shadow-md active:scale-95"
          >
            <ArrowRightLeft size={16} />
            <span>{loading ? "Đang xử lý..." : "Xác nhận đổi phòng"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
