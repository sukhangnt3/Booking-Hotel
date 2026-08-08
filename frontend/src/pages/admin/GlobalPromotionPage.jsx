import React, { useState } from "react";

const GlobalPromotionPage = () => {
  const [promotions] = useState([
    { id: "p1", code: "SUMMER2026", discount: "15%", minSpend: "1,000,000 đ" },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Mã Giảm Giá Toàn Cục</h1>
        <p className="text-xs text-slate-500">Tạo mã ưu đãi áp dụng trên toàn hệ thống.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Tạo Mã Mới</h3>
        <div className="flex gap-3">
          <input type="text" placeholder="Mã Voucher (VD: TET2026)" className="px-3 py-2 border rounded-xl text-xs flex-1" />
          <input type="text" placeholder="Mức giảm (VD: 20%)" className="px-3 py-2 border rounded-xl text-xs flex-1" />
          <button className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700">Tạo Mã</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 font-black rounded-lg text-sm">{p.code}</span>
              <span className="text-xs font-bold text-emerald-600">Đang áp dụng</span>
            </div>
            <p className="text-xs text-slate-500">Mức giảm: <strong className="text-slate-800">{p.discount}</strong></p>
            <p className="text-xs text-slate-500">Áp dụng từ: <strong className="text-slate-800">{p.minSpend}</strong></p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalPromotionPage;