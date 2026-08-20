import apiClient from "./apiClient";

export const uploadService = {
  /**
   * 1. UPLOAD MỘT FILE DUY NHẤT (Ví dụ: Avatar)
   * @param {File} file - Đối tượng file từ input
   * @param {String} folder - Thư mục lưu trữ (avatar, hotels, rooms...)
   */
  uploadSingle: async (file, folder = "general") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    return apiClient.post("/uploads/single", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * 2. UPLOAD NHIỀU FILE CÙNG LÚC (Ví dụ: Gallery khách sạn)
   * @param {FileList|Array} files - Danh sách các file
   * @param {Function} onProgress - Callback để hiển thị % tiến độ lên UI
   */
  uploadMultiple: async (files, folder = "hotels", onProgress) => {
    const formData = new FormData();

    // Append tất cả file vào cùng một key 'files' (Backend sẽ nhận dạng mảng)
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    formData.append("folder", folder);

    return apiClient.post("/uploads/multiple", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      // Theo dõi tiến độ upload
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percentCompleted);
        }
      },
    });
  },

  /**
   * 3. XÓA ẢNH (Dựa trên Public ID hoặc URL)
   */
  deleteImage: (publicId) => {
    return apiClient.delete(`/uploads/${publicId}`);
  },
};

export default uploadService;
