import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import hotelService from "../../services/hotelService";
import { LoadingSpinner } from "../../components/common";

const HotelDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";

  const [hotel, setHotel] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // State quản lý Trái tim Yêu thích (Bảng 24)
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Ref dùng để neo vị trí cuộn trang
  const roomsSectionRef = useRef(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        // 1. Lấy thông tin khách sạn & phòng
        const hotelData = await hotelService.getHotelById(id);
        setHotel(hotelData);
        setIsFavorite(hotelData?.is_favorite || false);

        // 2. Lấy bình luận thật
        const reviewsData = await hotelService.getHotelReviews(id);
        setReviews(reviewsData);
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [id]);

  // HÀM BẤM TRÁI TIM (KẾT HỢP API VÀ DỰ PHÒNG LOCALSTORAGE)
  const handleToggleFavorite = async () => {
    try {
      setFavLoading(true);

      const favList = JSON.parse(
        localStorage.getItem("user_favorites") || "[]",
      );
      const existsIndex = favList.findIndex(
        (item) => String(item.id) === String(id),
      );

      let newFavList = [];
      if (existsIndex >= 0) {
        newFavList = favList.filter((item) => String(item.id) !== String(id));
        setIsFavorite(false);
        alert("Đã xóa khỏi danh sách yêu thích!");
      } else {
        newFavList = [
          ...favList,
          {
            id: hotel.id,
            name: hotel.name,
            address: `${hotel.address}, ${hotel.city}`,
            rating: hotel.average_rating,
            image: hotel.images?.[0]?.path || "https://via.placeholder.com/300",
          },
        ];
        setIsFavorite(true);
        alert("Đã thêm vào danh sách yêu thích!");
      }

      localStorage.setItem("user_favorites", JSON.stringify(newFavList));

      if (hotelService.toggleFavorite) {
        await hotelService.toggleFavorite(id);
      }
    } catch (err) {
      console.warn("Đã lưu dữ liệu dự phòng.");
    } finally {
      setFavLoading(false);
    }
  };

  const handleBookNow = () => {
    setActiveTab("rooms");
    setTimeout(() => {
      roomsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  if (loading) return <LoadingSpinner />;
  if (!hotel)
    return (
      <div className="text-center py-20 text-gray-500">
        Không tìm thấy khách sạn.
      </div>
    );

  const hotelImages = hotel.images?.map((img) => img.path) || [];

  // Dữ liệu Tiện ích (Lấy từ Bảng 11/12 API hoặc Mặc định)
  const amenitiesList =
    hotel.amenities?.length > 0
      ? hotel.amenities
      : [
          { name: "WiFi miễn phí tốc độ cao", icon: "📶", type: "Internet" },
          { name: "Hồ bơi ngoài trời", icon: "🏊", type: "Thư giãn" },
          { name: "Chỗ đỗ xe miễn phí", icon: "🚗", type: "Đi lại" },
          { name: "Trung tâm thể hình (Gym)", icon: "🏋️", type: "Sức khỏe" },
          { name: "Nhà hàng & Quầy bar", icon: "🍹", type: "Ẩm thực" },
          { name: "Lễ tân phục vụ 24/7", icon: "🏪", type: "Dịch vụ" },
          { name: "Điều hòa nhiệt độ", icon: "❄️", type: "Tiện nghi" },
          { name: "Dịch vụ dọn phòng hàng ngày", icon: "🧹", type: "Dịch vụ" },
        ];

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 1. HEADER CHUYÊN NGHIỆP */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex text-amber-400 text-sm">
                {"★".repeat(hotel.star_rating || 0)}
              </div>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                Ưu đãi đặc biệt
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
              {hotel.name}
            </h1>
            <p className="text-gray-600 mt-2 flex items-center">
              <span className="text-blue-600 mr-1 text-lg">📍</span>{" "}
              {hotel.address}, {hotel.city}
              <button className="ml-3 text-blue-600 font-bold text-sm hover:underline italic">
                Xem trên bản đồ
              </button>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={handleBookNow}
              className="bg-[#006ce4] hover:bg-blue-700 text-white px-8 py-3 rounded-md font-bold shadow-lg transition-all"
            >
              Đặt ngay
            </button>
            <p className="text-xs text-green-600 font-medium">
              ✔️ Giá tốt nhất cho chuyến đi của bạn
            </p>
          </div>
        </div>

        {/* 2. GALLERY GRID (5 Ảnh) + NÚT YÊU THÍCH ❤️ */}
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[450px] overflow-hidden rounded-2xl mb-8 shadow-md relative">
          {/* Nút Trái tim Yêu thích */}
          <button
            onClick={handleToggleFavorite}
            disabled={favLoading}
            className={`absolute top-4 right-4 z-20 p-3 rounded-full shadow-lg transition-all duration-300 ${
              isFavorite
                ? "bg-white text-rose-500 scale-110"
                : "bg-black/40 text-white hover:bg-white hover:text-rose-500"
            }`}
            title={isFavorite ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          {/* Ảnh chính */}
          <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer">
            <img
              src={hotelImages[0] || "https://via.placeholder.com/800x600"}
              className="w-full h-full object-cover group-hover:brightness-90 transition"
              alt="Main"
            />
          </div>

          {/* 4 Ảnh phụ */}
          {hotelImages.slice(1, 5).map((img, idx) => (
            <div
              key={idx}
              className="hidden md:block overflow-hidden relative group cursor-pointer"
            >
              <img
                src={img}
                className="w-full h-full object-cover group-hover:brightness-90 transition"
                alt={`Sub ${idx}`}
              />
              {idx === 3 && hotelImages.length > 5 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl">
                  +{hotelImages.length - 4} ảnh
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 3. STICKY TABS MENU */}
        <div
          ref={roomsSectionRef}
          className="sticky top-0 bg-white shadow-sm border-b z-30 flex space-x-8 px-4 -mx-4 overflow-x-auto mb-8"
        >
          {[
            { id: "overview", label: "Tổng quan" },
            { id: "rooms", label: "Giá & Phòng trống" },
            { id: "reviews", label: `Đánh giá (${hotel.review_count})` },
            { id: "facilities", label: "Tiện nghi" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 whitespace-nowrap font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-4 border-blue-600"
                  : "text-gray-500 hover:text-blue-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4. CHIA CỘT NỘI DUNG */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {/* TAB: TỔNG QUAN */}
            {activeTab === "overview" && (
              <div className="animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Về chỗ nghỉ này
                </h2>
                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                  {hotel.description}
                </p>
                <div className="mt-8 pt-8 border-t">
                  <h3 className="font-bold mb-4">Tiện ích nổi bật</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-green-700 text-sm font-medium">
                    <span>🏊 Hồ bơi</span> <span>📶 WiFi miễn phí</span>{" "}
                    <span>🚗 Chỗ đỗ xe</span>
                    <span>🏋️ Gym</span> <span>🍹 Quầy bar</span>{" "}
                    <span>🏪 Lễ tân 24h</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DANH SÁCH PHÒNG */}
            {activeTab === "rooms" && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900">
                  Các loại phòng trống
                </h2>
                {hotel.rooms?.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-blue-300 transition shadow-sm p-6"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3 bg-gray-100 rounded-xl overflow-hidden h-40">
                        <img
                          src={hotelImages[1] || hotelImages[0]}
                          className="h-full w-full object-cover"
                          alt="Room"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-blue-600 text-xl">
                              {room.name}
                            </h3>
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">
                              CÒN PHÒNG
                            </span>
                          </div>
                          <div className="mt-3 flex gap-4 text-xs text-gray-500 font-medium">
                            <span>📐 {room.room_area}m²</span>
                            <span>👤 {room.capacity} Người</span>
                            <span>🛏️ {room.bed_type}</span>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t flex items-end justify-between">
                          <div className="text-sm font-bold text-green-600">
                            ✔️ Hủy miễn phí
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-red-600">
                              {room.base_price?.toLocaleString()} VND
                            </div>
                            <button
                              onClick={() =>
                                navigate(
                                  `/booking?hotelId=${id}&roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}`,
                                )
                              }
                              className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-md font-bold text-sm shadow-md hover:bg-blue-700 transition"
                            >
                              Tôi sẽ đặt
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: BÌNH LUẬN */}
            {activeTab === "reviews" && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900">
                  Đánh giá từ khách hàng
                </h2>
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white border p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6"
                    >
                      <div className="md:col-span-1 border-r pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                            {rev.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{rev.full_name}</p>
                            <p className="text-[10px] text-gray-400">
                              {new Date(rev.created_at).toLocaleDateString(
                                "vi-VN",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                            {rev.point}/5
                          </span>
                          <span className="font-bold text-gray-800">
                            {rev.point >= 4 ? "Rất tốt" : "Hài lòng"}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm italic">
                          "{rev.description}"
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-400 italic bg-white border rounded-2xl">
                    Chưa có bình luận nào.
                  </div>
                )}
              </div>
            )}

            {/* TAB: TIỆN NGHI (BẢNG 11 & 12) */}
            {activeTab === "facilities" && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Cơ sở vật chất & Tiện nghi
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {amenitiesList.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm"
                    >
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0">
                        {item.icon || "✔️"}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">
                          {typeof item === "object" ? item.name : item}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.type || "Tiện ích đạt chuẩn"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: SIDEBAR RATING */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-extrabold text-gray-900 text-lg">
                    Đánh giá
                  </h4>
                  <p className="text-xs text-gray-500">
                    {hotel.review_count} lượt đánh giá thực tế
                  </p>
                </div>
                <div className="bg-[#003580] text-white w-12 h-12 rounded-t-xl rounded-br-xl flex items-center justify-center text-xl font-black shadow-lg">
                  {hotel.average_rating}
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab("reviews");
                  setTimeout(() => {
                    roomsSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 100);
                }}
                className="w-full text-blue-600 font-bold text-sm border border-blue-600 py-2.5 rounded-lg hover:bg-blue-50 transition"
              >
                Xem tất cả bình luận
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailPage;
