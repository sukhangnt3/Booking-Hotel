import React, { useState, useEffect } from "react";
import hotelService from "../../services/hotelService";

const HotelCard = ({
  id,
  hotel,
  image,
  type,
  title,
  location,
  rating,
  reviewsCount,
  salePrice,
  stars,
  isGenius,
  isFavoriteInitial = false,
  onClick,
}) => {
  // LẤY ĐÚNG ID KHÁCH SẠN (Ưu tiên hotel_id -> id -> _id)
  const targetHotelId =
    id || hotel?.hotel_id || hotel?.id || hotel?._id || hotel?.hotel?.id;

  // State quản lý màu trái tim
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);

  useEffect(() => {
    const initialStatus =
      isFavoriteInitial || hotel?.is_favorite || hotel?.isFavorite || false;
    setIsFavorite(initialStatus);
  }, [isFavoriteInitial, hotel]);

  // HÀM BẤM TRÁI TIM LƯU DATABASE
  const handleFavoriteClick = async (e) => {
    e.stopPropagation(); // Ngăn việc bấm trái tim bị chuyển sang trang Chi tiết

    if (loadingFav) return;

    // 1. KIỂM TRA ID KHÁCH SẠN
    if (!targetHotelId) {
      alert("Lỗi: Không tìm thấy ID của khách sạn này!");
      console.error("Dữ liệu hotel thiếu ID:", hotel);
      return;
    }

    // 2. KIỂM TRA XEM NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP CHƯA
    const authData = localStorage.getItem("auth-storage");
    let token = null;
    if (authData) {
      try {
        token = JSON.parse(authData)?.state?.token;
      } catch (err) {
        token = null;
      }
    }

    if (!token) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const previousState = isFavorite; // Trạng thái cũ
    const nextState = !previousState; // Trạng thái mới (ngược lại)

    // 3. CẬP NHẬT GIAO DIỆN SÁNG/TẮT TỨC THÌ (0.01s)
    setIsFavorite(nextState);

    try {
      setLoadingFav(true);

      // 4. GỌI API BACKEND CHUẨN (POST NẾU THÊM, DELETE NẾU XÓA)
      if (previousState) {
        // Đang yêu thích -> Bấm vào để XÓA (DELETE)
        await hotelService.removeFavorite(targetHotelId);
      } else {
        // Chưa yêu thích -> Bấm vào để THÊM (POST)
        await hotelService.addFavorite(targetHotelId);
      }
    } catch (error) {
      console.error("Lỗi khi bấm yêu thích ở Trang Chủ:", error);

      // 5. Nếu API thất bại -> Hoàn tác màu trái tim cũ
      setIsFavorite(previousState);

      const errorMsg =
        error.response?.data?.message ||
        "Không thể lưu vào yêu thích. Vui lòng kiểm tra lại kết nối!";
      alert(errorMsg);
    } finally {
      setLoadingFav(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group cursor-pointer"
    >
      {/* NÚT TRÁI TIM CÓ CHỨC NĂNG LƯU DATABASE */}
      <button
        onClick={handleFavoriteClick}
        disabled={loadingFav}
        className={`absolute top-3 right-3 z-10 p-2.5 rounded-full shadow-md transition-all duration-300 cursor-pointer ${
          isFavorite
            ? "bg-white text-rose-500 scale-110 shadow-rose-100"
            : "bg-black/30 text-white hover:bg-white hover:text-rose-500"
        }`}
        title={isFavorite ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
      >
        <svg
          className={`w-5 h-5 transition-colors duration-200 ${
            isFavorite ? "fill-rose-500" : "fill-current"
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>

      {/* ẢNH KHÁCH SẠN */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <img
          src={image || "https://via.placeholder.com/300"}
          alt={title || "Khách sạn"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {isGenius && (
          <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
            Genius
          </span>
        )}
      </div>

      {/* THÔNG TIN KHÁCH SẠN */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {type && (
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {type}
            </span>
          )}

          <h3 className="font-bold text-gray-900 text-base line-clamp-1 mt-0.5 group-hover:text-blue-600 transition-colors">
            {title || "Khách sạn"}
          </h3>

          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            📍 {location || "Đang cập nhật địa điểm"}
          </p>

          {/* ĐÁNH GIÁ & SAO */}
          <div className="flex items-center gap-2 mt-3">
            {rating && (
              <span className="bg-[#003580] text-white text-xs font-bold px-2 py-1 rounded-t-md rounded-br-md">
                {rating}
              </span>
            )}
            <div className="text-xs text-gray-500">
              {reviewsCount ? `${reviewsCount} đánh giá` : "Mới ra mắt"}
            </div>
            {stars && (
              <div className="text-amber-400 text-xs ml-auto">
                {"★".repeat(stars)}
              </div>
            )}
          </div>
        </div>

        {/* GIÁ TIỀN */}
        <div className="mt-4 pt-3 border-t flex justify-between items-end">
          <span className="text-xs text-gray-400 font-medium">
            Giá 1 đêm từ
          </span>
          <div className="text-right">
            <span className="text-lg font-black text-red-600">
              {salePrice
                ? `${Number(salePrice).toLocaleString("vi-VN")} VND`
                : "Liên hệ"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
