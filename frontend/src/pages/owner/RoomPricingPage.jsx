// src/pages/owner/RoomPricingPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

// Định dạng chấm số tiền (VD: 150000 -> "150.000")
const formatNumberWithDots = (val) => {
  if (val === undefined || val === null || val === "") return "0";
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "0";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Chuyển chuỗi chấm thành số nguyên (VD: "150.000" -> 150000)
const parseDotsToNumber = (val) => {
  if (!val) return 0;
  const cleanDigits = String(val).replace(/\D/g, "");
  return Number(cleanDigits) || 0;
};

export default function RoomPricingPage() {
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);

  // Danh sách bảng giá
  const [priceBooks, setPriceBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Dòng đang mở rộng xem chi tiết
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [expandedSubTab, setExpandedSubTab] = useState("info");

  // Toast thông báo góc dưới phải
  const [toastMsg, setToastMsg] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("info");
  const [editingPriceBook, setEditingPriceBook] = useState(null);

  // Form State ban đầu đầy đủ 100%
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

  // Tự động đóng dropdown chọn phòng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsRoomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // 1. TẢI DỮ LIỆU TỪ DATABASE QUA API
  const fetchInitData = async () => {
    try {
      setLoading(true);
      const resH = await apiClient.get("/hotels/my-hotels?active_only=true");
      const hotelList = resH?.data?.hotels || resH?.data || [];
      setHotels(hotelList);

      const currentHId = hotelList[0]?.id ? String(hotelList[0].id) : "";
      setSelectedHotelId(currentHId);

      if (currentHId) {
        const resR = await apiClient.get(`/rooms?hotel_id=${currentHId}`);
        const rList = resR?.data?.rooms || resR?.data || [];
        const validRooms = Array.isArray(rList) ? rList : [];
        setAvailableRooms(validRooms);

        // Tạo sẵn 1 bản ghi hiển thị mẫu từ DB
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
  };

  useEffect(() => {
    fetchInitData();
  }, []);

  // 2. Mở Modal Thêm mới
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
    setIsModalOpen(true);
  };

  // 3. Mở Modal Chỉnh sửa
  const handleOpenEditModal = (pb, e) => {
    if (e) e.stopPropagation();
    setEditingPriceBook(pb);
    setModalTab("info");
    setFormData({ ...pb });
    setIsModalOpen(true);
  };

  // 4. LƯU BẢNG GIÁ THẲNG VÀO DATABASE QUA API
  const handleSavePriceBook = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng nhập Tên bảng giá!");
      return;
    }

    try {
      // Lưu trực tiếp các nấc bậc thang vào bảng room trong PostgreSQL
      for (const rp of formData.room_prices) {
        if (!rp.room_id) continue;
        await apiClient.put(`/rooms/${rp.room_id}`, {
          hourly_tiers: rp.hourly_tiers, // 🌟 LƯU VÀO DATABASE
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
        setIsModalOpen(false);
      }

      // Tải lại danh sách mới nhất từ Database
      await fetchInitData();
    } catch (err) {
      alert(
        "Lỗi lưu bảng giá vào DB: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  // 5. Xóa Bảng giá
  const handleDeletePriceBook = (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa bảng giá này?")) return;
    const updated = priceBooks.filter((b) => b.id !== id);
    setPriceBooks(updated);
    if (expandedRowId === id) setExpandedRowId(null);
    showToast("Đã xóa bảng giá thành công!");
  };

  // 6. Xử lý xóa hạng phòng trong bảng giá
  const handleRemoveRoomFromPrice = (roomId) => {
    setFormData((prev) => ({
      ...prev,
      room_prices: prev.room_prices.filter((r) => r.room_id !== roomId),
    }));
  };

  // 7. Xử lý thêm hạng phòng vào bảng giá
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

  // Thêm mốc giờ bậc thang
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

  // Xóa mốc giờ bậc thang
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

  // Cập nhật mốc giờ bậc thang
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

  // Toggle mở dòng xem chi tiết
  const handleToggleRowExpand = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
    setExpandedSubTab("info");
  };

  // Lọc bảng giá
  const filteredPriceBooks = useMemo(() => {
    return priceBooks.filter((b) =>
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [priceBooks, searchQuery]);

  return (
    <div className="bg-[#f0f2f5] min-h-screen font-sans text-slate-800 -m-4 sm:-m-6 p-4 sm:p-6 pb-28 relative">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2e7d32] text-white px-4 py-2.5 rounded shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-fadeIn">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Check size={14} strokeWidth={3} />
          </div>
          <span>{toastMsg}</span>
        </div>
      )}

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

        {/* CỘT PHẢI: BẢNG GIÁ PHÒNG */}
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
                                    onClick={() => setExpandedSubTab("prices")}
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

      {/* ─── MODAL THÊM / SỬA BẢNG GIÁ ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-md w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-800 tracking-tight">
                {editingPriceBook ? "Cập nhật bảng giá" : "Thêm bảng giá"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
}
