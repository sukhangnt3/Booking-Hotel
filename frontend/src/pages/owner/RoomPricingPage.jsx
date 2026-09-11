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
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

// =========================================================================
// CÁC HÀM TIỆN ÍCH ĐỊNH DẠNG SỐ TIỀN
// =========================================================================
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

// =========================================================================
// COMPONENT CHỌN GIỜ (TIMEPICKER DROPDOWN) - GIỮ NGUYÊN 100%
// =========================================================================
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

// =========================================================================
// TRANG CHÍNH: BẢNG GIÁ PHÒNG & THIẾT LẬP GIỜ NHẬN / TRẢ GỘP CHUNG
// =========================================================================
export default function RoomPricingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab chính điều khiển hiển thị: "pricing" (Bảng giá) hoặc "time_settings" (Thiết lập giờ)
  const currentTab = searchParams.get("tab") || "pricing";

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // State chung
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [availableRooms, setAvailableRooms] = useState([]);
  const [toastMsg, setToastMsg] = useState("");

  // -------------------------------------------------------------
  // STATE CỦA PHẦN 1: BẢNG GIÁ PHÒNG
  // -------------------------------------------------------------
  const [priceBooks, setPriceBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [expandedSubTab, setExpandedSubTab] = useState("info");

  // Modal Bảng giá
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

  // -------------------------------------------------------------
  // STATE CỦA PHẦN 2: THIẾT LẬP GIỜ NHẬN / TRẢ
  // -------------------------------------------------------------
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [timeSettings, setTimeSettings] = useState({
    hourly_grace_minutes: 30,
    overnight_checkin: "22:00",
    overnight_checkout: "11:00",
    daily_checkin: "14:00",
    daily_checkout: "12:00",
    daily_grace_hours: 6,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Đóng dropdown chọn phòng khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsRoomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -------------------------------------------------------------
  // 1. TẢI DỮ LIỆU CẤU HÌNH THỜI GIAN CỦA KHÁCH SẠN
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 2. KHỞI TẠO TẤT CẢ DỮ LIỆU
  // -------------------------------------------------------------
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
        // Tải thiết lập giờ
        await fetchHotelDetails(targetHId);

        // Tải danh sách phòng
        const resR = await apiClient.get(`/rooms?hotel_id=${targetHId}`);
        const rList = resR?.data?.rooms || resR?.data || [];
        const validRooms = Array.isArray(rList) ? rList : [];
        setAvailableRooms(validRooms);

        // Tạo sẵn 1 bảng giá tiêu chuẩn từ DB
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
          room_prices: validRooms.map((r) => ({
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
            overnight_price: r.overnight_price || r.base_price || 300000,
            daily_price: r.base_price || 200000,
          })),
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

  // -------------------------------------------------------------
  // 3. CÁC HÀM XỬ LÝ BẢNG GIÁ PHÒNG
  // -------------------------------------------------------------
  const handleOpenAddModal = () => {
    setEditingPriceBook(null);
    setModalTab("info");

    const initialRoomPrices = availableRooms.map((r) => ({
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
      overnight_price: r.overnight_price || r.base_price || 300000,
      daily_price: r.base_price || 200000,
    }));

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
        setFormData({
          ...initialFormState,
          code: "",
        });
        setEditingPriceBook(null);
      } else {
        setIsPricingModalOpen(false);
      }

      await fetchInitData();
    } catch (err) {
      alert(
        "Lỗi lưu bảng giá vào DB: " +
          (err.response?.data?.message || err.message),
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
      overnight_price: room.overnight_price || room.base_price || 300000,
      daily_price: room.base_price || 200000,
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

  // -------------------------------------------------------------
  // 4. CÁC HÀM XỬ LÝ THIẾT LẬP THỜI GIAN NHẬN / TRẢ PHÒNG
  // -------------------------------------------------------------
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
      setIsTimeModalOpen(false);
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
    <div className="bg-[#f0f2f5] min-h-screen font-sans text-slate-800 -m-4 sm:-m-6 p-4 sm:p-6 pb-28 relative">
      {/* Toast thông báo chung */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2e7d32] text-white px-4 py-2.5 rounded shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-fadeIn">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Check size={14} strokeWidth={3} />
          </div>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG TAB CHÍNH (GỘP CẢ 2 PHẦN) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 mb-5 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleTabChange("pricing")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              currentTab === "pricing"
                ? "bg-[#2e7d32] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Tags size={16} />
            <span>Bảng giá phòng</span>
          </button>

          <button
            onClick={() => handleTabChange("time_settings")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              currentTab === "time_settings"
                ? "bg-[#2e7d32] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Clock size={16} />
            <span>Thiết lập giờ nhận / trả</span>
          </button>
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

      {/* =====================================================================
          HIỂN THỊ NỘI DUNG THEO TAB ĐƯỢC CHỌN
      ===================================================================== */}
      {currentTab === "pricing" ? (
        /* ======================== TAB 1: BẢNG GIÁ PHÒNG ======================== */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* CỘT TRÁI: BỘ LỌC TÌM KIẾM */}
          <div className="md:col-span-3 space-y-3.5">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Tìm kiếm
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Theo tên bảng giá"
                className="w-full text-xs py-1.5 border-b border-slate-200 outline-none placeholder:text-slate-400 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH BẢNG GIÁ */}
          <div className="md:col-span-9 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Bảng giá phòng
              </h1>

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold text-xs rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Thiết lập bảng giá</span>
              </button>
            </div>

            {/* Khung Bảng */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#e0f2fe] text-slate-700 border-b border-slate-200 select-none">
                    <th className="py-3 px-4 font-bold whitespace-nowrap w-44">
                      Mã bảng giá
                    </th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">
                      Tên bảng giá
                    </th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap w-36">
                      Trạng thái
                    </th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap text-right w-52">
                      Thời gian hiệu lực
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPriceBooks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Inbox
                            size={40}
                            strokeWidth={1.2}
                            className="text-slate-300"
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
                                ? "bg-[#e8f5e9] border-t-2 border-l-2 border-r-2 border-[#2e7d32] font-semibold"
                                : "border-b border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {item.code}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {item.name}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block text-xs text-emerald-700 font-bold">
                                Đang hoạt động
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700">
                              {startDateStr} đến {endDateStr}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="border-b-2 border-l-2 border-r-2 border-[#2e7d32] bg-white">
                              <td colSpan={4} className="p-0">
                                <div className="bg-white">
                                  <div className="flex items-center gap-1 px-4 pt-2 bg-[#e8f5e9] border-b border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSubTab("info")}
                                      className={`px-5 py-1.5 text-xs font-bold rounded-t transition cursor-pointer border-t border-x ${
                                        expandedSubTab === "info"
                                          ? "bg-white text-slate-800 border-slate-300 border-b-white -mb-[1px]"
                                          : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                                      }`}
                                    >
                                      Thông tin
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedSubTab("prices")
                                      }
                                      className={`px-5 py-1.5 text-xs font-bold rounded-t transition cursor-pointer border-t border-x ${
                                        expandedSubTab === "prices"
                                          ? "bg-white text-slate-800 border-slate-300 border-b-white -mb-[1px]"
                                          : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                                      }`}
                                    >
                                      Giá phòng
                                    </button>
                                  </div>

                                  {expandedSubTab === "info" ? (
                                    <div className="p-6 space-y-6">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-xs">
                                        <div className="space-y-3">
                                          <div className="flex items-center border-b border-slate-100 pb-1.5">
                                            <span className="w-36 text-slate-600 font-normal">
                                              Mã bảng giá:
                                            </span>
                                            <span className="font-bold text-slate-800">
                                              {item.code}
                                            </span>
                                          </div>
                                          <div className="flex items-center border-b border-slate-100 pb-1.5">
                                            <span className="w-36 text-slate-600 font-normal">
                                              Tên bảng giá:
                                            </span>
                                            <span className="font-bold text-slate-800">
                                              {item.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center border-b border-slate-100 pb-1.5">
                                            <span className="w-36 text-slate-600 font-normal">
                                              Thời gian hiệu lực:
                                            </span>
                                            <span className="font-medium text-slate-800">
                                              {startDateStr} đến {endDateStr}
                                            </span>
                                          </div>
                                          <div className="flex items-center pb-1.5">
                                            <span className="w-36 text-slate-600 font-normal">
                                              Trạng thái:
                                            </span>
                                            <span className="font-bold text-emerald-700">
                                              Đang hoạt động
                                            </span>
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <div className="flex items-center border-b border-slate-100 pb-1.5">
                                            <span className="w-32 text-slate-600 font-normal">
                                              Chi nhánh:
                                            </span>
                                            <span className="font-medium text-slate-800">
                                              Toàn hệ thống
                                            </span>
                                          </div>
                                          <div className="flex items-center border-b border-slate-100 pb-1.5">
                                            <span className="w-32 text-slate-600 font-normal">
                                              Khách hàng:
                                            </span>
                                            <span className="font-medium text-slate-800">
                                              Toàn bộ khách hàng
                                            </span>
                                          </div>
                                          <div className="flex items-center pb-1.5">
                                            <span className="w-32 text-slate-600 font-normal">
                                              Ghi chú:
                                            </span>
                                            <span className="font-medium text-slate-700">
                                              {item.note || ""}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            handleOpenEditModal(item, e)
                                          }
                                          className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                                        >
                                          <CheckSquare size={14} />
                                          <span>Cập nhật</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            handleDeletePriceBook(item.id, e)
                                          }
                                          className="px-4 py-1.5 bg-[#e53e3e] hover:bg-[#c53030] text-white font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                                        >
                                          <Trash2 size={14} />
                                          <span>Xóa</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-4 space-y-3">
                                      <div className="border border-slate-200 rounded overflow-hidden">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead>
                                            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                              <th className="py-2.5 px-3 font-bold">
                                                Mã phòng
                                              </th>
                                              <th className="py-2.5 px-3 font-bold">
                                                Tên hạng phòng
                                              </th>
                                              <th className="py-2.5 px-3 font-bold text-right">
                                                Giá giờ đầu
                                              </th>
                                              <th className="py-2.5 px-3 font-bold text-right">
                                                Giá đêm
                                              </th>
                                              <th className="py-2.5 px-3 font-bold text-right">
                                                Giá ngày
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {(item.room_prices || []).map(
                                              (rp, idx) => (
                                                <tr
                                                  key={idx}
                                                  className="hover:bg-slate-50"
                                                >
                                                  <td className="py-2.5 px-3 font-bold text-slate-800">
                                                    {rp.code}
                                                  </td>
                                                  <td className="py-2.5 px-3 font-medium text-slate-800">
                                                    {rp.name}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                                                    {formatNumberWithDots(
                                                      rp.hourly_tiers?.[0]
                                                        ?.price ||
                                                        rp.hourly_price,
                                                    )}{" "}
                                                    đ
                                                  </td>
                                                  <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                                                    {formatNumberWithDots(
                                                      rp.overnight_price,
                                                    )}{" "}
                                                    đ
                                                  </td>
                                                  <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
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
      ) : (
        /* ======================== TAB 2: THIẾT LẬP GIỜ NHẬN / TRẢ ======================== */
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Thiết lập phòng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình mốc giờ nhận/trả phòng và cách tính phụ thu thời gian sử
              dụng
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-semibold animate-fadeIn">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>
                Đã lưu thành công thiết lập thời gian sử dụng phòng vào
                Database!
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
                    Quy định thời gian nhận phòng, trả phòng, tính thêm giờ khi
                    sử dụng quá thời gian...
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
                        {timeSettings.daily_checkin} -{" "}
                        {timeSettings.daily_checkout}
                      </b>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTimeModalOpen(true)}
                className="px-5 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs rounded-md transition cursor-pointer flex-shrink-0 active:scale-95 self-end sm:self-center"
              >
                Chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: THÊM / SỬA BẢNG GIÁ PHÒNG ─── */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-md w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-800 tracking-tight">
                {editingPriceBook ? "Cập nhật bảng giá" : "Thêm bảng giá"}
              </h3>
              <button
                onClick={() => setIsPricingModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-8 px-6 border-b border-slate-200 text-xs font-medium text-slate-500 bg-white select-none">
              <button
                type="button"
                onClick={() => setModalTab("info")}
                className={`py-2.5 transition relative cursor-pointer ${
                  modalTab === "info"
                    ? "text-slate-800 font-semibold"
                    : "hover:text-slate-800"
                }`}
              >
                Thông tin
                {modalTab === "info" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2e7d32]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("price_details")}
                className={`py-2.5 transition relative cursor-pointer ${
                  modalTab === "price_details"
                    ? "text-slate-800 font-semibold"
                    : "hover:text-slate-800"
                }`}
              >
                Chi tiết giá phòng
                {modalTab === "price_details" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2e7d32]" />
                )}
              </button>
            </div>

            <form
              onSubmit={handleSavePriceBook}
              className="flex-1 overflow-y-auto p-6 space-y-6 text-xs"
            >
              {modalTab === "info" && (
                <div className="space-y-5 pt-1">
                  <div className="flex items-center gap-4">
                    <label className="w-28 text-slate-700 font-normal">
                      Mã bảng giá
                    </label>
                    <input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      placeholder="Mã bảng giá tự động"
                      className="flex-1 py-1 border-b border-slate-300 outline-none text-slate-800 font-medium bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="w-28 text-slate-700 font-normal">
                      Tên bảng giá <b className="text-rose-500">*</b>
                    </label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Nhập tên bảng giá..."
                      className="flex-1 py-1 border-b border-[#2e7d32] outline-none text-slate-800 font-medium bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="w-28 flex items-center gap-1.5 text-slate-700 font-normal">
                      <span>Ghi chú</span>
                      <Edit2 size={12} className="text-slate-400" />
                    </label>
                    <input
                      value={formData.note}
                      onChange={(e) =>
                        setFormData({ ...formData, note: e.target.value })
                      }
                      placeholder="Thêm ghi chú nếu có..."
                      className="flex-1 py-1 border-b border-slate-300 outline-none text-slate-800 bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="w-28 text-slate-700 font-normal">
                      Hiệu lực
                    </label>
                    <div className="flex-1 flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 border-b border-slate-300 pb-0.5">
                        <input
                          type="datetime-local"
                          value={formData.start_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              start_date: e.target.value,
                            })
                          }
                          className="outline-none text-slate-800 font-medium bg-transparent"
                        />
                        <Calendar size={13} className="text-slate-400" />
                      </div>
                      <span className="text-slate-500">Đến</span>
                      <div className="flex items-center gap-2 border-b border-slate-300 pb-0.5">
                        <input
                          type="datetime-local"
                          value={formData.end_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              end_date: e.target.value,
                            })
                          }
                          className="outline-none text-slate-800 font-medium bg-transparent"
                        />
                        <Calendar size={13} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="block text-slate-700 font-medium">
                      Phạm vi áp dụng
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="scope_branch"
                            checked={formData.scope_branch === "all"}
                            onChange={() =>
                              setFormData({ ...formData, scope_branch: "all" })
                            }
                            className="accent-[#2e7d32]"
                          />
                          <span>Toàn hệ thống</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                            <input
                              type="radio"
                              name="scope_branch"
                              checked={formData.scope_branch === "custom"}
                              onChange={() =>
                                setFormData({
                                  ...formData,
                                  scope_branch: "custom",
                                })
                              }
                              className="accent-[#2e7d32]"
                            />
                            <span>Chi nhánh</span>
                          </label>
                          <input
                            disabled={formData.scope_branch !== "custom"}
                            value={formData.branch_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                branch_name: e.target.value,
                              })
                            }
                            placeholder="Chọn chi nhánh áp dụng"
                            className="flex-1 py-1 border-b border-slate-300 outline-none text-slate-700 disabled:opacity-40 bg-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="scope_customer"
                            checked={formData.scope_customer === "all"}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                scope_customer: "all",
                              })
                            }
                            className="accent-[#2e7d32]"
                          />
                          <span>Toàn bộ khách hàng</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                            <input
                              type="radio"
                              name="scope_customer"
                              checked={formData.scope_customer === "custom"}
                              onChange={() =>
                                setFormData({
                                  ...formData,
                                  scope_customer: "custom",
                                })
                              }
                              className="accent-[#2e7d32]"
                            />
                            <span>Nhóm khách hàng</span>
                          </label>
                          <input
                            disabled={formData.scope_customer !== "custom"}
                            value={formData.customer_group}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customer_group: e.target.value,
                              })
                            }
                            placeholder="Chọn nhóm khách hàng áp dụng"
                            className="flex-1 py-1 border-b border-slate-300 outline-none text-slate-700 disabled:opacity-40 bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "price_details" && (
                <div className="space-y-4">
                  <div className="relative" ref={dropdownRef}>
                    <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        value={roomSearchKey}
                        onFocus={() => setIsRoomDropdownOpen(true)}
                        onChange={(e) => setRoomSearchKey(e.target.value)}
                        placeholder="Thêm hạng phòng vào bảng giá"
                        className="w-full outline-none text-slate-800 text-xs placeholder:text-slate-400 bg-transparent"
                      />
                    </div>

                    {isRoomDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-30 max-h-48 overflow-y-auto">
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
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs border-b border-slate-100"
                            >
                              <span className="font-semibold text-slate-800">
                                {r.code || r.name} - {r.name}
                              </span>
                              <span className="text-slate-500 font-medium">
                                {formatNumberWithDots(r.base_price)} đ
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#e0f2fe] text-slate-700 border-b border-slate-200">
                          <th className="py-2.5 px-3 font-bold w-48">
                            Hạng phòng
                          </th>
                          <th className="py-2.5 px-3 font-bold w-28">
                            Ngày lưu trú
                          </th>
                          <th className="py-2.5 px-3 font-bold w-24">
                            Loại giá
                          </th>
                          <th className="py-2.5 px-3 font-bold">Mức giá</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
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
                              <td className="py-3 px-3">
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveRoomFromPrice(rp.room_id)
                                    }
                                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer mt-0.5"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  <div>
                                    <span className="font-bold text-slate-800 block">
                                      {rp.code}
                                    </span>
                                    <span className="text-slate-600 text-[11px] block">
                                      {rp.name}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-medium text-slate-700 block mb-3">
                                  Mặc định
                                </span>
                              </td>

                              <td className="py-3 px-3 text-slate-600">
                                <div
                                  style={{
                                    height: `${tiers.length * 32}px`,
                                    paddingTop: "2px",
                                  }}
                                >
                                  Giá giờ
                                </div>
                                <div className="py-1.5">Giá đêm</div>
                                <div className="py-1.5">Giá ngày</div>
                              </td>

                              <td className="py-3 px-3 space-y-2.5">
                                <div className="space-y-2">
                                  {tiers.map((tier, tierIdx) => {
                                    const isLastTier =
                                      tierIdx === tiers.length - 1;

                                    return (
                                      <div
                                        key={tierIdx}
                                        className="flex items-center gap-2 flex-wrap"
                                      >
                                        <span className="text-slate-600">
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
                                          className="w-10 text-center py-0.5 border-b border-slate-300 outline-none text-xs font-semibold"
                                        />

                                        <span className="text-slate-600">
                                          giá
                                        </span>
                                        <span className="font-medium text-slate-700">
                                          Mỗi giờ
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
                                          className="w-24 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] font-semibold text-slate-800 text-xs"
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
                                            className="text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer font-bold text-base ml-0.5"
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
                                    className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] font-semibold text-slate-800 text-xs"
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
                                    className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] font-semibold text-slate-800 text-xs"
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

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                >
                  <Save size={14} />
                  <span>Lưu</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSavePriceBook(e, true)}
                  className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                >
                  <Save size={14} />
                  <span>Lưu & Thêm mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="px-4 py-1.5 bg-[#718096] hover:bg-[#4a5568] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                >
                  <Ban size={14} />
                  <span>Bỏ qua</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: THIẾT LẬP THỜI GIAN SỬ DỤNG PHÒNG ─── */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col animate-scaleUp">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                Thiết lập thời gian sử dụng phòng
              </h3>
              <button
                onClick={() => setIsTimeModalOpen(false)}
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
                  onClick={() => setIsTimeModalOpen(false)}
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
