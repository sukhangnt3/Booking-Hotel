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
  X,
  Calendar,
  CheckCircle2,
  Check,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

function TimePickerDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "12:00");
  const containerRef = useRef(null);
  const selectedItemRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "12:00");
  }, [value]);

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

  const handleSelect = (timeStr) => {
    setInputValue(timeStr);
    onChange(timeStr);
    setIsOpen(false);
  };

  const handleManualInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div
        className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 cursor-pointer hover:border-slate-500 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleManualInput}
          onFocus={() => setIsOpen(true)}
          className="w-12 text-xs font-semibold text-slate-900 outline-none bg-transparent cursor-text"
          placeholder="12:00"
        />
        <Clock size={13} className="text-slate-500 cursor-pointer" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-28 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 max-h-48 overflow-y-auto animate-fadeIn">
          {timesList.map((t) => {
            const isSelected = t === inputValue;
            return (
              <div
                key={t}
                ref={isSelected ? selectedItemRef : null}
                onClick={() => handleSelect(t)}
                className={`px-3 py-1.5 flex items-center justify-between text-xs cursor-pointer transition ${
                  isSelected
                    ? "font-bold text-slate-900 bg-slate-50"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{t}</span>
                {isSelected && (
                  <Check
                    size={13}
                    className="text-blue-600"
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [timeSettings, setTimeSettings] = useState({
    hourly_grace_minutes: 30,
    overnight_checkin: "22:00",
    overnight_checkout: "11:00",
    daily_checkin: "14:00",
    daily_checkout: "12:00",
    daily_grace_hours: 6,
  });

  // 1. LẤY CẤU HÌNH TRỰC TIẾP TỪ DATABASE QUA API
  const fetchHotelDetails = useCallback(async (hotelId) => {
    if (!hotelId) return;
    try {
      const res = await apiClient.get(`/hotels/${hotelId}`);
      const h = res?.data?.hotel || res?.data || {};

      setTimeSettings({
        hourly_grace_minutes: Number(h.hourly_grace_minutes ?? 30),
        daily_grace_hours: Number(h.daily_grace_hours ?? 6),
        overnight_checkin: h.overnight_checkin_time
          ? String(h.overnight_checkin_time).slice(0, 5)
          : "22:00",
        overnight_checkout: h.overnight_checkout_time
          ? String(h.overnight_checkout_time).slice(0, 5)
          : "11:00",
        daily_checkin: h.checkin_time
          ? String(h.checkin_time).slice(0, 5)
          : "14:00",
        daily_checkout: h.checkout_time
          ? String(h.checkout_time).slice(0, 5)
          : "12:00",
      });
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

  // 2. LƯU THẲNG VÀO DATABASE QUA API PUT /hotels/:id
  const handleSaveSettings = async (e) => {
    e.preventDefault();
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
      setIsModalOpen(false);
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
    <div className="bg-[#f0f2f5] min-h-screen font-sans text-slate-800 -m-4 sm:-m-6 p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-5 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Thiết lập phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình mốc giờ nhận/trả phòng và cách tính phụ thu thời gian sử
            dụng
          </p>
        </div>

        {hotels.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-300 shadow-2xs self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">
              Chi nhánh:
            </span>
            <select
              value={selectedHotelId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedHotelId(newId);
                fetchHotelDetails(newId);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-semibold animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>
            Đã lưu thành công thiết lập thời gian sử dụng phòng vào Database!
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
        <h2 className="text-base font-bold text-slate-800 mb-4">
          Cài đặt quy chuẩn
        </h2>

        <div className="border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition bg-white">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Thiết lập thời gian sử dụng phòng
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Quy định thời gian nhận phòng, trả phòng, tính thêm giờ khi sử
                dụng quá thời gian...
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-[11px] text-slate-600">
                <div className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded">
                  Theo giờ:{" "}
                  <b className="text-slate-800">
                    Quá {timeSettings.hourly_grace_minutes}p tính 1h
                  </b>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded">
                  Qua đêm:{" "}
                  <b className="text-slate-800">
                    {timeSettings.overnight_checkin} -{" "}
                    {timeSettings.overnight_checkout}
                  </b>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded">
                  Cả ngày:{" "}
                  <b className="text-slate-800">
                    {timeSettings.daily_checkin} - {timeSettings.daily_checkout}
                  </b>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs rounded-md transition cursor-pointer flex-shrink-0 active:scale-95 self-end sm:self-center"
          >
            Chi tiết
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col animate-scaleUp">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                Thiết lập thời gian sử dụng phòng
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className="p-6 space-y-6 text-xs font-sans"
            >
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">Theo giờ</h4>
                <div className="flex items-center justify-between pl-2">
                  <span className="text-slate-700">
                    • Tính thêm <b className="text-slate-900">1 giờ</b> khi sử
                    dụng quá
                  </span>
                  <select
                    value={timeSettings.hourly_grace_minutes}
                    onChange={(e) =>
                      setTimeSettings({
                        ...timeSettings,
                        hourly_grace_minutes: Number(e.target.value),
                      })
                    }
                    className="w-32 py-1 px-2 border-b border-slate-300 outline-none focus:border-blue-600 font-medium text-slate-800 bg-transparent cursor-pointer text-right"
                  >
                    <option value={15}>15 phút</option>
                    <option value={30}>30 phút</option>
                    <option value={45}>45 phút</option>
                    <option value={60}>60 phút</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">Qua đêm</h4>
                <div className="flex items-center justify-between pl-2">
                  <span className="text-slate-700">
                    • Giờ nhận - trả quy định
                  </span>
                  <div className="flex items-center gap-2">
                    <TimePickerDropdown
                      value={timeSettings.overnight_checkin}
                      onChange={(val) =>
                        setTimeSettings((prev) => ({
                          ...prev,
                          overnight_checkin: val,
                        }))
                      }
                    />
                    <span className="text-slate-500 font-normal">đến</span>
                    <TimePickerDropdown
                      value={timeSettings.overnight_checkout}
                      onChange={(val) =>
                        setTimeSettings((prev) => ({
                          ...prev,
                          overnight_checkout: val,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">Cả ngày</h4>
                <div className="flex items-center justify-between pl-2">
                  <span className="text-slate-700">
                    • Giờ nhận - trả quy định
                  </span>
                  <div className="flex items-center gap-2">
                    <TimePickerDropdown
                      value={timeSettings.daily_checkin}
                      onChange={(val) =>
                        setTimeSettings((prev) => ({
                          ...prev,
                          daily_checkin: val,
                        }))
                      }
                    />
                    <span className="text-slate-500 font-normal">đến</span>
                    <TimePickerDropdown
                      value={timeSettings.daily_checkout}
                      onChange={(val) =>
                        setTimeSettings((prev) => ({
                          ...prev,
                          daily_checkout: val,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pl-2 pt-1">
                  <span className="text-slate-700">
                    • Tính thêm <b className="text-slate-900">1 ngày</b> khi sử
                    dụng quá
                  </span>
                  <select
                    value={timeSettings.daily_grace_hours}
                    onChange={(e) =>
                      setTimeSettings({
                        ...timeSettings,
                        daily_grace_hours: Number(e.target.value),
                      })
                    }
                    className="w-32 py-1 px-2 border-b border-slate-300 outline-none focus:border-blue-600 font-medium text-slate-800 bg-transparent cursor-pointer text-right"
                  >
                    <option value={4}>4 giờ</option>
                    <option value={5}>5 giờ</option>
                    <option value={6}>6 giờ</option>
                    <option value={8}>8 giờ</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2e7d32] hover:bg-[#256628] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                >
                  <Save size={14} />
                  <span>Lưu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                >
                  <Ban size={14} />
                  <span>Bỏ qua</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
