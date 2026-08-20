import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  Share2,
  CalendarDays,
  Users,
  ShieldCheck,
  Building2,
} from "lucide-react";

// ─── UI & COMMON COMPONENTS ───
import { Button, Badge, StarRating } from "@/components/ui";
import { Breadcrumb, LoadingSpinner } from "@/components/common";

// ─── HOTEL SPECIFIC COMPONENTS ───
import { HotelGallery, HotelInfo, AmenityList } from "@/components/hotel";
import { RoomCard } from "@/components/room";
import { ReviewList, ReviewForm } from "@/components/review";

// ─── SERVICES & STORES ───
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const HotelDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = searchParams.get("adults") || "2";

  // ─── 1. STATES DỮ LIỆU ───
  const [hotel, setHotel] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorite, setIsFavorite] = useState(false);

  const roomsRef = useRef(null);
  const reviewsRef = useRef(null);

  // ─── 2. FETCH HOTEL DATA + REVIEWS ───
  // ─── 2. FETCH HOTEL DATA + REVIEWS ĐỘC LẬP (ĐÃ SỬA) ───
  const fetchAllData = async () => {
    if (!id) return;
    setLoading(true);

    // 1. Lấy thông tin khách sạn chính
    try {
      const hotelData = await hotelService.getById(id);
      setHotel(hotelData);
      setIsFavorite(Boolean(hotelData?.is_favorite || hotelData?.isFavorite));
    } catch (err) {
      console.error("Lỗi tải chi tiết khách sạn:", err);
    }

    // 2. Lấy đánh giá (Nếu 404 thì bỏ qua, không làm sập trang)
    try {
      const reviewsData = await hotelService.getReviews(id);
      setReviews(
        Array.isArray(reviewsData) ? reviewsData : reviewsData?.data || [],
      );
    } catch (err) {
      setReviews([]); // Để mảng rỗng nếu chưa có đánh giá
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  // ─── 3. TOGGLE FAVORITE (OPTIMISTIC) ───
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const previous = isFavorite;
    setIsFavorite(!previous);

    try {
      if (previous) await hotelService.removeFavorite(id);
      else await hotelService.addFavorite(id);
    } catch {
      setIsFavorite(previous);
    }
  };

  // Cuộn mượt đến phần chọn phòng
  const scrollToRooms = () => {
    setActiveTab("rooms");
    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading)
    return <LoadingSpinner fullPage label="Đang tải thông tin chỗ nghỉ..." />;

  if (!hotel) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Không tìm thấy khách sạn
        </h2>
        <Button onClick={() => navigate("/hotels")}>Quay lại danh sách</Button>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Khách sạn", link: "/hotels" },
    {
      label: hotel.city || "Việt Nam",
      link: `/hotels?destination=${hotel.city}`,
    },
    { label: hotel.name },
  ];

  return (
    <div className="bg-gray-50/50 min-h-screen pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        {/* BREADCRUMB */}
        <Breadcrumb items={breadcrumbs} />

        {/* ─── HEADER CHI TIẾT ─── */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-3 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" size="sm">
                Khách sạn
              </Badge>
              {hotel.star_rating > 0 && (
                <StarRating rating={hotel.star_rating} size={14} />
              )}
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                ✓ Đã xác thực
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              {hotel.name}
            </h1>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium flex-wrap">
              <MapPin size={14} className="text-[#006ce4] shrink-0" />
              <span>
                {hotel.address}, {hotel.city}
              </span>
              <span>•</span>
              <button className="text-[#006ce4] font-bold hover:underline">
                Xem trên bản đồ
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleFavorite}
              className={`p-3 rounded-xl border transition-all ${
                isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-500 shadow-sm"
                  : "bg-white border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200"
              }`}
              title={isFavorite ? "Bỏ lưu" : "Lưu yêu thích"}
            >
              <Heart
                size={20}
                fill={isFavorite ? "currentColor" : "none"}
                strokeWidth={2}
              />
            </button>

            <Button
              onClick={scrollToRooms}
              className="bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold px-8 h-12 rounded-xl shadow-lg shadow-blue-100"
            >
              Đặt phòng ngay
            </Button>
          </div>
        </div>

        {/* ─── GALLERY ẢNH (BENTO GRID) ─── */}
        <div className="mb-10">
          <HotelGallery images={hotel.images || []} />
        </div>

        {/* ─── STICKY TABS ĐIỀU HƯỚNG ─── */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-30 flex gap-8 px-2 overflow-x-auto no-scrollbar mb-8">
          {[
            { id: "overview", label: "Tổng quan" },
            { id: "rooms", label: "Các loại phòng trống" },
            { id: "facilities", label: "Tiện nghi & Dịch vụ" },
            {
              id: "reviews",
              label: `Đánh giá (${hotel.review_count || reviews.length})`,
            },
            { id: "policies", label: "Quy định & Chính sách" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "rooms")
                  roomsRef.current?.scrollIntoView({ behavior: "smooth" });
                if (tab.id === "reviews")
                  reviewsRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "border-[#006ce4] text-[#006ce4]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── NỘI DUNG CHÍNH: 2 CỘT ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* CỘT TRÁI (8 COLS) */}
          <div className="lg:col-span-8 space-y-12">
            {/* 1. TỔNG QUAN & GIỚI THIỆU */}
            <section
              id="overview"
              className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6"
            >
              <h2 className="text-xl font-black text-gray-900">
                Về {hotel.name}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line text-justify">
                {hotel.description ||
                  "Khách sạn hiện đại với đầy đủ tiện nghi, cung cấp kỳ nghỉ thoải mái và trải nghiệm tuyệt vời cho du khách."}
              </p>
            </section>

            {/* 2. DANH SÁCH TIỆN NGHI */}
            <section
              id="facilities"
              className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm"
            >
              <AmenityList amenities={hotel.amenities || []} />
            </section>

            {/* 3. DANH SÁCH PHÒNG TRỐNG */}
            <section ref={roomsRef} id="rooms" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    Các loại phòng trống
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Chọn loại phòng phù hợp nhất với chuyến đi của bạn
                  </p>
                </div>
              </div>

              {hotel.rooms && hotel.rooms.length > 0 ? (
                <div className="space-y-4">
                  {hotel.rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onSelect={() =>
                        navigate(
                          `/booking?hotelId=${id}&roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}`,
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white p-10 rounded-2xl border border-dashed text-center text-gray-400">
                  Hiện chưa có thông tin phòng trống cho khoảng thời gian này.
                </div>
              )}
            </section>

            {/* 4. CHÍNH SÁCH KHÁCH SẠN */}
            <section id="policies">
              <HotelInfo hotel={hotel} policy={hotel.policy} />
            </section>

            {/* 5. ĐÁNH GIÁ CỦA KHÁCH */}
            <section ref={reviewsRef} id="reviews" className="space-y-8">
              <ReviewList
                reviews={reviews}
                ratingSummary={{
                  average_rating: Number(
                    hotel.average_rating || hotel.rating || 0,
                  ),
                  total_reviews: Number(
                    hotel.review_count || reviews.length || 0,
                  ),
                  star_counts: hotel.star_counts || {},
                }}
              />

              {/* Form gửi đánh giá mới */}
              <ReviewForm
                hotelId={hotel.id}
                hotelName={hotel.name}
                onSubmitSuccess={fetchAllData}
              />
            </section>
          </div>

          {/* CỘT PHẢI: STICKY SIDEBAR (4 COLS) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-24 space-y-6">
              {/* Điểm đánh giá tóm tắt */}
              <div className="flex justify-between items-center pb-6 border-b border-gray-100">
                <div>
                  <h4 className="font-extrabold text-gray-900 text-base">
                    Điểm đánh giá
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dựa trên {hotel.review_count || reviews.length} nhận xét
                    thực tế
                  </p>
                </div>
                <div className="bg-[#003580] text-white w-12 h-12 rounded-t-xl rounded-br-xl flex items-center justify-center text-xl font-black shadow-md">
                  {Number(hotel.average_rating || hotel.rating || 9.0).toFixed(
                    1,
                  )}
                </div>
              </div>

              {/* Lợi ích nổi bật */}
              <div className="space-y-3 text-xs text-gray-600 font-medium">
                <div className="flex items-center gap-2.5 text-emerald-600 font-bold">
                  <ShieldCheck size={18} className="shrink-0" />
                  <span>Cam kết giá tốt nhất thị trường</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CalendarDays size={18} className="text-[#006ce4] shrink-0" />
                  <span>Hỗ trợ đổi ngày linh hoạt</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users size={18} className="text-[#006ce4] shrink-0" />
                  <span>Hỗ trợ khách hàng 24/7</span>
                </div>
              </div>

              {/* Nút Call-To-Action */}
              <Button
                onClick={scrollToRooms}
                className="w-full h-12 text-sm font-extrabold shadow-lg shadow-blue-100"
              >
                Xem các phòng còn trống
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailPage;
