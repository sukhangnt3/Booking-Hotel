// src/pages/admin/HousekeepingManagementPage.jsx
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Brush,
  Play,
  Check,
  RotateCcw,
} from "lucide-react";
import { EmptyState } from "@/components/common";

export default function HousekeepingManagementPage() {
  const [rooms, setRooms] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  // Tải danh sách phòng từ kho phòng thật
  const loadRooms = () => {
    const masterRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    const savedHk = JSON.parse(
      localStorage.getItem("pms_housekeeping_rooms") || "[]",
    );

    if (masterRooms.length > 0) {
      const merged = masterRooms.map((mr) => {
        const existing = savedHk.find(
          (h) => h.id === mr.id || h.number === mr.room_number,
        );
        return {
          id: mr.id,
          number: mr.room_number || "P.101",
          type: mr.category || mr.name,
          floor: mr.floor || "Tầng 1",
          status: mr.room_status || existing?.status || "clean",
          housekeeper: existing?.housekeeper || "Chưa phân công",
          notes: mr.description || existing?.notes || "Phòng sẵn sàng",
        };
      });
      setRooms(merged);
      localStorage.setItem("pms_housekeeping_rooms", JSON.stringify(merged));
    } else {
      setRooms(savedHk);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const updateStatus = (roomId, newStatus) => {
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, status: newStatus } : r,
    );
    setRooms(updated);
    localStorage.setItem("pms_housekeeping_rooms", JSON.stringify(updated));

    // Đồng bộ ngược lại trạng thái phòng vào kho phòng master
    const masterRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    const updatedMaster = masterRooms.map((mr) =>
      mr.id === roomId ? { ...mr, room_status: newStatus } : mr,
    );
    localStorage.setItem(
      "pms_hotel_rooms_master",
      JSON.stringify(updatedMaster),
    );
  };

  const filtered = rooms.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles size={16} /> Buồng Phòng Thực Tế
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Theo Dõi Vệ Sinh {rooms.length} Buồng Phòng
          </h1>
        </div>

        <button
          onClick={loadRooms}
          className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-3xl border p-5 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      {room.number}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {room.type} • {room.floor}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      room.status === "clean"
                        ? "bg-emerald-50 text-emerald-700"
                        : room.status === "dirty"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2.5 rounded-xl border">
                  {room.notes}
                </p>
              </div>

              <div className="flex gap-1.5 pt-2 border-t">
                <button
                  onClick={() => updateStatus(room.id, "clean")}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  Sạch (Clean)
                </button>
                <button
                  onClick={() => updateStatus(room.id, "dirty")}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
                >
                  Cần dọn (Dirty)
                </button>
                <button
                  onClick={() => updateStatus(room.id, "in_progress")}
                  className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Đang dọn
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Chưa có buồng phòng nào"
          description="Hãy tạo phòng mới tại mục 'Quản lý buồng phòng' để theo dõi dọn phòng tại đây."
        />
      )}
    </div>
  );
}
