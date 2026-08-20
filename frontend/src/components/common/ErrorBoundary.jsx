import React from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "../ui";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Cập nhật state để lần render sau hiển thị UI thay thế
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Bạn có thể gửi lỗi này đến các dịch vụ như Sentry, LogRocket...
    console.error("Critical Error caught by Boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/"; // Đưa người dùng về trang chủ để "làm sạch" trạng thái
  };

  render() {
    if (this.state.hasError) {
      // GIAO DIỆN BÁO LỖI CHUYÊN NGHIỆP
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="max-w-md space-y-6">
            {/* Icon cảnh báo */}
            <div className="relative mx-auto w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <AlertTriangle size={40} />
              <div className="absolute inset-0 rounded-full border-4 border-rose-100 animate-ping opacity-25" />
            </div>

            {/* Thông điệp */}
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Rất tiếc, đã có sự cố xảy ra!
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                Ứng dụng gặp một lỗi không mong muốn. Đừng lo lắng, dữ liệu của
                bạn vẫn an toàn. Hãy thử tải lại trang hoặc quay về trang chủ.
              </p>
            </div>

            {/* Chi tiết lỗi (Chỉ hiển thị khi phát triển - Development) */}
            {process.env.NODE_ENV === "development" && (
              <div className="p-3 bg-gray-50 rounded-lg text-left overflow-auto max-h-32 border border-gray-200">
                <p className="text-[10px] font-mono text-rose-600">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}

            {/* Nút hành động */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                onClick={() => window.location.reload()}
                className="bg-gray-900 hover:bg-black text-white px-8 h-12 rounded-xl font-bold"
                leftIcon={<RefreshCcw size={18} />}
              >
                Tải lại trang
              </Button>
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="border-gray-200 text-gray-700 px-8 h-12 rounded-xl font-bold bg-white"
                leftIcon={<Home size={18} />}
              >
                Về trang chủ
              </Button>
            </div>

            <p className="text-[11px] text-gray-400 font-medium">
              Nếu lỗi vẫn tiếp tục diễn ra, vui lòng liên hệ bộ phận hỗ trợ
              GoStay.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
