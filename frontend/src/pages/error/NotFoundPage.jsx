import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Compass,
  Home,
  ArrowLeft,
  Search,
  HelpCircle,
  Hotel,
} from "lucide-react";
import { Button } from "@/components/ui";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/60 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* HÌNH MINH HỌA 404 VỚI ICON */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-30" />
          <div className="w-28 h-28 bg-white rounded-3xl shadow-xl shadow-blue-100 border border-blue-100 flex items-center justify-center text-[#006ce4]">
            <Compass
              size={56}
              strokeWidth={1.5}
              className="animate-spin duration-1000"
              style={{ animationDuration: "12s" }}
            />
          </div>
          <span className="absolute -bottom-2 bg-[#003580] text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
            LỖI 404
          </span>
        </div>

        {/* THÔNG ĐIỆP */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            Trang bạn tìm kiếm không tồn tại
          </h1>
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto leading-relaxed font-medium">
            Có vẻ như đường liên kết này đã bị thay đổi, xóa bỏ hoặc bạn đã gõ
            nhầm địa chỉ URL.
          </p>
        </div>

        {/* NÚT HÀNH ĐỘNG CHÍNH */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => navigate("/")}
            className="h-12 px-8 bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-100 text-sm"
            leftIcon={<Home size={18} />}
          >
            Về trang chủ GoStay
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-12 px-6 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-2xl font-bold text-sm"
            leftIcon={<ArrowLeft size={18} />}
          >
            Quay lại trang trước
          </Button>
        </div>

        {/* GỢI Ý ĐIỀU HƯỚNG NHANH */}
        <div className="pt-8 border-t border-gray-200/80">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Bạn có thể muốn khám phá:
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs font-bold text-[#006ce4]">
            <Link
              to="/hotels"
              className="px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-1.5"
            >
              <Hotel size={14} /> Danh sách khách sạn
            </Link>
            <Link
              to="/promotions"
              className="px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              🏷️ Mã giảm giá & Ưu đãi
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              👤 Đăng nhập tài khoản
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
