import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const HotelEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [hotelData, setHotelData] = useState({
    name: "InterContinental Danang Sun Peninsula Resort",
    type: "Resort",
    phone: "02363938888",
    address: "Bãi Bắc, Bán đảo Sơn Trà, Đà Nẵng",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    description: "Khu nghỉ dưỡng sang trọng bậc nhất nằm ẩn mình giữa thiên nhiên bán đảo Sơn Trà...",
    cancellationPolicy: "Miễn phí hủy trước 3 ngày check-in. Hủy sau thời gian này chịu phí 100% đêm đầu.",
    amenities: ["Free Wifi", "Bể bơi ngoài trời", "Bữa sáng", "Bãi biển riêng", "Phòng Gym"],
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500",
    ],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Đã cập nhật thông tin khách sạn thành công!");
    navigate("/owner/hotels");
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Chỉnh Sửa Thông Tin Khách Sạn</h2>
          <p className="text-xs text-slate-500 mt-1">Cập nhật thông tin mô tả, chính sách nhận/trả phòng và hình ảnh chỗ nghỉ.</p>
        </div>
        <button
          onClick={() => navigate("/owner/hotels")}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
        >
          ← Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        {/* THÔNG TIN CƠ BẢN */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">1. Thông Tin Chung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên khách sạn *</label>
              <input
                type="text"
                value={hotelData.name}
                onChange={(e) => setHotelData({ ...hotelData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại lễ tân *</label>
              <input
                type="text"
                value={hotelData.phone}
                onChange={(e) => setHotelData({ ...hotelData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ chi tiết</label>
            <input
              type="text"
              value={hotelData.address}
              onChange={(e) => setHotelData({ ...hotelData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chỗ nghỉ</label>
            <textarea
              rows={4}
              value={hotelData.description}
              onChange={(e) => setHotelData({ ...hotelData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold outline-none resize-none"
            />
          </div>
        </div>

        {/* KHUNG GIỜ & CHÍNH SÁCH */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">2. Khung Giờ & Chính Sách Hủy</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giờ Check-in quy định</label>
              <input
                type="time"
                value={hotelData.checkInTime}
                onChange={(e) => setHotelData({ ...hotelData, checkInTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giờ Check-out quy định</label>
              <input
                type="time"
                value={hotelData.checkOutTime}
                onChange={(e) => setHotelData({ ...hotelData, checkOutTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chính sách hủy phòng</label>
            <textarea
              rows={2}
              value={hotelData.cancellationPolicy}
              onChange={(e) => setHotelData({ ...hotelData, cancellationPolicy: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none resize-none"
            />
          </div>
        </div>

        {/* HÌNH ẢNH */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">3. Thư Viện Ảnh Chỗ Nghỉ</h3>
          <div className="flex gap-4 overflow-x-auto py-2">
            {hotelData.images.map((img, index) => (
              <div key={index} className="relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                <img src={img} alt="Hotel Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black"
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="w-32 h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50 text-slate-400 hover:text-blue-600 transition">
              <span className="text-xl">+</span>
              <span className="text-[10px] font-bold">Thêm Ảnh</span>
              <input type="file" multiple className="hidden" />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/owner/hotels")}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition"
          >
            Hủy Thay Đổi
          </button>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-md transition"
          >
            💾 Lưu Cập Nhật
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelEditPage;