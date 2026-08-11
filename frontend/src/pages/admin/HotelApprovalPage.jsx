import React, { useState } from "react";

const HotelApprovalPage = () => {
  const [hotels, setHotels] = useState([
    {
      id: "h1",
      name: "JW Marriott West Lake",
      owner: "Nguyen Van B",
      city: "Hà Nội",
    },
    {
      id: "h2",
      name: "Amanoi Resort",
      owner: "Tran Thi C",
      city: "Ninh Thuận",
    },
  ]);

  const handleAction = (id) => setHotels(hotels.filter((h) => h.id !== id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          Duyệt Khách Sạn Mới
        </h1>
        <p className="text-xs text-slate-500">
          Phê duyệt đối tác đăng ký mới vào sàn.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="p-4">Tên Khách Sạn</th>
              <th className="p-4">Chủ Sở Hữu</th>
              <th className="p-4">Khu Vực</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {hotels.map((h) => (
              <tr key={h.id}>
                <td className="p-4 font-bold text-slate-900">{h.name}</td>
                <td className="p-4 text-slate-600 font-medium">{h.owner}</td>
                <td className="p-4">{h.city}</td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleAction(h.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(h.id)}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-700"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {hotels.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="p-6 text-center text-slate-400 text-xs"
                >
                  Không còn khách sạn nào chờ duyệt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HotelApprovalPage;
