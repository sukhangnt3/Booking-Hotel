// src/pages/reception/components/QuickBookingModal.jsx
import React, { useState } from "react";
import {
  Search,
  Plus,
  User,
  CreditCard,
  Smartphone,
  PlusCircle,
  Trash2,
  Minus,
  RotateCw,
} from "lucide-react";

export default function QuickBookingModal({
  isOpen,
  onClose,
  rooms = [],
  bookingData,
  setBookingData,
  onConfirmBooking,
  formatVND,
  calculateDurationAndPrice,
  toDatetimeLocal,
}) {
  // ─── State 1: Thêm mới khách hàng (2 cột) ───
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    customer_group: "",
    birthday: "",
    type: "personal",
    tax_code: "",
    address: "",
    city: "",
    ward: "",
    note: "",
  });

  // ─── State 2: Khách lưu trú (Số lượng & Danh sách) ───
  const [isGuestStayOpen, setIsGuestStayOpen] = useState(false);
  const [tempGuestCount, setTempGuestCount] = useState({
    adult: 2,
    children: 0,
  });
  const [guestStayList, setGuestStayList] = useState([]);

  // ─── State 3: Form nhập giấy tờ / CCCD khách lưu trú ───
  const [isAddGuestDocOpen, setIsAddGuestDocOpen] = useState(false);
  const initialGuestDocForm = {
    room_number: "",
    full_name: "",
    gender: "male",
    birthday: "",
    nationality: "Việt Nam",
    address: "",
    id_type: "CCCD",
    id_number: "",
    stay_reason: "Du lịch",
    note: "",
  };
  const [guestDocForm, setGuestDocForm] = useState(initialGuestDocForm);

  if (!isOpen) return null;

  const handleAddMoreRoom = () => {
    const available =
      rooms.find(
        (r) =>
          r.status === "available" &&
          !bookingData.rooms.some((item) => item.room_id === r.id),
      ) || rooms[0];

    if (!available) return;

    const today = new Date();
    today.setHours(14, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    const checkinVal = toDatetimeLocal(today);
    const checkoutVal = toDatetimeLocal(tomorrow);
    const { durationLabel, price } = calculateDurationAndPrice(
      checkinVal,
      checkoutVal,
      "Ngày",
      available,
    );

    const newItem = {
      room_id: available.id,
      room_number: available.room_number,
      type_name: available.type_name,
      rental_type: "Ngày",
      checkin_mode: "Quy định",
      checkin_date: checkinVal,
      checkout_date: checkoutVal,
      duration_label: durationLabel,
      price: price,
    };

    setBookingData((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newItem],
    }));
  };

  const handleUpdateRoom = (index, field, value) => {
    setBookingData((prev) => {
      const updatedRooms = [...prev.rooms];
      const item = { ...updatedRooms[index], [field]: value };
      const roomInfo = rooms.find((r) => r.id === item.room_id) || {};

      if (field === "checkin_mode") {
        const now = new Date();
        if (value === "Hiện tại") {
          item.checkin_date = toDatetimeLocal(now);
        } else {
          now.setHours(14, 0, 0, 0);
          item.checkin_date = toDatetimeLocal(now);
        }
      }

      if (field === "room_id") {
        const sel = rooms.find((r) => r.id === value);
        if (sel) {
          item.room_number = sel.room_number;
          item.type_name = sel.type_name;
        }
      }

      const { durationLabel, price } = calculateDurationAndPrice(
        item.checkin_date,
        item.checkout_date,
        item.rental_type,
        roomInfo,
      );
      item.duration_label = durationLabel;
      item.price = price;

      updatedRooms[index] = item;
      return { ...prev, rooms: updatedRooms };
    });
  };

  const totalAmount = (bookingData.rooms || []).reduce(
    (sum, r) => sum + (Number(r.price) || 0),
    0,
  );

  return (
    <>
      {/* ─── MODAL CHÍNH: ĐẶT/NHẬN PHÒNG NHANH ─── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fadeIn">
        <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900">
              Đặt/Nhận phòng nhanh
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {bookingData.customer_name ? (
                <div className="flex items-center justify-between border border-slate-300 rounded-lg px-3 py-1.5 bg-white shadow-2xs min-w-[140px]">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <User size={14} className="text-slate-500" />
                    <span>{bookingData.customer_name}</span>
                  </div>
                  <button
                    onClick={() =>
                      setBookingData((prev) => ({
                        ...prev,
                        customer_name: "",
                        customer_phone: "",
                      }))
                    }
                    className="text-slate-400 hover:text-rose-600 pl-2 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white shadow-2xs w-72">
                  <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={bookingData.customer_name}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        customer_name: e.target.value,
                      })
                    }
                    placeholder="Tìm khách hàng (F4)"
                    className="w-full outline-none text-xs font-medium text-slate-800"
                  />
                  <button
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="ml-1 p-1 text-slate-600 hover:text-emerald-700 font-bold"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* KHUNG SỐ LƯỢNG KHÁCH VÀ GIẤY TỜ */}
              <div
                onClick={() => {
                  setTempGuestCount({
                    adult: bookingData.guest_count.adult,
                    children: bookingData.guest_count.children,
                  });
                  setIsGuestStayOpen(true);
                }}
                className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer shadow-2xs select-none"
              >
                <User size={14} className="text-slate-500" />
                <span>{bookingData.guest_count.adult}</span>
                <span className="text-slate-300">|</span>
                <span>👶 {bookingData.guest_count.children}</span>
                <span className="text-slate-300">|</span>
                <CreditCard size={13} className="text-slate-500" />
                <span>{guestStayList.length}</span>
              </div>

              {bookingData.customer_phone && (
                <div className="flex items-center gap-1 font-bold text-slate-700 font-mono text-xs pl-1">
                  <Smartphone size={13} className="text-slate-500" />
                  <span>{bookingData.customer_phone}</span>
                </div>
              )}
            </div>

            {/* Bảng danh sách phòng */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#eef8f2] text-slate-700 border-b">
                    <th className="py-2.5 px-3 font-bold">Hạng phòng</th>
                    <th className="py-2.5 px-3 font-bold">
                      Phòng{" "}
                      <span className="bg-[#1b6a38] text-white px-1.5 py-0.2 rounded-full text-[10px]">
                        {bookingData.rooms.length}
                      </span>
                    </th>
                    <th className="py-2.5 px-3 font-bold">Hình thức</th>
                    <th className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1">
                        <span>Nhận</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateRoom(0, "checkin_mode", "Hiện tại")
                          }
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${
                            bookingData.rooms[0]?.checkin_mode === "Hiện tại"
                              ? "border border-[#1b6a38] text-[#1b6a38] bg-white"
                              : "border border-slate-300 text-slate-600 bg-white"
                          }`}
                        >
                          Hiện tại
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateRoom(0, "checkin_mode", "Quy định")
                          }
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${
                            bookingData.rooms[0]?.checkin_mode === "Quy định"
                              ? "border border-[#1b6a38] text-[#1b6a38] bg-white"
                              : "border border-slate-300 text-slate-600 bg-white"
                          }`}
                        >
                          Quy định
                        </button>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-bold">Trả phòng</th>
                    <th className="py-2.5 px-3 font-bold">Dự kiến</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Thành tiền ⓘ
                    </th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookingData.rooms.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {item.type_name}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.room_id}
                          onChange={(e) =>
                            handleUpdateRoom(idx, "room_id", e.target.value)
                          }
                          className="border border-slate-300 rounded-lg px-2 py-1 outline-none font-bold text-slate-800 bg-white cursor-pointer"
                        >
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.room_number}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.rental_type}
                          onChange={(e) =>
                            handleUpdateRoom(idx, "rental_type", e.target.value)
                          }
                          className="border border-slate-300 rounded-lg px-2 py-1 outline-none font-semibold text-slate-800 bg-white cursor-pointer"
                        >
                          <option value="Ngày">Ngày</option>
                          <option value="Giờ">Giờ</option>
                          <option value="Đêm">Đêm</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="datetime-local"
                          value={item.checkin_date}
                          onChange={(e) =>
                            handleUpdateRoom(
                              idx,
                              "checkin_date",
                              e.target.value,
                            )
                          }
                          className="border border-slate-300 rounded-lg px-1.5 py-0.5 outline-none font-semibold text-slate-800 bg-white"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="datetime-local"
                          value={item.checkout_date}
                          onChange={(e) =>
                            handleUpdateRoom(
                              idx,
                              "checkout_date",
                              e.target.value,
                            )
                          }
                          className="border border-slate-300 rounded-lg px-1.5 py-0.5 outline-none font-semibold text-slate-800 bg-white"
                        />
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        {item.duration_label}
                      </td>
                      <td className="py-3 px-3 font-black text-right text-emerald-700 text-sm">
                        {formatVND(item.price)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setBookingData((prev) => ({
                              ...prev,
                              rooms: prev.rooms.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ghi chú & Tính tiền */}
            <div className="flex items-start justify-between gap-6 pt-1">
              <div className="space-y-3 flex-1">
                <button
                  type="button"
                  onClick={handleAddMoreRoom}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#1b6a38] text-[#1b6a38] font-bold hover:bg-emerald-50 cursor-pointer transition shadow-2xs"
                >
                  <PlusCircle size={14} />
                  <span>Chọn thêm phòng</span>
                </button>

                <div className="flex items-center gap-2 max-w-md">
                  <span className="font-semibold text-slate-600 shrink-0">
                    Ghi chú:
                  </span>
                  <input
                    value={bookingData.note}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, note: e.target.value })
                    }
                    placeholder="Nhập ghi chú..."
                    className="flex-1 border-b border-slate-300 py-1 outline-none text-slate-800 text-xs focus:border-[#1b6a38]"
                  />
                </div>
              </div>

              <div className="w-64 space-y-2 text-right">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">
                    Khách cần trả:
                  </span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatVND(totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    Khách thanh toán <CreditCard size={13} />:
                  </span>
                  {/* 🌟 TỰ ĐỘNG THÊM DẤU CHẤM HÀNG NGHÌN (VD: 100.000) */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={
                        bookingData.customer_paid
                          ? Number(bookingData.customer_paid).toLocaleString(
                              "vi-VN",
                            )
                          : ""
                      }
                      onChange={(e) => {
                        // Tự động lọc bỏ các ký tự không phải số rồi lưu lại
                        const rawValue = e.target.value.replace(/\D/g, "");
                        setBookingData({
                          ...bookingData,
                          customer_paid: rawValue ? Number(rawValue) : 0,
                        });
                      }}
                      className="w-28 text-right border-b border-slate-300 py-0.5 outline-none font-bold text-slate-900 focus:border-[#1b6a38]"
                      placeholder="0"
                    />
                    <span className="font-bold text-slate-600">đ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onConfirmBooking(true)}
              className="px-6 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95 text-xs"
            >
              Nhận phòng
            </button>
            <button
              type="button"
              onClick={() => onConfirmBooking(false)}
              className="px-6 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95 text-xs"
            >
              Đặt trước
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL 2: THÊM MỚI KHÁCH HÀNG (2 CỘT) ─── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900">
                Thêm mới khách hàng
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customerForm.name.trim()) {
                  alert("Vui lòng nhập Tên khách hàng!");
                  return;
                }
                setBookingData((prev) => ({
                  ...prev,
                  customer_name: customerForm.name.trim(),
                  customer_phone: customerForm.phone.trim(),
                }));
                setIsAddCustomerOpen(false);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Mã khách hàng
                    </label>
                    <input
                      disabled
                      placeholder="Mã tự động"
                      className="flex-1 p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-bold">
                      Tên khách hàng
                    </label>
                    <input
                      required
                      value={customerForm.name}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Nhập tên..."
                      className="flex-1 p-2 border border-emerald-600 rounded-lg outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Điện thoại
                    </label>
                    <input
                      value={customerForm.phone}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="0912345678"
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          email: e.target.value,
                        })
                      }
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Nhóm khách
                    </label>
                    <input
                      value={customerForm.customer_group}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          customer_group: e.target.value,
                        })
                      }
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={customerForm.birthday}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          birthday: e.target.value,
                        })
                      }
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Loại khách
                    </label>
                    <div className="flex items-center gap-6 font-semibold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="cust_type"
                          checked={customerForm.type === "personal"}
                          onChange={() =>
                            setCustomerForm({
                              ...customerForm,
                              type: "personal",
                            })
                          }
                          className="accent-[#1b6a38]"
                        />
                        <span>Cá nhân</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="cust_type"
                          checked={customerForm.type === "company"}
                          onChange={() =>
                            setCustomerForm({
                              ...customerForm,
                              type: "company",
                            })
                          }
                          className="accent-[#1b6a38]"
                        />
                        <span>Công ty</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Mã số thuế
                    </label>
                    <input
                      value={customerForm.tax_code}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          tax_code: e.target.value,
                        })
                      }
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Địa chỉ
                    </label>
                    <input
                      value={customerForm.address}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          address: e.target.value,
                        })
                      }
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-medium">
                      Tỉnh/Thành
                    </label>
                    <input
                      value={customerForm.city}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          city: e.target.value,
                        })
                      }
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <label className="w-28 text-slate-700 font-medium pt-1">
                      Ghi chú
                    </label>
                    <textarea
                      rows={2}
                      value={customerForm.note}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          note: e.target.value,
                        })
                      }
                      placeholder="Nhập ghi chú..."
                      className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: KHÁCH LƯU TRÚ (CÓ BẢNG THÔNG TIN CHI TIẾT & GIẤY TỜ) ─── */}
      {isGuestStayOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900">
                Khách lưu trú -{" "}
                {bookingData.rooms[0]?.room_number || "Đặt phòng"}
              </h3>
              <button
                type="button"
                onClick={() => setIsGuestStayOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Dòng 1: Số lượng khách */}
              <div className="flex items-center gap-8 flex-wrap border-b pb-4">
                <span className="font-bold text-slate-800 text-xs">
                  Số lượng khách
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 font-medium">Người lớn</span>
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          adult: Math.max(1, prev.adult - 1),
                        }))
                      }
                      className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      value={tempGuestCount.adult}
                      onChange={(e) =>
                        setTempGuestCount({
                          ...tempGuestCount,
                          adult: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-10 text-center font-bold text-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          adult: prev.adult + 1,
                        }))
                      }
                      className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-600 font-medium">Trẻ em</span>
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          children: Math.max(0, prev.children - 1),
                        }))
                      }
                      className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      value={tempGuestCount.children}
                      onChange={(e) =>
                        setTempGuestCount({
                          ...tempGuestCount,
                          children: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="w-10 text-center font-bold text-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          children: prev.children + 1,
                        }))
                      }
                      className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dòng 2: Nút [Làm mới] và [Giấy tờ] */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  Thông tin chi tiết
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestStayList([])}
                    className="p-2 border border-[#1b6a38] text-[#1b6a38] rounded-lg hover:bg-emerald-50 cursor-pointer"
                    title="Làm mới"
                  >
                    <RotateCw size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGuestDocForm({
                        ...initialGuestDocForm,
                        room_number:
                          bookingData.rooms[0]?.room_number || "P.101",
                        full_name: "",
                      });
                      setIsAddGuestDocOpen(true);
                    }}
                    className="px-3.5 py-1.5 border border-[#1b6a38] text-[#1b6a38] font-bold rounded-lg hover:bg-emerald-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <PlusCircle size={14} />
                    <span>Giấy tờ / CCCD</span>
                  </button>
                </div>
              </div>

              {/* Bảng danh sách khách lưu trú */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef8f2] text-slate-700 border-b">
                      <th className="py-2.5 px-3 font-bold">Họ và tên</th>
                      <th className="py-2.5 px-3 font-bold">
                        Thông tin cá nhân
                      </th>
                      <th className="py-2.5 px-3 font-bold">Phòng</th>
                      <th className="py-2.5 px-3 font-bold">
                        Thời gian khai báo
                      </th>
                      <th className="py-2.5 px-3 font-bold">
                        Thời gian lưu trú
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestStayList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-slate-400 font-medium"
                        >
                          Chưa có thông tin khách lưu trú
                        </td>
                      </tr>
                    ) : (
                      guestStayList.map((g, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 border-b border-slate-100"
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {g.full_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {g.gender === "male" ? "Nam" : "Nữ"} • {g.id_type}:{" "}
                            <b>{g.id_number}</b>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-800">
                            {g.room_number}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {g.declaration_time}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {g.stay_duration}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingData((prev) => ({
                      ...prev,
                      guest_count: {
                        ...prev.guest_count,
                        adult: tempGuestCount.adult,
                        children: tempGuestCount.children,
                        id_cards: guestStayList.length,
                      },
                    }));
                    setIsGuestStayOpen(false);
                  }}
                  className="px-8 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: FORM NHẬP THÔNG TIN GIẤY TỜ / CCCD ─── */}
      {isAddGuestDocOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900">
                Thêm thông tin khách lưu trú
              </h3>
              <button
                type="button"
                onClick={() => setIsAddGuestDocOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!guestDocForm.full_name.trim()) {
                  alert("Vui lòng nhập Họ và tên người lưu trú!");
                  return;
                }

                const now = new Date();
                const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

                const newGuestItem = {
                  ...guestDocForm,
                  declaration_time: timeStr,
                  stay_duration: "1 ngày",
                };

                setGuestStayList((prev) => [...prev, newGuestItem]);
                setIsAddGuestDocOpen(false);
              }}
              className="p-6 space-y-3.5"
            >
              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">Phòng</label>
                <select
                  value={guestDocForm.room_number}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      room_number: e.target.value,
                    })
                  }
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none font-bold text-slate-900 bg-white cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.room_number}>
                      {r.room_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Họ và tên
                </label>
                <input
                  required
                  value={guestDocForm.full_name}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="Nhập họ và tên người lưu trú..."
                  className="flex-1 p-2 border border-emerald-600 rounded-lg outline-none font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Giới tính
                </label>
                <div className="flex items-center gap-6 font-semibold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="guest_gender_qb"
                      checked={guestDocForm.gender === "male"}
                      onChange={() =>
                        setGuestDocForm({ ...guestDocForm, gender: "male" })
                      }
                      className="accent-[#1b6a38]"
                    />
                    <span>Nam</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="guest_gender_qb"
                      checked={guestDocForm.gender === "female"}
                      onChange={() =>
                        setGuestDocForm({ ...guestDocForm, gender: "female" })
                      }
                      className="accent-[#1b6a38]"
                    />
                    <span>Nữ</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="guest_gender_qb"
                      checked={guestDocForm.gender === "other"}
                      onChange={() =>
                        setGuestDocForm({ ...guestDocForm, gender: "other" })
                      }
                      className="accent-[#1b6a38]"
                    />
                    <span>Khác</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={guestDocForm.birthday}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      birthday: e.target.value,
                    })
                  }
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none text-slate-700 bg-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Quốc tịch
                </label>
                <select
                  value={guestDocForm.nationality}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      nationality: e.target.value,
                    })
                  }
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none bg-white cursor-pointer"
                >
                  <option value="Việt Nam">Việt Nam</option>
                  <option value="Hàn Quốc">Hàn Quốc</option>
                  <option value="Mỹ">Mỹ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Địa chỉ
                </label>
                <input
                  value={guestDocForm.address}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      address: e.target.value,
                    })
                  }
                  placeholder="Nhập địa chỉ..."
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Loại giấy tờ
                </label>
                <select
                  value={guestDocForm.id_type}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      id_type: e.target.value,
                    })
                  }
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none bg-white cursor-pointer"
                >
                  <option value="CCCD">CCCD</option>
                  <option value="CMND">CMND</option>
                  <option value="Hộ chiếu">Hộ chiếu</option>
                  <option value="Bằng lái xe">Bằng lái xe</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Số giấy tờ
                </label>
                <input
                  value={guestDocForm.id_number}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      id_number: e.target.value,
                    })
                  }
                  placeholder="Nhập số CCCD/Hộ chiếu..."
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-slate-700 font-medium">
                  Lý do lưu trú
                </label>
                <input
                  value={guestDocForm.stay_reason}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      stay_reason: e.target.value,
                    })
                  }
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-start gap-3">
                <label className="w-24 text-slate-700 font-medium pt-1">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={guestDocForm.note}
                  onChange={(e) =>
                    setGuestDocForm({ ...guestDocForm, note: e.target.value })
                  }
                  placeholder="Nhập ghi chú..."
                  className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  type="submit"
                  className="px-8 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
