import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
// Import Services & Components theo cấu trúc thư mục của bạn
import hotelService from "../../services/hotelService";
import HotelCard from "../../components/hotel/HotelCard";
import { LoadingSpinner, EmptyState } from "../../components/common";

const HotelListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ─── 1. STATES DỮ LIỆU THỰC ───
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── 2. THÔNG TIN TÌM KIẾM TỪ URL ───
  const destination = searchParams.get("destination") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = searchParams.get("adults") || "2";

  // ─── 3. STATES BỘ LỌC (Đồng bộ với URL hoặc mặc định) ───
  const [priceRange, setPriceRange] = useState(
    Number(searchParams.get("maxPrice")) || 10000000,
  );
  const [selectedStars, setSelectedStars] = useState(
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [],
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "popular");

  // ─── 4. GỌI API KHI BỘ LỌC THAY ĐỔI ───
  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      try {
        const filters = {
          destination,
          checkIn,
          checkOut,
          adults,
          maxPrice: priceRange,
          stars: selectedStars.join(","),
          sortBy,
        };

        // Gọi API searchHotels (Sẽ chạy câu SQL SELECT ... WHERE ... tại BE)
        const data = await hotelService.searchHotels(filters);
        setHotels(data);
      } catch (err) {
        console.error("Lỗi tải danh sách khách sạn:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [
    destination,
    checkIn,
    checkOut,
    adults,
    priceRange,
    selectedStars,
    sortBy,
  ]);

  // Xử lý thay đổi sao
  const handleStarChange = (star) => {
    setSelectedStars((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star],
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-6 text-gray-800">
        {/* Header Thông tin tìm kiếm */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase">
            {destination ? `Chỗ nghỉ tại ${destination}` : "Tất cả chỗ nghỉ"}
          </h1>
          <div className="flex gap-2 text-xs text-gray-500 mt-1 font-medium">
            <span>
              📅 {checkIn} - {checkOut}
            </span>
            <span>•</span>
            <span>👤 {adults} khách</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* CỘT TRÁI: SIDEBAR BỘ LỌC (Giữ nguyên giao diện của bạn) */}
          <div className="md:col-span-4 lg:col-span-3 space-y-5 bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold border-b pb-3 uppercase tracking-tight">
              Bộ lọc tìm kiếm
            </h2>

            {/* Lọc giá */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase text-gray-400">
                Ngân sách tối đa
              </h3>
              <input
                type="range"
                min="500000"
                max="20000000"
                step="500000"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#006ce4] cursor-pointer"
              />
              <div className="text-sm font-bold text-[#006ce4] mt-2">
                Dưới {priceRange.toLocaleString("vi-VN")} VND
              </div>
            </div>

            {/* Lọc sao (Table 5: star_rating) */}
            <div className="border-t pt-4">
              <h3 className="text-xs font-bold mb-3 uppercase text-gray-400">
                Xếp hạng sao
              </h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <label
                    key={star}
                    className="flex items-center gap-3 text-xs font-bold cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStars.includes(star)}
                      onChange={() => handleStarChange(star)}
                      className="rounded border-gray-300 text-[#006ce4] w-4 h-4"
                    />
                    <span className="group-hover:text-[#006ce4]">
                      {star} sao
                    </span>
                    <span className="text-amber-400">{"★".repeat(star)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KẾT QUẢ */}
          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            {/* Thanh Sắp xếp */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold">
                Tìm thấy <span className="text-[#006ce4]">{hotels.length}</span>{" "}
                chỗ nghỉ
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold border-none bg-gray-50 rounded-lg px-3 py-2 outline-none"
              >
                <option value="popular">Phổ biến nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
            </div>

            {/* Danh sách Hotel Card */}
            {loading ? (
              <LoadingSpinner />
            ) : hotels.length > 0 ? (
              hotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onClick={() =>
                    navigate(
                      `/hotel/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`,
                    )
                  }
                />
              ))
            ) : (
              <EmptyState title="Không có kết quả nào phù hợp" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelListPage;
