import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
// Import Services & Components
import hotelService from "../../services/hotelService";
import { LoadingSpinner, EmptyState } from "../../components/common";

const HotelListPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ─── 1. STATES DỮ LIỆU THỰC ───
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});

  // ─── 2. THÔNG TIN TÌM KIẾM TỪ URL ───
  const destination = searchParams.get("destination") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = searchParams.get("adults") || "2";

  // ─── 3. STATES BỘ LỌC (Đồng bộ với URL hoặc mặc định) ───
  const [priceRange, setPriceRange] = useState(
    Number(searchParams.get("maxPrice")) || 10000000
  );
  const [selectedStars, setSelectedStars] = useState(
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || []
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

        const data = await hotelService.searchHotels(filters);
        setHotels(Array.isArray(data) ? data : data?.hotels || []);
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

  // Handle chọn sao
  const handleStarChange = (star) => {
    setSelectedStars((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star]
    );
  };

  // Handle yêu thích (sử dụng stopPropagation để không bị nhảy trang khi bấm tim)
  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 🚀 ĐÃ THÊM: Hàm tập trung chuyển hướng sang trang chi tiết HotelDetailPage
  const handleGoToDetail = (hotelId) => {
    navigate(`/hotel/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12 font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-6 text-gray-800">
        
        {/* Header Thông tin tìm kiếm */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase">
            {destination ? `Chỗ nghỉ tại ${destination}` : "Tất cả chỗ nghỉ"}
          </h1>
          <div className="flex gap-2 text-xs text-gray-500 mt-1 font-medium">
            <span>
              📅 {checkIn || "Ngày nhận"} - {checkOut || "Ngày trả"}
            </span>
            <span>•</span>
            <span>👤 {adults} khách</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI: SIDEBAR BỘ LỌC */}
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
                Dưới {Number(priceRange).toLocaleString("vi-VN")} VND
              </div>
            </div>

            {/* Lọc sao */}
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

          {/* CỘT PHẢI: KẾT QUẢ TÌM KIẾM */}
          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            
            {/* Thanh Sắp xếp */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold">
                Tìm thấy <span className="text-[#006ce4]">{hotels.length}</span> chỗ nghỉ
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold border-none bg-gray-50 rounded-lg px-3 py-2 outline-none cursor-pointer"
              >
                <option value="popular">Phổ biến nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
            </div>

            {/* DANH SÁCH KHÁCH SẠN */}
            {loading ? (
              <LoadingSpinner />
            ) : hotels.length > 0 ? (
              hotels.map((hotel) => {
                // Xử lý dữ liệu linh hoạt theo tên cột Backend
                const id = hotel.id || hotel.hotel_id;
                
                // 🚀 ĐÃ SỬA: Thêm ảnh mặc định phòng trường hợp API trả về null/empty
                const image =
                  hotel.image ||
                  hotel.imageUrl ||
                  hotel.avatar ||
                  hotel.images?.[0] ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";

                const title = hotel.title || hotel.name || "Khách sạn";
                const location = hotel.location || hotel.address || destination || "Địa điểm";
                const rating = Number(hotel.rating || hotel.star_rating || 8.0).toFixed(1).replace(".", ",");
                const ratingText = hotel.ratingText || (Number(hotel.rating || 8) >= 8 ? "Rất tốt" : "Tốt");
                const reviewsCount = Number(hotel.reviewsCount || hotel.review_count || 0).toLocaleString("vi-VN");
                const stars = Number(hotel.stars || hotel.star_rating || 4);
                const originalPrice = hotel.originalPrice ? Number(hotel.originalPrice).toLocaleString("vi-VN") : null;
                const salePrice = Number(hotel.salePrice || hotel.price || 0).toLocaleString("vi-VN");

                return (
                  <div
                    key={id}
                    /* 🚀 Bấm vào toàn bộ Card sẽ điều hướng sang trang HotelDetailPage */
                    onClick={() => handleGoToDetail(id)}
                    className="bg-[#f0f6ff] border border-[#b4d4ff] rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:shadow-md transition-all cursor-pointer group w-full"
                  >
                    {/* 1. KHUNG ẢNH */}
                    <div className="relative w-full md:w-60 h-48 shrink-0 rounded-lg overflow-hidden bg-gray-200">
                      {/* 🚀 ĐÃ THÊM: Thẻ img bị thiếu trong code ban đầu */}
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Ảnh dự phòng nếu link bị lỗi
                          e.target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, id)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition z-10"
                      >
                        <span className={`text-sm ${favorites[id] ? "text-red-500" : "text-gray-400"}`}>
                          {favorites[id] ? "❤️" : "🤍"}
                        </span>
                      </button>
                    </div>

                    {/* 2. CỘT THÔNG TIN GIỮA */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <h3 className="font-bold text-lg md:text-xl text-[#006ce4] group-hover:underline leading-snug">
                            {title}
                          </h3>
                          <div className="flex items-center gap-1 mt-1 shrink-0">
                            <div className="flex text-amber-400 text-xs">
                              {Array.from({ length: stars }).map((_, i) => (
                                <span key={i}>★</span>
                              ))}
                            </div>
                            <span className="bg-[#ffb700] text-white font-bold text-[10px] px-1 py-0.5 rounded ml-1">
                              👍+
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-700 mt-2 flex flex-wrap items-center gap-1 font-medium">
                          <span className="text-[#006ce4] font-semibold">{location}</span>
                          <span>•</span>
                          <button
                            type="button"
                            className="text-[#006ce4] underline hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Xem trên bản đồ
                          </button>
                        </div>

                        <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                          {hotel.description || `Chỗ nghỉ tuyệt vời tại ${location}, cung cấp đầy đủ tiện nghi hiện đại cho chuyến đi của bạn.`}
                        </p>
                      </div>
                    </div>

                    {/* 3. CỘT PHẢI: ĐÁNH GIÁ & NÚT BẤM GIÁ */}
                    <div className="flex md:flex-col justify-between items-end shrink-0 md:w-44 pt-3 md:pt-0 border-t md:border-t-0 border-gray-200">
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <div className="text-sm font-bold text-gray-900 leading-tight">
                            {ratingText}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {reviewsCount} đánh giá
                          </div>
                        </div>
                        <div className="bg-[#003580] text-white font-bold text-base px-2 py-1 rounded-t-lg rounded-br-lg min-w-[34px] text-center">
                          {rating}
                        </div>
                      </div>

                      <div className="mt-auto pt-2 flex flex-col items-end w-full">
                        {originalPrice && (
                          <span className="text-xs text-red-600 line-through font-normal">
                            VND {originalPrice}
                          </span>
                        )}

                        {/* 🚀 ĐÃ THÊM: Gắn onClick trực tiếp vào nút Xem phòng */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Ngăn chặn sự kiện trùng lặp với div cha
                            handleGoToDetail(id);
                          }}
                          className="bg-[#006ce4] hover:bg-[#0057b8] text-white font-semibold text-sm px-4 py-2.5 rounded-md transition-colors w-full mt-1"
                        >
                          {Number(hotel.salePrice || hotel.price) > 0 ? `VND ${salePrice}` : "Xem phòng"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
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