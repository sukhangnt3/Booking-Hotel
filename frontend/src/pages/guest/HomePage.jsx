import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// UI Components
import { Card } from "../../components/ui";
import HotelCard from "../../components/hotel/HotelCard";
import HotelFilter from "../../components/hotel/HotelFilter";
// Services
import hotelService from "../../services/hotelService";

// Hàm hỗ trợ: Ép dữ liệu trả về LUÔN LÀ MẢNG (Tránh lỗi .map is not a function)
const toSafeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.favorites)) return data.favorites;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

const HomePage = () => {
  const navigate = useNavigate();

  // ─── 1. STATES LƯU DỮ LIỆU ───
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const [discoverVietnam, setDiscoverVietnam] = useState([]);
  const [uniqueStays, setUniqueStays] = useState([]);

  // Set lưu danh sách các Hotel ID đã được User yêu thích trong Database
  const [favoriteHotelIds, setFavoriteHotelIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // ─── 2. GỌI API KHI MOUNT ───
  useEffect(() => {
    const fetchHomePageData = async () => {
      setLoading(true);
      try {
        // Gọi song song các API trang chủ VÀ API danh sách Yêu thích của User từ DB
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
          hotelService.getFavoriteHotels(), // Lấy danh sách yêu thích thật từ Database
        ]);

        // 1. Lưu danh sách ID đã yêu thích vào Set để tra cứu cực nhanh
        const favList = toSafeArray(myFavoritesData);
        const favIdsSet = new Set(
          favList.map((item) => String(item.id || item.hotel_id)),
        );
        setFavoriteHotelIds(favIdsSet);

        // 2. Lưu dữ liệu các section
        setPropertyTypes(toSafeArray(typesData));
        setTrendingDestinations(toSafeArray(trendingData));
        setDiscoverVietnam(toSafeArray(discoverData));
        setUniqueStays(toSafeArray(staysData));
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomePageData();
  }, []);

  // ─── 3. XỬ LÝ TÌM KIẾM ───
  const handleSearch = (searchData) => {
    const query = new URLSearchParams();

    if (searchData?.destination)
      query.append("destination", searchData.destination);

    if (searchData?.startDate) query.append("checkIn", searchData.startDate);
    if (searchData?.endDate) query.append("checkOut", searchData.endDate);

    if (searchData?.adults) query.append("adults", searchData.adults);
    if (searchData?.rooms) query.append("rooms", searchData.rooms);
    if (!searchData?.adults && searchData?.guests)
      query.append("adults", searchData.guests);

    navigate({
      pathname: "/hotels",
      search: query.toString(),
    });
  };

  const safePropertyTypes = toSafeArray(propertyTypes);
  const safeTrending = toSafeArray(trendingDestinations);
  const safeDiscover = toSafeArray(discoverVietnam);
  const safeUniqueStays = toSafeArray(uniqueStays);

  return (
    <div className="w-full pb-24 bg-gray-50/30 font-sans">
      {/* ─── HERO BANNER ─── */}
      <div className="bg-[#003580] pt-12 pb-20 px-4 text-white">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Tìm chỗ nghỉ tiếp theo
          </h1>
          <p className="text-base md:text-xl text-blue-100 font-normal">
            Tìm ưu đãi khách sạn, chỗ nghỉ dạng nhà và nhiều hơn nữa...
          </p>
        </div>
      </div>

      {/* HotelFilter */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <HotelFilter onSearch={handleSearch} />
      </div>

      {/* ─── SECTION 1: TÌM THEO LOẠI CHỖ NGHĨ ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          Tìm theo loại chỗ nghỉ
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="w-full h-40 bg-gray-200 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {safePropertyTypes.map((type) => (
              <div
                key={type.id || type._id || Math.random()}
                className="cursor-pointer hover:opacity-90 transition transform hover:-translate-y-1"
                onClick={() =>
                  handleSearch({
                    destination: "",
                    type: type.title || type.name,
                  })
                }
              >
                <Card image={type.image} title={type.title || type.name} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── SECTION 2: ĐIỂM ĐẾN ĐANG THỊNH HÀNH ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Điểm đến đang thịnh hành
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Các lựa chọn phổ biến nhất cho du khách từ Việt Nam
          </p>
        </div>

        {loading ? (
          <div className="h-80 bg-gray-200 animate-pulse rounded-xl" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeTrending
              .filter((item) => item.isLarge || true)
              .map((place) => (
                <div
                  key={place.id || place._id || Math.random()}
                  onClick={() =>
                    handleSearch({ destination: place.title || place.name })
                  }
                  className="relative rounded-xl overflow-hidden group cursor-pointer shadow-sm"
                >
                  <Card
                    image={place.image}
                    title=""
                    className="w-full aspect-[16/9] md:aspect-[2/1]"
                  />
                  <div className="absolute top-6 left-6 drop-shadow-lg">
                    <h3 className="text-white text-2xl font-black flex items-center gap-2">
                      {place.title || place.name}{" "}
                      <span className="text-base">🇻🇳</span>
                    </h3>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* ─── SECTION 3: KHÁM PHÁ VIỆT NAM ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          Khám phá Việt Nam
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {loading
            ? [1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-48 bg-gray-200 animate-pulse rounded-xl"
                />
              ))
            : safeDiscover.map((item) => (
                <div
                  key={item.id || item._id || Math.random()}
                  onClick={() =>
                    handleSearch({ destination: item.title || item.name })
                  }
                  className="cursor-pointer group"
                >
                  <Card
                    image={item.image}
                    title={
                      <span className="group-hover:text-[#006ce4] transition-colors">
                        {item.title || item.name} 🇻🇳
                      </span>
                    }
                    subTitle={item.subTitle}
                    className="w-full aspect-[4/3] rounded-xl"
                  />
                </div>
              ))}
        </div>
      </section>

      {/* ─── SECTION 4: UNIQUE STAYS (TRÁI TIM GIỮ MÀU SÁNG KỂ CẢ KHI F5) ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Lưu trú tại các chỗ nghỉ độc đáo hàng đầu
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Khám phá những trải nghiệm lưu trú đặc biệt nhất
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-72 bg-gray-200 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {safeUniqueStays.map((stay) => {
              const stayId = String(stay.id || stay.hotel_id || stay._id);
              // Kiểm tra xem Hotel ID này có nằm trong danh sách đã yêu thích ở DB không
              const isSavedInDb = favoriteHotelIds.has(stayId);

              return (
                <HotelCard
                  key={stayId}
                  id={stay.id || stay._id || stay.hotel_id}
                  hotel={stay}
                  image={stay.image || stay.stay_image}
                  type={stay.type}
                  title={stay.title || stay.name}
                  location={stay.location || stay.address}
                  rating={stay.average_rating || stay.rating}
                  reviewsCount={stay.review_count || stay.reviewsCount}
                  salePrice={stay.min_price || stay.price}
                  stars={stay.star_rating || stay.stars}
                  isGenius={stay.isGenius}
                  // TRUYỀN TRẠNG THÁI YÊU THÍCH THẬT TỪ DATABASE
                  isFavoriteInitial={
                    isSavedInDb || stay.is_favorite || stay.isFavorite
                  }
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
