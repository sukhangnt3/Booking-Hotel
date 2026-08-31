import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  CalendarDays,
  Users,
  ArrowUpDown,
  Search,
  ChevronDown,
  ChevronUp,
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
  const initialStars =
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [];
  const sortBy = searchParams.get("sortBy") || "popular";

  // ─── 2. STATES ───
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});

  // States của Bộ lọc
  const [searchHotelName, setSearchHotelName] = useState("");
  const [selectedBudgets, setSelectedBudgets] = useState([]); // ['under_1m', '1m_2m', '2m_3m', 'above_3m']
  const [selectedStars, setSelectedStars] = useState(initialStars);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // States mở rộng "Xem thêm"
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // ─── 3. FETCH HOTELS + SYNC FAVORITES ───
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
          stars: selectedStars.join(","),
          sortBy,
        };

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

        const favIdsSet = new Set(
          favList.map((item) => String(item.id || item.hotel_id)),
        );

        const favMap = {};
        list.forEach((h) => {
          const hId = String(h.id || h.hotel_id);
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
    selectedStars,
    sortBy,
    isAuthenticated,
  ]);

  // ─── 4. CẬP NHẬT FILTER LÊN URL & STATE ───
  const updateUrlParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };

    Object.keys(updated).forEach((key) => {
      if (!updated[key] || updated[key] === "0") delete updated[key];
    });

    setSearchParams(updated);
  };

  // Toggle Hạng sao
  const handleStarToggle = (star) => {
    const newStars = selectedStars.includes(star)
      ? selectedStars.filter((s) => s !== star)
      : [...selectedStars, star];

    setSelectedStars(newStars);
    updateUrlParams({ stars: newStars.join(",") });
  };

  // Toggle Ngân sách
  const handleBudgetToggle = (key) => {
    setSelectedBudgets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Toggle Loại hình nơi ở
  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // Toggle Tiện ích
  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  // Nút Xóa tất cả bộ lọc
  const handleResetAllFilters = () => {
    setSearchHotelName("");
    setSelectedBudgets([]);
    setSelectedStars([]);
    setSelectedTypes([]);
    setSelectedAmenities([]);
    updateUrlParams({ stars: "" });
  };

  // ─── 5. LỌC CLIENT-SIDE TỨC THÌ ───
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const price = Number(
        hotel.salePrice || hotel.price || hotel.min_price || 0,
      );
      const star = Number(hotel.stars || hotel.star_rating || 0);
      const name = (hotel.title || hotel.name || "").toLowerCase();

      // Lọc theo tên khách sạn
      if (
        searchHotelName &&
        !name.includes(searchHotelName.toLowerCase().trim())
      ) {
        return false;
      }

      // Lọc theo ngân sách
      if (selectedBudgets.length > 0) {
        const matchBudget = selectedBudgets.some((b) => {
          if (b === "under_1m") return price > 0 && price < 1000000;
          if (b === "1m_2m") return price >= 1000000 && price <= 2000000;
          if (b === "2m_3m") return price > 2000000 && price <= 3000000;
          if (b === "above_3m") return price > 3000000;
          return true;
        });
        if (!matchBudget) return false;
      }

      // Lọc theo sao
      if (selectedStars.length > 0 && !selectedStars.includes(star)) {
        return false;
      }

      return true;
    });
  }, [hotels, searchHotelName, selectedBudgets, selectedStars]);

  // ─── 6. TOGGLE YÊU THÍCH ───
  const toggleFavorite = async (e, hotel) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const hotelId = String(hotel.id || hotel.hotel_id);
    const previous = Boolean(favorites[hotelId]);
    const next = !previous;

    setFavorites((prev) => ({ ...prev, [hotelId]: next }));

    try {
      if (next) {
        await hotelService.addFavorite(hotelId);
      } else {
        await hotelService.removeFavorite(hotelId);
      }
    } catch {
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
    <div className="bg-[#f5f7fa] min-h-screen pb-16 font-sans text-gray-800">
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

        {/* ─── MAIN LAYOUT: SIDEBAR FILTER + HOTEL LIST ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 👈 ─── SIDEBAR FILTER CHUẨN THEO HÌNH (3.5 COLS) ─── */}
          <aside className="lg:col-span-3 lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-5 sticky top-20">
            {/* Header Bộ Lọc & Nút Xóa Tất Cả */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-gray-900">Bộ lọc</h2>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs text-[#006ce4] hover:underline font-semibold"
              >
                Xóa tất cả
              </button>
            </div>

            {/* Ô tìm tên khách sạn */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Tìm tên khách sạn"
                value={searchHotelName}
                onChange={(e) => setSearchHotelName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#00bcd4] focus:outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                className="w-9 h-9 bg-[#00bcd4] hover:bg-[#00acc1] text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-colors"
              >
                <Search size={16} />
              </button>
            </div>

            {/* 1. NGÂN SÁCH */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Ngân sách</h3>
                <p className="text-[11px] text-gray-400">
                  Áp dụng theo giá /phòng
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { key: "under_1m", label: "Dưới 1 triệu", count: 158 },
                  { key: "1m_2m", label: "1 - 2 triệu", count: 68 },
                  { key: "2m_3m", label: "2 - 3 triệu", count: 32 },
                  { key: "above_3m", label: "Trên 3 triệu", count: 32 },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedBudgets.includes(item.key)}
                        onChange={() => handleBudgetToggle(item.key)}
                        className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-0 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded font-normal">
                      {item.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. HẠNG SAO */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Hạng sao</h3>
              <div className="space-y-2">
                {[
                  { star: 5, count: 330 },
                  { star: 4, count: 432 },
                  { star: 3, count: 878 },
                  { star: 2, count: 527 },
                  { star: 1, count: 1429 },
                ].map((item) => (
                  <label
                    key={item.star}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedStars.includes(item.star)}
                        onChange={() => handleStarToggle(item.star)}
                        className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-0 cursor-pointer"
                      />
                      <span>{item.star} sao</span>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded font-normal">
                      {item.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. LOẠI HÌNH NƠI Ở */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Loại hình nơi ở
              </h3>
              <div className="space-y-2">
                {[
                  { key: "hotel", label: "Khách sạn (Hotel)", count: 1913 },
                  {
                    key: "apartment",
                    label: "Căn hộ (Apartment)",
                    count: 1522,
                  },
                  { key: "cruise", label: "Du thuyền (Cruise)", count: 2 },
                  { key: "resort", label: "Khu nghỉ dưỡng (Resort)", count: 8 },
                  {
                    key: "homestay",
                    label: "Nhà nghỉ (Guest house, Homestay)",
                    count: 118,
                  },
                  ...(showAllTypes
                    ? [
                        { key: "villa", label: "Biệt thự (Villa)", count: 45 },
                        {
                          key: "hostel",
                          label: "Hostel / Ký túc xá",
                          count: 12,
                        },
                      ]
                    : []),
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(item.key)}
                        onChange={() => handleTypeToggle(item.key)}
                        className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-0 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded font-normal">
                      {item.count}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAllTypes(!showAllTypes)}
                className="text-xs text-[#006ce4] hover:underline flex items-center gap-1 font-semibold pt-1"
              >
                <span>
                  {showAllTypes ? "Thu gọn" : "Xem thêm loại hình nơi ở"}
                </span>
                {showAllTypes ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </div>

            {/* 4. TIỆN ÍCH */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Tiện ích</h3>
              <div className="space-y-2">
                {[
                  { key: "family", label: "Phòng gia đình", count: 85 },
                  {
                    key: "parking",
                    label: "Bãi đậu xe ô tô tại khách sạn",
                    count: 38,
                  },
                  { key: "pool", label: "Hồ bơi", count: 72 },
                  { key: "airport", label: "Đưa đón sân bay", count: 28 },
                  { key: "kids", label: "Khu vui chơi trẻ em", count: 9 },
                  ...(showAllAmenities
                    ? [
                        { key: "wifi", label: "Wi-Fi miễn phí", count: 120 },
                        {
                          key: "gym",
                          label: "Phòng Gym / Thể hình",
                          count: 40,
                        },
                        { key: "spa", label: "Spa & Massage", count: 35 },
                      ]
                    : []),
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(item.key)}
                        onChange={() => handleAmenityToggle(item.key)}
                        className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-0 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded font-normal">
                      {item.count}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAllAmenities(!showAllAmenities)}
                className="text-xs text-[#006ce4] hover:underline flex items-center gap-1 font-semibold pt-1"
              >
                <span>
                  {showAllAmenities ? "Thu gọn" : "Xem thêm tiện ích"}
                </span>
                {showAllAmenities ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </div>
          </aside>

          {/* 👉 ─── DANH SÁCH KHÁCH SẠN (8.5 COLS) ─── */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* THANH SẮP XẾP */}
            <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-bold text-gray-600">
                Tìm thấy{" "}
                <span className="text-[#006ce4] font-black">
                  {filteredHotels.length}
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
                  onChange={(e) => updateUrlParams({ sortBy: e.target.value })}
                  className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:border-[#006ce4]"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                  <option value="rating">Điểm đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {/* DANH SÁCH CARD KHÁCH SẠN */}
            {loading ? (
              <div className="py-20 flex justify-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <LoadingSpinner
                  size="lg"
                  label="Đang tìm kiếm chỗ nghỉ tốt nhất..."
                />
              </div>
            ) : filteredHotels.length > 0 ? (
              <div className="space-y-4">
                {filteredHotels.map((hotel) => {
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
                      {/* ẢNH KHÁCH SẠN */}
                      <div className="relative w-full md:w-64 h-52 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />

                        {/* NÚT YÊU THÍCH */}
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
                description="Hãy thử đổi bộ lọc hoặc tìm tên khách sạn khác."
                actionLabel="Xóa bộ lọc"
                onAction={handleResetAllFilters}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default HotelListPage;
