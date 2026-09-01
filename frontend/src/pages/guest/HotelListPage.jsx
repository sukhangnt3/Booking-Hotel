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
  SlidersHorizontal,
  Building2,
  Sparkles,
} from "lucide-react";

// Components
import { Button, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, EmptyState, Breadcrumb } from "@/components/common";

// Services & Stores
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const parseImageUrl = (img) => {
  if (!img)
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
  let raw =
    typeof img === "string" ? img : img.url || img.path || img.preview || "";
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

// Chuẩn hóa tiếng Việt bỏ dấu
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

const HotelListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // ─── 1. QUERY PARAMS TỪ URL ───
  const destination =
    searchParams.get("destination") || searchParams.get("search") || "";
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
  const [selectedBudgets, setSelectedBudgets] = useState([]);
  const [selectedStars, setSelectedStars] = useState(initialStars);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // States mở rộng "Xem thêm"
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 3. FETCH HOTELS THẬT & LỌC BỎ CÁC CƠ SỞ ĐÃ BỊ XOÁ
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isMounted = true;

    const fetchHotelsAndFavorites = async () => {
      setLoading(true);
      try {
        let apiHotels = [];
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
          apiHotels = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        } catch (e) {
          console.error("Lỗi API hotels:", e);
        }

        // Danh sách ID các khách sạn đã xoá (nếu có lưu từ trang Admin)
        const deletedHotelIds = JSON.parse(
          localStorage.getItem("deleted_hotel_ids") || "[]",
        ).map(String);

        // Tải các khách sạn được duyệt qua LocalStorage (dành cho môi trường mock)
        const localApps = JSON.parse(
          localStorage.getItem("pending_partner_applications") || "[]",
        );
        const approvedHotelIds = JSON.parse(
          localStorage.getItem("approved_hotel_ids") || "[]",
        ).map(String);
        const approvedEmails = JSON.parse(
          localStorage.getItem("approved_owner_emails") || "[]",
        );

        const approvedLocalHotels = localApps.filter((h) => {
          const id = String(h.id || h.applicationId || h.hotel_id);
          const email = String(h.emailContact || h.email || "")
            .toLowerCase()
            .trim();

          // Loại bỏ cơ sở đã bị đánh dấu xoá
          if (
            deletedHotelIds.includes(id) ||
            h.isDeleted ||
            h.is_deleted ||
            h.status === "deleted"
          ) {
            return false;
          }

          return (
            approvedHotelIds.includes(id) ||
            approvedEmails.includes(email) ||
            h.status === "approved"
          );
        });

        // Gộp dữ liệu và loại trừ toàn bộ cơ sở đã xoá
        const combined = [...approvedLocalHotels, ...apiHotels].filter((h) => {
          const id = String(h.id || h.hotel_id || h.applicationId || "");
          const isDeleted =
            deletedHotelIds.includes(id) ||
            Boolean(h.is_deleted || h.isDeleted || h.deletedAt) ||
            h.status === "deleted" ||
            h.status === "inactive";
          return !isDeleted;
        });

        const uniqueMap = new Map();

        combined.forEach((h) => {
          const hotelId = String(
            h.id || h.hotel_id || h.applicationId || h.name,
          );
          if (!uniqueMap.has(hotelId)) {
            const rawImg =
              h.image ||
              h.hotelImages?.[0]?.url ||
              h.hotelImages?.[0]?.preview ||
              h.hotelImages?.[0] ||
              "";
            const price =
              h.rooms?.[0]?.weekdayPrice ||
              h.min_price ||
              h.base_price ||
              h.price ||
              h.salePrice ||
              650000;

            uniqueMap.set(hotelId, {
              ...h,
              id: hotelId,
              title: h.hotelNameVi || h.name || "Khách sạn nghỉ dưỡng",
              name: h.hotelNameVi || h.name || "Khách sạn nghỉ dưỡng",
              city: h.province || h.city || "Hồ Chí Minh",
              address: h.streetAddress || h.address || "Việt Nam",
              location: h.streetAddress
                ? `${h.streetAddress}, ${h.province || h.city}`
                : h.address || h.city || "Việt Nam",
              image: parseImageUrl(rawImg),
              salePrice: Number(price),
              min_price: Number(price),
              price: Number(price),
              star_rating: Number(h.starRating || h.star_rating || 5),
              stars: Number(h.starRating || h.star_rating || 5),
              type: h.hotelType || h.type || "Khách sạn",
              rating: h.rating || 9.4,
              review_count: h.review_count || 0,
              reviewsCount: h.review_count || 0,
            });
          }
        });

        const list = Array.from(uniqueMap.values());

        // Lấy danh sách yêu thích
        let favList = [];
        try {
          if (isAuthenticated && hotelService?.getFavoriteHotels) {
            const favRes = await hotelService.getFavoriteHotels();
            favList = Array.isArray(favRes) ? favRes : favRes?.data || [];
          }
        } catch (e) {}

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
  }, [destination, checkIn, checkOut, adults, sortBy, isAuthenticated]);

  // ─── 4. CẬP NHẬT FILTER LÊN URL ───
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

  const handleBudgetToggle = (key) => {
    setSelectedBudgets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  const handleResetAllFilters = () => {
    setSearchHotelName("");
    setSelectedBudgets([]);
    setSelectedStars([]);
    setSelectedTypes([]);
    setSelectedAmenities([]);
    updateUrlParams({ stars: "", destination: "" });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🎯 5. BỘ LỌC TÌM KIẾM THÔNG MINH
  // ════════════════════════════════════════════════════════════════════════════
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const price = Number(
        hotel.salePrice || hotel.price || hotel.min_price || 0,
      );
      const star = Number(hotel.stars || hotel.star_rating || 0);

      // 1. Tìm kiếm theo địa điểm hoặc từ khóa URL
      if (destination.trim()) {
        const destKey = removeVietnameseTones(destination);
        const nameKey = removeVietnameseTones(hotel.name || hotel.title);
        const cityKey = removeVietnameseTones(hotel.city || hotel.province);
        const addrKey = removeVietnameseTones(hotel.address || hotel.location);

        const matchDest =
          nameKey.includes(destKey) ||
          cityKey.includes(destKey) ||
          addrKey.includes(destKey) ||
          destKey.includes(cityKey);

        if (!matchDest) return false;
      }

      // 2. Lọc theo ô tìm tên khách sạn trên sidebar
      if (searchHotelName.trim()) {
        const nameSearchKey = removeVietnameseTones(searchHotelName);
        const nameKey = removeVietnameseTones(hotel.name || hotel.title);
        if (!nameKey.includes(nameSearchKey)) return false;
      }

      // 3. Lọc theo ngân sách
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

      // 4. Lọc theo sao
      if (selectedStars.length > 0 && !selectedStars.includes(star)) {
        return false;
      }

      // 5. Lọc theo loại hình
      if (selectedTypes.length > 0) {
        const hotelTypeStr = removeVietnameseTones(
          hotel.type || hotel.hotelType || "",
        );
        const matchType = selectedTypes.some((t) =>
          hotelTypeStr.includes(removeVietnameseTones(t)),
        );
        if (!matchType) return false;
      }

      return true;
    });
  }, [
    hotels,
    destination,
    searchHotelName,
    selectedBudgets,
    selectedStars,
    selectedTypes,
  ]);

  // Sắp xếp
  const sortedHotels = useMemo(() => {
    const list = [...filteredHotels];
    if (sortBy === "price_asc")
      list.sort((a, b) => (a.salePrice || 0) - (b.salePrice || 0));
    else if (sortBy === "price_desc")
      list.sort((a, b) => (b.salePrice || 0) - (a.salePrice || 0));
    else if (sortBy === "rating")
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return list;
  }, [filteredHotels, sortBy]);

  // Toggle Yêu thích
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
        if (hotelService?.addFavorite) await hotelService.addFavorite(hotelId);
      } else {
        if (hotelService?.removeFavorite)
          await hotelService.removeFavorite(hotelId);
      }
    } catch {
      setFavorites((prev) => ({ ...prev, [hotelId]: previous }));
    }
  };

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Khách sạn", link: "/hotels" },
    { label: destination ? `Chỗ nghỉ tại ${destination}` : "Tất cả chỗ nghỉ" },
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
            className="text-xs font-bold border-gray-300 self-start md:self-auto cursor-pointer"
            onClick={() => navigate("/")}
          >
            Đổi tìm kiếm
          </Button>
        </div>

        {/* ─── MAIN LAYOUT: SIDEBAR FILTER + HOTEL LIST ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 👈 ─── SIDEBAR FILTER ─── */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-5 sticky top-20">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-gray-900">Bộ lọc</h2>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs text-[#006ce4] hover:underline font-semibold cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>

            {/* Ô tìm tên khách sạn */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Tìm tên khách sạn..."
                value={searchHotelName}
                onChange={(e) => setSearchHotelName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#006ce4] focus:outline-none placeholder:text-gray-400 font-medium"
              />
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
                  { key: "under_1m", label: "Dưới 1 triệu" },
                  { key: "1m_2m", label: "1 - 2 triệu" },
                  { key: "2m_3m", label: "2 - 3 triệu" },
                  { key: "above_3m", label: "Trên 3 triệu" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4]"
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
                  </label>
                ))}
              </div>
            </div>

            {/* 2. HẠNG SAO */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Hạng sao</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <label
                    key={star}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4]"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedStars.includes(star)}
                        onChange={() => handleStarToggle(star)}
                        className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-0 cursor-pointer"
                      />
                      <span>{star} sao ⭐</span>
                    </div>
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
                  { key: "Khách sạn", label: "Khách sạn (Hotel)" },
                  { key: "Khu nghỉ dưỡng", label: "Khu nghỉ dưỡng (Resort)" },
                  { key: "Biệt thự", label: "Biệt thự (Villa)" },
                  { key: "Homestay", label: "Homestay / Căn hộ" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4]"
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
                  </label>
                ))}
              </div>
            </div>

            {/* 4. TIỆN ÍCH */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Tiện ích</h3>
              <div className="space-y-2">
                {[
                  { key: "wifi", label: "Wi-Fi miễn phí" },
                  { key: "parking", label: "Bãi đỗ xe ô tô" },
                  { key: "pool", label: "Hồ bơi ngoài trời" },
                  { key: "breakfast", label: "Bao gồm ăn sáng" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-[#006ce4]"
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
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* 👉 ─── DANH SÁCH KHÁCH SẠN THẬT (9 COLS) ─── */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* THANH SẮP XẾP */}
            <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-bold text-gray-600">
                Tìm thấy{" "}
                <span className="text-[#006ce4] font-black">
                  {sortedHotels.length}
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

            {/* DANH SÁCH THẺ KHÁCH SẠN */}
            {loading ? (
              <div className="py-20 flex justify-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <LoadingSpinner
                  size="lg"
                  label="Đang tìm kiếm chỗ nghỉ tốt nhất..."
                />
              </div>
            ) : sortedHotels.length > 0 ? (
              <div className="space-y-4">
                {sortedHotels.map((hotel) => {
                  const id = String(hotel.id || hotel.hotel_id);
                  const image = hotel.image;
                  const title = hotel.title || hotel.name || "Khách sạn";
                  const location =
                    hotel.location || hotel.address || "Việt Nam";
                  const rating = Number(hotel.rating || 9.4).toFixed(1);
                  const reviewsCount = Number(hotel.review_count || 0);
                  const stars = Number(hotel.stars || hotel.star_rating || 5);
                  const salePrice = Number(
                    hotel.salePrice || hotel.min_price || hotel.price || 0,
                  );

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
                      {/* ẢNH KHÁCH SẠN KHÓA CỨNG KÍCH THƯỚC */}
                      <div className="relative w-full md:w-64 h-52 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
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
                      </div>

                      {/* THÔNG TIN CHÍNH */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
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
                              "Chỗ nghỉ sở hữu không gian thoáng đãng, tiện nghi hiện đại và dịch vụ chu đáo."}
                          </p>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              ✓ Miễn phí hủy phòng
                            </span>
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              ✓ Xác nhận tức thì
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
                                {Number(rating) >= 9 ? "Xuất sắc" : "Rất tốt"}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {reviewsCount > 0
                                  ? `${reviewsCount} đánh giá`
                                  : "Chỗ nghỉ mới"}
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
                title={`Không tìm thấy chỗ nghỉ nào phù hợp`}
                description="Hãy thử xóa bớt bộ lọc hoặc tìm kiếm theo tên thành phố khác."
                actionLabel="Xóa tất cả bộ lọc"
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
