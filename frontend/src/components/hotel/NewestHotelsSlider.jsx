// src/components/hotel/NewestHotelsSlider.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import HotelCard from "./HotelCard";
import apiClient from "@/services/apiClient";

export default function NewestHotelsSlider({
  hotels: propHotels = null,
  title = "Chỗ nghỉ nổi bật & Mới nhất",
  subtitle = "Các cơ sở lưu trú thực tế đang mở bán trên hệ thống GoStay",
  excludeHotelId = null,
}) {
  const navigate = useNavigate();
  const [apiHotels, setApiHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const VISIBLE_COUNT = 4;

  useEffect(() => {
    if (!propHotels) {
      const fetchHotels = async () => {
        try {
          setLoading(true);
          const res = await apiClient.get("/hotels");
          const list =
            res?.data?.hotels ||
            res?.data?.data ||
            res?.data ||
            res?.hotels ||
            [];
          setApiHotels(Array.isArray(list) ? list : []);
        } catch (err) {
          console.error("Lỗi khi tải danh sách khách sạn:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchHotels();
    }
  }, [propHotels]);

  const rawList = propHotels || apiHotels;

  const sortedHotels = useMemo(() => {
    let list = [...rawList];

    if (excludeHotelId) {
      list = list.filter(
        (h) => String(h.id || h.hotel_id) !== String(excludeHotelId),
      );
    }

    return list.sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [rawList, excludeHotelId]);

  const maxIndex = Math.max(0, sortedHotels.length - VISIBLE_COUNT);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  if (loading || sortedHotels.length === 0) return null;

  return (
    <section className="my-8 w-full max-w-7xl mx-auto px-4 select-none">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500 fill-orange-500" size={22} />
            <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {sortedHotels.length > VISIBLE_COUNT && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                currentIndex === 0
                  ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                  : "border-gray-300 text-gray-700 hover:bg-[#003580] hover:text-white hover:border-[#003580] shadow-sm active:scale-95 cursor-pointer"
              }`}
              title="Xem khách sạn trước"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                currentIndex >= maxIndex
                  ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                  : "border-gray-300 text-gray-700 hover:bg-[#003580] hover:text-white hover:border-[#003580] shadow-sm active:scale-95 cursor-pointer"
              }`}
              title="Xem khách sạn tiếp theo"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden py-2 -my-2">
        <div
          className="flex flex-nowrap transition-transform duration-500 ease-out -mx-2.5"
          style={{
            transform: `translateX(-${currentIndex * 25}%)`,
          }}
        >
          {sortedHotels.map((hotel) => (
            <div
              key={hotel.id || hotel._id}
              className="w-full sm:w-1/2 lg:w-1/4 shrink-0 px-2.5"
            >
              <HotelCard
                id={hotel.id}
                hotel={hotel}
                title={hotel.name || hotel.title}
                image={
                  hotel.image ||
                  hotel.thumbnail ||
                  (Array.isArray(hotel.images) ? hotel.images[0] : null)
                }
                location={hotel.address || hotel.city || hotel.location}
                rating={hotel.average_rating || hotel.rating}
                reviewsCount={hotel.review_count || hotel.reviewsCount}
                salePrice={
                  hotel.min_price || hotel.base_price || hotel.salePrice
                }
                stars={hotel.star_rating || hotel.stars}
                isGenius={hotel.is_genius || hotel.isGenius}
                isFavoriteInitial={hotel.is_favorite}
                type={hotel.property_type || hotel.type}
                onClick={() => {
                  navigate(`/hotel/${hotel.id}`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
