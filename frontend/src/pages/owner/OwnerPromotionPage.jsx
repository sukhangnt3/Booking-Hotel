import React, { useState } from "react";

const OwnerPromotionPage = () => {
  const [promotions] = useState([
    { id: 1, code: "SUMMER2026", discount: "15%", minSpend: 2000000, validUntil: "31/08/2026", status: "active" },
    { id: 2, code: "WEEKENDVIP", discount: "200,000 đ", minSpend: 3000000, validUntil: "15/09/2026", status: "active" },
  ]);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Mã Giảm Giá Khách Sạn</h2>
          <p className="text-xs text-slate-500 mt-1">Tạo khuyến mãi riêng để thu hút khách đặt phòng vào các ngày thấp điểm.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-3 rounded-xl shadow-md transition">
          + Tạo Mã Voucher Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {promotions.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border border-dashed border-2 border-slate-300 shadow-sm flex justify-between items-center">
            <div className="space-y-2">
              <span className="bg-emerald-100 text-emerald-800 font-black text-base px-3 py-1 rounded-lg inline-block tracking-wider">
                🏷️ {p.code}
              </span>
              <p className="text-xs font-bold text-slate-900">Giảm ngay {p.discount} cho đơn từ {p.minSpend.toLocaleString()} đ</p>
              <p className="text-[11px] text-slate-400">Hạn sử dụng đến: {p.validUntil}</p>
            </div>
            <button className="bg-rose-50 text-rose-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-rose-100 transition">
              Tắt Voucher
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnerPromotionPage;