import React, { useState } from 'react';

const HotelCard = ({ 
  image, 
  type, 
  title, 
  location, 
  rating, 
  ratingText, 
  reviewsCount, 
  originalPrice, 
  salePrice,
  stars = 4,
  isGenius = true
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden flex flex-col group relative shadow-sm hover:shadow-md transition-all">
      
      {/* 1. Phần Ảnh & Nút Trái tim */}
      <div className="w-full aspect-square overflow-hidden relative bg-gray-100">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Nút Trái tim yêu thích góc phải */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors z-10"
        >
          <span className={`text-xl transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* 2. Phần Thông tin chi tiết */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Loại hình + Số sao + Badge Genius */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-1">
            <span className="font-medium text-gray-600">{type}</span>
            {/* Render số sao */}
            <div className="flex text-yellow-500 text-[10px]">
              {Array.from({ length: stars }).map((_, i) => (
                <span key={i}>⭐</span>
              ))}
            </div>
            {/* Badge Genius màu xanh đặc trưng */}
            {isGenius && (
              <span className="bg-[#003580] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1">
                Genius
              </span>
            )}
          </div>

          {/* Tên khách sạn */}
          <h3 className="font-bold text-base text-gray-900 group-hover:text-[#006ce4] line-clamp-1 mb-0.5">
            {title}
          </h3>

          {/* Địa điểm */}
          <p className="text-xs text-gray-500 mb-3">{location}</p>

          {/* Điểm số & Đánh giá */}
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-[#003580] text-white font-bold text-sm px-1.5 py-1 rounded-t-md rounded-br-md">
              {rating.toFixed(1)}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-gray-800 leading-tight">{ratingText}</p>
              <p className="text-gray-500 leading-none mt-0.5">{reviewsCount.toLocaleString()} đánh giá</p>
            </div>
          </div>
        </div>

        {/* 3. Phần Giá cả (Nằm góc phải dưới chân) */}
        <div className="text-right mt-auto pt-2 border-t border-gray-50 flex flex-col items-end">
          <span className="text-xs text-gray-500 font-normal">Bắt đầu từ</span>
          <div className="flex items-center gap-2 mt-0.5">
            {originalPrice && (
              <span className="text-xs text-red-600 line-through font-normal">
                VND {originalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-base font-bold text-gray-900">
              VND {salePrice.toLocaleString()}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HotelCard;