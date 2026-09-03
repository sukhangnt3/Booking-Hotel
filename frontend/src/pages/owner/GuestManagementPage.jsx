// src/pages/owner/GuestManagementPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  DollarSign,
  Phone,
  Mail,
  Receipt,
  UserCheck,
  ShieldCheck,
  Crown,
  Eye,
  X,
  Edit,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";

const TIER_FILTERS = [
  { id: "all", label: "Tất cả khách hàng" },
  { id: "VIP Diamond", label: "💎 VIP Diamond" },
  { id: "VIP Gold", label: "🥇 VIP Gold" },
  { id: "VIP Silver", label: "🥈 VIP Silver" },
  { id: "Member", label: "Thành viên mới" },
];

export default function GuestManagementPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");

  const [selectedGuestHistory, setSelectedGuestHistory] = useState(null);
  const [editingGuest, setEditingGuest] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    setLoading(true);
    const realBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    setBookings(realBookings);
    setLoading(false);
  }, []);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const realGuestProfiles = useMemo(() => {
    const guestMap = new Map();

    bookings.forEach((b) => {
      const phone = String(
        b.customer_phone || b.guest_phone || "0901234567",
      ).trim();
      const email = String(
        b.customer_email || b.guest_email || "guest@gmail.com",
      )
        .toLowerCase()
        .trim();
      const key = phone || email;

      if (!guestMap.has(key)) {
        guestMap.set(key, {
          id: `GST-G${phone.slice(-4) || "101"}`,
          name: b.customer_name || "Khách hàng",
          phone: phone,
          email: email,
          idCard: b.customer_id_card || "079090001234",
          address: "Việt Nam",
          totalSpent: 0,
          totalBookings: 0,
          notes: "Khách thích phòng thoáng mát, không hút thuốc.",
          bookings: [],
        });
      }

      const guest = guestMap.get(key);
      const isPaid =
        b.payment_status === "paid" ||
        b.status === "confirmed" ||
        b.status === "checked_in" ||
        b.status === "checked_out";

      if (isPaid) {
        guest.totalSpent += Number(b.total_price || 0);
      }
      guest.totalBookings += 1;
      guest.bookings.push({
        code: b.code,
        hotel: b.hotel_name || "BezTower & Residences",
        room: b.room_name || "Deluxe Room",
        checkIn: b.check_in,
        checkOut: b.check_out,
        amount: Number(b.total_price || 0),
        status: b.status,
      });
    });

    return Array.from(guestMap.values()).map((g) => ({
      ...g,
      tier:
        g.totalSpent >= 10000000
          ? "VIP Diamond"
          : g.totalSpent >= 5000000
            ? "VIP Gold"
            : g.totalBookings >= 2
              ? "VIP Silver"
              : "Member",
    }));
  }, [bookings]);

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingGuest) return;
    alert(`✓ Đã cập nhật thành công hồ sơ khách hàng ${editFormData.name}!`);
    setEditingGuest(null);
  };

  const filteredGuests = realGuestProfiles.filter((g) => {
    if (selectedTier !== "all" && g.tier !== selectedTier) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.email.toLowerCase().includes(q) ||
        (g.idCard && g.idCard.includes(q))
      );
    }
    return true;
  });

  const totalSpentAll = realGuestProfiles.reduce(
    (sum, g) => sum + g.totalSpent,
    0,
  );
  const vipCount = realGuestProfiles.filter((g) =>
    g.tier.includes("VIP"),
  ).length;

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <UserCheck size={16} /> Quản Trị Khách Hàng (Guest CRM)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hồ Sơ Khách Lưu Trú & Lịch Sử Chi Tiêu ({realGuestProfiles.length}{" "}
            Khách)
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Tổng Khách Lưu Trú
          </span>
          <h3 className="text-2xl font-black text-slate-900">
            {realGuestProfiles.length} Hồ sơ
          </h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Khách VIP
          </span>
          <h3 className="text-2xl font-black text-indigo-600">
            {vipCount} Khách VIP
          </h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Tổng Chi Tiêu
          </span>
          <h3 className="text-2xl font-black text-emerald-600">
            {formatVND(totalSpentAll)}
          </h3>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border shadow-2xs space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TIER_FILTERS.map((t) => {
            const count = realGuestProfiles.filter((g) =>
              t.id === "all" ? true : g.tier === t.id,
            ).length;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedTier === t.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{t.label}</span> ({count})
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo Tên khách hàng, Số điện thoại, Email hoặc Số CCCD/Hộ chiếu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-2xl text-xs outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải dữ liệu hồ sơ khách hàng..."
          />
        </div>
      ) : filteredGuests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.map((g) => {
            const isVIP = g.tier.includes("VIP");
            return (
              <div
                key={g.id}
                className="bg-white rounded-3xl border p-6 shadow-2xs hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900">
                          {g.name}
                        </h3>
                        {isVIP && (
                          <Crown
                            size={16}
                            className="text-amber-500 fill-amber-400"
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Mã hồ sơ: #{g.id}
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700">
                      {g.tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border">
                      <span className="text-slate-400 block font-bold text-[10px] uppercase">
                        LƯU TRÚ
                      </span>
                      <strong className="text-slate-900 text-sm font-black">
                        {g.totalBookings} Chuyến
                      </strong>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-emerald-700 block font-bold text-[10px] uppercase">
                        TỔNG CHI TIÊU
                      </span>
                      <strong className="text-emerald-800 text-sm font-black">
                        {formatVND(g.totalSpent)}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />{" "}
                      <span className="font-mono">{g.phone}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400" />{" "}
                      <span className="truncate">{g.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <ShieldCheck size={13} className="text-slate-400" />{" "}
                      <span>
                        CCCD: <b className="font-mono">{g.idCard}</b>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => setSelectedGuestHistory(g)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Receipt size={14} /> Lịch Sử Đặt ({g.bookings?.length || 0}
                    )
                  </button>
                  <button
                    onClick={() => {
                      setEditingGuest(g);
                      setEditFormData(g);
                    }}
                    className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer"
                  >
                    <Edit size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Chưa có hồ sơ khách hàng nào"
          description="Khi có khách đặt phòng trên website hoặc tại quầy, hồ sơ sẽ tự động xuất hiện tại đây."
        />
      )}

      {selectedGuestHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">
                  Lịch Sử Đặt Phòng: {selectedGuestHistory.name}
                </h3>
                <span className="text-xs text-slate-400">
                  Tổng chi tiêu:{" "}
                  <b className="text-emerald-700">
                    {formatVND(selectedGuestHistory.totalSpent)}
                  </b>
                </span>
              </div>
              <button onClick={() => setSelectedGuestHistory(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {selectedGuestHistory.bookings?.map((b, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-blue-900 block">
                      #{b.code}
                    </span>
                    <strong className="text-slate-900 text-sm font-bold block">
                      {b.hotel}
                    </strong>
                    <span className="text-slate-500">
                      {b.room} • {b.checkIn} &rarr; {b.checkOut}
                    </span>
                  </div>
                  <strong className="text-emerald-700 font-black text-sm">
                    {formatVND(b.amount)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedGuestHistory(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Edit size={16} className="text-blue-600" /> Cập Nhật Hồ Sơ
                Khách
              </h3>
              <button onClick={() => setEditingGuest(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Họ và tên *</label>
                <input
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    required
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Số CCCD / Hộ chiếu
                  </label>
                  <input
                    value={editFormData.idCard}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        idCard: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
