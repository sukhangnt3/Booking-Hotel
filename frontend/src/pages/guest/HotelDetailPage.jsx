import React, { useState, useEffect } from "react";
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
  const [reviews, setReviews] = useState([]); // Dữ liệu từ bảng 22
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        // 1. Lấy thông tin khách sạn & phòng (Bảng 5, 7, 23)
        const hotelData = await hotelService.getHotelById(id);
        setHotel(hotelData);

        // 2. Lấy bình luận thật (Bảng 22 JOIN Bảng 2)
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

  const handleBookNow = () => {
    const firstRoomId = hotel?.rooms?.[0]?.id;
    if (!firstRoomId) {
      alert("Khách sạn hiện chưa có phòng trống.");
      return;
    }
    navigate(
      `/booking?hotelId=${id}&roomId=${firstRoomId}&checkIn=${checkIn}&checkOut=${checkOut}`,
    );
  };

  if (loading) return <LoadingSpinner />;
  if (!hotel)
    return (
      <div className="text-center py-20 text-gray-500">
        Không tìm thấy khách sạn.
      </div>
    );

  // Lấy danh sách ảnh từ bảng image (Bảng 23)
  const hotelImages = hotel.images?.map((img) => img.path) || [];

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

        {/* 2. GALLERY GRID (5 Ảnh) */}
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[450px] overflow-hidden rounded-2xl mb-8 shadow-md">
          <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer">
            <img
              src={hotelImages[0] || "https://via.placeholder.com/800x600"}
              className="w-full h-full object-cover group-hover:brightness-90 transition"
              alt="Main"
            />
          </div>
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
        <div className="sticky top-0 bg-white shadow-sm border-b z-30 flex space-x-8 px-4 -mx-4 overflow-x-auto mb-8">
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
          {/* CỘT TRÁI: NỘI DUNG TAB */}
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
                  <h3 className="font-bold mb-4">Tiện ích phổ biến</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-green-700 text-sm font-medium">
                    <span>🏊 Hồ bơi</span> <span>📶 WiFi miễn phí</span>{" "}
                    <span>🚗 Chỗ đỗ xe</span>
                    <span>🏋️ Gym</span> <span>🍹 Quầy bar</span>{" "}
                    <span>🏪 Lễ tân 24h</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DANH SÁCH PHÒNG (Bảng 7) */}
            {activeTab === "rooms" && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-gray-900">
                  Các loại phòng trống
                </h2>
                {hotel.rooms?.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-blue-300 transition shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-1/3 bg-gray-100">
                        <img
                          src={hotelImages[1] || hotelImages[0]}
                          className="h-full w-full object-cover"
                          alt="Room"
                        />
                      </div>
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-blue-600 text-xl">
                            {room.name}
                          </h3>
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">
                            CÒN PHÒNG
                          </span>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs text-gray-500">
                          <span>📐 {room.room_area}m²</span>
                          <span>👤 {room.capacity} Người</span>
                          <span>🛏️ {room.bed_type}</span>
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
                              className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-md font-bold text-sm shadow-md"
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

            {/* TAB: BÌNH LUẬN THẬT (Bảng 22) */}
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
                        {rev.reply && (
                          <div className="mt-4 p-4 bg-gray-50 border-l-4 border-blue-400 rounded-r-xl">
                            <p className="text-xs font-bold text-blue-800 mb-1">
                              💬 Phản hồi từ chủ nhà:
                            </p>
                            <p className="text-xs text-gray-600">{rev.reply}</p>
                          </div>
                        )}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Vị trí</span>
                  <div className="w-32 bg-gray-200 h-1.5 rounded-full">
                    <div
                      className="bg-blue-600 h-full"
                      style={{ width: "95%" }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sạch sẽ</span>
                  <div className="w-32 bg-gray-200 h-1.5 rounded-full">
                    <div
                      className="bg-blue-600 h-full"
                      style={{ width: "90%" }}
                    ></div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("reviews")}
                className="w-full mt-6 text-blue-600 font-bold text-sm border border-blue-600 py-2 rounded-lg hover:bg-blue-50 transition"
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
