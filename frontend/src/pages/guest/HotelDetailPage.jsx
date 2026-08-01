import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

// Import Services (Tầng kết nối Backend)
import hotelService from "../../services/hotelService";
import roomService from "../../services/roomService";
import bookingService from "../../services/bookingService";

// Import Components đã tách nhỏ
import HotelGallery from "../../components/hotel/HotelGallery";
import HotelInfo from "../../components/hotel/HotelInfo";
import RoomCard from "../../components/room/RoomCard";
import BookingSummary from "../../components/booking/BookingSummary";
import { LoadingSpinner, Breadcrumb } from "../../components/common";

const HotelDetailPage = () => {
  const { id } = useParams(); // Lấy UUID của khách sạn từ URL
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ─── STATES QUẢN LÝ DỮ LIỆU ───
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Lấy thông tin lưu trú từ URL (Để tính giá từ Room Inventory)
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const adults = searchParams.get("adults") || 2;

  // ─── GỌI API LẤY CHI TIẾT ───
  useEffect(() => {
    const fetchHotelData = async () => {
      setLoading(true);
      try {
        // Gọi song song thông tin khách sạn và danh sách phòng trống
        const [hotelData, roomsData] = await Promise.all([
          hotelService.getHotelDetail(id),
          roomService.getAvailableRooms(id, { checkIn, checkOut, adults }),
        ]);

        setHotel(hotelData);
        setRooms(roomsData);

        // Mặc định chọn loại phòng đầu tiên có sẵn
        if (roomsData.length > 0) {
          setSelectedRoom(roomsData[0]);
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết khách sạn:", err);
        setError(
          "Không thể tải thông tin khách sạn lúc này. Vui lòng thử lại sau.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchHotelData();
  }, [id, checkIn, checkOut, adults]);

  // ─── XỬ LÝ ĐẶT PHÒNG (TEMPORARY LOCK) ───
  const handleConfirmBooking = async () => {
    if (!selectedRoom) return;

    try {
      setLoading(true);

      // 1. Tạo Temporary Lock trong DB (Table 10)
      // Việc này giúp giữ phòng trong 15 phút để khách điền thông tin
      const lockData = await bookingService.createTemporaryLock({
        room_id: selectedRoom.id,
        checkIn,
        checkOut,
        quantity: 1,
      });

      // 2. Chuyển sang trang xác nhận với ID của bản ghi khóa phòng
      navigate(`/booking/confirm?lockId=${lockData.id}&hotelId=${id}`);
    } catch (err) {
      alert(
        "Rất tiếc, phòng này vừa mới có người đặt hoặc đang được giữ. Vui lòng chọn loại phòng khác.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── GIAO DIỆN KHI ĐANG TẢI ───
  if (loading && !hotel) return <LoadingSpinner fullPage />;

  // ─── GIAO DIỆN KHI LỖI ───
  if (error)
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-bold">{error}</p>
        <button
          onClick={() => navigate("/hotels")}
          className="mt-4 text-blue-600 underline"
        >
          Quay lại tìm kiếm
        </button>
      </div>
    );

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Điều hướng Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb
            items={[
              { label: "Trang chủ", link: "/" },
              { label: hotel?.city || "Khách sạn", link: "/hotels" },
              { label: hotel?.name },
            ]}
          />
        </div>

        {/* 1. Gallery Hình ảnh (Table 23: image) */}
        <HotelGallery images={hotel?.images} />

        {/* Bố cục 2 cột chính */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* CỘT TRÁI (2/3): Thông tin chi tiết & Phòng */}
          <div className="lg:col-span-2 space-y-8">
            {/* 2. Thông tin mô tả & Chính sách (Table 5 & 6) */}
            <HotelInfo hotel={hotel} policy={hotel?.policy} />

            {/* 3. Danh sách loại phòng & Giá (Table 7 & 9) */}
            <section id="rooms" className="scroll-mt-6">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Các loại phòng còn trống
                </h2>
                <span className="text-xs text-gray-500 font-medium italic">
                  Giá cho lưu trú từ {checkIn} đến {checkOut}
                </span>
              </div>

              {rooms.length > 0 ? (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      isSelected={selectedRoom?.id === room.id}
                      onSelect={() => setSelectedRoom(room)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-100 p-8 rounded-xl text-center">
                  <p className="text-orange-700 font-bold">
                    Rất tiếc, ngày bạn chọn đã hết phòng!
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Vui lòng thử thay đổi ngày nhận/trả phòng.
                  </p>
                </div>
              )}
            </section>

            {/* 4. Đánh giá của khách (Table 22: review) */}
            <section className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-extrabold text-gray-900 mb-6">
                Đánh giá từ khách hàng
              </h2>
              {/* Bạn có thể nhúng <ReviewList hotelId={id} /> tại đây */}
              <p className="text-sm text-gray-500 italic">
                Tính năng đánh giá đang được cập nhật...
              </p>
            </section>
          </div>

          {/* CỘT PHẢI (1/3): Sidebar Thanh toán */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <BookingSummary
                hotel={hotel}
                selectedRoom={selectedRoom}
                onConfirm={handleConfirmBooking}
              />

              {/* Thông tin hỗ trợ khách hàng */}
              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 text-[11px] text-gray-500 space-y-2">
                <p className="flex items-center gap-2">
                  🛡️{" "}
                  <span className="font-bold text-gray-700">
                    Giá cam kết tốt nhất
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  🔒{" "}
                  <span className="font-bold text-gray-700">
                    Thanh toán an toàn bảo mật
                  </span>
                </p>
                <p>
                  Mọi thắc mắc vui lòng liên hệ hotline:{" "}
                  <span className="text-[#006ce4] font-bold">1900 1234</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailPage;
