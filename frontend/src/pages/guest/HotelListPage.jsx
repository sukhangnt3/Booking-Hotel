import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  SlidersHorizontal,
  CalendarDays,
  Users,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";

// Components
import { Button, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, EmptyState, Breadcrumb } from "@/components/common";

// Services & Stores
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const HotelListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // ─── 1. QUERY PARAMS TỪ URL ───
  const destination = searchParams.get("destination") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = searchParams.get("adults") || "2";
  const initialMaxPrice = Number(searchParams.get("maxPrice")) || 20000000;
  const initialStars =
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [];
  const sortBy = searchParams.get("sortBy") || "popular";

  // ─── 2. STATES ───
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({}); // Lưu map { hotelId: true/false }
  const [priceRange, setPriceRange] = useState(initialMaxPrice);
  const [selectedStars, setSelectedStars] = useState(initialStars);

  // ─── 3. FETCH HOTELS + ĐỒNG BỘ YÊU THÍCH THẬT TỪ DATABASE ───
  useEffect(() => {
    let isMounted = true;

    const fetchHotelsAndFavorites = async () => {
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

        // 👈 GỌI SONG SONG: Danh sách tìm kiếm + Danh sách ID đã yêu thích của User
        const [resHotels, resFavorites] = await Promise.all([
          hotelService.searchHotels(filters),
          isAuthenticated ? hotelService.getFavoriteHotels() : [],
        ]);

        const list = Array.isArray(resHotels)
          ? resHotels
          : resHotels?.data || resHotels?.hotels || [];
        const favList = Array.isArray(resFavorites)
          ? resFavorites
          : resFavorites?.data || [];

        if (!isMounted) return;
        setHotels(list);

        // Tạo Set lưu danh sách các ID khách sạn đã yêu thích thật từ Database
        const favIdsSet = new Set(
          favList.map((item) => String(item.id || item.hotel_id)),
        );

        // Tạo map boolean cho từng khách sạn hiển thị
        const favMap = {};
        list.forEach((h) => {
          const hId = String(h.id || h.hotel_id);
          // Trái tim sẽ ĐỎ nếu ID nằm trong danh sách yêu thích của DB hoặc backend trả về true
          favMap[hId] =
            favIdsSet.has(hId) || Boolean(h.is_favorite || h.isFavorite);
        });

        setFavorites(favMap);
      } catch (error) {
        console.error("Lỗi khi tải danh sách khách sạn:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHotelsAndFavorites();

    return () => {
      isMounted = false;
    };
  }, [
    destination,
    checkIn,
    checkOut,
    adults,
    priceRange,
    selectedStars,
    sortBy,
    isAuthenticated,
  ]);

  // ─── 4. CẬP NHẬT FILTER LÊN URL ───
  const updateUrlParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };

    Object.keys(updated).forEach((key) => {
      if (!updated[key] || updated[key] === "0") delete updated[key];
    });

    setSearchParams(updated);
  };

  const handleStarChange = (star) => {
    const newStars = selectedStars.includes(star)
      ? selectedStars.filter((s) => s !== star)
      : [...selectedStars, star];

    setSelectedStars(newStars);
    updateUrlParams({ stars: newStars.join(",") });
  };

  const handlePriceChange = (val) => {
    setPriceRange(val);
    updateUrlParams({ maxPrice: val });
  };

  const handleSortChange = (newSort) => {
    updateUrlParams({ sortBy: newSort });
  };

  // ─── 5. TOGGLE FAVORITE (OPTIMISTIC UI) ───
  const toggleFavorite = async (e, hotel) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const hotelId = String(hotel.id || hotel.hotel_id);
    const previous = Boolean(favorites[hotelId]);
    const next = !previous;

    // Đổi màu tim ngay lập tức
    setFavorites((prev) => ({ ...prev, [hotelId]: next }));

    try {
      if (next) {
        await hotelService.addFavorite(hotelId);
      } else {
        await hotelService.removeFavorite(hotelId);
      }
    } catch (err) {
      // Hoàn tác nếu lỗi
      setFavorites((prev) => ({ ...prev, [hotelId]: previous }));
    }
  };

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  const breadcrumbs = [
    { label: "Khách sạn", link: "/hotels" },
    { label: destination || "Tất cả chỗ nghỉ" },
  ];

  return (
    <div className="bg-gray-50/60 min-h-screen pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Breadcrumb items={breadcrumbs} />

        {/* ─── HEADER THÔNG TIN TÌM KIẾM ─── */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mt-3 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {destination ? `Chỗ nghỉ tại ${destination}` : "Tất cả chỗ nghỉ"}
            </h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays size={14} className="text-[#006ce4]" />
                {checkIn || "Hôm nay"} — {checkOut || "Ngày mai"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users size={14} className="text-[#006ce4]" />
                {adults} người lớn
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="text-xs font-bold border-gray-300 self-start md:self-auto"
            onClick={() => navigate("/")}
          >
            Đổi tìm kiếm
          </Button>
        </div>

        {/* ─── MAIN LAYOUT: SIDEBAR + LIST ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ─── SIDEBAR FILTER (3 COLS) ─── */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6 sticky top-24">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <SlidersHorizontal size={18} className="text-[#006ce4]" />
                <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                  Bộ lọc tìm kiếm
                </h2>
              </div>

              {/* NGÂN SÁCH */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase text-gray-400">
                    Ngân sách tối đa
                  </h3>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="20000000"
                  step="500000"
                  value={priceRange}
                  onChange={(e) => handlePriceChange(Number(e.target.value))}
                  className="w-full accent-[#006ce4] cursor-pointer"
                />
                <div className="text-sm font-black text-[#006ce4] bg-blue-50 px-3 py-1.5 rounded-lg text-center">
                  Dưới {formatVND(priceRange)}
                </div>
              </div>

              {/* HẠNG SAO */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                <h3 className="text-xs font-bold uppercase text-gray-400">
                  Hạng sao khách sạn
                </h3>
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <label
                      key={star}
                      className="flex items-center justify-between text-xs font-bold text-gray-700 cursor-pointer group hover:text-[#006ce4] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedStars.includes(star)}
                          onChange={() => handleStarChange(star)}
                          className="rounded border-gray-300 text-[#006ce4] w-4 h-4 focus:ring-0 cursor-pointer"
                        />
                        <span>{star} sao</span>
                      </div>
                      <StarRating rating={star} size={12} />
                    </label>
                  ))}
                </div>
              </div>

              {/* NÚT RESET FILTER */}
              {(selectedStars.length > 0 || priceRange < 20000000) && (
                <button
                  onClick={() => {
                    setSelectedStars([]);
                    setPriceRange(20000000);
                    updateUrlParams({ stars: "", maxPrice: "" });
                  }}
                  className="w-full text-xs font-bold text-red-500 hover:bg-red-50 py-2 rounded-lg transition-colors"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          </aside>

          {/* ─── HOTEL LIST (9 COLS) ─── */}
          <main className="lg:col-span-9 space-y-4">
            {/* THANH SẮP XẾP */}
            <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-bold text-gray-600">
                Tìm thấy{" "}
                <span className="text-[#006ce4] font-black">
                  {hotels.length}
                </span>{" "}
                chỗ nghỉ
              </span>

              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">
                  Sắp xếp theo:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:border-[#006ce4]"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                  <option value="rating">Điểm đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {/* DANH SÁCH KHÁCH SẠN */}
            {loading ? (
              <div className="py-20 flex justify-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <LoadingSpinner
                  size="lg"
                  label="Đang tìm kiếm chỗ nghỉ tốt nhất..."
                />
              </div>
            ) : hotels.length > 0 ? (
              <div className="space-y-4">
                {hotels.map((hotel) => {
                  const id = String(hotel.id || hotel.hotel_id);
                  const image =
                    hotel.image ||
                    hotel.images?.[0]?.path ||
                    hotel.images?.[0] ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";

                  const title = hotel.title || hotel.name || "Khách sạn";
                  const location =
                    hotel.location ||
                    hotel.address ||
                    destination ||
                    "Việt Nam";
                  const rating = Number(
                    hotel.rating || hotel.average_rating || 8,
                  ).toFixed(1);
                  const reviewsCount = Number(
                    hotel.reviewsCount || hotel.review_count || 0,
                  );
                  const stars = Number(hotel.stars || hotel.star_rating || 0);
                  const salePrice =
                    hotel.salePrice || hotel.price || hotel.min_price || 0;

                  // 👈 TRÁI TIM ĐỎ CHUẨN XÁC TỪ DATABASE
                  const isFav = Boolean(favorites[id]);

                  return (
                    <div
                      key={id}
                      onClick={() =>
                        navigate(
                          `/hotel/${id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`,
                        )
                      }
                      className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-[#006ce4] hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col md:flex-row gap-5"
                    >
                      {/* ẢNH */}
                      <div className="relative w-full md:w-64 h-52 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />

                        {/* NÚT TRÁI TIM YÊU THÍCH */}
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, hotel)}
                          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                            isFav
                              ? "bg-white text-rose-500 scale-110 shadow-rose-200"
                              : "bg-black/30 text-white hover:bg-white hover:text-rose-500"
                          }`}
                          title={isFav ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
                        >
                          <Heart
                            size={18}
                            fill={isFav ? "currentColor" : "none"}
                            strokeWidth={isFav ? 0 : 2}
                          />
                        </button>

                        {hotel.isGenius && (
                          <div className="absolute bottom-2.5 left-2.5">
                            <Badge variant="primary" size="sm">
                              Genius
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* THÔNG TIN CHÍNH */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-[#006ce4] transition-colors leading-snug">
                                  {title}
                                </h3>
                                {stars > 0 && (
                                  <StarRating rating={stars} size={12} />
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <MapPin
                                  size={13}
                                  className="text-[#006ce4] shrink-0"
                                />
                                <span className="line-clamp-1">{location}</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pt-1">
                            {hotel.description ||
                              "Chỗ nghỉ tọa lạc tại vị trí đắc địa với nhiều tiện nghi hiện đại cho kỳ nghỉ trọn vẹn."}
                          </p>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              ✓ Miễn phí hủy phòng
                            </span>
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              ✓ Không cần thanh toán trước
                            </span>
                          </div>
                        </div>

                        {/* ĐÁNH GIÁ & GIÁ TIỀN */}
                        <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-[#003580] text-white font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
                              {rating}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-gray-900 leading-none">
                                {Number(rating) >= 9
                                  ? "Xuất sắc"
                                  : Number(rating) >= 8
                                    ? "Rất tốt"
                                    : "Tốt"}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {reviewsCount} đánh giá
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-medium">
                              Giá 1 đêm từ
                            </p>
                            <p className="text-xl font-black text-rose-600 tracking-tight">
                              {salePrice > 0 ? formatVND(salePrice) : "Liên hệ"}
                            </p>
                            <p className="text-[10px] text-gray-400 italic">
                              Đã bao gồm thuế & phí
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Không tìm thấy khách sạn phù hợp"
                description="Hãy thử tăng mức ngân sách hoặc chọn ít tiêu chí lọc hơn."
                actionLabel="Xóa bộ lọc"
                onAction={() => {
                  setSelectedStars([]);
                  setPriceRange(20000000);
                  updateUrlParams({ stars: "", maxPrice: "" });
                }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default HotelListPage;
