import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui'; 
import HotelCard from '../../components/hotel/HotelCard'; 
import HotelFilter from '../../components/hotel/HotelFilter';
import hotelService from '../../services/hotelService';

const HomePage = () => {
  const navigate = useNavigate();

  // ─── 1. STATES LƯU DỮ LIỆU TỪ BACKEND ───
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const [discoverVietnam, setDiscoverVietnam] = useState([]);
  const [uniqueStays, setUniqueStays] = useState([]);

  // States quản lý trạng thái tải trang
  const [loading, setLoading] = useState(true);

  // ─── 2. GỌI API BACKEND KHI COMPONENT DỰNG (MOUNT) ───
  useEffect(() => {
    const fetchHomePageData = async () => {
      setLoading(true);
      try {
        const [typesData, trendingData, discoverData, staysData] = await Promise.all([
          hotelService.getPropertyTypes ? hotelService.getPropertyTypes() : Promise.resolve([]),
          hotelService.getTrendingDestinations ? hotelService.getTrendingDestinations() : Promise.resolve([]),
          hotelService.getDiscoverVietnam ? hotelService.getDiscoverVietnam() : Promise.resolve([]),
          hotelService.getUniqueStays ? hotelService.getUniqueStays() : Promise.resolve([])
        ]);

        setPropertyTypes(typesData || []);
        setTrendingDestinations(trendingData || []);
        setDiscoverVietnam(discoverData || []);
        setUniqueStays(staysData || []);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu Trang chủ từ Backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomePageData();
  }, []);

  // ─── 3. XỬ LÝ SỰ KIỆN TÌM KIẾM TỪ HOTELFILTER ───
  const handleSearch = (searchParams) => {
    // Chuyển đổi dữ liệu search thành URL Search Parameters (Query String)
    const query = new URLSearchParams();

    if (searchParams?.destination) query.append('destination', searchParams.destination);
    if (searchParams?.startDate) query.append('checkIn', searchParams.startDate);
    if (searchParams?.endDate) query.append('checkOut', searchParams.endDate);
    if (searchParams?.guests) query.append('guests', searchParams.guests);

    // Chuyển hướng người dùng sang trang danh sách khách sạn (/hotels) cùng thông tin tìm kiếm
    navigate({
      pathname: '/hotels',
      search: query.toString(),
    });
  };

  return (
    <div className="w-full pb-24 bg-gray-50/30">

      {/* ─── HERO BANNER & HOTEL FILTER ─── */}
      <div className="bg-[#003580] pt-10 pb-16 px-4 text-white">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Tìm chỗ nghỉ tiếp theo
          </h1>
          <p className="text-base md:text-xl text-blue-100 font-normal">
            Tìm ưu đãi khách sạn, chỗ nghỉ dạng nhà và nhiều hơn nữa...
          </p>
        </div>
      </div>

      {/* Thanh HotelFilter đè lên giữa Banner và Nội dung */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
        <div >
          <HotelFilter onSearch={handleSearch} />
        </div>
      </div>

      {/* ─── SECTION 1: TÌM THEO LOẠI CHỖ NGHĨ ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          Tìm theo loại chỗ nghỉ
        </h2>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="w-full h-48 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative">
            {propertyTypes.map((type) => (
              <div key={type.id || type._id} className="cursor-pointer hover:opacity-95 transition">
                <Card image={type.image} title={type.title} />
              </div>
            ))}
            {propertyTypes.length > 4 && (
              <button className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 z-10">
                <span className="text-gray-600 text-sm">❯</span>
              </button>
            )}
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
          <div className="h-96 bg-gray-200 animate-pulse rounded-xl w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Hàng 1: Các thẻ lớn (isLarge = true) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingDestinations.filter(item => item.isLarge).map((place) => (
                <div 
                  key={place.id || place._id} 
                  onClick={() => handleSearch({ destination: place.title })}
                  className="relative rounded-lg overflow-hidden group shadow-sm cursor-pointer"
                >
                  <Card image={place.image} title="" className="w-full aspect-[16/9] md:aspect-[2/1]" />
                  <div className="absolute top-6 left-6 pointer-events-none drop-shadow-md">
                    <h3 className="text-white text-2xl font-extrabold flex items-center gap-1.5 tracking-wide">
                      {place.title} <span className="inline-flex items-center justify-center w-6 h-6 rounded-full overflow-hidden bg-white/20 text-base">🇻🇳</span>
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Hàng 2: Các thẻ nhỏ (isLarge = false) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {trendingDestinations.filter(item => !item.isLarge).map((place) => (
                <div 
                  key={place.id || place._id} 
                  onClick={() => handleSearch({ destination: place.title })}
                  className="relative rounded-lg overflow-hidden group shadow-sm cursor-pointer"
                >
                  <Card image={place.image} title="" className="w-full aspect-[4/3]" />
                  <div className="absolute top-5 left-5 pointer-events-none drop-shadow-md">
                    <h3 className="text-white text-xl font-extrabold flex items-center gap-1.5 tracking-wide">
                      {place.title} <span className="inline-flex items-center justify-center w-5 h-5 rounded-full overflow-hidden bg-white/20 text-xs">🇻🇳</span>
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── SECTION 3: KHÁM PHÁ VIỆT NAM ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Khám phá Việt Nam
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Các điểm đến phổ biến này có nhiều điều chờ đón bạn
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="w-full h-56 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {discoverVietnam.map((item) => (
              <div 
                key={item.id || item._id} 
                onClick={() => handleSearch({ destination: item.title })}
                className="flex flex-col cursor-pointer hover:opacity-95 transition"
              >
                <Card
                  image={item.image}
                  title={
                    <span className="flex items-center gap-1.5">
                      {item.title}
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full overflow-hidden bg-gray-100 border border-gray-200 text-xs shadow-sm">
                        🇻🇳
                      </span>
                    </span>
                  }
                  subTitle={item.subTitle}
                  className="w-full aspect-[4/3]"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── SECTION 4: LƯU TRÚ TẠI CÁC CHỖ NGHỈ ĐỘC ĐÁO HÀNG ĐẦU ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Lưu trú tại các chỗ nghỉ độc đáo hàng đầu
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Từ biệt thự, lâu đài cho đến nhà thuyền, igloo, chúng tôi đều có hết
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="w-full h-64 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uniqueStays.map((stay) => (
              <HotelCard
                key={stay.id || stay._id}
                image={stay.image || stay.stay_image}
                type={stay.type}
                title={stay.title || stay.name}
                location={stay.location || stay.address}
                rating={stay.rating || stay.average_rating}
                ratingText={stay.ratingText}
                reviewsCount={stay.reviewsCount || stay.review_count}
                originalPrice={stay.originalPrice}
                salePrice={stay.salePrice || stay.price || stay.min_price}
                stars={stay.stars || stay.star_rating}
                isGenius={stay.isGenius}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default HomePage;