import React, { useState } from "react";

const ServiceManagementPage = () => {
  const [services, setServices] = useState([
    { id: 1, name: "Bữa sáng Buffet Á-Âu", price: 150000, unit: "Người / Ngày", status: "active" },
    { id: 2, name: "Đưa đón sân bay 2 chiều", price: 350000, unit: "Lượt", status: "active" },
    { id: 3, name: "Gói Massage & Spa thư giãn", price: 450000, unit: "Suất / 60 phút", status: "active" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Dịch Vụ Khách Sạn Đi Kèm</h2>
          <p className="text-xs text-slate-500 mt-1">Tạo thêm các gói tiện ích gia tăng để bán cùng với phòng nghỉ.</p>
        </div>
        <button className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md">
          + Thêm Dịch Vụ Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {services.map((s) => (
          <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="font-black text-sm text-slate-900">{s.name}</h3>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                Đang bán
              </span>
            </div>
            <div className="text-xs text-slate-600">
              <p>Giá dịch vụ: <span className="font-black text-slate-900 text-sm">{s.price.toLocaleString()} đ</span> / {s.unit}</p>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 rounded-lg">
                ✏️ Chỉnh sửa
              </button>
              <button className="bg-rose-50 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-rose-100">
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceManagementPage;