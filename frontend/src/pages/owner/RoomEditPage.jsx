import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const RoomEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [roomData, setRoomData] = useState({
    name: isEdit ? "Phòng Deluxe Hướng Biển" : "",
    price: isEdit ? 1800000 : 1000000,
    totalQuantity: isEdit ? 5 : 1,
    maxAdults: isEdit ? 2 : 2,
    maxChildren: isEdit ? 1 : 0,
    roomSize: isEdit ? 45 : 30,
    bedType: isEdit ? "1 Giường King lớn" : "1 Giường Đôi",
    description: isEdit ? "Phòng rộng 45m2 có ban công ngắm trọn toàn cảnh biển..." : "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(isEdit ? "Cập nhật loại phòng thành công!" : "Tạo loại phòng mới thành công!");
    navigate("/owner/rooms");
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 max-w-3xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{isEdit ? "Sửa Hạng Phòng" : "Thêm Hạng Phòng Mới"}</h2>
          <p className="text-xs text-slate-500 mt-1">Cài đặt số lượng phòng bán, cấu hình giường và giá bán mỗi đêm.</p>
        </div>
        <button
          onClick={() => navigate("/owner/rooms")}
          className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          ← Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Tên loại phòng *</label>
          <input
            type="text"
            required
            placeholder="Ví dụ: Premier Ocean Suite"
            value={roomData.name}
            onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Giá gốc / đêm (VNĐ) *</label>
            <input
              type="number"
              required
              value={roomData.price}
              onChange={(e) => setRoomData({ ...roomData, price: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tổng số phòng loại này hiện có</label>
            <input
              type="number"
              required
              value={roomData.totalQuantity}
              onChange={(e) => setRoomData({ ...roomData, totalQuantity: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Số người lớn tối đa</label>
            <input
              type="number"
              value={roomData.maxAdults}
              onChange={(e) => setRoomData({ ...roomData, maxAdults: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Số trẻ em tối đa</label>
            <input
              type="number"
              value={roomData.maxChildren}
              onChange={(e) => setRoomData({ ...roomData, maxChildren: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Diện tích phòng (m²)</label>
            <input
              type="number"
              value={roomData.roomSize}
              onChange={(e) => setRoomData({ ...roomData, roomSize: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Cấu hình giường</label>
          <input
            type="text"
            placeholder="Ví dụ: 1 Giường King lớn hoặc 2 Giường Đơn"
            value={roomData.bedType}
            onChange={(e) => setRoomData({ ...roomData, bedType: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/owner/rooms")}
            className="bg-slate-100 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-md transition"
          >
            ✓ {isEdit ? "Cập Nhật" : "Tạo Hạng Phòng"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoomEditPage;