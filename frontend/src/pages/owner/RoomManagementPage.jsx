import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RoomManagementPage = () => {
  const navigate = useNavigate();
  const [rooms] = useState([
    {
      id: 1,
      name: "Phòng Deluxe Hướng Biển (Deluxe Sea View)",
      price: 1800000,
      capacity: "2 Người lớn, 1 Trẻ em",
      totalQuantity: 5,
      availableQuantity: 3,
      bedType: "1 Giường King lớn",
      image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=500",
    },
    {
      id: 2,
      name: "Biệt Thự Hồ Bơi Riêng (Private Pool Villa)",
      price: 4500000,
      capacity: "4 Người lớn",
      totalQuantity: 2,
      availableQuantity: 1,
      bedType: "2 Giường King Super",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500",
    },
  ]);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Danh Mục Loại Phòng</h2>
          <p className="text-xs text-slate-500 mt-1">Thiết lập các hạng phòng, cài đặt giá niêm yết và sức chứa tối đa.</p>
        </div>
        <button
          onClick={() => navigate("/owner/rooms/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-3 rounded-xl shadow-md transition"
        >
          + Thêm Loại Phòng Mới
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-400">
            <tr>
              <th className="p-4">Hình Ảnh & Tên Loại Phòng</th>
              <th className="p-4">Sức Chứa</th>
              <th className="p-4">Loại Giường</th>
              <th className="p-4">Giá Niêm Yết / Đêm</th>
              <th className="p-4">Kho Phòng</th>
              <th className="p-4 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={room.image} alt={room.name} className="w-16 h-12 object-cover rounded-lg border" />
                    <span className="font-black text-slate-900 text-sm">{room.name}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">👨‍👩‍👧 {room.capacity}</td>
                <td className="p-4 text-slate-600">🛏️ {room.bedType}</td>
                <td className="p-4 font-black text-emerald-600 text-sm">{room.price.toLocaleString()} đ</td>
                <td className="p-4">
                  <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-bold text-[11px]">
                    {room.availableQuantity} / {room.totalQuantity} trống
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => navigate(`/owner/rooms/edit/${room.id}`)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => navigate(`/owner/room-numbers?typeId=${room.id}`)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                    >
                      🔑 Sơ đồ phòng
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomManagementPage;