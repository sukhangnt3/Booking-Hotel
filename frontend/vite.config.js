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
      // Dấu @ trỏ thẳng vào thư mục src
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ngăn inline SVG thành base64
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 🌟 TỰ ĐỘNG CHIA TÁCH CÁC THƯ VIỆN LỚN RA THÀNH FILE ĐỘC LẬP
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router")
            ) {
              return "vendor-react";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("date-fns")) {
              return "vendor-date";
            }
            return "vendor-libs";
          }
        },
      },
    },
  },
});
