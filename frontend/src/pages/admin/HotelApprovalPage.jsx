import React, { useState } from "react";

const HotelApprovalPage = () => {
  const [hotels, setHotels] = useState([
    {
      id: 1,
      name: "Sea Villa Resort Phú Quốc",
      owner: "Nguyễn Văn Hùng",
      email: "hung.seavilla@gmail.com",
      phone: "0918273645",
      address: "Bãi Dài, Phú Quốc, Kiên Giang",
      roomsCount: 24,
      licenseNo: "GPKD-88912/PQ",
      status: "pending",
      submittedAt: "14/08/2026",
    },
    {
      id: 2,
      name: "Sapa Horizon Hotel",
      owner: "Trần Hoàng Nam",
      email: "nam.sapa@gmail.com",
      phone: "0977112233",
      address: "Đường Phố Mới, Sapa, Lào Cai",
      roomsCount: 15,
      licenseNo: "GPKD-77123/SP",
      status: "pending",
      submittedAt: "13/08/2026",
    },
  ]);

  const handleApprove = (id) => {
    setHotels(hotels.filter((h) => h.id !== id));
    alert("Đã duyệt khách sạn thành công!");
  };

  const handleReject = (id) => {
    setHotels(hotels.filter((h) => h.id !== id));
    alert("Đã từ chối hồ sơ khách sạn!");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Duyệt Khách Sạn Mới</h2>
        <p className="text-xs text-slate-500 mt-1">Kiểm tra thông tin pháp lý và duyệt đối tác đăng ký gia nhập sàn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {hotels.map((h) => (
          <div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                  Chờ duyệt hồ sơ
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{h.name}</h3>
                <p className="text-xs text-slate-500">📍 {h.address}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <p><strong>Chủ sở hữu:</strong> {h.owner} ({h.phone})</p>
              <p><strong>Giấy phép KD:</strong> {h.licenseNo}</p>
              <p><strong>Quy mô:</strong> {h.roomsCount} Phòng</p>
              <p><strong>Ngày gửi:</strong> {h.submittedAt}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(h.id)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition"
              >
                ✓ Chấp nhận
              </button>
              <button
                onClick={() => handleReject(h.id)}
                className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold py-2 rounded-xl transition"
              >
                ✕ Từ chối
              </button>
            </div>
          </div>
        ))}
        {hotels.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border text-slate-400 font-bold text-xs">
            🎉 Không có hồ sơ khách sạn nào đang chờ duyệt!
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelApprovalPage;