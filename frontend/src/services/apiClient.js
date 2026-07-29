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
    // 1. Lấy dữ liệu mà Zustand đã lưu (tên key phải khớp với name trong authStore.js)
    const authData = localStorage.getItem("auth-storage");

    if (authData) {
      try {
        // 2. Parse từ chuỗi JSON sang Object
        const parsedData = JSON.parse(authData);

        // 3. Lấy token nằm trong state của Zustand
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

// --- XỬ LÝ DỮ LIỆU TRẢ VỀ ---
apiClient.interceptors.response.use(
  (response) => {
    // Trả về data trực tiếp để FE dùng cho gọn
    return response.data;
  },
  (error) => {
    // Xử lý lỗi tập trung
    const message =
      error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!";

    // Nếu Backend báo lỗi 401 (Hết hạn token), bạn có thể tự động logout ở đây
    if (error.response?.status === 401) {
      console.warn("Phiên đăng nhập hết hạn!");
      // localStorage.removeItem('auth-storage'); // Tùy chọn: tự xóa token cũ
      // window.location.href = '/login'; // Tùy chọn: đá về trang login
    }

    return Promise.reject(new Error(message));
  },
);

export default apiClient;
