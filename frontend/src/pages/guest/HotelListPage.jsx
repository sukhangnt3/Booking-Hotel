import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import hotelService from '../../services/hotelService';

const HotelListPage = () => {
  const [searchParams] = useSearchParams();

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Lấy thông tin tìm kiếm từ URL
  const destination = searchParams.get('destination') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const adults = searchParams.get('adults') || '2';
  const rooms = searchParams.get('rooms') || '1';

  // 2. States cho Bộ lọc Nâng cao (Sidebar)
  const [priceRange, setPriceRange] = useState(5000000); // Tối đa 5.000.000 VND
  const [selectedStars, setSelectedStars] = useState([]);
  const [freeCancel, setFreeCancel] = useState(false);
  const [allowPets, setAllowPets] = useState(false);

  // 3. State cho Sắp xếp
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'price_asc' | 'price_desc' | 'rating'

  // Gọi API lọc mỗi khi thay đổi điều kiện
  useEffect(() => {
    const fetchFilteredHotels = async () => {
      setLoading(true);
      try {
        const filters = {
          destination,
          checkIn,
          checkOut,
          adults,
          rooms,
          maxPrice: priceRange,
          stars: selectedStars.join(','),
          freeCancel,
          allowPets,
          sortBy,
        };

        const data = await hotelService.searchHotels(filters);
        setHotels(data || []);
      } catch (err) {
        console.error('Lỗi lọc danh sách khách sạn:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredHotels();
  }, [destination, checkIn, checkOut, adults, rooms, priceRange, selectedStars, freeCancel, allowPets, sortBy]);

  // Handle chọn / bỏ chọn sao
  const handleStarChange = (star) => {
    setSelectedStars((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star]
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 text-gray-800">
        
        {/* Tiêu đề ngắn gọn & đường dẫn vị trí */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {destination ? `Chỗ nghỉ tại ${destination}` : 'Tất cả chỗ nghỉ'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {checkIn ? `Nhận phòng: ${checkIn}` : 'Chưa chọn ngày đi'}
            {checkOut ? ` — Trả phòng: ${checkOut}` : ''} · {adults} người lớn · {rooms} phòng
          </p>
        </div>

        {/* BỐ CỤC CHÍNH 2 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ═════════════════ CỘT TRÁI: BỘ LỌC (SIDEBAR) ═════════════════ */}
          <div className="lg:col-span-1 space-y-5 bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3">Chọn lọc theo:</h2>

            {/* 1. Kéo thanh Ngân sách (Price Range) */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Ngân sách tối đa (mỗi đêm)
              </h3>
              <input
                type="range"
                min="200000"
                max="10000000"
                step="200000"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#006ce4] cursor-pointer"
              />
              <div className="text-xs font-bold text-[#006ce4] mt-1 text-right">
                Up to {priceRange.toLocaleString('vi-VN')} VND
              </div>
            </div>

            {/* 2. Xếp hạng sao (Star Rating) */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Xếp hạng sao</h3>
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
                    <span className="text-yellow-400">{'★'.repeat(star)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Chính sách chỗ nghỉ (Policy) */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Chính sách chỗ nghỉ</h3>
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


          {/* ═════════════════ CỘT PHẢI: KẾT QUẢ & SẮP XẾP ═════════════════ */}
          <div className="lg:col-span-3 space-y-4">

            {/* Thanh Sắp Xếp (Sort Bar) */}
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs sm:text-sm font-bold text-gray-700">
                Tìm thấy <span className="text-[#006ce4]">{hotels.length}</span> chỗ nghỉ
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 hidden sm:inline">Sắp xếp theo:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#006ce4] cursor-pointer"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                  <option value="rating">Điểm đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {/* Danh sách các Thẻ Khách sạn (Hotel Cards) */}
            {loading ? (
              <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-400 font-medium">
                Đang tìm chỗ nghỉ tốt nhất cho bạn...
              </div>
            ) : hotels.length > 0 ? (
              hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row"
                >
                  {/* Ảnh khách sạn */}
                  <div className="sm:w-64 h-48 sm:h-auto relative flex-shrink-0">
                    <img
                      src={hotel.image || '/assets/images/placeholder-hotel.jpg'}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Thông tin chi tiết */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-bold text-base text-gray-900 hover:text-[#006ce4] cursor-pointer leading-snug">
                            {hotel.name}
                          </h3>
                          <div className="text-yellow-400 text-xs mt-0.5">
                            {'★'.repeat(hotel.star_rating || 0)}
                          </div>
                        </div>

                        {/* Điểm Rating kiểu Booking (Nền xanh chữ trắng) */}
                        {hotel.average_rating > 0 && (
                          <div className="flex items-center gap-1.5 bg-[#003580] text-white px-2 py-1 rounded-t-lg rounded-br-lg text-right flex-shrink-0">
                            <div>
                              <div className="text-[10px] font-medium leading-none text-gray-200">
                                {hotel.average_rating >= 9 ? 'Xuất sắc' : 'Tuyệt hảo'}
                              </div>
                              <div className="text-xs font-extrabold">{hotel.average_rating}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mt-1.5">
                        📍 {hotel.address || hotel.city}
                      </p>

                      {hotel.free_cancellation && (
                        <span className="inline-block mt-2 text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          ✓ Hủy miễn phí
                        </span>
                      )}
                    </div>

                    {/* Mức giá & Nút xem chi tiết */}
                    <div className="flex justify-between items-end border-t border-gray-100 pt-3 mt-3">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Giá 1 đêm từ</span>
                        <div className="text-lg font-bold text-[#006ce4]">
                          {hotel.min_price
                            ? `${hotel.min_price.toLocaleString('vi-VN')} VND`
                            : `${hotel.price?.toLocaleString('vi-VN')} VND`}
                        </div>
                      </div>

                      <button className="bg-[#006ce4] hover:bg-[#0056b3] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                        Xem phòng trống
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                <p className="font-bold text-base mb-1">Không tìm thấy chỗ nghỉ phù hợp</p>
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