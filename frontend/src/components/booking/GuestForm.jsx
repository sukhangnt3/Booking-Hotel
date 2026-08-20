import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Users, Info, BedDouble } from "lucide-react";
import { Input, Badge } from "../ui";
import { cn } from "@/utils/cn";

const GuestForm = ({ selectedRooms = [], initialUser = null, onChange }) => {
  // 1. State thông tin người đặt chính
  const [mainInfo, setMainInfo] = useState({
    fullName: initialUser?.name || "",
    email: initialUser?.email || "",
    phone: initialUser?.phone || "",
  });

  // 2. State danh sách khách theo từng phòng: { [roomIndex]: "Tên khách" }
  const [roomGuests, setRoomGuests] = useState({});

  // Cập nhật dữ liệu ra ngoài mỗi khi có thay đổi
  useEffect(() => {
    if (onChange) {
      onChange({
        booker: mainInfo,
        guests: roomGuests,
      });
    }
  }, [mainInfo, roomGuests]);

  const handleMainChange = (e) => {
    setMainInfo({ ...mainInfo, [e.target.name]: e.target.value });
  };

  const handleGuestChange = (index, value) => {
    setRoomGuests({ ...roomGuests, [index]: value });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* PHẦN 1: THÔNG TIN NGƯỜI ĐẶT (CHÍNH) */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <User size={20} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Thông tin liên hệ</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="Họ và tên người đặt *"
              name="fullName"
              value={mainInfo.fullName}
              onChange={handleMainChange}
              placeholder="Nhập đầy đủ tên như trên CCCD/Hộ chiếu"
              leftIcon={<User size={18} className="text-gray-400" />}
            />
          </div>
          <Input
            label="Địa chỉ Email *"
            name="email"
            type="email"
            value={mainInfo.email}
            onChange={handleMainChange}
            placeholder="Để nhận vé điện tử (E-voucher)"
            leftIcon={<Mail size={18} className="text-gray-400" />}
          />
          <Input
            label="Số điện thoại *"
            name="phone"
            type="tel"
            value={mainInfo.phone}
            onChange={handleMainChange}
            placeholder="Ví dụ: 0905123456"
            leftIcon={<Phone size={18} className="text-gray-400" />}
          />
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
            Chúng tôi sẽ gửi xác nhận đặt phòng và các thông tin cập nhật quan
            trọng vào email và số điện thoại này.
          </p>
        </div>
      </section>

      {/* PHẦN 2: THÔNG TIN KHÁCH Ở (THEO TỪNG PHÒNG) */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Thông tin khách ở
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Vui lòng cung cấp tên khách đại diện cho từng phòng
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {selectedRooms.length > 0 ? (
            selectedRooms.map((room, index) => (
              <div
                key={index}
                className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">
                      Phòng {index + 1}
                    </Badge>
                    <span className="font-bold text-gray-800 text-sm">
                      {room.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                    <BedDouble size={14} />
                    {room.bed_type}
                  </div>
                </div>

                <Input
                  placeholder="Họ tên khách đại diện phòng này"
                  value={roomGuests[index] || ""}
                  onChange={(e) => handleGuestChange(index, e.target.value)}
                  className="bg-white"
                />

                <label className="flex items-center gap-2 cursor-pointer group w-fit">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.checked)
                        handleGuestChange(index, mainInfo.fullName);
                    }}
                  />
                  <span className="text-xs text-gray-500 font-medium group-hover:text-blue-600 transition-colors">
                    Tôi là người ở phòng này
                  </span>
                </label>
              </div>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-400 text-sm italic">
                Vui lòng chọn phòng trước khi nhập thông tin khách.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default GuestForm;
