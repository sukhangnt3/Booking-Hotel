import axios from "axios";

const apiClient = axios.create({
  // Sử dụng biến môi trường hoặc mặc định localhost:5000
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// --- GẮN TOKEN TỪ ZUSTAND VÀO MỖI REQUEST ---
apiClient.interceptors.request.use(
  (config) => {
    // 1. Lấy dữ liệu mà Zustand đã lưu (key: auth-storage)
    const authData = localStorage.getItem("auth-storage");

    if (authData) {
      try {
        const parsedData = JSON.parse(authData);
        // Lấy token nằm trong state của Zustand
        const token = parsedData.state?.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Lỗi lấy token từ LocalStorage:", error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- XỬ LÝ DỮ LIỆU TRẢ VỀ CHUẨN TẬP TRUNG ---
apiClient.interceptors.response.use(
  (response) => {
    // Trả về data trực tiếp để các Service dùng cho gọn
    return response.data;
  },
  (error) => {
    // Xử lý lỗi 401 (Hết hạn Token / Chưa đăng nhập)
    if (error.response?.status === 401) {
      console.warn("Phiên đăng nhập hết hạn hoặc chưa đăng nhập!");
    }

    // Giữ nguyên object error để các hàm try...catch ở FE đọc được err.response.data
    return Promise.reject(error);
  },
);

export default apiClient;
