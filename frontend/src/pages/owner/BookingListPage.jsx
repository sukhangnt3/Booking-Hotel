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

  // Modal Check-in (Có thu tiền tại chỗ và nhập số phòng)
  const [checkInModal, setCheckInModal] = useState(null);
  const [assignedRoom, setAssignedRoom] = useState("");
  const [earlyOption, setEarlyOption] = useState("none");
  const [payMethodAtCheckIn, setPayMethodAtCheckIn] = useState("cash");

  // Modal Check-out
  const [checkOutModal, setCheckOutModal] = useState(null);
  const [lateOption, setLateOption] = useState("none");
  const [minibarFee, setMinibarFee] = useState(0);
  const [otherFee, setOtherFee] = useState(0);

  // Modal Walk-in (Đặt tại quầy)
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

  // ─────────────────────────────────────────────
  // 🕒 HÀM ĐỊNH DẠNG MÚI GIỜ VIỆT NAM (ASIA/HO_CHI_MINH)
  // ─────────────────────────────────────────────
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

  // Xác nhận đơn đặt online
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

  // Nút thu tiền nhanh tại quầy
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

  // ─────────────────────────────────────────────
  // 🔑 THỰC HIỆN CHECK-IN (LƯU SỐ PHÒNG BÀN GIAO)
  // ─────────────────────────────────────────────
  const handlePerformCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInModal) return;

    const basePrice = Number(checkInModal.total_price);
    let earlyFee = 0;
    if (earlyOption === "30") earlyFee = Math.round(basePrice * 0.3);
    if (earlyOption === "50") earlyFee = Math.round(basePrice * 0.5);

    try {
      // 👉 GỬI CẢ ROOM_NUMBER VỀ BACKEND
      await apiClient.post(`/owner/bookings/${checkInModal.id}/checkin`, {
        early_fee: earlyFee,
        room_number: assignedRoom,
      });

      // Cập nhật State ngay lập tức
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

  // THỰC HIỆN CHECK-OUT
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

  // TẠO ĐƠN WALK-IN TẠI QUẦY
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
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* HEADER & NÚT WALK-IN */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 size={16} /> Quy Trình Tiếp Tân & Quản Trị Lưu Trú
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Đơn Đặt ({bookings.length} Đơn)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy chuẩn Thu tiền, Check-in (14h) & Check-out (12h) theo tiêu chuẩn
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsWalkInOpen(true)}
            className="px-4 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
          >
            <UserPlus size={16} /> + Đặt Phòng Tại Quầy (Walk-in)
          </button>

          <button
            onClick={fetchOwnerBookings}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên khách, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-2xl text-xs font-medium focus:outline-blue-600 shadow-xs"
          />
        </div>

        <div className="bg-white p-1.5 rounded-2xl border shadow-xs flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BẢNG ĐƠN ĐẶT PHÒNG */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách đơn từ PostgreSQL..."
          />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bg-white rounded-3xl border overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Mã Đơn & Khách Hàng</th>
                <th className="py-4 px-4">Hạng Phòng & Cơ Sở</th>
                <th className="py-4 px-4">Ngày Nhận / Trả (Giờ VN)</th>
                <th className="py-4 px-4">Tổng Hóa Đơn</th>
                <th className="py-4 px-4 text-center">Thanh Toán</th>
                <th className="py-4 px-5 text-right">Nghiệp Vụ Lễ Tân</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBookings.map((b) => {
                const isPaid = b.payment_status === "paid";

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="py-4 px-5">
                      <span className="font-mono font-bold text-blue-900 flex items-center gap-1">
                        #{b.booking_code}
                        {b.booking_code?.startsWith("WI") && (
                          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[9px] font-bold rounded">
                            Walk-in
                          </span>
                        )}
                      </span>
                      <strong className="block text-slate-900 mt-0.5">
                        {b.customer_name || b.guest_name || "Khách tại quầy"}
                      </strong>
                      <span className="text-slate-400 block">
                        {b.guest_phone || b.contact_phone || "---"}
                      </span>
                      {b.created_at && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Đặt lúc: {formatBookingTime(b.created_at)}
                        </span>
                      )}
                    </td>

                    {/* CỘT HẠNG PHÒNG & HIỂN THỊ SỐ PHÒNG BÀN GIAO */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-800">
                        {b.room_name || "Phòng tiêu chuẩn"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {b.hotel_name}
                      </p>

                      {/* 👉 HIỂN THỊ SỐ PHÒNG (P.201) NẾU ĐÃ CHECK-IN */}
                      {b.room_number ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-md border border-blue-200">
                          🔑 Phòng: {b.room_number}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic block mt-0.5">
                          (Chưa giao phòng)
                        </span>
                      )}
                    </td>

                    {/* CỘT NGÀY NHẬN / TRẢ ĐÃ FIX MÚI GIỜ VIỆT NAM */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-emerald-800">
                        Nhận: {formatStayDateTime(b.checkin_date, "14:00")}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Trả: {formatStayDateTime(b.checkout_date, "12:00")}
                      </p>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-black text-[#ff6a00] block text-sm">
                        {formatVND(b.total_price)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Trạng thái:{" "}
                        {b.status === "checked_in"
                          ? "Đang ở"
                          : b.status === "confirmed"
                            ? "Đã duyệt"
                            : b.status}
                      </span>
                    </td>

                    {/* CỘT THANH TOÁN */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isPaid ? "✓ Đã thanh toán" : "⚠️ Chưa thanh toán"}
                      </span>
                    </td>

                    {/* CỘT THAO TÁC NGHIỆP VỤ */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {!isPaid && (
                          <button
                            onClick={() => handleQuickPay(b.id)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Xác nhận khách đã nộp tiền"
                          >
                            <DollarSign size={13} /> Thu tiền
                          </button>
                        )}

                        {b.status === "pending" && (
                          <button
                            onClick={() => handleConfirmOrder(b.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                          >
                            Xác nhận
                          </button>
                        )}

                        {b.status === "confirmed" && (
                          <button
                            onClick={() => {
                              setCheckInModal(b);
                              setAssignedRoom(b.room_number || "P.201");
                              setEarlyOption("none");
                              setPayMethodAtCheckIn("cash");
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                          >
                            <Key size={13} /> Check-in
                          </button>
                        )}

                        {b.status === "checked_in" && (
                          <button
                            onClick={() => {
                              setCheckOutModal(b);
                              setLateOption("none");
                              setMinibarFee(0);
                              setOtherFee(0);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
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
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="Không tìm thấy đơn đặt phòng nào"
          description="Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL CHECK-IN: NHẬP VÀ GIAO SỐ PHÒNG THẬT
         ───────────────────────────────────────────────────────────── */}
      {checkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <Key size={18} className="text-emerald-600" /> Thủ Tục
                  Check-in & Bàn Giao Phòng
                </h3>
                <p className="text-[11px] text-slate-400">
                  Giờ chuẩn nhận phòng từ 14:00 chiều
                </p>
              </div>
              <button onClick={() => setCheckInModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePerformCheckIn} className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-slate-600">
                  Khách hàng: <b>{checkInModal.customer_name}</b>
                </p>
                <p className="text-slate-600">
                  Hạng phòng: <b>{checkInModal.room_name}</b>
                </p>
                <p className="text-slate-600">
                  Thời gian nhận:{" "}
                  <b className="text-emerald-800">
                    {formatStayDateTime(checkInModal.checkin_date, "14:00")}
                  </b>
                </p>
                <p className="text-slate-600">
                  Tiền phòng cơ bản:{" "}
                  <b>{formatVND(checkInModal.total_price)}</b>
                </p>
              </div>

              {checkInModal.payment_status !== "paid" ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <p className="font-bold text-amber-900 flex items-center gap-1">
                    <AlertCircle size={15} /> Khách CHƯA thanh toán tiền phòng!
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Xác nhận hình thức thu tiền tại quầy:
                    </label>
                    <select
                      value={payMethodAtCheckIn}
                      onChange={(e) => setPayMethodAtCheckIn(e.target.value)}
                      className="w-full p-2 border rounded-xl font-bold bg-white"
                    >
                      <option value="cash">
                        💵 Đã thu tiền mặt đủ tại quầy
                      </option>
                      <option value="transfer">
                        📱 Khách đã quét mã QR chuyển khoản
                      </option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Đơn phòng này đã thanh toán trước
                  (paid)
                </div>
              )}

              {/* Ô NHẬP SỐ PHÒNG BÀN GIAO */}
              <div>
                <label className="block font-bold mb-1">
                  Số phòng bàn giao (Giao chìa khóa) *
                </label>
                <input
                  required
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  placeholder="VD: P.201, Phòng 305..."
                  className="w-full p-2.5 border rounded-xl font-bold text-slate-900 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Quy định nhận phòng sớm (Early Check-in)
                </label>
                <select
                  value={earlyOption}
                  onChange={(e) => setEarlyOption(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium bg-white"
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

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCheckInModal(null)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  {checkInModal.payment_status !== "paid"
                    ? "✓ Xác nhận đã thu tiền & Giao chìa khóa"
                    : "✓ Bàn giao chìa khóa (Check-in)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHECK-OUT */}
      {checkOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <Receipt size={18} className="text-blue-600" /> Quyết Toán &
                  Trả Phòng (Check-out)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Giờ chuẩn trả phòng trước 12:00 trưa
                </p>
              </div>
              <button onClick={() => setCheckOutModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePerformCheckOut} className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-slate-600">
                  Khách hàng: <b>{checkOutModal.customer_name}</b>
                </p>
                {checkOutModal.room_number && (
                  <p className="text-slate-600">
                    Phòng đang ở:{" "}
                    <b className="text-blue-700 font-bold">
                      {checkOutModal.room_number}
                    </b>
                  </p>
                )}
                <p className="text-slate-600">
                  Thời gian trả:{" "}
                  <b className="text-slate-900">
                    {formatStayDateTime(checkOutModal.checkout_date, "12:00")}
                  </b>
                </p>
                <p className="text-slate-600">
                  Tiền phòng cơ bản:{" "}
                  <b>{formatVND(checkOutModal.total_price)}</b>
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Quy định trả phòng trễ (Late Check-out)
                </label>
                <select
                  value={lateOption}
                  onChange={(e) => setLateOption(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium bg-white"
                >
                  <option value="none">
                    Đúng giờ (Trước 12:00) - Không phụ thu
                  </option>
                  <option value="30">
                    Trả phòng từ sau 12:00 - 15:00 (+30% tiền phòng)
                  </option>
                  <option value="50">
                    Trả phòng từ sau 15:00 - 18:00 (+50% tiền phòng)
                  </option>
                  <option value="100">
                    Trả phòng sau 18:00 (+100% tính nguyên 1 ngày)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 flex items-center gap-1">
                    <Coffee size={13} className="text-amber-600" /> Tiền Minibar
                    / Nước uống
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={minibarFee}
                    onChange={(e) => setMinibarFee(e.target.value)}
                    className="w-full p-2 border rounded-xl font-bold"
                    placeholder="0 đ"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Dịch vụ khác / Đền bù
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={otherFee}
                    onChange={(e) => setOtherFee(e.target.value)}
                    className="w-full p-2 border rounded-xl font-bold"
                    placeholder="0 đ"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCheckOutModal(null)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer"
                >
                  Hoàn tất quyết toán & Thu hồi phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WALK-IN */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <UserPlus size={18} className="text-blue-600" /> Tạo Đơn Đặt
                  Phòng Tại Quầy (Walk-in)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Dành cho khách đến trực tiếp lễ tân không qua website
                </p>
              </div>
              <button onClick={() => setIsWalkInOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Cơ sở khách sạn *
                  </label>
                  <select
                    required
                    value={walkInForm.hotel_id}
                    onChange={(e) =>
                      setWalkInForm({ ...walkInForm, hotel_id: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        🏨 {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Hạng phòng *</label>
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
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
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
                  <label className="block font-bold mb-1">
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
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
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
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Giá thanh toán thực tế (VNĐ)
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
                    className="w-full p-2.5 border rounded-xl font-black text-[#ff6a00]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
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
                    className="w-full p-2.5 border rounded-xl font-bold bg-white"
                  >
                    <option value="cash">💵 Đã thu tiền mặt tại quầy</option>
                    <option value="transfer">📱 Đã chuyển khoản qua QR</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer"
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
