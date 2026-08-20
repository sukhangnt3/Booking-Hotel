import { create } from "zustand";

// 1. GIÁ TRỊ MẶC ĐỊNH (DEFAULT)
const initialFilters = {
  destination: "",
  checkIn: null, // ISO String
  checkOut: null, // ISO String
  adults: 2,
  children: 0,
  rooms: 1,
  minPrice: 0,
  maxPrice: 20000000,
  stars: [], // Mảng chứa số sao: [4, 5]
  amenities: [], // Mảng tiện ích: ["wifi", "pool"]
  sortBy: "popularity",
};

export const useFilterStore = create((set, get) => ({
  // --- STATE ---
  ...initialFilters,

  // --- ACTIONS ---

  /**
   * Cập nhật bộ lọc (Merge dữ liệu)
   */
  setFilters: (newFilters) => {
    set((state) => ({ ...state, ...newFilters }));
  },

  /**
   * Cập nhật số lượng khách/phòng nhanh
   */
  updateGuest: (field, value) => {
    if (value < 0) return;
    set({ [field]: value });
  },

  /**
   * Xử lý chọn/bỏ chọn Mảng (Stars hoặc Amenities)
   */
  toggleArrayFilter: (field, value) => {
    const currentArray = get()[field];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value];
    set({ [field]: newArray });
  },

  /**
   * Reset về ban đầu
   */
  resetFilters: () => set(initialFilters),

  /**
   * CHUYỂN ĐỔI STATE THÀNH URL PARAMS (Dùng để gọi API hoặc đổi URL)
   */
  getQueryParams: () => {
    const state = get();
    const params = new URLSearchParams();

    if (state.destination) params.append("destination", state.destination);
    if (state.checkIn) params.append("checkIn", state.checkIn);
    if (state.checkOut) params.append("checkOut", state.checkOut);

    params.append("adults", state.adults);
    params.append("children", state.children);
    params.append("rooms", state.rooms);

    if (state.stars.length > 0) params.append("stars", state.stars.join(","));
    if (state.amenities.length > 0)
      params.append("amenities", state.amenities.join(","));

    params.append("minPrice", state.minPrice);
    params.append("maxPrice", state.maxPrice);
    params.append("sortBy", state.sortBy);

    return params.toString();
  },

  /**
   * ĐỌC TỪ URL VÀO STATE (Dùng khi vừa load trang)
   */
  syncFromUrl: (searchParams) => {
    const updates = {};
    if (searchParams.get("destination"))
      updates.destination = searchParams.get("destination");
    if (searchParams.get("checkIn"))
      updates.checkIn = searchParams.get("checkIn");
    if (searchParams.get("checkOut"))
      updates.checkOut = searchParams.get("checkOut");
    if (searchParams.get("adults"))
      updates.adults = Number(searchParams.get("adults"));
    if (searchParams.get("children"))
      updates.children = Number(searchParams.get("children"));
    if (searchParams.get("rooms"))
      updates.rooms = Number(searchParams.get("rooms"));

    // Xử lý mảng (biến "4,5" thành [4, 5])
    const stars = searchParams.get("stars");
    if (stars) updates.stars = stars.split(",").map(Number);

    const amenities = searchParams.get("amenities");
    if (amenities) updates.amenities = amenities.split(",");

    set(updates);
  },
}));

export default useFilterStore;
