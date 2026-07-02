import React from 'react';
import { Card } from '../../components/ui'; // Thao tác gọi trực tiếp Card từ UI

const HomePage = () => {
  // Mảng dữ liệu chứa danh sách loại chỗ nghỉ (Có thể thay thế bằng dữ liệu từ API hoặc hook useHotels sau này)
  const propertyTypes = [
    {
      id: 'hotel',
      title: 'Khách sạn',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop', // Bạn có thể thay bằng asset cục bộ
    },
    {
      id: 'apartment',
      title: 'Căn hộ',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 'resort',
      title: 'Các resort',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 'villa',
      title: 'Các biệt thự',
      image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=600&auto=format&fit=crop',
    }
  ];

  const handleTypeClick = (typeId) => {
    console.log(`Chuyển hướng người dùng tìm kiếm theo loại: ${typeId}`);
    // Xử lý chuyển trang sang HotelListPage kèm theo bộ lọc loại chỗ nghỉ
  };

  return (
    <div className="w-full pb-16">
      {/* ─── PHẦN BODY: TÌM THEO LOẠI CHỖ NGHĨ ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-20"> {/* mt-20 để đẩy khoảng cách an toàn tránh đè vào Search Bar của Header */}
        
        {/* Tiêu đề mục */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          Tìm theo loại chỗ nghỉ
        </h2>

        {/* Danh sách hiển thị dạng Grid (4 cột trên màn hình máy tính) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative">
          {propertyTypes.map((type) => (
            <Card
              key={type.id}
              image={type.image}
              title={type.title}
              onClick={() => handleTypeClick(type.id)}
            />
          ))}

          {/* Nút mũi tên chuyển trang (Next button) ở góc phải giống trong ảnh */}
          <button className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 z-10 transition-all">
            <span className="text-gray-600 text-sm">❯</span>
          </button>
        </div>

      </section>
    </div>
  );
};

export default HomePage;