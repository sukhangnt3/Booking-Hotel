import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// UI Components
import { Card } from "../../components/ui";
import HotelCard from "../../components/hotel/HotelCard";
import HotelFilter from "../../components/hotel/HotelFilter";
// Services
import hotelService from "../../services/hotelService";

const HomePage = () => {
  const navigate = useNavigate();

  // ─── 1. STATES LƯU DỮ LIỆU ───
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const [discoverVietnam, setDiscoverVietnam] = useState([]);
  const [uniqueStays, setUniqueStays] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── 2. GỌI API KHI MOUNT ───
  useEffect(() => {
    const fetchHomePageData = async () => {
      setLoading(true);
      try {
        // Gọi song song các API để tối ưu tốc độ load
        const [typesData, trendingData, discoverData, staysData] =
          await Promise.all([
            hotelService.getPropertyTypes(),
            hotelService.getTrendingDestinations(),
            hotelService.getDiscoverVietnam(),
            hotelService.getUniqueStays(),
          ]);

        setPropertyTypes(typesData || []);
        setTrendingDestinations(trendingData || []);
        setDiscoverVietnam(discoverData || []);
        setUniqueStays(staysData || []);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomePageData();
  }, []);

  // ─── 3. XỬ LÝ TÌM KIẾM (ĐỒNG BỘ VỚI HOTEL LIST PAGE) ───
  const handleSearch = (searchData) => {
    const query = new URLSearchParams();

    if (searchData?.destination)
      query.append("destination", searchData.destination);

    // Gửi checkIn/checkOut để HotelListPage và HotelDetailPage tính được giá từ Inventory (Table 9)
    if (searchData?.startDate) query.append("checkIn", searchData.startDate);
    if (searchData?.endDate) query.append("checkOut", searchData.endDate);

    // Đồng bộ số lượng khách và phòng
    if (searchData?.adults) query.append("adults", searchData.adults);
    if (searchData?.rooms) query.append("rooms", searchData.rooms);
    // Fallback nếu HotelFilter trả về biến guests chung
    if (!searchData?.adults && searchData?.guests)
      query.append("adults", searchData.guests);

    navigate({
      pathname: "/hotels",
      search: query.toString(),
    });
  };

  return (
    <div className="w-full pb-24 bg-gray-50/30">
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

      {/* HotelFilter: Nhận dữ liệu và chuyển hướng qua handleSearch */}
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
            {propertyTypes.map((type) => (
              <div
                key={type.id || type._id}
                className="cursor-pointer hover:opacity-90 transition transform hover:-translate-y-1"
                onClick={() =>
                  handleSearch({ destination: "", type: type.title })
                }
              >
                <Card image={type.image} title={type.title} />
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
            {trendingDestinations
              .filter((item) => item.isLarge)
              .map((place) => (
                <div
                  key={place.id || place._id}
                  onClick={() => handleSearch({ destination: place.title })}
                  className="relative rounded-xl overflow-hidden group cursor-pointer shadow-sm"
                >
                  <Card
                    image={place.image}
                    title=""
                    className="w-full aspect-[16/9] md:aspect-[2/1]"
                  />
                  <div className="absolute top-6 left-6 drop-shadow-lg">
                    <h3 className="text-white text-2xl font-black flex items-center gap-2">
                      {place.title} <span className="text-base">🇻🇳</span>
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
            : discoverVietnam.map((item) => (
                <div
                  key={item.id || item._id}
                  onClick={() => handleSearch({ destination: item.title })}
                  className="cursor-pointer group"
                >
                  <Card
                    image={item.image}
                    title={
                      <span className="group-hover:text-[#006ce4] transition-colors">
                        {item.title} 🇻🇳
                      </span>
                    }
                    subTitle={item.subTitle}
                    className="w-full aspect-[4/3] rounded-xl"
                  />
                </div>
              ))}
        </div>
      </section>

      {/* ─── SECTION 4: UNIQUE STAYS (LIÊN KẾT ĐẾN CHI TIẾT) ─── */}
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
            {uniqueStays.map((stay) => (
              <div
                key={stay.id || stay._id}
                className="cursor-pointer transform transition-transform hover:scale-[1.02]"
                onClick={() => navigate(`/hotel/${stay.id || stay._id}`)} // Điều hướng đến HotelDetailPage
              >
                <HotelCard
                  image={stay.image || stay.stay_image}
                  type={stay.type}
                  title={stay.title || stay.name}
                  location={stay.location || stay.address}
                  rating={stay.average_rating || stay.rating}
                  reviewsCount={stay.review_count || stay.reviewsCount}
                  salePrice={stay.min_price || stay.price}
                  stars={stay.star_rating || stay.stars}
                  isGenius={stay.isGenius}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
