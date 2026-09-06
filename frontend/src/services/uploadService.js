// src/services/uploadService.js
import apiClient from "./apiClient";

export const uploadService = {
  // 1. Tải 1 ảnh lên máy chủ (Avatar)
  uploadSingle: async (file, folder = "avatars") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    // Để Axios tự động nhận diện header boundary của FormData
    return apiClient.post("/uploads/single", formData, {
      headers: {
        "Content-Type": undefined,
      },
    });
  },

  // 2. Tải nhiều ảnh cùng lúc (Khách sạn / Phòng)
  uploadMultiple: async (files, folder = "hotels", onProgress) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    formData.append("folder", folder);

    return apiClient.post("/uploads/multiple", formData, {
      headers: {
        "Content-Type": undefined,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
};

export default uploadService;
