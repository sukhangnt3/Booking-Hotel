// src/hooks/useAutoUpdate.js
import { useEffect, useRef } from "react";

export function useAutoUpdate() {
  const currentVersionRef = useRef(null);

  useEffect(() => {
    // Chỉ kích hoạt trên môi trường đã deploy (Vercel), không chạy ở Localhost khi dev
    if (import.meta.env.DEV) return;

    const checkVersion = async () => {
      // Nếu người dùng đang ẩn tab web thì tạm dừng để tiết kiệm tối đa tài nguyên
      if (document.visibilityState !== "visible") return;

      try {
        // Gọi file version.json với tham số thời gian để vượt qua toàn bộ bộ nhớ đệm
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = data?.version;

        if (!serverVersion) return;

        // Lưu phiên bản lần đầu mở trang
        if (currentVersionRef.current === null) {
          currentVersionRef.current = serverVersion;
        }
        // Nếu phát hiện Vercel vừa deploy xong bản mới hơn bản đang mở
        else if (serverVersion !== currentVersionRef.current) {
          console.log(
            "⚡ Đã phát hiện bản deploy mới trên Vercel! Đang tự động nạp giao diện mới...",
          );
          currentVersionRef.current = serverVersion;
          // Nạp lại giao diện mới nhất ngay lập tức mà không cần F5
          window.location.reload();
        }
      } catch {
        // Bỏ qua nếu mất kết nối mạng tạm thời (Đã xóa biến err để hết sạch gạch đỏ ESLint)
      }
    };

    // 1. Kiểm tra ngay khi vừa mở trang web
    checkVersion();

    // 2. Kiểm tra siêu tốc mỗi 3 giây một lần (cực nhẹ 50 bytes, không bao giờ lag)
    const timer = setInterval(checkVersion, 3000);

    // 3. Kiểm tra tức thì mỗi khi bạn vừa bấm quay lại Tab trình duyệt
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
