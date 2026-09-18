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

  // 🌟 TÍNH TOÁN THỜI GIAN LƯU TRÚ (PHÂN BIỆT RÕ THEO GIỜ VS THEO NGÀY)
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

    const checkin = new Date(b.checkin_date || Date.now());
    const checkout = new Date(b.checkout_date || Date.now());
    const now = new Date();

    if (isHourly) {
      const diffTotalMs = Math.max(0, checkout.getTime() - checkin.getTime());
      const totalHours = Math.max(1, Math.ceil(diffTotalMs / (1000 * 60 * 60)));
      const diffStayedMs = Math.max(0, now.getTime() - checkin.getTime());
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

  // Giá phòng cũ theo giờ hoặc ngày
  const oldRate = Number(
    isHourly
      ? currentRoom.hourly_price ||
          Math.round((currentRoom.daily_price || 200000) * 0.25)
      : currentRoom.daily_price || 0,
  );

  // Giá phòng mới theo giờ hoặc ngày
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
      // Đã bắt lỗi
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-fadeIn backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 text-xs text-gray-900 animate-scaleUp">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between p-5 bg-[#003580] text-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight leading-none text-white">
                  Đổi Phòng Cho Khách Lưu Trú
                </h2>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 font-bold border border-white/15">
                  ROOM SWITCH
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Tự động phân tách thời gian ở và tính chênh lệch đơn giá (áp
                dụng cả thuê giờ & ngày)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* NỘI DUNG */}
        <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto bg-white">
          {/* Thông tin phòng hiện tại */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#006ce4] font-black uppercase tracking-wider">
                Phòng đang lưu trú (
                {isHourly ? "Thuê theo giờ" : "Thuê theo ngày"})
              </div>
              <div className="text-lg font-black text-[#0a2540] mt-0.5">
                Phòng {currentRoom.room_number} • {currentRoom.type_name}
              </div>
              <div className="text-gray-600 mt-1 font-medium">
                Khách:{" "}
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
              <DoorOpen size={15} className="text-[#006ce4]" />
              <span>
                Chọn phòng chuyển sang ({availableRooms.length} phòng trống khả
                dụng):
              </span>
            </label>

            {availableRooms.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-center gap-2 font-bold">
                <AlertCircle size={16} className="shrink-0" />
                <span>Hiện không còn phòng trống nào khác để đổi!</span>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100 bg-white">
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

          {/* Phương án phân tách */}
          {targetRoom && currentRoom.status === "occupied" && (
            <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="font-black text-[#0a2540] flex items-center gap-1.5 text-xs">
                <Calendar size={15} className="text-[#006ce4]" />
                <span>Phương án phân tách thời gian & tiền phòng:</span>
              </div>

              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    switchMode === "split_stay"
                      ? "bg-white border-[#003580] shadow-xs"
                      : "bg-white/60 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="kiot_switch_mode"
                    checked={switchMode === "split_stay"}
                    onChange={() => setSwitchMode("split_stay")}
                    className="accent-[#003580] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                      <Split size={14} className="text-[#006ce4]" />
                      Tính thời gian sử dụng ở CẢ HAI PHÒNG (Khuyên dùng)
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      Ở phòng cũ{" "}
                      <b>
                        {stayCalculations.stayedUnits}{" "}
                        {stayCalculations.unitLabel}
                      </b>{" "}
                      (đơn giá cũ) + chuyển sang phòng mới ở tiếp{" "}
                      <b>
                        {stayCalculations.remainingUnits}{" "}
                        {stayCalculations.unitLabel}
                      </b>{" "}
                      (đơn giá mới).
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    switchMode === "transfer_all"
                      ? "bg-white border-[#003580] shadow-xs"
                      : "bg-white/60 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="kiot_switch_mode"
                    checked={switchMode === "transfer_all"}
                    onChange={() => setSwitchMode("transfer_all")}
                    className="accent-[#003580] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                      <Layers size={14} className="text-gray-600" />
                      Chuyển toàn bộ thời gian sang phòng mới
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      Áp dụng khi khách vừa vào nhận phòng muốn đổi ngay hoặc
                      phòng cũ gặp sự cố kỹ thuật.
                    </span>
                  </div>
                </label>
              </div>

              {/* Chính sách giá */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-gray-800">
                  Chính sách giá phòng mới:
                </span>
                <div className="flex items-center gap-4 font-semibold text-gray-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="kiot_price_mode"
                      checked={applyNewPrice === true}
                      onChange={() => setApplyNewPrice(true)}
                      className="accent-[#003580]"
                    />
                    <span>Áp dụng giá phòng mới</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="kiot_price_mode"
                      checked={applyNewPrice === false}
                      onChange={() => setApplyNewPrice(false)}
                      className="accent-[#003580]"
                    />
                    <span>Giữ nguyên giá phòng cũ</span>
                  </label>
                </div>
              </div>

              {/* Tạm tính hóa đơn */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <div className="font-black text-[#003580] flex justify-between items-center text-xs">
                  <span>Tạm tính hoá đơn sau khi đổi:</span>
                  <span className="text-sm font-black text-[#003580] tabular-nums">
                    {calculatedTotalPrice.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="space-y-1 text-[11px] divide-y divide-blue-100/80">
                  {calculatedLegs.map((leg, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between pt-1 font-medium"
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
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-white font-bold cursor-pointer transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !selectedNewRoomNumber}
            className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 disabled:opacity-40 text-white rounded-xl font-black cursor-pointer transition flex items-center gap-2 shadow-md active:scale-95"
          >
            <ArrowRightLeft size={15} />
            <span>{loading ? "Đang xử lý..." : "Xác nhận đổi phòng"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
