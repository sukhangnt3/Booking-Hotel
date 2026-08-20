import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ServerCrash,
  RefreshCcw,
  Home,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui";

const ServerErrorPage = ({ errorMessage }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/60 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* HÌNH MINH HỌA 500 VỚI ICON CẢNH BÁO */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-30" />
          <div className="w-28 h-28 bg-white rounded-3xl shadow-xl shadow-rose-100 border border-rose-100 flex items-center justify-center text-rose-600">
            <ServerCrash size={56} strokeWidth={1.5} />
          </div>
          <span className="absolute -bottom-2 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
            LỖI 500
          </span>
        </div>

        {/* THÔNG ĐIỆP */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            Máy chủ đang gặp sự cố tạm thời
          </h1>
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto leading-relaxed font-medium">
            Hệ thống máy chủ GoStay đang được bảo trì hoặc quá tải. Đội ngũ kỹ
            thuật của chúng tôi đã nhận được cảnh báo và đang xử lý.
          </p>
        </div>

        {/* NỘI DUNG LỖI CHI TIẾT (NẾU CÓ TRUYỀN VÀO) */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-left max-w-md mx-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
              <ShieldAlert size={14} /> Chi tiết lỗi kỹ thuật:
            </div>
            <p className="font-mono text-[11px] text-rose-600 break-words">
              {typeof errorMessage === "object"
                ? JSON.stringify(errorMessage)
                : errorMessage}
            </p>
          </div>
        )}

        {/* NÚT HÀNH ĐỘNG */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => window.location.reload()}
            className="h-12 px-8 bg-gray-900 hover:bg-black text-white font-extrabold rounded-2xl shadow-lg text-sm"
            leftIcon={<RefreshCcw size={18} />}
          >
            Thử tải lại trang
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="h-12 px-6 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-2xl font-bold text-sm"
            leftIcon={<Home size={18} />}
          >
            Về trang chủ
          </Button>
        </div>

        <p className="text-xs text-gray-400 font-medium pt-4">
          Nếu sự cố vẫn tiếp diễn, vui lòng liên hệ hotline hỗ trợ:{" "}
          <strong className="text-gray-700">+84 28 3861 4699</strong>
        </p>
      </div>
    </div>
  );
};

export default ServerErrorPage;
