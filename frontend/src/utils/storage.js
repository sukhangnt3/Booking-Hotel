/**
 * KEY CONSTANTS (Quản lý các khóa tập trung chống gõ nhầm)
 */
const STORAGE_KEYS = {
  TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user_info",
  AUTH_STORAGE: "auth-storage", // Key do Zustand persist tạo ra
  CART_STORAGE: "gostay-cart-storage", // Key giỏ hàng
  RECENT_SEARCHES: "recent_searches", // Lịch sử tìm kiếm
  FAVORITES: "user_favorites", // Yêu thích offline
};

/**
 * ─── HÀM BỔ TRỢ AN TOÀN (SAFE GET/SET/REMOVE) ───
 */
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      if (!item || item === "undefined" || item === "null") return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`[Storage] Lỗi đọc key "${key}":`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[Storage] Lỗi lưu key "${key}":`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[Storage] Lỗi xóa key "${key}":`, error);
      return false;
    }
  },

  clearAll: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("[Storage] Lỗi dọn sạch LocalStorage:", error);
      return false;
    }
  },
};

/**
 * ─── 1. QUẢN LÝ ACCESS TOKEN & REFRESH TOKEN ───
 */
export const getToken = () => {
  // 1. Thử lấy từ key riêng
  const directToken = storage.get(STORAGE_KEYS.TOKEN);
  if (directToken) return directToken;

  // 2. Fallback đọc từ Zustand store nếu có
  const authState = storage.get(STORAGE_KEYS.AUTH_STORAGE);
  return authState?.state?.token || authState?.state?.systemToken || null;
};

export const setToken = (token) => storage.set(STORAGE_KEYS.TOKEN, token);
export const removeToken = () => storage.remove(STORAGE_KEYS.TOKEN);

export const getRefreshToken = () => {
  const directRefresh = storage.get(STORAGE_KEYS.REFRESH_TOKEN);
  if (directRefresh) return directRefresh;
  const authState = storage.get(STORAGE_KEYS.AUTH_STORAGE);
  return authState?.state?.refreshToken || null;
};

export const setRefreshToken = (token) =>
  storage.set(STORAGE_KEYS.REFRESH_TOKEN, token);
export const removeRefreshToken = () =>
  storage.remove(STORAGE_KEYS.REFRESH_TOKEN);

/**
 * ─── 2. QUẢN LÝ THÔNG TIN USER ───
 */
export const getUser = () => {
  const directUser = storage.get(STORAGE_KEYS.USER);
  if (directUser) return directUser;
  const authState = storage.get(STORAGE_KEYS.AUTH_STORAGE);
  return authState?.state?.user || null;
};

export const setUser = (user) => storage.set(STORAGE_KEYS.USER, user);
export const removeUser = () => storage.remove(STORAGE_KEYS.USER);

/**
 * ─── 3. QUẢN LÝ GIỎ HÀNG / ĐẶT PHÒNG TẠM THỜI (CART) ───
 */
export const getCart = () => storage.get(STORAGE_KEYS.CART_STORAGE, null);
export const setCart = (cartData) =>
  storage.set(STORAGE_KEYS.CART_STORAGE, cartData);
export const removeCart = () => storage.remove(STORAGE_KEYS.CART_STORAGE);

/**
 * ─── 4. LỊCH SỬ TÌM KIẾM GẦN ĐÂY (SEARCH HISTORY) ───
 */
export const getRecentSearches = () =>
  storage.get(STORAGE_KEYS.RECENT_SEARCHES, []);

export const addRecentSearch = (keyword, maxItems = 5) => {
  if (!keyword || !keyword.trim()) return;
  const cleanKeyword = keyword.trim();
  const current = getRecentSearches();

  // Đẩy từ khóa mới lên đầu và loại bỏ trùng lặp
  const updated = [
    cleanKeyword,
    ...current.filter((item) => item !== cleanKeyword),
  ].slice(0, maxItems);
  storage.set(STORAGE_KEYS.RECENT_SEARCHES, updated);
  return updated;
};

export const clearRecentSearches = () =>
  storage.remove(STORAGE_KEYS.RECENT_SEARCHES);

/**
 * ─── 5. XÓA SẠCH TOÀN BỘ PHIÊN ĐĂNG NHẬP ───
 */
export const clearAuthSession = () => {
  removeToken();
  removeRefreshToken();
  removeUser();
  storage.remove(STORAGE_KEYS.AUTH_STORAGE);
};

export default storage;
