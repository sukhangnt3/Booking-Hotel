import React, { useState } from "react";

const RoomNumberPage = () => {
  const [rooms, setRooms] = useState([
    { id: 101, type: "Standard King", status: "occupied", guest: "Lê Hoàng C", cleanStatus: "clean" },
    { id: 102, type: "Standard King", status: "available", guest: null, cleanStatus: "clean" },
    { id: 103, type: "Deluxe Sea View", status: "maintenance", guest: null, cleanStatus: "dirty" },
    { id: 201, type: "Biệt thự Biển", status: "reserved", guest: "Nguyễn Văn A", cleanStatus: "clean" },
    { id: 202, type: "Biệt thự Biển", status: "available", guest: null, cleanStatus: "dirty" },
  ]);

  const toggleCleanStatus = (id) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, cleanStatus: r.cleanStatus === 'clean' ? 'dirty' : 'clean' } : r));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Sơ Đồ & Trạng Thái Số Phòng</h2>
          <p className="text-xs text-slate-500 mt-1">Quản lý trực quan phòng thực tế, tình trạng vệ sinh và phòng đang có khách.</p>
        </div>
        <button className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
          + Thêm Số Phòng Mới
        </button>
      </div>

      {/* SƠ ĐỒ LƯỚI PHÒNG */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {rooms.map((r) => (
          <div
            key={r.id}
            className={`p-4 rounded-2xl border-2 space-y-3 shadow-sm transition ${
              r.status === 'occupied'
                ? 'border-blue-500 bg-blue-50/30'
                : r.status === 'reserved'
                ? 'border-amber-500 bg-amber-50/30'
                : r.status === 'maintenance'
                ? 'border-rose-300 bg-slate-100'
                : 'border-emerald-500 bg-emerald-50/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-lg font-black text-slate-900">Phòng {r.id}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                r.cleanStatus === 'clean' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {r.cleanStatus === 'clean' ? '✨ Sạch' : '🧹 Chưa dọn'}
              </span>
            </div>

            <div className="text-[11px] font-semibold text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">{r.type}</p>
              <p>{r.guest ? `👤 ${r.guest}` : '🟢 Phòng trống'}</p>
            </div>

            <div className="pt-2 border-t flex justify-between gap-1">
              <button
                onClick={() => toggleCleanStatus(r.id)}
                className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md w-full hover:bg-slate-50"
              >
                Đổi dọn dẹp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomNumberPage;