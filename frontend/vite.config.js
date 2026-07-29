import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path"; // Thêm dòng này để xử lý đường dẫn

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Cấu hình dấu @ đại diện cho thư mục src
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
