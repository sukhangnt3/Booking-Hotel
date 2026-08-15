import React, { useState } from "react";

const GlobalPromotionPage = () => {
  const [promotions, setPromotions] = useState([
    { id: 1, code: "GOSTAY2026", discount: "15%", minSpend: "1,000,000 đ", validUntil: "31/12/2026", status: "Active" },
    { id: 2, code: "SUMMERVIBES", discount: "200,000 đ", minSpend: "2,500,000 đ", validUntil: "30/09/2026", status: "Active" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Mã Giảm Giá Toàn Cục</h2>
          <p className="text-xs text-slate-500 mt-1">Tạo Voucher khuyến mãi áp dụng cho tất cả khách sạn trên sàn.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md">
          + Tạo Mã Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex justify-between items-center">
            <div>
              <span className="bg-blue-100 text-blue-700 font-black text-sm px-3 py-1 rounded-lg tracking-widest">
                {p.code}
              </span>
              <div className="mt-3 text-xs text-slate-600 space-y-1">
                <p><strong>Mức giảm:</strong> {p.discount}</p>
                <p><strong>Đơn tối thiểu:</strong> {p.minSpend}</p>
                <p><strong>Hạn sử dụng:</strong> {p.validUntil}</p>
              </div>
            </div>
            <button className="text-rose-600 text-xs font-bold hover:underline">Xóa mã</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalPromotionPage;