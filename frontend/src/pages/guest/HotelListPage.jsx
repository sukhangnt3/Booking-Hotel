import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import hotelService from "../../services/hotelService";
import { LoadingSpinner, EmptyState } from "../../components/common";

const HotelListPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ==========================================
  // 1. HOTEL STATES
  // ==========================================
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // 2. FAVORITE STATES
  // ==========================================
  const [favorites, setFavorites] = useState({});
  const [favoriteLoading, setFavoriteLoading] = useState({});

  // ==========================================
  // 3. SEARCH PARAMS
  // ==========================================
  const destination = searchParams.get("destination") || "";

  const checkIn = searchParams.get("checkIn") || "";

  const checkOut = searchParams.get("checkOut") || "";

  const adults = searchParams.get("adults") || "2";

  // ==========================================
  // 4. FILTER STATES
  // ==========================================
  const [priceRange, setPriceRange] = useState(
    Number(searchParams.get("maxPrice")) || 10000000,
  );

  const [selectedStars, setSelectedStars] = useState(
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [],
  );

  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "popular");

  // ==========================================
  // 5. ĐỌC FAVORITES TỪ LOCAL STORAGE
  // ==========================================
  const getLocalFavorites = () => {
    try {
      const stored = localStorage.getItem("user_favorites");

      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Lỗi đọc user_favorites:", error);

      return [];
    }
  };

  // ==========================================
  // 6. KIỂM TRA HOTEL CÓ FAVORITE KHÔNG
  // ==========================================
  const checkLocalFavorite = (hotelId) => {
    const favList = getLocalFavorites();

    return favList.some((item) => String(item.id) === String(hotelId));
  };

  // ==========================================
  // 7. LOAD HOTEL LIST
  // ==========================================
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

        const hotelList = Array.isArray(data) ? data : data?.hotels || [];

        setHotels(hotelList);

        // ======================================
        // ĐỒNG BỘ TRẠNG THÁI FAVORITE
        // ======================================

        const localFavorites = getLocalFavorites();

        const newFavorites = {};

        hotelList.forEach((hotel) => {
          const hotelId = hotel.id || hotel.hotel_id;

          // ------------------------------
          // BACKEND CÓ is_favorite
          // ------------------------------
          if (typeof hotel.is_favorite === "boolean") {
            newFavorites[hotelId] = hotel.is_favorite;

            return;
          }

          // ------------------------------
          // BACKEND CÓ isFavorite
          // ------------------------------
          if (typeof hotel.isFavorite === "boolean") {
            newFavorites[hotelId] = hotel.isFavorite;

            return;
          }

          // ------------------------------
          // FALLBACK LOCAL STORAGE
          // ------------------------------
          newFavorites[hotelId] = localFavorites.some(
            (item) => String(item.id) === String(hotelId),
          );
        });

        setFavorites(newFavorites);
      } catch (error) {
        console.error("Lỗi tải danh sách khách sạn:", error);
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

  // ==========================================
  // 8. STAR FILTER
  // ==========================================
  const handleStarChange = (star) => {
    setSelectedStars((prev) => {
      if (prev.includes(star)) {
        return prev.filter((item) => item !== star);
      }

      return [...prev, star];
    });
  };

  // ==========================================
  // 9. UPDATE LOCAL STORAGE
  // ==========================================
  const updateLocalFavorite = (hotel, shouldFavorite) => {
    try {
      let favList = getLocalFavorites();

      const hotelId = hotel.id || hotel.hotel_id;

      // ======================================
      // THÊM VÀO YÊU THÍCH
      // ======================================
      if (shouldFavorite) {
        const favoriteItem = {
          id: hotelId,

          name: hotel.name || hotel.title || "Khách sạn",

          address: hotel.address || hotel.location || "",

          city: hotel.city || "",

          rating:
            hotel.average_rating || hotel.rating || hotel.star_rating || 0,

          image:
            hotel.image ||
            hotel.imageUrl ||
            hotel.avatar ||
            hotel.images?.[0]?.path ||
            hotel.images?.[0] ||
            "https://via.placeholder.com/300",
        };

        // Xóa bản cũ trước
        favList = favList.filter((item) => String(item.id) !== String(hotelId));

        // Thêm bản mới
        favList.push(favoriteItem);
      }

      // ======================================
      // XÓA KHỎI YÊU THÍCH
      // ======================================
      else {
        favList = favList.filter((item) => String(item.id) !== String(hotelId));
      }

      localStorage.setItem("user_favorites", JSON.stringify(favList));

      console.log("user_favorites:", favList);
    } catch (error) {
      console.error("Lỗi cập nhật LocalStorage:", error);
    }
  };

  // ==========================================
  // 10. TOGGLE FAVORITE
  // ==========================================
  const toggleFavorite = async (e, hotel) => {
    e.preventDefault();
    e.stopPropagation();

    const hotelId = hotel.id || hotel.hotel_id;

    // Không cho spam click
    if (favoriteLoading[hotelId]) {
      return;
    }

    // Trạng thái hiện tại
    const currentFavorite = Boolean(favorites[hotelId]);

    // Trạng thái muốn chuyển sang
    const nextFavorite = !currentFavorite;

    console.log("Favorite:", hotelId, currentFavorite, "=>", nextFavorite);

    // ======================================
    // KHÓA BUTTON
    // ======================================
    setFavoriteLoading((prev) => ({
      ...prev,
      [hotelId]: true,
    }));

    try {
      // ====================================
      // CHƯA YÊU THÍCH
      // => GỌI POST
      // ====================================
      if (nextFavorite) {
        console.log("Đang thêm favorite:", hotelId);

        await hotelService.addFavorite(hotelId);

        console.log("Thêm favorite thành công");

        // ----------------------------------
        // API THÀNH CÔNG
        // MỚI CHO TIM SÁNG
        // ----------------------------------
        setFavorites((prev) => ({
          ...prev,
          [hotelId]: true,
        }));

        // ----------------------------------
        // LƯU LOCAL
        // ----------------------------------
        updateLocalFavorite(hotel, true);
      }

      // ====================================
      // ĐANG YÊU THÍCH
      // => GỌI DELETE
      // ====================================
      else {
        console.log("Đang xóa favorite:", hotelId);

        await hotelService.removeFavorite(hotelId);

        console.log("Xóa favorite thành công");

        // ----------------------------------
        // API THÀNH CÔNG
        // MỚI CHO TIM TẮT
        // ----------------------------------
        setFavorites((prev) => ({
          ...prev,
          [hotelId]: false,
        }));

        // ----------------------------------
        // XÓA LOCAL
        // ----------------------------------
        updateLocalFavorite(hotel, false);
      }
    } catch (error) {
      console.error("Lỗi cập nhật favorite:", error);

      /*
       * QUAN TRỌNG:
       *
       * API lỗi thì KHÔNG đổi trạng thái.
       *
       * Nếu đang 🤍 -> vẫn 🤍
       *
       * Nếu đang ❤️ -> vẫn ❤️
       */
      setFavorites((prev) => ({
        ...prev,
        [hotelId]: currentFavorite,
      }));
    } finally {
      // Mở khóa button
      setFavoriteLoading((prev) => ({
        ...prev,
        [hotelId]: false,
      }));
    }
  };

  // ==========================================
  // 11. ĐI ĐẾN HOTEL DETAIL
  // ==========================================
  const handleGoToDetail = (hotelId) => {
    navigate(
      `/hotel/${hotelId}?checkIn=${encodeURIComponent(
        checkIn,
      )}&checkOut=${encodeURIComponent(checkOut)}&adults=${encodeURIComponent(
        adults,
      )}`,
    );
  };

  // ==========================================
  // 12. LOADING
  // ==========================================
  if (loading) {
    return <LoadingSpinner />;
  }

  // ==========================================
  // 13. RENDER
  // ==========================================
  return (
    <div className="bg-gray-50 min-h-screen pb-12 font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-6 text-gray-800">
        {/* ======================================
            HEADER
        ====================================== */}
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

        {/* ======================================
            MAIN GRID
        ====================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* ====================================
              SIDEBAR
          ==================================== */}
          <div className="md:col-span-4 lg:col-span-3 space-y-5 bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold border-b pb-3 uppercase tracking-tight">
              Bộ lọc tìm kiếm
            </h2>

            {/* PRICE */}
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

            {/* STARS */}
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

          {/* ====================================
              HOTEL LIST
          ==================================== */}
          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            {/* SORT */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold">
                Tìm thấy <span className="text-[#006ce4]">{hotels.length}</span>{" "}
                chỗ nghỉ
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

            {/* ==================================
                HOTEL ITEMS
            ================================== */}
            {hotels.length > 0 ? (
              hotels.map((hotel) => {
                const id = hotel.id || hotel.hotel_id;

                const image =
                  hotel.image ||
                  hotel.imageUrl ||
                  hotel.avatar ||
                  hotel.images?.[0]?.path ||
                  hotel.images?.[0] ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";

                const title = hotel.title || hotel.name || "Khách sạn";

                const location =
                  hotel.location || hotel.address || destination || "Địa điểm";

                const rating = Number(
                  hotel.rating ||
                    hotel.average_rating ||
                    hotel.star_rating ||
                    8,
                )
                  .toFixed(1)
                  .replace(".", ",");

                const ratingText =
                  hotel.ratingText ||
                  (Number(hotel.rating || hotel.average_rating || 8) >= 8
                    ? "Rất tốt"
                    : "Tốt");

                const reviewsCount = Number(
                  hotel.reviewsCount || hotel.review_count || 0,
                ).toLocaleString("vi-VN");

                const stars = Number(hotel.stars || hotel.star_rating || 4);

                const originalPrice = hotel.originalPrice
                  ? Number(hotel.originalPrice).toLocaleString("vi-VN")
                  : null;

                const salePrice = Number(
                  hotel.salePrice || hotel.price || hotel.base_price || 0,
                ).toLocaleString("vi-VN");

                // =================================
                // FAVORITE
                // =================================
                const isFav = Boolean(favorites[id]);

                const isFavLoading = Boolean(favoriteLoading[id]);

                return (
                  <div
                    key={id}
                    onClick={() => handleGoToDetail(id)}
                    className="bg-[#f0f6ff] border border-[#b4d4ff] rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:shadow-md transition-all cursor-pointer group w-full"
                  >
                    {/* =========================
                        IMAGE
                    ========================= */}
                    <div className="relative w-full md:w-60 h-48 shrink-0 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
                        }}
                      />

                      {/* =======================
                          FAVORITE
                      ======================= */}
                      <button
                        type="button"
                        disabled={isFavLoading}
                        onClick={(e) => toggleFavorite(e, hotel)}
                        className={`
                          absolute
                          top-2.5
                          right-2.5
                          z-20
                          w-10
                          h-10
                          rounded-full
                          flex
                          items-center
                          justify-center
                          shadow-md
                          transition-all
                          duration-200
                          ${
                            isFav
                              ? "bg-white scale-110"
                              : "bg-white/95 hover:bg-white"
                          }
                          ${
                            isFavLoading
                              ? "opacity-60 cursor-wait"
                              : "cursor-pointer"
                          }
                        `}
                        title={isFav ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
                      >
                        <svg
                          className={`
                            w-6
                            h-6
                            transition-all
                            duration-200
                            ${
                              isFav
                                ? "text-red-500 fill-red-500"
                                : "text-gray-500 fill-none"
                            }
                          `}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* =========================
                        HOTEL INFO
                    ========================= */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <h3 className="font-bold text-lg md:text-xl text-[#006ce4] group-hover:underline leading-snug">
                            {title}
                          </h3>

                          <div className="flex items-center gap-1 mt-1 shrink-0">
                            <div className="flex text-amber-400 text-xs">
                              {Array.from({
                                length: stars,
                              }).map((_, index) => (
                                <span key={index}>★</span>
                              ))}
                            </div>

                            <span className="bg-[#ffb700] text-white font-bold text-[10px] px-1 py-0.5 rounded ml-1">
                              👍+
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-700 mt-2 flex flex-wrap items-center gap-1 font-medium">
                          <span className="text-[#006ce4] font-semibold">
                            {location}
                          </span>

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
                          {hotel.description ||
                            `Chỗ nghỉ tuyệt vời tại ${location}, cung cấp đầy đủ tiện nghi hiện đại cho chuyến đi của bạn.`}
                        </p>
                      </div>
                    </div>

                    {/* =========================
                        RATING + PRICE
                    ========================= */}
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

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();

                            handleGoToDetail(id);
                          }}
                          className="bg-[#006ce4] hover:bg-[#0057b8] text-white font-semibold text-sm px-4 py-2.5 rounded-md transition-colors w-full mt-1"
                        >
                          {Number(
                            hotel.salePrice ||
                              hotel.price ||
                              hotel.base_price ||
                              0,
                          ) > 0
                            ? `VND ${salePrice}`
                            : "Xem phòng"}
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
