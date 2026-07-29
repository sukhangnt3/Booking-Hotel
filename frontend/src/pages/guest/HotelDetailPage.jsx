import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// ════════════════════════════════════════════════════════════════
// DỮ LIỆU CHI TIẾT KHÁCH SẠN MẪU (Đồng bộ theo ID của HotelListPage)
// ════════════════════════════════════════════════════════════════
const HOTEL_DETAILS_DATA = {
  "crystal-apartment-phu-quoc": {
    id: "crystal-apartment-phu-quoc",
    name: "Crystal Apartment Hillside Phu Quoc - Sunset Town & Firework & Free Airport Pickup",
    stars: 4,
    rating: 8.0,
    ratingText: "Rất tốt",
    totalReviews: 84,
    address: "An Thới, Thành phố Phú Quốc, Kiên Giang, Việt Nam",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80"
    ],
    highlights: [
      "🎁 Miễn phí xe đưa đón sân bay 2 chiều (Lưu trú từ 3 đêm)",
      "🎆 View ngắm pháo hoa trực diện tại Thị trấn Hoàng Hôn (Sunset Town)",
      "🏊 Hồ bơi vô cực trên tầng thượng & Phòng Gym hiện đại",
      "🏖️ Gần bãi biển riêng và ga cáp treo Hòn Thơm"
    ],
    rooms: [
      {
        id: "r1",
        name: "Căn hộ Studio View Biển & Pháo Hoa",
        bed: "1 giường đôi lớn (King bed)",
        maxAdults: 2,
        price: 1400000,
        features: ["Bao gồm bữa sáng", "Hủy miễn phí", "Ban công ngắm pháo hoa", "Wifi tốc độ cao"]
      },
      {
        id: "r2",
        name: "Căn hộ 2 Phòng Ngủ Gia Đình - Miễn Phí Đón Sân Bay",
        bed: "2 giường đôi lớn",
        maxAdults: 4,
        price: 2600000,
        features: ["Bao gồm bữa sáng", "Hủy miễn phí", "Đón sân bay miễn phí", "Bếp riêng đầy đủ dụng cụ"]
      }
    ]
  },
  "eirlys-home-apartment": {
    id: "eirlys-home-apartment",
    name: "Eirlys Home Apartment Phu Quoc - Firework & Ocean View",
    stars: 3,
    rating: 8.7,
    ratingText: "Tuyệt vời",
    totalReviews: 15,
    address: "An Thới, Thành phố Phú Quốc, Kiên Giang, Việt Nam",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80"
    ],
    highlights: [
      "🌊 View trực diện biển Sunset Town",
      "🐾 Cho phép mang theo thú cưng",
      "📶 Wi-Fi miễn phí & Bãi đỗ xe rộng rãi"
    ],
    rooms: [
      {
        id: "r3",
        name: "Căn hộ Hướng Biển Tầng Cao",
        bed: "1 giường Queen",
        maxAdults: 2,
        price: 1200000,
        features: ["Hủy miễn phí", "Cho phép vật nuôi", "Điều hòa & Máy giặt"]
      }
    ]
  }
};

const HotelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Tìm thông tin khách sạn theo ID từ URL, mặc định fallback về crystal-apartment
  const hotel = HOTEL_DETAILS_DATA[id] || HOTEL_DETAILS_DATA["crystal-apartment-phu-quoc"];

  // State chọn phòng
  const [selectedRoom, setSelectedRoom] = useState(hotel.rooms[0]);

  const handleBooking = () => {
    alert(`Xác nhận chọn phòng: ${selectedRoom.name}\nTổng tiền: ${selectedRoom.price.toLocaleString('vi-VN')} VND`);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16 text-gray-800">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        {/* Nút quay lại trang danh sách */}
        <button
          onClick={() => navigate(-1)}
          className="text-[#006ce4] text-xs font-bold mb-4 hover:underline flex items-center gap-1 cursor-pointer"
        >
          ← Quay lại danh sách kết quả
        </button>

        {/* ─── HEADER THÔNG TIN KHÁCH SẠN ─── */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#003580] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                Căn hộ / Khách sạn
              </span>
              <span className="text-amber-400 text-sm">{'★'.repeat(hotel.stars)}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{hotel.name}</h1>
            <p className="text-xs text-gray-500 mt-1">📍 {hotel.address}</p>
          </div>

          {/* Khối Đánh giá */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
            <div className="text-right">
              <span className="block text-sm font-bold text-gray-900">{hotel.ratingText}</span>
              <span className="block text-xs text-gray-500">{hotel.totalReviews} đánh giá</span>
            </div>
            <div className="bg-[#003580] text-white font-extrabold text-base px-3 py-1.5 rounded-lg">
              {hotel.rating.toFixed(1).replace('.', ',')}
            </div>
          </div>
        </div>

        {/* ─── GALLERY HÌNH ẢNH ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-2xl overflow-hidden mb-8 shadow-sm">
          <div className="md:col-span-2 h-[340px]">
            <img src={hotel.images[0]} alt="Main View" className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer" />
          </div>
          <div className="grid grid-rows-2 gap-2 h-[340px]">
            {hotel.images.slice(1, 3).map((img, idx) => (
              <img key={idx} src={img} alt={`Sub View ${idx}`} className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer" />
            ))}
          </div>
        </div>

        {/* ─── BỐ CỤC NỘI DUNG CHÍNH ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CỘT TRÁI (2 CỘT): TIỆN ÍCH NỔI BẬT & DANH SÁCH PHÒNG */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tiện ích nổi bật */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-sm text-[#003580] mb-3">✨ ĐIỂM NỔI BẬT CỦA CHỖ NGHỈ</h3>
              <ul className="space-y-2">
                {hotel.highlights.map((item, index) => (
                  <li key={index} className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bảng chọn loại phòng */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Các loại phòng còn trống</h2>
              
              <div className="space-y-4">
                {hotel.rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedRoom.id === room.id
                        ? 'border-[#006ce4] bg-blue-50/40 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">{room.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">🛏️ {room.bed} · 👤 Tối đa {room.maxAdults} người lớn</p>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {room.features.map((f, i) => (
                            <span key={i} className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] text-gray-400 block">Giá 1 đêm</span>
                        <span className="text-lg font-bold text-[#006ce4]">
                          {room.price.toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* CỘT PHẢI (1 CỘT): TỔNG TIỀN & XÁC NHẬN ĐẶT PHÒNG ─── */}
          <div className="lg:col-span-1">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-md sticky top-6">
              <h3 className="font-bold text-base text-gray-900 border-b pb-3 mb-4">Tóm tắt đặt phòng</h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Loại phòng chọn:</span>
                  <span className="font-bold text-gray-800 text-right max-w-[180px]">{selectedRoom.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sức chứa:</span>
                  <span className="font-semibold text-gray-800">{selectedRoom.maxAdults} người lớn</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chính sách:</span>
                  <span className="font-semibold text-emerald-600">Hủy miễn phí</span>
                </div>
                
                <hr className="my-3" />

                <div className="flex justify-between items-end">
                  <span className="font-bold text-sm text-gray-900">Tổng chi phí:</span>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#006ce4] block">
                      {selectedRoom.price.toLocaleString('vi-VN')} VND
                    </span>
                    <span className="text-[10px] text-gray-400">Đã bao gồm thuế & phí dịch vụ</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBooking}
                className="w-full mt-6 bg-[#006ce4] hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md cursor-pointer"
              >
                Đặt ngay phòng này
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default HotelDetailPage;