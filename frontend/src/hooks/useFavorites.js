import { useState, useCallback, useEffect } from "react";
import hotelService from "@/services/hotelService";
import { useAuthStore } from "@/stores/authStore";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuthStore();

  // --- 1. LẤY DANH SÁCH YÊU THÍCH ---
  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await hotelService.getFavorites();
      // Giả sử trả về mảng các khách sạn
      setFavorites(response.data || []);
    } catch (err) {
      setError("Không thể tải danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Tự động tải khi mount (nếu đã login)
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // --- 2. THÊM / XÓA YÊU THÍCH (TOGGLE) ---
  const toggleFavorite = async (hotel) => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu yêu thích!");
      return;
    }

    const hotelId = hotel.id || hotel.hotel_id;
    const isCurrentlyFavorite = favorites.some(
      (fav) => (fav.id || fav.hotel_id) === hotelId,
    );

    // OPTIMISTIC UI: Cập nhật state cục bộ ngay lập tức
    const previousFavorites = [...favorites];
    if (isCurrentlyFavorite) {
      setFavorites(
        favorites.filter((fav) => (fav.id || fav.hotel_id) !== hotelId),
      );
    } else {
      setFavorites([...favorites, hotel]);
    }

    try {
      if (isCurrentlyFavorite) {
        await hotelService.removeFavorite(hotelId);
      } else {
        await hotelService.addFavorite(hotelId);
      }
    } catch (err) {
      // HOÀN TÁC (ROLLBACK) nếu API lỗi
      setFavorites(previousFavorites);
      alert("Có lỗi xảy ra khi cập nhật yêu thích");
    }
  };

  // --- 3. KIỂM TRA TRẠNG THÁI (HELPER) ---
  const isFavorite = useCallback(
    (hotelId) => {
      return favorites.some((fav) => (fav.id || fav.hotel_id) === hotelId);
    },
    [favorites],
  );

  return {
    favorites,
    loading,
    error,
    toggleFavorite,
    isFavorite,
    refresh: fetchFavorites,
  };
};

export default useFavorites;
