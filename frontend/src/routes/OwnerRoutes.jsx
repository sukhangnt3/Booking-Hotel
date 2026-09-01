import React from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";
import {
  Clock,
  PhoneCall,
  Home,
  LogOut,
  AlertCircle,
  XCircle,
  FileEdit,
  ShieldAlert,
} from "lucide-react";

const OwnerRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, systemToken, isRehydrated, logout } = useAuthStore();
  const activeToken = token || systemToken || localStorage.getItem("token");

  if (isRehydrated === false) {
    return <LoadingSpinner fullPage label="Đang xác thực quyền đối tác..." />;
  }

  if (!activeToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleStr = String(user?.role || user?.role_name || "").toLowerCase();
  const isAdmin = roleStr.includes("admin") || user?.role_id === 1;
  const isStaff = roleStr === "staff" || roleStr === "receptionist"; // 👈 NHẬN DIỆN LỄ TÂN

  const myEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  // 1. KIỂM TRA TỪ CHỐI
  const rejectedRecords = JSON.parse(
    localStorage.getItem("rejected_owner_records") || "{}",
  );
  const rejectionInfo = rejectedRecords[myEmail];

  const isRejected = !isAdmin && !isStaff && Boolean(rejectionInfo);
  const rejectReason =
    rejectionInfo?.reason ||
    "Giấy phép kinh doanh không hợp lệ hoặc thiếu hình ảnh.";

  if (isRejected) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white max-w-lg w-full rounded-3xl border border-rose-200 p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="relative w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
            <XCircle size={44} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldAlert size={14} /> Hồ sơ không được phê duyệt
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Hồ Sơ Đăng Ký Bị Từ Chối
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              Rất tiếc, hồ sơ đăng ký cơ sở lưu trú của Quý đối tác{" "}
              <strong>{user?.email}</strong> chưa đạt tiêu chuẩn phê duyệt.
            </p>
          </div>

          <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 text-left text-xs space-y-1.5">
            <span className="font-extrabold text-rose-900 flex items-center gap-1.5">
              <AlertCircle size={15} className="text-rose-600" /> Lý do từ Ban
              Quản Trị:
            </span>
            <p className="text-rose-800 leading-relaxed font-medium pl-5">
              "{rejectReason}"
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate("/register-owner")}
              className="w-full py-3.5 px-4 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
            >
              <FileEdit size={16} /> Chỉnh sửa & Nộp lại hồ sơ
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/")}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Home size={14} /> Về trang chủ
              </button>

              <button
                onClick={() => {
                  if (logout) logout();
                  navigate("/login");
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut size={14} /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. KIỂM TRA PHÊ DUYỆT (CHO PHÉP CẢ ADMIN, OWNER ĐÃ DUYỆT VÀ STAFF LỄ TÂN)
  const approvedEmails = JSON.parse(
    localStorage.getItem("approved_owner_emails") || "[]",
  );

  // 🛑 NẾU LÀ STAFF HOẶC ADMIN HOẶC OWNER ĐÃ DUYỆT -> CHO PHÉP TRUY CẬP 100%
  const isApproved = isAdmin || isStaff || approvedEmails.includes(myEmail);

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="relative w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-100 shadow-sm">
            <Clock size={40} className="animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
              <AlertCircle size={14} /> Chờ Admin phê duyệt
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tài Khoản Đang Chờ Xét Duyệt
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              Hồ sơ đăng ký chỗ nghỉ của Quý đối tác{" "}
              <strong>{user?.email}</strong> đang được thẩm định trong vòng{" "}
              <strong>24h - 48h</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => navigate("/")}
              className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Home size={15} /> Về trang chủ
            </button>
            <button
              onClick={() => {
                if (logout) logout();
                navigate("/login");
              }}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default OwnerRoutes;
