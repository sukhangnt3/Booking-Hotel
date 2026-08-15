import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const HotelManagementPage = () => {
  const navigate = useNavigate();
  const [hotels] = useState([
    {
      id: 1,
      name: "InterContinental Danang Sun Peninsula Resort",
      type: "Resort 5 Sao",
      address: "Bãi Bắc, Bán đảo Sơn Trà, Đà Nẵng",
      totalRooms: 20,
      activeRooms: 17,
      status: "approved",
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
    },
    {
      id: 2,
      name: "Sea Breeze Homestay Phú Quốc",
      type: "Homestay / Villa",
      address: "Đường Trần Hưng Đạo, Dương Đông, Phú Quốc",
      totalRooms: 8,
      activeRooms: 8,
      status: "pending",
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500",
    },
  ]);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Khách Sạn Của Tôi</h2>
          <p className="text-xs text-slate-500 mt-1">Quản lý danh sách chỗ nghỉ, cập nhật thông tin và theo dõi trạng thái phê duyệt từ sàn.</p>
        </div>
        <button
          onClick={() => navigate("/owner/register-hotel")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-3 rounded-xl shadow-md transition"
        >
          + Thêm Chỗ Nghỉ Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hotels.map((hotel) => (
          <div key={hotel.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="relative h-48 w-full overflow-hidden">
                <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                <span className={`absolute top-3 right-3 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md ${
                  hotel.status === "approved" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                }`}>
                  {hotel.status === "approved" ? "✓ Đã Duyệt & Hiển Thị" : "⏳ Chờ Admin Phê Duyệt"}
                </span>
                <span className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">
                  ⭐ {hotel.rating} / 5.0
                </span>
              </div>
              <div className="p-5 space-y-3">
                <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                  {hotel.type}
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{hotel.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">📍 {hotel.address}</p>
                <div className="flex gap-4 pt-2 text-xs font-semibold text-slate-600">
                  <span>🛏️ Tổng số: <strong>{hotel.totalRooms} phòng</strong></span>
                  <span>🟢 Đang mở bán: <strong>{hotel.activeRooms} phòng</strong></span>
                </div>
              </div>
            </div>
            <div className="p-5 pt-0 grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate(`/owner/hotels/edit/${hotel.id}`)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition text-center"
              >
                ⚙️ Sửa Thông Tin
              </button>
              <button
                onClick={() => navigate(`/owner/rooms?hotelId=${hotel.id}`)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2.5 rounded-xl transition text-center"
              >
                🛏️ Quản Lý Loại Phòng
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelManagementPage;