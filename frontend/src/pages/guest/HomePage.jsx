import React from 'react';
import { Card } from '../../components/ui'; // Gọi trực tiếp Card từ UI
import HotelCard from '../../components/hotel/HotelCard'; // Component hiển thị chỗ nghỉ độc đáo

const HomePage = () => {
  // 1. Dữ liệu: Tìm theo loại chỗ nghỉ
  const propertyTypes = [
    { id: 'hotel', title: 'Khách sạn', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop' },
    { id: 'apartment', title: 'Căn hộ', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=600&auto=format&fit=crop' },
    { id: 'resort', title: 'Các resort', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop' },
    { id: 'villa', title: 'Các biệt thự', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=600&auto=format&fit=crop' }
  ];

  // 2. Dữ liệu: Điểm đến đang thịnh hành (Grid 2 hàng to nhỏ phối hợp)
  const trendingDestinations = [
    { id: 'hcm', title: 'TP. Hồ Chí Minh', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=800&auto=format&fit=crop', isLarge: true },
    { id: 'vungtau', title: 'Vũng Tàu', image: 'https://images.unsplash.com/photo-1571243156023-e18640191eb5?q=80&w=800&auto=format&fit=crop', isLarge: true },
    { id: 'hanoi', title: 'Hà Nội', image: 'https://images.unsplash.com/photo-1509060464153-4466739f78d0?q=80&w=600&auto=format&fit=crop', isLarge: false },
    { id: 'danang', title: 'Đà Nẵng', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop', isLarge: false },
    { id: 'dalat', title: 'Đà Lạt', image: 'https://images.unsplash.com/photo-1589400244153-5b88cb7da75e?q=80&w=600&auto=format&fit=crop', isLarge: false }
  ];

  // 3. Dữ liệu: Khám phá Việt Nam (image_53c3f6.jpg)
  const discoverVietnam = [
    {
      id: 'hcm_discover',
      title: 'TP. Hồ Chí Minh',
      subTitle: '6.636 chỗ nghỉ',
      image: 'https://images.unsplash.com/photo-1543536448-d209d2d13a1c?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 'vungtau_discover',
      title: 'Vũng Tàu',
      subTitle: '1.545 chỗ nghỉ',
      image: 'https://images.unsplash.com/photo-1626082929543-5bab0f090c42?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 'hanoi_discover',
      title: 'Hà Nội',
      subTitle: '5.682 chỗ nghỉ',
      image: 'https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?q=80&w=600&auto=format&fit=crop'
    }
  ];

  // 4. Dữ liệu: Lưu trú tại các chỗ nghỉ độc đáo hàng đầu (image_53ce1a.jpg)
  const uniqueStays = [
    {
      id: 'stay_1',
      type: 'Nhà nghỉ',
      title: 'Mekong Lodge Resort',
      location: 'Cái Bè, Việt Nam',
      rating: 8.7,
      ratingText: 'Tuyệt vời',
      reviewsCount: 1018,
      originalPrice: 3000000,
      salePrice: 1200000,
      stars: 4,
      isGenius: true,
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 'stay_2',
      type: 'Resort',
      title: 'Hmong Village Resort',
      location: 'Hà Giang, Việt Nam',
      rating: 8.9,
      ratingText: 'Tuyệt vời',
      reviewsCount: 159,
      originalPrice: null,
      salePrice: 1550000,
      stars: 4,
      isGenius: true,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop'
    }
  ];

  return (
    <div className="w-full pb-24">
      
      {/* ─── SECTION 1: TÌM THEO LOẠI CHỖ NGHĨ ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          Tìm theo loại chỗ nghỉ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative">
          {propertyTypes.map((type) => (
            <Card key={type.id} image={type.image} title={type.title} />
          ))}
          <button className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 z-10">
            <span className="text-gray-600 text-sm">❯</span>
          </button>
        </div>
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

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trendingDestinations.filter(item => item.isLarge).map((place) => (
              <div key={place.id} className="relative rounded-lg overflow-hidden group shadow-sm">
                <Card image={place.image} title="" className="w-full aspect-[16/9] md:aspect-[2/1]" />
                <div className="absolute top-6 left-6 pointer-events-none drop-shadow-md">
                  <h3 className="text-white text-2xl font-extrabold flex items-center gap-1.5 tracking-wide">
                    {place.title} <span className="inline-flex items-center justify-center w-6 h-6 rounded-full overflow-hidden bg-white/20 text-base">🇻🇳</span>
                  </h3>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {trendingDestinations.filter(item => !item.isLarge).map((place) => (
              <div key={place.id} className="relative rounded-lg overflow-hidden group shadow-sm">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {discoverVietnam.map((item) => (
            <div key={item.id} className="flex flex-col">
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
      </section>

      {/* ─── SECTION 4: LƯU TRÚ TẠI CÁC CHỖ NGHỈ ĐỘC ĐÁO HÀNG ĐẦU (MỚI) ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Lưu trú tại các chỗ nghỉ độc đáo hàng đầu
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Từ biệt thự, lâu đài cho đến nhà thuyền, igloo, chúng tôi đều có hết
          </p>
        </div>

        {/* Bố cục Grid 4 cột đều đặn khi hiển thị trên màn hình máy tính lớn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uniqueStays.map((stay) => (
            <HotelCard
              key={stay.id}
              image={stay.stay_image || stay.image} // Tương thích linh hoạt tên thuộc tính ảnh
              type={stay.type}
              title={stay.title}
              location={stay.location}
              rating={stay.rating}
              ratingText={stay.ratingText}
              reviewsCount={stay.reviewsCount}
              originalPrice={stay.originalPrice}
              salePrice={stay.salePrice}
              stars={stay.stars}
              isGenius={stay.isGenius}
            />
          ))}
        </div>
      </section>

    </div>
  );
};

export default HomePage;