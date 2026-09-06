// src/hooks/useFavorites.js
import { useState, useCallback, useEffect } from "react";
import hotelService from "@/services/hotelService";
import { useAuthStore } from "@/stores/authStore";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuthStore();

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await hotelService.getFavorites();
      const list = Array.isArray(response)
        ? response
        : response?.favorites || response?.data || [];
      setFavorites(list);
    } catch (err) {
      console.warn("Lỗi tải danh sách yêu thích:", err);
      setError("Không thể tải danh sách yêu thích");
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (hotel) => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const hotelId = String(hotel.id || hotel.hotel_id);
    const isCurrentlyFavorite = favorites.some(
      (fav) => String(fav.id || fav.hotel_id) === hotelId,
    );

    const previousFavorites = [...favorites];
    if (isCurrentlyFavorite) {
      setFavorites(
        favorites.filter((fav) => String(fav.id || fav.hotel_id) !== hotelId),
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
      setFavorites(previousFavorites);
      alert("Có lỗi xảy ra khi cập nhật yêu thích");
    }
  };

  const isFavorite = useCallback(
    (hotelId) => {
      return favorites.some(
        (fav) => String(fav.id || fav.hotel_id) === String(hotelId),
      );
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
