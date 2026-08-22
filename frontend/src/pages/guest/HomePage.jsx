import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp,ChevronRight, ChevronLeft, Flame } from "lucide-react";

// UI Components
import { Card, Badge, Button } from "@/components/ui";
import { HotelCard, HotelFilter } from "@/components/hotel";

// Services & Helpers
import { hotelService } from "@/services";

const toSafeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.favorites)) return data.favorites;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

const HomePage = () => {
  const navigate = useNavigate();

  // ─── 1. GOM NHÓM STATES ───
  const [pageData, setPageData] = useState({
    propertyTypes: [],
    trendingDestinations: [],
    discoverVietnam: [],
    uniqueStays: [],
  });
  const [favoriteHotelIds, setFavoriteHotelIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // ─── 2. GỌI API KHI MOUNT ───
  useEffect(() => {
    let isMounted = true;

    const fetchHomePageData = async () => {
      setLoading(true);
      try {
        const [
          typesData,
          trendingData,
          discoverData,
          staysData,
          myFavoritesData,
        ] = await Promise.all([
          hotelService.getPropertyTypes(),
          hotelService.getTrendingDestinations(),
          hotelService.getDiscoverVietnam(),
          hotelService.getUniqueStays(),
          hotelService.getFavoriteHotels(),
        ]);

        if (!isMounted) return;

        // Lưu ID đã yêu thích vào Set
        const favList = toSafeArray(myFavoritesData);
        const favIdsSet = new Set(
          favList.map((item) => String(item.id || item.hotel_id)),
        );
        setFavoriteHotelIds(favIdsSet);

        // Lưu toàn bộ data vào 1 lần setState
        setPageData({
          propertyTypes: toSafeArray(typesData),
          trendingDestinations: toSafeArray(trendingData),
          discoverVietnam: toSafeArray(discoverData),
          uniqueStays: toSafeArray(staysData),
        });
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Trang chủ:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHomePageData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── 3. ĐIỀU HƯỚNG TÌM KIẾM ───
  const handleSearch = (searchData) => {
    const query = new URLSearchParams();
    if (searchData?.destination)
      query.append("destination", searchData.destination);
    if (searchData?.checkIn) query.append("checkIn", searchData.checkIn);
    if (searchData?.checkOut) query.append("checkOut", searchData.checkOut);
    if (searchData?.adults) query.append("adults", searchData.adults);
    if (searchData?.children) query.append("children", searchData.children);
    if (searchData?.rooms) query.append("rooms", searchData.rooms);

    navigate(`/hotels?${query.toString()}`);
  };

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans">
      {/* ─── HERO BANNER ─── */}
      <div className="bg-[#003580] pt-10 pb-24 px-4 text-white rounded-2xl overflow-hidden relative">
        <div className="max-w-7xl mx-auto space-y-3">
          <Badge
            variant="primary"
            className="bg-blue-800/80 text-blue-200 border-none"
          >
            Ưu đãi du lịch 2026
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Tìm chỗ nghỉ tiếp theo
          </h1>
          <p className="text-base md:text-xl text-blue-100/90 font-normal max-w-2xl">
            Khám phá khách sạn sang trọng, homestay ấm cúng và những khu nghỉ
            dưỡng tuyệt vời tại Việt Nam.
          </p>
        </div>
      </div>

      {/* ─── BỘ LỌC TÌM KIẾM CHÍNH ─── */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-30">
        <HotelFilter onSearch={handleSearch} />
      </div>

      {/* ─── PROMOTION BANNER NỔI BẬT ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-12">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={20} />
              <span className="text-xs uppercase tracking-widest font-black text-yellow-400">
                Khuyến Mãi Đặc Biệt
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold">
              Giảm đến 30% cho kỳ nghỉ hè sớm!
            </h3>
            <p className="text-sm text-gray-300 max-w-xl">
              Áp dụng cho các điểm đến hàng đầu như Đà Nẵng, Nha Trang, Phú Quốc
              khi đặt trước 30 ngày.
            </p>
          </div>
          <Button
            className="bg-[#ffb700] hover:bg-[#e0a200] text-gray-900 font-extrabold px-8 h-12 shrink-0 z-10 border-none shadow-lg rounded-2xl"
            onClick={() => handleSearch({ destination: "Đà Nẵng" })}
          >
            Khám phá ưu đãi
          </Button>
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
        </div>
      </section>

      {/* ─── SECTION 1: ĐIỂM ĐẾN ĐANG THỊNH HÀNH ─── */}
<section className="max-w-7xl mx-auto px-4 mt-16">
  <div className="mb-6 flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <TrendingUp className="text-rose-500" size={24} />
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Điểm đến đang thịnh hành
        </h2>
      </div>
      <p className="text-gray-500 text-sm mt-1">
        Các lựa chọn phổ biến nhất cho du khách từ Việt Nam
      </p>
    </div>
  </div>

  {loading ? (
    <div className="space-y-4">
      {/* Skeleton hàng trên: 2 cột */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-64 bg-gray-200 animate-pulse rounded-2xl"
          />
        ))}
      </div>
      {/* Skeleton hàng dưới: 3 cột */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-60 bg-gray-200 animate-pulse rounded-2xl"
          />
        ))}
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      {/* HÀNG TRÊN: 2 CARD ĐẦU TIÊN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pageData.trendingDestinations.slice(0, 2).map((place) => (
          <div
            key={place.id || place.name}
            onClick={() =>
              handleSearch({ destination: place.title || place.name })
            }
            className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md h-64 md:h-72"
          >
            <img
              src={place.image}
              alt={place.name}
              className="w-full h-full object-cover "
            />
            {/* Lớp phủ gradient màu tối phía trên để chữ trắng nổi bật */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-28 pointer-events-none" />
            
            {/* Tiêu đề góc trên bên trái */}
            <div className="absolute top-4 left-4 text-white flex items-center gap-2 drop-shadow-md">
              <h3 className="text-xl md:text-2xl font-bold tracking-wide">
                {place.title || place.name}
              </h3>
              <span className="text-lg">
                {place.countryCode === "TH" ? "🇹🇭" : "🇻🇳"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* HÀNG DƯỚI: 3 CARD TIẾP THEO */}
      {pageData.trendingDestinations.length > 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pageData.trendingDestinations.slice(2, 5).map((place) => (
            <div
              key={place.id || place.name}
              onClick={() =>
                handleSearch({ destination: place.title || place.name })
              }
              className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md h-56 md:h-64"
            >
              <img
                src={place.image}
                alt={place.name}
                className="w-full h-full object-cover "
              />
              {/* Lớp phủ gradient màu tối phía trên */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-28 pointer-events-none" />
              
              {/* Tiêu đề góc trên bên trái */}
              <div className="absolute top-4 left-4 text-white flex items-center gap-2 drop-shadow-md">
                <h3 className="text-lg md:text-xl font-bold tracking-wide">
                  {place.title || place.name}
                </h3>
                <span className="text-base">
                  {place.countryCode === "TH" ? "🇹🇭" : "🇻🇳"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
</section>

      {/* ─── SECTION 2: KHÁM PHÁ VIỆT NAM ─── */}
<section className="max-w-7xl mx-auto px-4 mt-16">
  {/* Tiêu đề & Mô tả */}
  <div className="mb-6">
    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
      Khám phá Việt Nam
    </h2>
    <p className="text-gray-500 text-sm mt-1">
      Các điểm đến phổ biến này có nhiều điều chờ đón bạn
    </p>
  </div>

  {loading ? (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="flex-none w-[170px] sm:w-[190px] md:w-[200px] space-y-3">
          <div className="w-full h-[130px] sm:h-[140px] md:h-[150px] bg-gray-200 rounded-2xl" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  ) : (
    <div className="relative group">
      {/* Nút cuộn trái */}
      <button
        type="button"
        onClick={() => {
          const container = document.getElementById("discover-vietnam-slider");
          if (container) container.scrollBy({ left: -400, behavior: "smooth" });
        }}
        className="absolute -left-4 top-[70px] -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft size={15} />
      </button>

      {/* Danh sách cuộn ngang */}
      <div
        id="discover-vietnam-slider"
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {pageData.discoverVietnam.map((item) => (
          <div
            key={item.id || item.name}
            onClick={() =>
              handleSearch({ destination: item.title || item.name })
            }
            className="flex-none w-[170px] sm:w-[190px] md:w-[200px] cursor-pointer"
          >
            {/* Ảnh bo góc */}
            <div className="w-full h-[130px] sm:h-[140px] md:h-[150px] rounded-2xl overflow-hidden mb-2.5">
              <img
                src={item.image}
                alt={item.title || item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Chữ hiển thị bên dưới */}
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-snug truncate">
                {item.title || item.name}
              </h3>
              <p className="text-gray-500 text-xs font-normal mt-0.5">
                {item.subTitle || `${item.hotelCount || 50} chỗ nghỉ`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Nút cuộn phải */}
      <button
        type="button"
        onClick={() => {
          const container = document.getElementById("discover-vietnam-slider");
          if (container) container.scrollBy({ left: 400, behavior: "smooth" });
        }}
        className="absolute -right-4 top-[70px] -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )}
</section>

      {/* ─── SECTION 3: CHỖ NGHỈ ĐỘC ĐÁO (UNIQUE STAYS) ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500" size={24} />
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Lưu trú tại các chỗ nghỉ độc đáo hàng đầu
            </h2>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Trải nghiệm các khu nghỉ dưỡng, biệt thự và căn hộ được đánh giá cao
            nhất
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-80 bg-gray-200 animate-pulse rounded-3xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pageData.uniqueStays.map((stay) => {
              const stayId = String(stay.id || stay.hotel_id || stay._id);
              const isSavedInDb = favoriteHotelIds.has(stayId);

              // 👈 TÍNH GIÁ CHUẨN XÁC ĐỂ KHÔNG BAO GIỜ HIỆN "LIÊN HỆ"
              const computedPrice =
                stay.min_price ||
                stay.base_price ||
                stay.price ||
                stay.sell_price ||
                stay.rooms?.[0]?.base_price ;

              return (
                <HotelCard
                  key={stayId}
                  id={stayId}
                  hotel={stay}
                  image={stay.image || stay.stay_image}
                  type={stay.type}
                  title={stay.title || stay.name}
                  location={stay.location || stay.address}
                  rating={stay.average_rating || stay.rating}
                  reviewsCount={stay.review_count || stay.reviewsCount}
                  salePrice={computedPrice}
                  stars={stay.star_rating || stay.stars}
                  isGenius={stay.isGenius}
                  isFavoriteInitial={isSavedInDb || stay.is_favorite}
                  onClick={() => navigate(`/hotel/${stayId}`)}
                />
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};

export default HomePage;
