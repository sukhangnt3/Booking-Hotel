import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

// Tự định nghĩa __dirname cho môi trường ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Dấu @ bây giờ sẽ trỏ thẳng vào thư mục src
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ngăn Vite nén hàng loạt file SVG thành chuỗi base64 trong code, giúp giảm tải bước Optimizer
    assetsInlineLimit: 0,
    // Tăng giới hạn cảnh báo dung lượng file để tránh tiến trình bị dừng hoặc chậm
    chunkSizeWarningLimit: 3000,
  },
});
