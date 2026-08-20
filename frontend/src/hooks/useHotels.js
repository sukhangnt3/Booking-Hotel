import { useState, useEffect, useCallback } from "react";
import hotelService from "@/services/hotelService";

export const useHotels = (initialFilters = {}) => {
  // 1. STATE QUẢN LÝ
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quản lý bộ lọc (Điểm đến, giá, sao, v.v.)
  const [filters, setFilters] = useState({
    destination: "",
    minPrice: "",
    maxPrice: "",
    stars: "",
    amenities: [],
    sortBy: "popularity",
    ...initialFilters,
  });

  // Quản lý phân trang
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1,
  });

  // 2. HÀM GỌI API (Được bọc trong useCallback để tránh render thừa)
  const fetchHotels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...filters,
        page: pagination.currentPage,
        limit: pagination.pageSize,
        // Chuyển mảng tiện ích thành chuỗi nếu Backend yêu cầu (ví dụ: "wifi,pool")
        amenities: filters.amenities.join(","),
      };

      const response = await hotelService.getAll(params);

      // Giả sử API trả về dạng: { data: [...], total: 100, totalPages: 10 }
      setHotels(response.data || []);
      setPagination((prev) => ({
        ...prev,
        totalItems: response.total || 0,
        totalPages: response.totalPages || 1,
      }));
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Không thể tải danh sách khách sạn";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.pageSize]);

  // 3. EFFECT: Tự động gọi API khi bộ lọc hoặc trang thay đổi
  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  // 4. CÁC HÀM HÀNH ĐỘNG (ACTIONS)

  // Cập nhật từng filter lẻ
  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset về trang 1 khi lọc
  };

  // Thay đổi trang
  const changePage = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  // Reset toàn bộ lọc
  const resetFilters = () => {
    setFilters({
      destination: "",
      minPrice: "",
      maxPrice: "",
      stars: "",
      amenities: [],
      sortBy: "popularity",
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  return {
    hotels,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    changePage,
    resetFilters,
    refresh: fetchHotels, // Hàm để gọi lại thủ công nếu cần
  };
};

export default useHotels;
