// src/pages/owner/BookingListPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Key,
  LogOut,
  X,
  Coffee,
  Receipt,
  UserPlus,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

const STATUS_TABS = [
  { id: "all", label: "Tất cả đơn" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "checked_in", label: "Đang lưu trú" },
  { id: "checked_out", label: "Đã trả phòng" },
  { id: "cancelled", label: "Đã hủy" },
];

export default function BookingListPage() {
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [apiError, setApiError] = useState("");

  // Modal Check-in
  const [checkInModal, setCheckInModal] = useState(null);
  const [assignedRoom, setAssignedRoom] = useState("");
  const [earlyOption, setEarlyOption] = useState("none");
  const [payMethodAtCheckIn, setPayMethodAtCheckIn] = useState("cash");

  // Modal Check-out
  const [checkOutModal, setCheckOutModal] = useState(null);
  const [lateOption, setLateOption] = useState("none");
  const [minibarFee, setMinibarFee] = useState(0);
  const [otherFee, setOtherFee] = useState(0);

  // Modal Walk-in
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    hotel_id: "",
    room_id: "",
    customer_name: "",
    guest_phone: "",
    total_price: 650000,
    checkin_date: new Date().toISOString().split("T")[0],
    checkout_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    payment_method: "cash",
    is_check_in_now: true,
  });

  const formatStayDateTime = (dateStr, defaultHour = "14:00") => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const formatter = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return `${defaultHour} • ${formatter.format(d)}`;
    } catch {
      return dateStr;
    }
  };

  const formatBookingTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      return new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const fetchOwnerBookings = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get("/owner/bookings");
      const list = res?.data || res?.bookings || res || [];
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      setApiError(err.message || "Không thể kết nối đến dữ liệu đơn đặt.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyHotels = useCallback(async () => {
    try {
      const res = await apiClient.get("/hotels/my-hotels?active_only=true");
      const list = res?.data || res?.hotels || res || [];
      const hotelArr = Array.isArray(list) ? list : [];
      setHotels(hotelArr);
      if (hotelArr.length > 0 && !walkInForm.hotel_id) {
        setWalkInForm((prev) => ({ ...prev, hotel_id: hotelArr[0].id }));
      }
    } catch (err) {
      console.error("Lỗi lấy khách sạn:", err);
    }
  }, [walkInForm.hotel_id]);

  useEffect(() => {
    if (!walkInForm.hotel_id) return;
    apiClient
      .get(`/rooms?hotel_id=${walkInForm.hotel_id}`)
      .then((res) => {
        const rList = res?.data || res?.rooms || res || [];
        const arr = Array.isArray(rList) ? rList : [];
        setRooms(arr);
        if (arr.length > 0) {
          setWalkInForm((prev) => ({
            ...prev,
            room_id: arr[0].id,
            total_price: Number(arr[0].base_price || 650000),
          }));
        }
      })
      .catch(() => setRooms([]));
  }, [walkInForm.hotel_id]);

  useEffect(() => {
    fetchOwnerBookings();
    fetchMyHotels();
  }, [fetchOwnerBookings, fetchMyHotels]);

  const handleConfirmOrder = async (bookingId) => {
    try {
      await apiClient.patch(`/owner/bookings/${bookingId}/status`, {
        status: "confirmed",
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "confirmed" } : b,
        ),
      );
      alert("✓ Đã xác nhận tiếp nhận đơn đặt phòng!");
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleQuickPay = async (bookingId) => {
    if (!window.confirm("Xác nhận khách đã thanh toán đủ tiền phòng?")) return;
    try {
      await apiClient.patch(`/owner/bookings/${bookingId}/status`, {
        payment_status: "paid",
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, payment_status: "paid" } : b,
        ),
      );
      alert("✓ Đã cập nhật: Đơn phòng ĐÃ THANH TOÁN! Tiền đã vào doanh thu.");
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handlePerformCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInModal) return;

    const basePrice = Number(checkInModal.total_price);
    let earlyFee = 0;
    if (earlyOption === "30") earlyFee = Math.round(basePrice * 0.3);
    if (earlyOption === "50") earlyFee = Math.round(basePrice * 0.5);

    try {
      await apiClient.post(`/owner/bookings/${checkInModal.id}/checkin`, {
        early_fee: earlyFee,
        room_number: assignedRoom,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === checkInModal.id
            ? {
                ...b,
                status: "checked_in",
                payment_status: "paid",
                room_number: assignedRoom,
                total_price: basePrice + earlyFee,
              }
            : b,
        ),
      );

      alert(
        `✓ Check-in thành công! Đã bàn giao phòng ${assignedRoom} cho khách.`,
      );
      setCheckInModal(null);
    } catch (err) {
      alert(`Lỗi check-in: ${err.message}`);
    }
  };

  const handlePerformCheckOut = async (e) => {
    e.preventDefault();
    if (!checkOutModal) return;

    const basePrice = Number(checkOutModal.total_price);
    let lateFee = 0;
    if (lateOption === "30") lateFee = Math.round(basePrice * 0.3);
    if (lateOption === "50") lateFee = Math.round(basePrice * 0.5);
    if (lateOption === "100") lateFee = basePrice;

    try {
      await apiClient.post(`/owner/bookings/${checkOutModal.id}/checkout`, {
        late_fee: lateFee,
        minibar_fee: Number(minibarFee),
        other_fee: Number(otherFee),
      });

      const finalTotal =
        basePrice + lateFee + Number(minibarFee) + Number(otherFee);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === checkOutModal.id
            ? {
                ...b,
                status: "checked_out",
                payment_status: "paid",
                total_price: finalTotal,
              }
            : b,
        ),
      );
      alert("✓ Check-out thành công! Đã hoàn tất quyết toán hóa đơn.");
      setCheckOutModal(null);
    } catch (err) {
      alert(`Lỗi check-out: ${err.message}`);
    }
  };

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/owner/bookings/walk-in", walkInForm);
      alert(res?.message || "✓ Đã tạo đơn tại quầy thành công!");
      setIsWalkInOpen(false);
      fetchOwnerBookings();
    } catch (err) {
      alert(`Lỗi tạo đơn: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusTab !== "all" && b.status !== statusTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.booking_code?.toLowerCase().includes(q) ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.guest_phone?.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER & NÚT WALK-IN THEO PHONG CÁCH GHOSTAY */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#006ce4] font-bold text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 size={16} /> Quy Trình Tiếp Tân & Quản Trị Lưu Trú
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0a2540] tracking-tight">
            Quản Lý Đơn Đặt ({bookings.length} Đơn)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Quy chuẩn thu tiền, check-in tiêu chuẩn 14:00 & check-out 12:00
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsWalkInOpen(true)}
            className="px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <UserPlus size={16} /> Đặt phòng tại quầy (Walk-in)
          </button>
          <button
            type="button"
            onClick={fetchOwnerBookings}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      {/* TÌM KIẾM & BỘ LỌC TABS */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên khách, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003580] shadow-xs"
          />
        </div>

        <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusTab === tab.id
                  ? "bg-[#003580] text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BẢNG ĐƠN ĐẶT PHÒNG */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách đơn đặt phòng..."
          />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-4 px-5">Mã Đơn & Khách Hàng</th>
                  <th className="py-4 px-4">Hạng Phòng & Cơ Sở</th>
                  <th className="py-4 px-4">Ngày Nhận / Trả (Giờ VN)</th>
                  <th className="py-4 px-4">Tổng Hóa Đơn</th>
                  <th className="py-4 px-4 text-center">Thanh Toán</th>
                  <th className="py-4 px-5 text-right">Nghiệp Vụ Lễ Tân</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredBookings.map((b) => {
                  const isPaid = b.payment_status === "paid";

                  return (
                    <tr key={b.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-[#003580] flex items-center gap-1.5">
                          #{b.booking_code}
                          {b.booking_code?.startsWith("WI") && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black rounded-md">
                              Walk-in
                            </span>
                          )}
                        </span>
                        <strong className="block text-gray-900 mt-1 font-bold">
                          {b.customer_name || b.guest_name || "Khách tại quầy"}
                        </strong>
                        <span className="text-gray-400 block text-[11px]">
                          {b.guest_phone || b.contact_phone || "---"}
                        </span>
                        {b.created_at && (
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Đặt lúc: {formatBookingTime(b.created_at)}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900">
                          {b.room_name || "Phòng tiêu chuẩn"}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {b.hotel_name}
                        </p>

                        {b.room_number ? (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-50 text-[#003580] font-bold text-[11px] rounded-lg border border-blue-200">
                            🔑 Phòng: {b.room_number}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic block mt-0.5">
                            (Chưa giao phòng)
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-emerald-700">
                          Nhận: {formatStayDateTime(b.checkin_date, "14:00")}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          Trả: {formatStayDateTime(b.checkout_date, "12:00")}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-black text-[#ff6a00] block text-sm tabular-nums">
                          {formatVND(b.total_price)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          Trạng thái:{" "}
                          {b.status === "checked_in"
                            ? "Đang ở"
                            : b.status === "confirmed"
                              ? "Đã duyệt"
                              : b.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isPaid ? "✓ Đã thanh toán" : "Chưa thanh toán"}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handleQuickPay(b.id)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-[11px] flex items-center gap-1 cursor-pointer transition"
                              title="Xác nhận khách đã nộp tiền"
                            >
                              <DollarSign size={13} /> Thu tiền
                            </button>
                          )}

                          {b.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmOrder(b.id)}
                              className="px-3 py-1.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition shadow-2xs"
                            >
                              Xác nhận
                            </button>
                          )}

                          {b.status === "confirmed" && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckInModal(b);
                                setAssignedRoom(b.room_number || "P.201");
                                setEarlyOption("none");
                                setPayMethodAtCheckIn("cash");
                              }}
                              className="px-3.5 py-1.5 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                            >
                              <Key size={13} /> Check-in
                            </button>
                          )}

                          {b.status === "checked_in" && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckOutModal(b);
                                setLateOption("none");
                                setMinibarFee(0);
                                setOtherFee(0);
                              }}
                              className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                            >
                              <LogOut size={13} /> Check-out
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="Không tìm thấy đơn đặt phòng nào"
          description="Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
        />
      )}

      {/* MODAL CHECK-IN */}
      {checkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-[#0a2540] flex items-center gap-1.5">
                  <Key size={18} className="text-[#003580]" /> Thủ Tục Check-in
                </h3>
                <p className="text-[11px] text-gray-500">
                  Giờ chuẩn nhận phòng từ 14:00
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePerformCheckIn} className="space-y-3.5">
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <p className="text-gray-600">
                  Khách hàng:{" "}
                  <b className="text-gray-900">{checkInModal.customer_name}</b>
                </p>
                <p className="text-gray-600">
                  Hạng phòng:{" "}
                  <b className="text-gray-900">{checkInModal.room_name}</b>
                </p>
                <p className="text-gray-600">
                  Thời gian nhận:{" "}
                  <b className="text-emerald-700">
                    {formatStayDateTime(checkInModal.checkin_date, "14:00")}
                  </b>
                </p>
                <p className="text-gray-600">
                  Tiền phòng cơ bản:{" "}
                  <b className="text-gray-900">
                    {formatVND(checkInModal.total_price)}
                  </b>
                </p>
              </div>

              {checkInModal.payment_status !== "paid" ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <p className="font-bold text-amber-900 flex items-center gap-1">
                    <AlertCircle size={15} /> Khách CHƯA thanh toán tiền phòng!
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Hình thức thu tiền tại quầy:
                    </label>
                    <select
                      value={payMethodAtCheckIn}
                      onChange={(e) => setPayMethodAtCheckIn(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-xl font-bold bg-white text-xs outline-none focus:border-[#003580]"
                    >
                      <option value="cash">💵 Thu tiền mặt trực tiếp</option>
                      <option value="transfer">
                        📱 Quét mã QR chuyển khoản
                      </option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Đơn phòng này đã thanh toán đủ 100%
                </div>
              )}

              <div>
                <label className="block font-bold mb-1 text-gray-800">
                  Số phòng bàn giao (Chìa khóa) *
                </label>
                <input
                  required
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  placeholder="VD: P.201, Phòng 305..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 bg-gray-50 focus:bg-white outline-none focus:border-[#003580]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-800">
                  Quy định nhận phòng sớm
                </label>
                <select
                  value={earlyOption}
                  onChange={(e) => setEarlyOption(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-medium bg-white outline-none focus:border-[#003580]"
                >
                  <option value="none">
                    Đúng giờ chuẩn (Sau 14:00) - Miễn phụ thu
                  </option>
                  <option value="30">
                    Check-in từ 09:00 - 14:00 (+30% giá phòng)
                  </option>
                  <option value="50">
                    Check-in sớm từ 05:00 - 09:00 (+50% giá phòng)
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCheckInModal(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer shadow-sm transition active:scale-95"
                >
                  {checkInModal.payment_status !== "paid"
                    ? "✓ Thu tiền & Giao phòng"
                    : "✓ Bàn giao chìa khóa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHECK-OUT */}
      {checkOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-[#0a2540] flex items-center gap-1.5">
                  <Receipt size={18} className="text-[#003580]" /> Quyết Toán &
                  Trả Phòng
                </h3>
                <p className="text-[11px] text-gray-500">
                  Giờ chuẩn trả phòng trước 12:00 trưa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckOutModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePerformCheckOut} className="space-y-3.5">
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <p className="text-gray-600">
                  Khách hàng:{" "}
                  <b className="text-gray-900">{checkOutModal.customer_name}</b>
                </p>
                {checkOutModal.room_number && (
                  <p className="text-gray-600">
                    Phòng:{" "}
                    <b className="text-[#003580] font-bold">
                      {checkOutModal.room_number}
                    </b>
                  </p>
                )}
                <p className="text-gray-600">
                  Thời gian trả:{" "}
                  <b className="text-gray-900">
                    {formatStayDateTime(checkOutModal.checkout_date, "12:00")}
                  </b>
                </p>
                <p className="text-gray-600">
                  Tiền phòng:{" "}
                  <b className="text-gray-900">
                    {formatVND(checkOutModal.total_price)}
                  </b>
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-800">
                  Quy định trả phòng trễ
                </label>
                <select
                  value={lateOption}
                  onChange={(e) => setLateOption(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-medium bg-white outline-none focus:border-[#003580]"
                >
                  <option value="none">
                    Đúng giờ (Trước 12:00) - Không phụ thu
                  </option>
                  <option value="30">
                    Trả phòng sau 12:00 - 15:00 (+30% tiền phòng)
                  </option>
                  <option value="50">
                    Trả phòng sau 15:00 - 18:00 (+50% tiền phòng)
                  </option>
                  <option value="100">
                    Trả phòng sau 18:00 (+100% nguyên ngày)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1 text-gray-800">
                    <Coffee size={13} className="text-amber-600" /> Minibar / Đồ
                    uống
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={minibarFee}
                    onChange={(e) => setMinibarFee(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#003580]"
                    placeholder="0 đ"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Dịch vụ khác / Đền bù
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={otherFee}
                    onChange={(e) => setOtherFee(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#003580]"
                    placeholder="0 đ"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCheckOutModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl font-bold cursor-pointer hover:bg-gray-50 text-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer shadow-sm transition active:scale-95"
                >
                  Hoàn tất quyết toán & Thu hồi phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WALK-IN TẠI QUẦY */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-[#0a2540] flex items-center gap-1.5">
                  <UserPlus size={18} className="text-[#003580]" /> Tạo Đơn Đặt
                  Phòng Tại Quầy
                </h3>
                <p className="text-[11px] text-gray-500">
                  Dành cho khách đến trực tiếp lễ tân không qua đặt online
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Cơ sở khách sạn *
                  </label>
                  <select
                    required
                    value={walkInForm.hotel_id}
                    onChange={(e) =>
                      setWalkInForm({ ...walkInForm, hotel_id: e.target.value })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold bg-gray-50 outline-none focus:border-[#003580]"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        🏨 {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Hạng phòng *
                  </label>
                  <select
                    required
                    value={walkInForm.room_id}
                    onChange={(e) => {
                      const rId = e.target.value;
                      const selectedR = rooms.find(
                        (r) => String(r.id) === String(rId),
                      );
                      setWalkInForm({
                        ...walkInForm,
                        room_id: rId,
                        total_price: selectedR
                          ? Number(selectedR.base_price || 650000)
                          : walkInForm.total_price,
                      });
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold bg-gray-50 outline-none focus:border-[#003580]"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        🛏️ {r.name} ({formatVND(r.base_price)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Họ và tên khách *
                  </label>
                  <input
                    required
                    value={walkInForm.customer_name}
                    onChange={(e) =>
                      setWalkInForm({
                        ...walkInForm,
                        customer_name: e.target.value,
                      })
                    }
                    placeholder="VD: Anh Tuấn, Chị Hoa..."
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#003580]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    value={walkInForm.guest_phone}
                    onChange={(e) =>
                      setWalkInForm({
                        ...walkInForm,
                        guest_phone: e.target.value,
                      })
                    }
                    placeholder="0912 345 678"
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Giá thanh toán (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={walkInForm.total_price}
                    onChange={(e) =>
                      setWalkInForm({
                        ...walkInForm,
                        total_price: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-black text-[#ff6a00] outline-none focus:border-[#003580]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Hình thức thu tiền
                  </label>
                  <select
                    value={walkInForm.payment_method}
                    onChange={(e) =>
                      setWalkInForm({
                        ...walkInForm,
                        payment_method: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold bg-white outline-none focus:border-[#003580]"
                  >
                    <option value="cash">💵 Đã thu tiền mặt tại quầy</option>
                    <option value="transfer">📱 Đã chuyển khoản qua QR</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl font-bold cursor-pointer hover:bg-gray-50 text-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer shadow-sm transition active:scale-95"
                >
                  Lưu & Thu tiền hoàn tất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
