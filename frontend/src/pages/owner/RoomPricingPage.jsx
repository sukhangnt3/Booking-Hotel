// src/pages/owner/RoomPricingPage.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Save,
  Ban,
  X,
  Inbox,
  Check,
  CheckSquare,
  CheckCircle2,
  Tags,
  ChevronDown,
  Building2,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

const formatNumberWithDots = (val) => {
  if (val === undefined || val === null || val === "") return "0";
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "0";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseDotsToNumber = (val) => {
  if (!val) return 0;
  const cleanDigits = String(val).replace(/\D/g, "");
  return Number(cleanDigits) || 0;
};

// 🌟 BỘ CHỌN GIỜ ĐƯỢC THIẾT KẾ ĐÚNG HÌNH ẢNH: [14:00 🕒]
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

export default function RoomPricingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "pricing";

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [availableRooms, setAvailableRooms] = useState([]);
  const [toastMsg, setToastMsg] = useState("");

  const [priceBooks, setPriceBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [expandedSubTab, setExpandedSubTab] = useState("info");

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("info");
  const [editingPriceBook, setEditingPriceBook] = useState(null);

  const initialFormState = {
    code: "",
    name: "",
    note: "",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    scope_branch: "all",
    branch_name: "",
    scope_customer: "all",
    customer_group: "",
    is_active: true,
    room_prices: [],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [roomSearchKey, setRoomSearchKey] = useState("");
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // 🌟 CẤU HÌNH THỜI GIAN CHUẨN (ĐÃ XÓA BUỔI: CHỈ CÒN GIỜ, ĐÊM, NGÀY, THÁNG)
  const [timeSettings, setTimeSettings] = useState({
    enable_hourly: true,
    enable_daily: true,
    enable_overnight: true,
    enable_monthly: false,

    hourly_grace_minutes: 30,

    daily_checkin: "14:00",
    daily_checkout: "12:00",
    daily_grace_type: "late_only",
    daily_grace_hours: 6,

    overnight_checkin: "22:00",
    overnight_checkout: "12:00",
    overnight_enable_day_fee: false,
    overnight_grace_hours: 12,
  });

  const [isDailyGraceDropdownOpen, setIsDailyGraceDropdownOpen] =
    useState(false);
  const dailyGraceDropdownRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsRoomDropdownOpen(false);
      }
      if (
        dailyGraceDropdownRef.current &&
        !dailyGraceDropdownRef.current.contains(event.target)
      ) {
        setIsDailyGraceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const fetchInitData = useCallback(async () => {
    try {
      setLoading(true);
      const resH = await apiClient.get("/hotels/my-hotels?active_only=true");
      const hotelList = resH?.data?.hotels || resH?.data || [];
      setHotels(hotelList);

      const targetHId =
        selectedHotelId || (hotelList[0] && String(hotelList[0].id)) || "";
      setSelectedHotelId(targetHId);

      if (targetHId) {
        await fetchHotelDetails(targetHId);

        const resR = await apiClient.get(`/rooms?hotel_id=${targetHId}`);
        const rList = resR?.data?.rooms || resR?.data || [];
        const validRooms = Array.isArray(rList) ? rList : [];
        setAvailableRooms(validRooms);

        const defaultBook = {
          id: "default_pb",
          code: "BG000001",
          name: "Bảng giá tiêu chuẩn",
          note: "Bảng giá mặc định của hệ thống",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
          scope_branch: "all",
          scope_customer: "all",
          is_active: true,
          room_prices: validRooms.map((r) => {
            const baseP = Number(r.base_price || 200000);
            return {
              room_id: r.id,
              code: r.code || r.name,
              name: r.name,
              hourly_tiers:
                r.hourly_tiers && r.hourly_tiers.length > 0
                  ? r.hourly_tiers
                  : [
                      {
                        from_hour: 1,
                        calc_type: "each_hour",
                        price: r.hourly_price || 100000,
                      },
                    ],
              overnight_price: r.overnight_price || baseP,
              daily_price: baseP,
            };
          }),
        };
        setPriceBooks([defaultBook]);
        setExpandedRowId("default_pb");
      }
    } catch (err) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, fetchHotelDetails]);

  useEffect(() => {
    fetchInitData();
  }, [fetchInitData]);

  const handleOpenAddModal = () => {
    setEditingPriceBook(null);
    setModalTab("info");

    const initialRoomPrices = availableRooms.map((r) => {
      const baseP = Number(r.base_price || 200000);
      return {
        room_id: r.id,
        code: r.code || r.name,
        name: r.name,
        hourly_tiers:
          r.hourly_tiers && r.hourly_tiers.length > 0
            ? r.hourly_tiers
            : [
                {
                  from_hour: 1,
                  calc_type: "each_hour",
                  price: r.hourly_price || 100000,
                },
              ],
        overnight_price: r.overnight_price || baseP,
        daily_price: baseP,
      };
    });

    setFormData({
      ...initialFormState,
      code: `BG${String(priceBooks.length + 1).padStart(6, "0")}`,
      name: "Bảng giá mới",
      room_prices: initialRoomPrices,
    });
    setIsPricingModalOpen(true);
  };

  const handleOpenEditModal = (pb, e) => {
    if (e) e.stopPropagation();
    setEditingPriceBook(pb);
    setModalTab("info");
    setFormData({ ...pb });
    setIsPricingModalOpen(true);
  };

  const handleSavePriceBook = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng nhập Tên bảng giá!");
      return;
    }

    try {
      for (const rp of formData.room_prices) {
        if (!rp.room_id) continue;
        await apiClient.put(`/rooms/${rp.room_id}`, {
          hourly_tiers: rp.hourly_tiers,
          hourly_price: rp.hourly_tiers?.[0]?.price || rp.hourly_price,
          overnight_price: rp.overnight_price,
          base_price: rp.daily_price,
        });
      }

      showToast("Đã lưu bảng giá vào Database thành công!");

      if (keepOpen) {
        setFormData({ ...initialFormState, code: "" });
        setEditingPriceBook(null);
      } else {
        setIsPricingModalOpen(false);
      }

      await fetchInitData();
    } catch (err) {
      alert(
        "Lỗi lưu bảng giá: " + (err.response?.data?.message || err.message),
      );
    }
  };

  const handleDeletePriceBook = (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa bảng giá này?")) return;
    const updated = priceBooks.filter((b) => b.id !== id);
    setPriceBooks(updated);
    if (expandedRowId === id) setExpandedRowId(null);
    showToast("Đã xóa bảng giá thành công!");
  };

  const handleRemoveRoomFromPrice = (roomId) => {
    setFormData((prev) => ({
      ...prev,
      room_prices: prev.room_prices.filter((r) => r.room_id !== roomId),
    }));
  };

  const handleAddRoomToPrice = (room) => {
    if (formData.room_prices.some((rp) => rp.room_id === room.id)) {
      alert("Hạng phòng này đã có trong bảng giá!");
      return;
    }
    const baseP = Number(room.base_price || 200000);
    const newRp = {
      room_id: room.id,
      code: room.code || room.name,
      name: room.name,
      hourly_tiers:
        room.hourly_tiers && room.hourly_tiers.length > 0
          ? room.hourly_tiers
          : [
              {
                from_hour: 1,
                calc_type: "each_hour",
                price: room.hourly_price || 100000,
              },
            ],
      overnight_price: room.overnight_price || baseP,
      daily_price: baseP,
    };
    setFormData((prev) => ({
      ...prev,
      room_prices: [...prev.room_prices, newRp],
    }));
    setRoomSearchKey("");
    setIsRoomDropdownOpen(false);
  };

  const handleAddHourlyTier = (roomIdx) => {
    setFormData((prev) => {
      const updatedRooms = [...prev.room_prices];
      const currentTiers = updatedRooms[roomIdx].hourly_tiers || [];
      const nextHour =
        currentTiers.length > 0
          ? Number(currentTiers[currentTiers.length - 1].from_hour) + 1
          : 2;

      const newTier = {
        from_hour: nextHour,
        calc_type: "each_hour",
        price: 20000,
      };

      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        hourly_tiers: [...currentTiers, newTier],
      };
      return { ...prev, room_prices: updatedRooms };
    });
  };

  const handleRemoveHourlyTier = (roomIdx, tierIdx) => {
    setFormData((prev) => {
      const updatedRooms = [...prev.room_prices];
      const currentTiers = updatedRooms[roomIdx].hourly_tiers.filter(
        (_, idx) => idx !== tierIdx,
      );

      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        hourly_tiers: currentTiers,
      };
      return { ...prev, room_prices: updatedRooms };
    });
  };

  const handleUpdateHourlyTier = (roomIdx, tierIdx, field, value) => {
    setFormData((prev) => {
      const updatedRooms = [...prev.room_prices];
      const currentTiers = [...updatedRooms[roomIdx].hourly_tiers];
      currentTiers[tierIdx] = {
        ...currentTiers[tierIdx],
        [field]: value,
      };

      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        hourly_tiers: currentTiers,
      };
      return { ...prev, room_prices: updatedRooms };
    });
  };

  const handleToggleRowExpand = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
    setExpandedSubTab("info");
  };

  const filteredPriceBooks = useMemo(() => {
    return priceBooks.filter((b) =>
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [priceBooks, searchQuery]);

  // 🌟 LƯU THẲNG CẤU HÌNH THỜI GIAN VÀO DATABASE (ĐÃ XÓA BUỔI)
  const handleSaveTimeSettings = async (e) => {
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
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#003580] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
          <Check size={16} strokeWidth={3} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG TAB CHÍNH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("pricing")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              currentTab === "pricing"
                ? "bg-[#003580] text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Tags size={16} />
            <span>Bảng giá phòng</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("time_settings")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              currentTab === "time_settings"
                ? "bg-[#003580] text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Clock size={16} />
            <span>Thiết lập giờ nhận / trả</span>
          </button>
        </div>

        {hotels.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs self-start sm:self-auto">
            <span className="text-xs text-gray-400 font-medium">
              Chi nhánh:
            </span>
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
      </div>

      {currentTab === "pricing" ? (
        /* TAB 1: BẢNG GIÁ PHÒNG (ĐÃ XÓA GIÁ BUỔI) */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-3 space-y-4">
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-2">
              <label className="block text-xs font-black uppercase text-[#0a2540] tracking-wider">
                Tìm kiếm
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Theo tên bảng giá..."
                className="w-full text-xs py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 focus:border-[#003580] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="md:col-span-9 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#0a2540] tracking-tight">
                  Danh Sách Bảng Giá
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Thiết lập các khung giá giờ, giá qua đêm và giá ngày theo từng
                  mùa
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Thiết lập bảng giá mới</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200 select-none">
                      <th className="py-4 px-4 font-bold whitespace-nowrap w-44">
                        Mã bảng giá
                      </th>
                      <th className="py-4 px-4 font-bold whitespace-nowrap">
                        Tên bảng giá
                      </th>
                      <th className="py-4 px-4 font-bold whitespace-nowrap w-36">
                        Trạng thái
                      </th>
                      <th className="py-4 px-4 font-bold whitespace-nowrap text-right w-52">
                        Thời gian hiệu lực
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPriceBooks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400 space-y-2">
                            <Inbox
                              size={40}
                              strokeWidth={1.2}
                              className="text-gray-300"
                            />
                            <span className="text-xs font-medium">
                              Không tìm thấy bảng giá nào phù hợp
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPriceBooks.map((item) => {
                        const isExpanded = expandedRowId === item.id;
                        const startDateStr = item.start_date
                          ? item.start_date.slice(0, 10)
                          : "Toàn thời gian";
                        const endDateStr = item.end_date
                          ? item.end_date.slice(0, 10)
                          : "Không thời hạn";

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              onClick={() => handleToggleRowExpand(item.id)}
                              className={`transition cursor-pointer select-none ${
                                isExpanded
                                  ? "bg-blue-50/70 border-t-2 border-l-2 border-r-2 border-[#003580] font-semibold"
                                  : "border-b border-gray-100 hover:bg-gray-50"
                              }`}
                            >
                              <td className="py-3 px-4 font-bold text-[#003580]">
                                {item.code}
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-900">
                                {item.name}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-block text-xs text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200">
                                  Đang áp dụng
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-gray-600 font-mono">
                                {startDateStr} đến {endDateStr}
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="border-b-2 border-l-2 border-r-2 border-[#003580] bg-white">
                                <td colSpan={4} className="p-0">
                                  <div className="bg-white">
                                    <div className="flex items-center gap-1 px-5 pt-3 bg-blue-50/50 border-b border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedSubTab("info")
                                        }
                                        className={`px-5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer border-t border-x ${
                                          expandedSubTab === "info"
                                            ? "bg-white text-[#003580] border-gray-200 border-b-white -mb-[1px]"
                                            : "bg-transparent text-gray-500 border-transparent hover:text-gray-900"
                                        }`}
                                      >
                                        Thông tin chung
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedSubTab("prices")
                                        }
                                        className={`px-5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer border-t border-x ${
                                          expandedSubTab === "prices"
                                            ? "bg-white text-[#003580] border-gray-200 border-b-white -mb-[1px]"
                                            : "bg-transparent text-gray-500 border-transparent hover:text-gray-900"
                                        }`}
                                      >
                                        Chi tiết giá phòng
                                      </button>
                                    </div>

                                    {expandedSubTab === "info" ? (
                                      <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-xs">
                                          <div className="space-y-3">
                                            <div className="flex items-center border-b border-gray-100 pb-2">
                                              <span className="w-36 text-gray-500 font-medium">
                                                Mã bảng giá:
                                              </span>
                                              <span className="font-bold text-gray-900">
                                                {item.code}
                                              </span>
                                            </div>
                                            <div className="flex items-center border-b border-gray-100 pb-2">
                                              <span className="w-36 text-gray-500 font-medium">
                                                Tên bảng giá:
                                              </span>
                                              <span className="font-bold text-gray-900">
                                                {item.name}
                                              </span>
                                            </div>
                                            <div className="flex items-center border-b border-gray-100 pb-2">
                                              <span className="w-36 text-gray-500 font-medium">
                                                Hiệu lực:
                                              </span>
                                              <span className="font-semibold text-gray-800">
                                                {startDateStr} đến {endDateStr}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <div className="flex items-center border-b border-gray-100 pb-2">
                                              <span className="w-32 text-gray-500 font-medium">
                                                Chi nhánh:
                                              </span>
                                              <span className="font-bold text-gray-900">
                                                Toàn bộ hệ thống
                                              </span>
                                            </div>
                                            <div className="flex items-center border-b border-gray-100 pb-2">
                                              <span className="w-32 text-gray-500 font-medium">
                                                Ghi chú:
                                              </span>
                                              <span className="font-medium text-gray-700">
                                                {item.note || "---"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                                          <button
                                            type="button"
                                            onClick={(e) =>
                                              handleOpenEditModal(item, e)
                                            }
                                            className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                                          >
                                            <CheckSquare size={14} />
                                            <span>Chỉnh sửa</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) =>
                                              handleDeletePriceBook(item.id, e)
                                            }
                                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                                          >
                                            <Trash2 size={14} />
                                            <span>Xóa</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-5 space-y-3">
                                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                          <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                                <th className="py-3 px-4 font-bold">
                                                  Mã phòng
                                                </th>
                                                <th className="py-3 px-4 font-bold">
                                                  Tên hạng phòng
                                                </th>
                                                <th className="py-3 px-4 font-bold text-right">
                                                  Giá giờ đầu
                                                </th>
                                                <th className="py-3 px-4 font-bold text-right">
                                                  Giá đêm
                                                </th>
                                                <th className="py-3 px-4 font-bold text-right">
                                                  Giá ngày
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {(item.room_prices || []).map(
                                                (rp, idx) => (
                                                  <tr
                                                    key={idx}
                                                    className="hover:bg-blue-50/40"
                                                  >
                                                    <td className="py-3 px-4 font-bold text-[#003580]">
                                                      {rp.code}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-gray-900">
                                                      {rp.name}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium text-gray-700 tabular-nums">
                                                      {formatNumberWithDots(
                                                        rp.hourly_tiers?.[0]
                                                          ?.price ||
                                                          rp.hourly_price,
                                                      )}{" "}
                                                      đ
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium text-gray-700 tabular-nums">
                                                      {formatNumberWithDots(
                                                        rp.overnight_price,
                                                      )}{" "}
                                                      đ
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                                                      {formatNumberWithDots(
                                                        rp.daily_price,
                                                      )}{" "}
                                                      đ
                                                    </td>
                                                  </tr>
                                                ),
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════ */
        /* 🌟 TAB 2: THIẾT LẬP THỜI GIAN SỬ DỤNG PHÒNG (ĐÃ BỎ HOÀN TOÀN BUỔI) 🌟 */
        /* ═══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-4 max-w-4xl animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0a2540] tracking-tight">
                Thiết lập thời gian sử dụng phòng
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cấu hình mốc giờ nhận, trả phòng và tự động tính thêm tiền khi
                sử dụng quá giờ, nhận sớm hoặc trả muộn.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveTimeSettings}
              className="px-6 py-2.5 bg-[#006ce4] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Save size={15} /> <span>Lưu thiết lập</span>
            </button>
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
                    timeSettings.enable_hourly
                      ? "translate-x-5"
                      : "translate-x-0"
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
                    timeSettings.enable_daily
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
                  value={timeSettings.daily_checkin}
                  onChange={(val) =>
                    setTimeSettings((prev) => ({ ...prev, daily_checkin: val }))
                  }
                />
                <span>đến</span>
                <TimePickerInput
                  value={timeSettings.daily_checkout}
                  onChange={(val) =>
                    setTimeSettings((prev) => ({
                      ...prev,
                      daily_checkout: val,
                    }))
                  }
                />
              </div>

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
                  timeSettings.enable_overnight
                    ? "bg-[#006ce4]"
                    : "bg-slate-300"
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
      )}

      {/* MODAL THIẾT LẬP BẢNG GIÁ MỚI */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden font-sans">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
              <h3 className="font-black text-base text-[#0a2540]">
                {editingPriceBook ? "Cập Nhật Bảng Giá" : "Thêm Bảng Giá Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-8 px-6 border-b border-gray-200 text-xs font-bold text-gray-500 bg-white select-none">
              <button
                type="button"
                onClick={() => setModalTab("info")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "info"
                    ? "text-[#003580] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Thông tin chung
                {modalTab === "info" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#003580]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("price_details")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "price_details"
                    ? "text-[#003580] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Chi tiết giá phòng
                {modalTab === "price_details" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#003580]" />
                )}
              </button>
            </div>

            <form
              onSubmit={handleSavePriceBook}
              className="flex-1 overflow-y-auto p-6 space-y-6 text-xs"
            >
              {modalTab === "info" && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-4">
                    <label className="w-28 text-gray-700 font-bold">
                      Mã bảng giá
                    </label>
                    <input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      placeholder="Mã tự động"
                      className="flex-1 py-1.5 border-b border-gray-300 outline-none text-gray-900 font-mono bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="w-28 text-gray-700 font-bold">
                      Tên bảng giá *
                    </label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Nhập tên bảng giá..."
                      className="flex-1 py-1.5 border-b border-[#003580] outline-none text-gray-900 font-bold bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="w-28 text-gray-700 font-bold">
                      Ghi chú
                    </label>
                    <input
                      value={formData.note}
                      onChange={(e) =>
                        setFormData({ ...formData, note: e.target.value })
                      }
                      placeholder="Ghi chú áp dụng..."
                      className="flex-1 py-1.5 border-b border-gray-300 outline-none text-gray-800 bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="w-28 text-gray-700 font-bold">
                      Hiệu lực
                    </label>
                    <div className="flex-1 flex items-center gap-4 flex-wrap">
                      <input
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
                        }
                        className="py-1 border-b border-gray-300 outline-none text-gray-900 font-semibold bg-transparent"
                      />
                      <span className="text-gray-400">đến</span>
                      <input
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                        className="py-1 border-b border-gray-300 outline-none text-gray-900 font-semibold bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "price_details" && (
                <div className="space-y-4">
                  <div className="relative" ref={dropdownRef}>
                    <div className="flex items-center gap-2 border-b border-gray-300 pb-1.5">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        value={roomSearchKey}
                        onFocus={() => setIsRoomDropdownOpen(true)}
                        onChange={(e) => setRoomSearchKey(e.target.value)}
                        placeholder="Tìm & thêm hạng phòng vào bảng giá..."
                        className="w-full outline-none text-gray-900 text-xs bg-transparent"
                      />
                    </div>

                    {isRoomDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto">
                        {availableRooms
                          .filter((r) =>
                            r.name
                              .toLowerCase()
                              .includes(roomSearchKey.toLowerCase()),
                          )
                          .map((r) => (
                            <div
                              key={r.id}
                              onClick={() => handleAddRoomToPrice(r)}
                              className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs border-b border-gray-100"
                            >
                              <span className="font-bold text-gray-900">
                                {r.code || r.name} - {r.name}
                              </span>
                              <span className="text-slate-900 font-black">
                                {formatNumberWithDots(r.base_price)} đ
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                          <th className="py-3 px-4 font-bold w-48">
                            Hạng phòng
                          </th>
                          <th className="py-3 px-4 font-bold w-24">Loại giá</th>
                          <th className="py-3 px-4 font-bold">Mức giá</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200">
                        {formData.room_prices.map((rp, roomIdx) => {
                          const tiers = rp.hourly_tiers || [
                            {
                              from_hour: 1,
                              calc_type: "each_hour",
                              price: 100000,
                            },
                          ];

                          return (
                            <tr
                              key={rp.room_id || roomIdx}
                              className="align-top bg-white"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveRoomFromPrice(rp.room_id)
                                    }
                                    className="text-gray-400 hover:text-rose-600 p-0.5 cursor-pointer mt-0.5"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  <div>
                                    <span className="font-bold text-[#003580] block">
                                      {rp.code}
                                    </span>
                                    <span className="text-gray-600 text-[11px] block">
                                      {rp.name}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* 🌟 CHỈ CÒN ĐÚNG 3 LOẠI GIÁ: GIÁ GIỜ, GIÁ ĐÊM, GIÁ NGÀY */}
                              <td className="py-3 px-4 text-gray-500 font-semibold">
                                <div
                                  style={{
                                    height: `${tiers.length * 32}px`,
                                    paddingTop: "2px",
                                  }}
                                >
                                  Giá giờ
                                </div>
                                <div className="py-1.5">Giá đêm</div>
                                <div className="py-1.5 font-bold text-slate-800">
                                  Giá ngày
                                </div>
                              </td>

                              <td className="py-3 px-4 space-y-2.5">
                                <div className="space-y-2">
                                  {tiers.map((tier, tierIdx) => {
                                    const isLastTier =
                                      tierIdx === tiers.length - 1;

                                    return (
                                      <div
                                        key={tierIdx}
                                        className="flex items-center gap-2 flex-wrap"
                                      >
                                        <span className="text-gray-500">
                                          Từ giờ thứ
                                        </span>
                                        <input
                                          type="number"
                                          value={tier.from_hour}
                                          onChange={(e) =>
                                            handleUpdateHourlyTier(
                                              roomIdx,
                                              tierIdx,
                                              "from_hour",
                                              Number(e.target.value),
                                            )
                                          }
                                          className="w-10 text-center py-0.5 border-b border-gray-300 outline-none text-xs font-bold"
                                        />
                                        <span className="text-gray-500">
                                          giá
                                        </span>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={formatNumberWithDots(
                                            tier.price,
                                          )}
                                          onChange={(e) =>
                                            handleUpdateHourlyTier(
                                              roomIdx,
                                              tierIdx,
                                              "price",
                                              parseDotsToNumber(e.target.value),
                                            )
                                          }
                                          className="w-24 text-right py-0.5 border-b border-gray-300 outline-none focus:border-[#003580] font-bold text-gray-900 text-xs"
                                        />
                                        {tiers.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveHourlyTier(
                                                roomIdx,
                                                tierIdx,
                                              )
                                            }
                                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer font-bold text-xs"
                                          >
                                            ✕
                                          </button>
                                        )}
                                        {isLastTier && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleAddHourlyTier(roomIdx)
                                            }
                                            className="text-[#006ce4] hover:text-blue-800 p-0.5 cursor-pointer font-bold text-base"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="pt-1">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatNumberWithDots(
                                      rp.overnight_price,
                                    )}
                                    onChange={(e) => {
                                      const val = parseDotsToNumber(
                                        e.target.value,
                                      );
                                      setFormData((prev) => ({
                                        ...prev,
                                        room_prices: prev.room_prices.map(
                                          (item, i) =>
                                            i === roomIdx
                                              ? {
                                                  ...item,
                                                  overnight_price: val,
                                                }
                                              : item,
                                        ),
                                      }));
                                    }}
                                    className="w-28 text-right py-0.5 border-b border-gray-300 outline-none focus:border-[#003580] font-bold text-gray-900 text-xs"
                                  />
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatNumberWithDots(rp.daily_price)}
                                    onChange={(e) => {
                                      const val = parseDotsToNumber(
                                        e.target.value,
                                      );
                                      setFormData((prev) => ({
                                        ...prev,
                                        room_prices: prev.room_prices.map(
                                          (item, i) =>
                                            i === roomIdx
                                              ? { ...item, daily_price: val }
                                              : item,
                                        ),
                                      }));
                                    }}
                                    className="w-28 text-right py-0.5 border-b border-gray-300 outline-none focus:border-[#003580] font-bold text-slate-900 text-xs"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                >
                  <Save size={14} />
                  <span>Lưu bảng giá</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
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
