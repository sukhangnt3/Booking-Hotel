// src/pages/owner/RoomTimeSettingsPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Clock,
  Save,
  Ban,
  CheckCircle2,
  Check,
  ChevronDown,
  Building2,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

// 🌟 BỘ CHỌN GIỜ ĐƯỢC THIẾT KẾ GIỐNG 100% HÌNH ẢNH: [14:00 🕒]
function TimePickerInput({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedItemRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: "center" });
    }
  }, [isOpen]);

  const timesList = useMemo(() => {
    const list = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        list.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
      }
    }
    return list;
  }, []);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#006ce4] rounded-full text-xs font-semibold text-slate-800 cursor-pointer transition shadow-2xs min-w-[90px]"
      >
        <span>{value || "12:00"}</span>
        <Clock size={14} className="text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-28 bg-white border border-slate-200 rounded-2xl shadow-xl py-1 z-50 max-h-48 overflow-y-auto animate-in fade-in">
          {timesList.map((t) => {
            const isSelected = t === value;
            return (
              <div
                key={t}
                ref={isSelected ? selectedItemRef : null}
                onClick={() => {
                  onChange(t);
                  setIsOpen(false);
                }}
                className={`px-3 py-1.5 flex items-center justify-between text-xs cursor-pointer transition ${
                  isSelected
                    ? "font-bold text-[#003580] bg-blue-50"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{t}</span>
                {isSelected && (
                  <Check
                    size={13}
                    className="text-[#006ce4]"
                    strokeWidth={2.5}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RoomTimeSettingsPage() {
  const [searchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 🌟 CẤU HÌNH THỜI GIAN CHUẨN (ĐÃ XÓA BUỔI)
  const [timeSettings, setTimeSettings] = useState({
    // Bật tắt các hình thức
    enable_hourly: true,
    enable_daily: true,
    enable_overnight: true,
    enable_monthly: false,

    // Thuê theo giờ
    hourly_grace_minutes: 30,

    // Thuê ngày đêm
    daily_checkin: "14:00",
    daily_checkout: "12:00",
    daily_grace_type: "late_only",
    daily_grace_hours: 6,

    // Thuê qua đêm
    overnight_checkin: "22:00",
    overnight_checkout: "12:00",
    overnight_enable_day_fee: false,
    overnight_grace_hours: 12,
  });

  const [isDailyGraceDropdownOpen, setIsDailyGraceDropdownOpen] =
    useState(false);
  const dailyGraceDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dailyGraceDropdownRef.current &&
        !dailyGraceDropdownRef.current.contains(e.target)
      ) {
        setIsDailyGraceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. LẤY CẤU HÌNH TỪ DATABASE
  const fetchHotelDetails = useCallback(async (hotelId) => {
    if (!hotelId) return;
    try {
      const res = await apiClient.get(`/hotels/${hotelId}`);
      const h = res?.data?.hotel || res?.data || {};

      setTimeSettings((prev) => ({
        ...prev,
        hourly_grace_minutes: Number(h.hourly_grace_minutes ?? 30),
        daily_grace_hours: Number(h.daily_grace_hours ?? 6),
        overnight_checkin: h.overnight_checkin_time
          ? String(h.overnight_checkin_time).slice(0, 5)
          : "22:00",
        overnight_checkout: h.overnight_checkout_time
          ? String(h.overnight_checkout_time).slice(0, 5)
          : "12:00",
        daily_checkin: h.checkin_time
          ? String(h.checkin_time).slice(0, 5)
          : "14:00",
        daily_checkout: h.checkout_time
          ? String(h.checkout_time).slice(0, 5)
          : "12:00",
      }));
    } catch (err) {
      console.error("Lỗi lấy thông tin khách sạn từ DB:", err);
    }
  }, []);

  const fetchMyHotels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/hotels/my-hotels?active_only=true");
      const list = res?.data?.hotels || res?.data || [];
      setHotels(list);

      const targetId = selectedHotelId || (list[0] && String(list[0].id)) || "";
      if (targetId) {
        setSelectedHotelId(targetId);
        await fetchHotelDetails(targetId);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách khách sạn:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, fetchHotelDetails]);

  useEffect(() => {
    fetchMyHotels();
  }, [fetchMyHotels]);

  // 2. LƯU THẲNG VÀO DATABASE QUA API (ĐÃ BỎ BUỔI)
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      await apiClient.put(`/hotels/${selectedHotelId}`, {
        checkin_time: `${timeSettings.daily_checkin}:00`,
        checkout_time: `${timeSettings.daily_checkout}:00`,
        overnight_checkin_time: `${timeSettings.overnight_checkin}:00`,
        overnight_checkout_time: `${timeSettings.overnight_checkout}:00`,
        hourly_grace_minutes: Number(timeSettings.hourly_grace_minutes),
        daily_grace_hours: Number(timeSettings.daily_grace_hours),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchHotelDetails(selectedHotelId);
    } catch (err) {
      alert("Lỗi lưu vào DB: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER & CHỌN CHI NHÁNH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Thiết lập thời gian sử dụng phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình mốc giờ nhận, trả phòng và tự động tính thêm tiền khi sử
            dụng quá giờ, nhận sớm hoặc trả muộn.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hotels.length > 1 && (
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs">
              <Building2 size={15} className="text-[#006ce4]" />
              <select
                value={selectedHotelId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedHotelId(newId);
                  fetchHotelDetails(newId);
                }}
                className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
              >
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    🏨 {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-6 py-2.5 bg-[#006ce4] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={15} /> <span>Lưu thiết lập</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>
            Đã lưu thành công toàn bộ thiết lập thời gian sử dụng phòng vào
            Database!
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🌟 DANH SÁCH KHỐI CÀI ĐẶT THỜI GIAN CHUẨN (ĐÃ XÓA BUỔI) 🌟 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 max-w-4xl">
        {/* KHỐI 1: THUÊ THEO GIỜ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Thuê theo giờ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tính tiền theo số giờ sử dụng, không cố định giờ nhận - trả
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setTimeSettings((prev) => ({
                  ...prev,
                  enable_hourly: !prev.enable_hourly,
                }))
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                timeSettings.enable_hourly ? "bg-[#006ce4]" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  timeSettings.enable_hourly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs text-slate-700 flex items-center gap-2 flex-wrap">
            <span>
              • Tính thêm <b className="text-slate-900">1 giờ</b> nếu sử dụng
              quá
            </span>
            <div className="relative inline-block">
              <select
                value={timeSettings.hourly_grace_minutes}
                onChange={(e) =>
                  setTimeSettings({
                    ...timeSettings,
                    hourly_grace_minutes: Number(e.target.value),
                  })
                }
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 outline-none cursor-pointer pr-7 appearance-none"
              >
                <option value={15}>15 phút</option>
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* KHỐI 2: THUÊ NGÀY ĐÊM */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Thuê ngày đêm
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Khách nhận phòng buổi chiều và trả vào trưa hôm sau
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setTimeSettings((prev) => ({
                  ...prev,
                  enable_daily: !prev.enable_daily,
                }))
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                timeSettings.enable_daily ? "bg-[#006ce4]" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  timeSettings.enable_daily ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3 text-xs text-slate-700">
            {/* Hàng giờ nhận - trả */}
            <div className="flex items-center gap-2 flex-wrap">
              <span>• Giờ nhận - trả quy định</span>
              <TimePickerInput
                value={timeSettings.daily_checkin}
                onChange={(val) =>
                  setTimeSettings((prev) => ({ ...prev, daily_checkin: val }))
                }
              />
              <span>đến</span>
              <TimePickerInput
                value={timeSettings.daily_checkout}
                onChange={(val) =>
                  setTimeSettings((prev) => ({ ...prev, daily_checkout: val }))
                }
              />
            </div>

            {/* Hàng quy định tính thêm 1 ngày */}
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                • Tính thêm <b className="text-slate-900">1 ngày</b> khi
              </span>

              <div
                className="relative inline-block"
                ref={dailyGraceDropdownRef}
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsDailyGraceDropdownOpen(!isDailyGraceDropdownOpen)
                  }
                  className="px-3 py-1.5 bg-white border border-[#006ce4] rounded-full text-xs font-semibold text-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <span>
                    {timeSettings.daily_grace_type === "late_only"
                      ? "Trả muộn quá"
                      : "Nhận sớm + Trả muộn quá"}
                  </span>
                  <ChevronDown size={14} className="text-[#006ce4]" />
                </button>

                {isDailyGraceDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1 z-50 animate-in fade-in">
                    <div
                      onClick={() => {
                        setTimeSettings((prev) => ({
                          ...prev,
                          daily_grace_type: "late_only",
                        }));
                        setIsDailyGraceDropdownOpen(false);
                      }}
                      className="px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer text-slate-800 font-medium"
                    >
                      <span>Trả muộn quá</span>
                      {timeSettings.daily_grace_type === "late_only" && (
                        <Check
                          size={14}
                          className="text-[#006ce4]"
                          strokeWidth={2.5}
                        />
                      )}
                    </div>

                    <div
                      onClick={() => {
                        setTimeSettings((prev) => ({
                          ...prev,
                          daily_grace_type: "both",
                        }));
                        setIsDailyGraceDropdownOpen(false);
                      }}
                      className="px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer text-slate-800 font-medium border-t border-slate-100"
                    >
                      <span>Nhận sớm + Trả muộn quá</span>
                      {timeSettings.daily_grace_type === "both" && (
                        <Check
                          size={14}
                          className="text-[#006ce4]"
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* DROPDOWN CHỌN SỐ GIỜ */}
              <div className="relative inline-block">
                <select
                  value={timeSettings.daily_grace_hours}
                  onChange={(e) =>
                    setTimeSettings({
                      ...timeSettings,
                      daily_grace_hours: Number(e.target.value),
                    })
                  }
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 outline-none cursor-pointer pr-7 appearance-none"
                >
                  <option value={4}>4 giờ</option>
                  <option value={5}>5 giờ</option>
                  <option value={6}>6 giờ</option>
                  <option value={8}>8 giờ</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 3: THUÊ QUA ĐÊM */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Thuê qua đêm
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Khách nhận phòng buổi tối và trả vào trưa hôm sau
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setTimeSettings((prev) => ({
                  ...prev,
                  enable_overnight: !prev.enable_overnight,
                }))
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                timeSettings.enable_overnight ? "bg-[#006ce4]" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  timeSettings.enable_overnight
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3 text-xs text-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span>• Giờ nhận - trả quy định</span>
              <TimePickerInput
                value={timeSettings.overnight_checkin}
                onChange={(val) =>
                  setTimeSettings((prev) => ({
                    ...prev,
                    overnight_checkin: val,
                  }))
                }
              />
              <span>đến</span>
              <TimePickerInput
                value={timeSettings.overnight_checkout}
                onChange={(val) =>
                  setTimeSettings((prev) => ({
                    ...prev,
                    overnight_checkout: val,
                  }))
                }
              />
            </div>

            {/* Checkbox tính thêm 1 ngày nếu trả muộn quá 12 giờ */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={timeSettings.overnight_enable_day_fee}
                  onChange={(e) =>
                    setTimeSettings((prev) => ({
                      ...prev,
                      overnight_enable_day_fee: e.target.checked,
                    }))
                  }
                  className="rounded border-slate-300 text-[#006ce4] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>
                  Tính thêm <b className="text-slate-900">1 ngày</b> nếu trả
                  muộn quá
                </span>
              </label>

              <div className="relative inline-block">
                <select
                  disabled={!timeSettings.overnight_enable_day_fee}
                  value={timeSettings.overnight_grace_hours}
                  onChange={(e) =>
                    setTimeSettings({
                      ...timeSettings,
                      overnight_grace_hours: Number(e.target.value),
                    })
                  }
                  className={`px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 outline-none pr-7 appearance-none ${
                    !timeSettings.overnight_enable_day_fee
                      ? "opacity-50 cursor-not-allowed bg-slate-100"
                      : "cursor-pointer"
                  }`}
                >
                  <option value={8}>8 giờ</option>
                  <option value={10}>10 giờ</option>
                  <option value={12}>12 giờ</option>
                  <option value={14}>14 giờ</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 4: THUÊ THEO THÁNG */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Thuê theo tháng
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Khách thuê dài hạn, trả phòng theo chu kỳ tháng
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setTimeSettings((prev) => ({
                  ...prev,
                  enable_monthly: !prev.enable_monthly,
                }))
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                timeSettings.enable_monthly ? "bg-[#006ce4]" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  timeSettings.enable_monthly
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
