import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// ════════════════════════════════════════════════════════════════
// 1. DỮ LIỆU MẪU (MOCK DATA)
// ════════════════════════════════════════════════════════════════
const MOCK_HOTELS = [
  {
    id: "crystal-apartment-phu-quoc",
    name: "Crystal Apartment Hillside Phu Quoc - Sunset Town & Firework & Free Airport Pickup",
    stars: 4,
    price: 1400000,
    rating: 8.0,
    ratingText: "Rất tốt",
    totalReviews: 84,
    location: "An Thới, Phú Quốc",
    distanceFromCenter: "Cách trung tâm 21,4km",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    description: "Nhìn ra thành phố, Crystal Apartment Hillside Phu Quoc - Sunset Town & Firework & Free Airport Pickup ở Phú Quốc cung cấp chỗ nghỉ có hồ bơi ngoài trời, trung tâm thể dục, khu vườn, khu vực bãi biển...",
    isThumbUp: true,
    freeCancel: true,
    allowPets: false,
    isHighlighted: true,
  },
  {
    id: "eirlys-home-apartment",
    name: "Eirlys Home Apartment Phu Quoc - Firework & Ocean View",
    stars: 3,
    price: 1200000,
    rating: 8.7,
    ratingText: "Tuyệt vời",
    totalReviews: 15,
    location: "An Thới, Phú Quốc",
    distanceFromCenter: "Cách trung tâm 21,2km",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    description: "Căn hộ Eirlys Home sở hữu tầm nhìn hướng biển tuyệt đẹp, nằm ngay tại trung tâm Thị trấn Hoàng Hôn, thuận tiện ngắm pháo hoa và di chuyển đến cáp treo Hòn Thơm...",
    isThumbUp: false,
    freeCancel: true,
    allowPets: true,
    isHighlighted: false,
  }
];

const HotelListPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Thông tin tìm kiếm từ URL
  const destination = searchParams.get('destination') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const adults = searchParams.get('adults') || '2';
  const rooms = searchParams.get('rooms') || '1';

  // States bộ lọc
  const [priceRange, setPriceRange] = useState(10000000); 
  const [selectedStars, setSelectedStars] = useState([]);
  const [freeCancel, setFreeCancel] = useState(false);
  const [allowPets, setAllowPets] = useState(false);
  const [sortBy, setSortBy] = useState('popular');

  const handleStarChange = (star) => {
    setSelectedStars((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star]
    );
  };

  // 🚀 HÀM ĐIỀU HƯỚNG SANG TRANG CHI TIẾT
  const handleGoToDetail = (hotelId) => {
    navigate(`/hotel/${hotelId}`);
  };

  // Logic lọc dữ liệu
  const filteredHotels = useMemo(() => {
    let result = MOCK_HOTELS.filter((hotel) => {
      const matchesPrice = hotel.price <= priceRange;
      const matchesStar = selectedStars.length === 0 || selectedStars.includes(hotel.stars);
      const matchesCancel = !freeCancel || hotel.freeCancel;
      const matchesPets = !allowPets || hotel.allowPets;

      return matchesPrice && matchesStar && matchesCancel && matchesPets;
    });

    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [priceRange, selectedStars, freeCancel, allowPets, sortBy]);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-6 text-gray-800">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {destination ? `Chỗ nghỉ tại ${destination}` : 'Phú Quốc: tất cả chỗ nghỉ'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {checkIn ? `Nhận phòng: ${checkIn}` : 'Chưa chọn ngày đi'}
            {checkOut ? ` — Trả phòng: ${checkOut}` : ''} · {adults} người lớn · {rooms} phòng
          </p>
        </div>

        {/* Cột 2 bên */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* CỘT TRÁI: BỘ LỌC */}
          <div className="md:col-span-4 lg:col-span-3 space-y-5 bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold text-gray-900 border-b pb-3">Chọn lọc theo:</h2>

            <div>
              <h3 className="text-xs font-bold text-gray-800 mb-2">Ngân sách tối đa (mỗi đêm)</h3>
              <input
                type="range"
                min="500000"
                max="10000000"
                step="100000"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#006ce4] cursor-pointer"
              />
              <div className="text-xs font-bold text-[#006ce4] mt-1 text-right">
                Tối đa {priceRange.toLocaleString('vi-VN')} VND
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xs font-bold text-gray-800 mb-2">Xếp hạng sao</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <label key={star} className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:text-[#006ce4]">
                    <input
                      type="checkbox"
                      checked={selectedStars.includes(star)}
                      onChange={() => handleStarChange(star)}
                      className="rounded border-gray-300 text-[#006ce4] focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>{star} sao</span>
                    <span className="text-amber-400">{'★'.repeat(star)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xs font-bold text-gray-800 mb-2">Chính sách chỗ nghỉ</h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:text-[#006ce4]">
                  <input
                    type="checkbox"
                    checked={freeCancel}
                    onChange={(e) => setFreeCancel(e.target.checked)}
                    className="rounded border-gray-300 text-[#006ce4] focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>Hủy miễn phí</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:text-[#006ce4]">
                  <input
                    type="checkbox"
                    checked={allowPets}
                    onChange={(e) => setAllowPets(e.target.checked)}
                    className="rounded border-gray-300 text-[#006ce4] focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>Cho phép vật nuôi</span>
                </label>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KẾT QUẢ TÌM KIẾM */}
          <div className="md:col-span-8 lg:col-span-9 space-y-4">

            {/* Thanh Sắp Xếp */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-gray-700">
                Tìm thấy <span className="text-[#006ce4]">{filteredHotels.length}</span> chỗ nghỉ
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 hidden sm:inline">Sắp xếp theo:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#006ce4] cursor-pointer"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                  <option value="rating">Điểm đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {/* Danh sách Thẻ Khách sạn */}
            {filteredHotels.length > 0 ? (
              filteredHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className={`border rounded-xl p-4 flex flex-col md:flex-row gap-4 transition-all shadow-sm hover:shadow-md ${
                    hotel.isHighlighted
                      ? 'bg-[#f0f6ff] border-[#b4d4ff]'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {/* 1. Click vào Ảnh để chuyển trang */}
                  <div 
                    onClick={() => handleGoToDetail(hotel.id)}
                    className="relative w-full md:w-[260px] h-[190px] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button 
                      onClick={(e) => e.stopPropagation()} 
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-full shadow transition-colors"
                    >
                      ♡
                    </button>
                  </div>

                  {/* Thông tin chi tiết */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          {/* 2. Click vào Tiêu đề để chuyển trang */}
                          <h3
                            onClick={() => handleGoToDetail(hotel.id)}
                            className="text-[#006ce4] text-base font-bold leading-snug cursor-pointer hover:underline"
                          >
                            {hotel.name}
                            <span className="inline-flex items-center gap-1 ml-1.5 text-amber-400 text-xs">
                              {'★'.repeat(hotel.stars)}
                              {hotel.isThumbUp && (
                                <span className="bg-[#ffb700] text-white px-1 py-0.5 rounded text-[10px] font-bold">
                                  👍+
                                </span>
                              )}
                            </span>
                          </h3>

                          {/* Địa chỉ */}
                          <p className="text-xs mt-1">
                            <span className="text-[#006ce4] font-semibold hover:underline cursor-pointer">
                              {hotel.location}
                            </span>
                            <span className="text-gray-400 mx-1">·</span>
                            <span className="text-[#006ce4] hover:underline cursor-pointer">
                              Xem trên bản đồ
                            </span>
                            <span className="text-gray-400 mx-1">·</span>
                            <span className="text-gray-600">{hotel.distanceFromCenter}</span>
                          </p>
                        </div>

                        {/* Điểm đánh giá */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <span className="block text-xs font-bold text-gray-900">{hotel.ratingText}</span>
                            <span className="block text-[10px] text-gray-500">{hotel.totalReviews} đánh giá</span>
                          </div>
                          <div className="bg-[#003580] text-white font-bold px-2 py-1 rounded text-sm">
                            {hotel.rating.toFixed(1).replace('.', ',')}
                          </div>
                        </div>
                      </div>

                      {/* Mô tả */}
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-3">
                        {hotel.description}
                      </p>
                    </div>

                    {/* 3. Click vào Nút "Chọn ngày" để chuyển trang */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-xs text-gray-500 block">Giá chỉ từ</span>
                        <span className="text-base font-extrabold text-[#006ce4]">
                          {hotel.price.toLocaleString('vi-VN')} VND
                        </span>
                      </div>

                      <button
                        onClick={() => handleGoToDetail(hotel.id)}
                        className="bg-[#006ce4] hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-md text-xs transition shadow-sm"
                      >
                        Chọn ngày
                      </button>
                    </div>

                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <p className="font-bold text-gray-800 text-base mb-1">
                  Không tìm thấy chỗ nghỉ phù hợp
                </p>
                <p className="text-xs text-gray-400">
                  Thử điều chỉnh lại bộ lọc ngân sách hoặc xếp hạng sao bên cột trái xem sao nhé.
                </p>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default HotelListPage;