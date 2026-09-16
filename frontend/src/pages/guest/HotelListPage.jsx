// src/pages/guest/HotelListPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  CalendarDays,
  Users,
  ArrowUpDown,
  Waves,
  Navigation,
  Star,
  SlidersHorizontal,
} from "lucide-react";

import { Button, StarRating } from "@/components/ui";
import { LoadingSpinner, EmptyState, Breadcrumb } from "@/components/common";

import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const parseImageUrl = (img) => {
  if (!img)
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
  let raw = typeof img === "string" ? img : img.url || img.path || "";
  raw = String(raw).trim();
  if (!raw || raw.startsWith("blob:"))
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

const removeVietnameseTones = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
};

export default function HotelListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const destination =
    searchParams.get("destination") || searchParams.get("search") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = searchParams.get("adults") || "2";
  const initialStars =
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [];
  const sortBy = searchParams.get("sortBy") || "popular";

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});

  const [searchHotelName, setSearchHotelName] = useState("");
  const [selectedStars, setSelectedStars] = useState(initialStars);
  const [selectedRating, setSelectedRating] = useState(null); // Điểm tối thiểu (6, 7, 8, 9)

  // Khoảng giá thực tế tự động quét từ danh sách phòng trả về
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 5000000 });
  const [userPriceRange, setUserPriceRange] = useState([0, 5000000]);

  useEffect(() => {
    let isMounted = true;

    const fetchHotelsAndFavorites = async () => {
      setLoading(true);
      try {
        const res = await (hotelService.searchHotels
          ? hotelService.searchHotels({
              destination,
              checkIn,
              checkOut,
              adults,
              sortBy,
            })
          : hotelService.getAll());
        const apiHotels = Array.isArray(res) ? res : res?.data || [];

        const formattedList = apiHotels.map((h) => {
          const hotelId = String(h.id);
          const rawImg = h.image || h.thumbnail || "";
          const price = Number(h.min_price || h.base_price || 650000);

          return {
            ...h,
            id: hotelId,
            title: h.name || "Khách sạn nghỉ dưỡng",
            name: h.name || "Khách sạn nghỉ dưỡng",
            city: h.city || "Việt Nam",
            location: h.address
              ? `${h.address}, ${h.city}`
              : h.city || "Việt Nam",
            image: parseImageUrl(rawImg),
            salePrice: price,
            star_rating: Number(h.star_rating || 3),
            stars: Number(h.star_rating || 3),
            rating: Number(h.average_rating || 0),
            review_count: Number(h.review_count || 0),
            is_beachfront: Boolean(h.is_beachfront),
            distance_to_center: h.distance_to_center,
          };
        });

        // Tự động tính Min và Max theo giá thực tế của các khách sạn vừa tìm thấy
        if (formattedList.length > 0) {
          const allPrices = formattedList.map((h) => h.salePrice);
          const realMin = Math.min(...allPrices);
          const realMax = Math.max(...allPrices);

          // Làm tròn đẹp mắt (bội số của 50.000đ)
          const roundedMin = Math.floor(realMin / 50000) * 50000;
          const roundedMax = Math.ceil(realMax / 50000) * 50000 || 5000000;

          setPriceBounds({ min: roundedMin, max: roundedMax });
          setUserPriceRange([roundedMin, roundedMax]);
        } else {
          setPriceBounds({ min: 0, max: 5000000 });
          setUserPriceRange([0, 5000000]);
        }

        let favMap = {};
        if (isAuthenticated && hotelService?.getFavorites) {
          try {
            const favs = await hotelService.getFavorites();
            const favList = Array.isArray(favs) ? favs : favs?.data || [];
            favList.forEach((item) => {
              favMap[String(item.id || item.hotel_id)] = true;
            });
          } catch (e) {}
        }

        if (!isMounted) return;
        setHotels(formattedList);
        setFavorites(favMap);
      } catch (error) {
        console.error("Lỗi khi tải danh sách khách sạn:", error);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchHotelsAndFavorites();

    return () => {
      isMounted = false;
    };
  }, [destination, checkIn, checkOut, adults, sortBy, isAuthenticated]);

  const updateUrlParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };
    Object.keys(updated).forEach((key) => {
      if (!updated[key] || updated[key] === "0") delete updated[key];
    });
    setSearchParams(updated);
  };

  const handleStarToggle = (star) => {
    const newStars = selectedStars.includes(star)
      ? selectedStars.filter((s) => s !== star)
      : [...selectedStars, star];
    setSelectedStars(newStars);
    updateUrlParams({ stars: newStars.join(",") });
  };

  const handleRatingToggle = (minScore) => {
    setSelectedRating((prev) => (prev === minScore ? null : minScore));
  };

  const handleResetAllFilters = () => {
    setSearchHotelName("");
    setSelectedStars([]);
    setSelectedRating(null);
    setUserPriceRange([priceBounds.min, priceBounds.max]);
    updateUrlParams({ stars: "", destination: "" });
  };

  // Đếm số lượng khách sạn theo từng tiêu chí để hiển thị bên cạnh checkbox
  const filterCounts = useMemo(() => {
    const counts = {
      stars: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      ratings: { 9: 0, 8: 0, 7: 0, 6: 0 },
    };

    hotels.forEach((h) => {
      const star = Math.round(h.star_rating);
      if (counts.stars[star] !== undefined) {
        counts.stars[star]++;
      }

      if (h.rating >= 9.0) counts.ratings[9]++;
      if (h.rating >= 8.0) counts.ratings[8]++;
      if (h.rating >= 7.0) counts.ratings[7]++;
      if (h.rating >= 6.0) counts.ratings[6]++;
    });

    return counts;
  }, [hotels]);

  // Bộ lọc khách sạn
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const price = Number(hotel.salePrice || 0);
      const star = Number(hotel.star_rating || 0);
      const score = Number(hotel.rating || 0);

      // 1. Lọc theo địa điểm
      if (destination.trim()) {
        const destKey = removeVietnameseTones(destination);
        const nameKey = removeVietnameseTones(hotel.name);
        const cityKey = removeVietnameseTones(hotel.city);
        const addrKey = removeVietnameseTones(hotel.address || "");

        const matchDest =
          nameKey.includes(destKey) ||
          cityKey.includes(destKey) ||
          addrKey.includes(destKey) ||
          destKey.includes(cityKey);

        if (!matchDest) return false;
      }

      // 2. Tìm nhanh theo tên khách sạn
      if (searchHotelName.trim()) {
        const nameSearchKey = removeVietnameseTones(searchHotelName);
        const nameKey = removeVietnameseTones(hotel.name);
        if (!nameKey.includes(nameSearchKey)) return false;
      }

      // 3. Lọc theo dải ngân sách Min - Max thực tế
      if (price < userPriceRange[0] || price > userPriceRange[1]) {
        return false;
      }

      // 4. Lọc theo số sao
      if (selectedStars.length > 0 && !selectedStars.includes(star)) {
        return false;
      }

      // 5. Lọc theo điểm đánh giá của khách (1 - 10 điểm)
      if (selectedRating !== null && score < selectedRating) {
        return false;
      }

      return true;
    });
  }, [
    hotels,
    destination,
    searchHotelName,
    userPriceRange,
    selectedStars,
    selectedRating,
  ]);

  const sortedHotels = useMemo(() => {
    const list = [...filteredHotels];
    if (sortBy === "price_asc") list.sort((a, b) => a.salePrice - b.salePrice);
    else if (sortBy === "price_desc")
      list.sort((a, b) => b.salePrice - a.salePrice);
    else if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [filteredHotels, sortBy]);

  const toggleFavorite = async (e, hotel) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const hotelId = String(hotel.id);
    const previous = Boolean(favorites[hotelId]);
    setFavorites((prev) => ({ ...prev, [hotelId]: !previous }));

    try {
      if (previous) {
        await hotelService.removeFavorite(hotelId);
      } else {
        await hotelService.addFavorite(hotelId);
      }
    } catch {
      setFavorites((prev) => ({ ...prev, [hotelId]: previous }));
    }
  };

  const formatVND = (price) =>
    "VND " + Number(price || 0).toLocaleString("vi-VN");

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Khách sạn", link: "/hotels" },
    { label: destination ? `Chỗ nghỉ tại ${destination}` : "Tất cả chỗ nghỉ" },
  ];

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-16 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Breadcrumb items={breadcrumbs} />

        {/* BANNER THÔNG BÁO TÌNH TRẠNG CHỖ TRỐNG CHUẨN BOOKING.COM */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs mt-3 mb-4 flex items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-[#003580] flex items-center justify-center font-bold text-[11px] shrink-0">
              i
            </span>
            <span>
              Dựa vào tìm kiếm của bạn, các chỗ nghỉ dưới đây đang có giá phòng
              và tình trạng phòng trống thực tế theo thời gian thực.
            </span>
          </div>
        </div>

        {/* HEADER TÌM KIẾM */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            className="text-xs font-bold border-gray-300 self-start md:self-auto cursor-pointer"
            onClick={() => navigate("/")}
          >
            Đổi tìm kiếm
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR BỘ LỌC CHUẨN GIAO DIỆN BOOKING.COM */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-6 sticky top-20">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="font-extrabold text-base text-gray-900 flex items-center gap-1.5">
                <SlidersHorizontal size={16} /> Chọn lọc theo:
              </h2>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs text-[#006ce4] hover:underline font-bold cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>

            {/* Ô tìm nhanh tên khách sạn */}
            <div>
              <input
                type="text"
                placeholder="Tìm theo tên chỗ nghỉ..."
                value={searchHotelName}
                onChange={(e) => setSearchHotelName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:border-[#006ce4] focus:outline-none placeholder:text-gray-400 font-medium"
              />
            </div>

            {/* BỘ LỌC 1: NGÂN SÁCH CỦA BẠN (MỖI ĐÊM) VỚI DẢI MIN-MAX THỰC TẾ */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Ngân sách của bạn (mỗi đêm)
              </h3>

              <div className="text-xs font-black text-slate-800">
                {formatVND(userPriceRange[0])} – {formatVND(userPriceRange[1])}
              </div>

              {/* Biểu đồ phân bổ giá mô phỏng Booking.com */}
              <div className="flex items-end gap-1 h-9 px-1 pt-2">
                {[20, 45, 80, 60, 100, 75, 40, 90, 50, 30, 15].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-slate-200 rounded-t-xs"
                  />
                ))}
              </div>

              {/* Thanh kéo dải giá */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={50000}
                  value={userPriceRange[1]}
                  onChange={(e) =>
                    setUserPriceRange([
                      userPriceRange[0],
                      Number(e.target.value),
                    ])
                  }
                  className="w-full accent-[#006ce4] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>{formatVND(priceBounds.min)}</span>
                  <span>{formatVND(priceBounds.max)}</span>
                </div>
              </div>
            </div>

            {/* BỘ LỌC 2: ĐIỂM ĐÁNH GIÁ CỦA KHÁCH (1 - 10 ĐIỂM) KÈM SỐ LƯỢNG */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Điểm đánh giá của khách
              </h3>
              <div className="space-y-2">
                {[
                  { score: 9, label: "Xuất sắc: 9 điểm trở lên" },
                  { score: 8, label: "Rất tốt: 8 điểm trở lên" },
                  { score: 7, label: "Tốt: 7 điểm trở lên" },
                  { score: 6, label: "Dễ chịu: 6 điểm trở lên" },
                ].map((item) => {
                  const count = filterCounts.ratings[item.score] || 0;
                  const isChecked = selectedRating === item.score;

                  return (
                    <label
                      key={item.score}
                      className="flex items-center justify-between text-xs text-gray-700 cursor-pointer group hover:text-[#006ce4]"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleRatingToggle(item.score)}
                          className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                        />
                        <span
                          className={
                            isChecked ? "font-bold text-[#006ce4]" : ""
                          }
                        >
                          {item.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium group-hover:text-gray-600">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* BỘ LỌC 3: HẠNG SAO KÈM SỐ LƯỢNG */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Hạng sao khách sạn
              </h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = filterCounts.stars[star] || 0;
                  const isChecked = selectedStars.includes(star);

                  return (
                    <label
                      key={star}
                      className="flex items-center justify-between text-xs text-gray-700 cursor-pointer group hover:text-[#006ce4]"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleStarToggle(star)}
                          className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                        />
                        <span className="flex items-center gap-1">
                          <span>{star} sao</span>
                          <span className="text-amber-400">★</span>
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium group-hover:text-gray-600">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* MAIN LIST DANH SÁCH KHÁCH SẠN */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-4">
            <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-bold text-gray-600">
                Tìm thấy{" "}
                <span className="text-[#006ce4] font-black">
                  {sortedHotels.length}
                </span>{" "}
                chỗ nghỉ phù hợp
              </span>

              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">
                  Sắp xếp theo:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => updateUrlParams({ sortBy: e.target.value })}
                  className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                  <option value="rating">Điểm đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <LoadingSpinner size="lg" label="Đang tìm kiếm chỗ nghỉ..." />
              </div>
            ) : sortedHotels.length > 0 ? (
              <div className="space-y-4">
                {sortedHotels.map((hotel) => {
                  const id = hotel.id;
                  const isFav = Boolean(favorites[id]);
                  const score = Number(hotel.rating || 0);

                  const getRatingLabel = (pt) => {
                    if (pt >= 9.0) return "Xuất sắc";
                    if (pt >= 8.0) return "Rất tốt";
                    if (pt >= 7.0) return "Tốt";
                    if (pt >= 6.0) return "Dễ chịu";
                    return "Điểm đánh giá";
                  };

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
                      {/* ẢNH ĐẠI DIỆN */}
                      <div className="relative w-full md:w-64 h-52 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={hotel.image}
                          alt={hotel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, hotel)}
                          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                            isFav
                              ? "bg-white text-rose-500"
                              : "bg-black/30 text-white hover:bg-white hover:text-rose-500"
                          }`}
                        >
                          <Heart
                            size={18}
                            fill={isFav ? "currentColor" : "none"}
                          />
                        </button>
                      </div>

                      {/* THÔNG TIN CHI TIẾT */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-[#006ce4] transition-colors leading-snug">
                              {hotel.title}
                            </h3>
                            {hotel.stars > 0 && (
                              <div className="flex text-amber-400">
                                {[...Array(hotel.stars)].map((_, i) => (
                                  <Star key={i} size={13} fill="currentColor" />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Vị trí & Khoảng cách */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <MapPin
                                size={13}
                                className="text-[#006ce4] shrink-0"
                              />
                              <span className="line-clamp-1">
                                {hotel.location}
                              </span>
                            </div>
                            {hotel.distance_to_center !== undefined &&
                              hotel.distance_to_center !== null && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-600 font-semibold flex items-center gap-1">
                                    <Navigation
                                      size={11}
                                      className="text-amber-600"
                                    />{" "}
                                    Cách trung tâm {hotel.distance_to_center} km
                                  </span>
                                </>
                              )}
                          </div>

                          {/* Huy hiệu giáp biển */}
                          {hotel.is_beachfront && (
                            <div className="pt-1">
                              <span className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                <Waves
                                  size={13}
                                  className="text-cyan-600 shrink-0 stroke-[2.5]"
                                />
                                Giáp biển
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pt-1">
                            {hotel.description ||
                              "Chỗ nghỉ sở hữu không gian thoáng đãng, tiện nghi hiện đại và dịch vụ tận tâm."}
                          </p>
                        </div>

                        {/* PHẦN GIÁ VÀ ĐIỂM ĐÁNH GIÁ CHUẨN BOOKING.COM */}
                        <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-3">
                          {/* Điểm đánh giá bên trái */}
                          <div className="flex items-center gap-2">
                            <div className="bg-[#003580] text-white font-black text-sm w-9 h-9 rounded-lg flex items-center justify-center shadow-xs">
                              {score > 0 ? score.toFixed(1) : "---"}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 leading-none">
                                {getRatingLabel(score)}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {hotel.review_count > 0
                                  ? `${hotel.review_count} đánh giá`
                                  : "Chưa có đánh giá"}
                              </p>
                            </div>
                          </div>

                          {/* Giá phòng bên phải */}
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              Giá mỗi đêm từ
                            </p>
                            <p className="text-xl font-black text-[#003580]">
                              {formatVND(hotel.salePrice)}
                            </p>
                            <p className="text-[10px] text-gray-400 italic">
                              Đã gồm thuế & phí
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/hotel/${id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`,
                                )
                              }
                              className="mt-2 px-4 py-1.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              Xem chỗ trống &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Không tìm thấy chỗ nghỉ nào phù hợp"
                description="Hãy thử xóa bớt bộ lọc hoặc chọn mức ngân sách rộng hơn."
                actionLabel="Xóa tất cả bộ lọc"
                onAction={handleResetAllFilters}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
