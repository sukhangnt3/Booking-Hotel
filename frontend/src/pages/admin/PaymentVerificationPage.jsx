// src/pages/admin/PaymentVerificationPage.jsx
import React, { useState, useEffect } from "react";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  Search,
  DollarSign,
  RefreshCw,
  X,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import mailService from "@/services/mailService";

export default function PaymentVerificationPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");

  const [selectedProofImg, setSelectedProofImg] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 🛑 CHỈ ĐỌC DANH SÁCH BẰNG CHỨNG THANH TOÁN THẬT
  const loadPayments = () => {
    setLoading(true);
    const realPayments = JSON.parse(
      localStorage.getItem("pms_payment_verifications") || "[]",
    );
    setPayments(realPayments);
    setLoading(false);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const saveAndSync = (updatedList) => {
    setPayments(updatedList);
    localStorage.setItem(
      "pms_payment_verifications",
      JSON.stringify(updatedList),
    );
  };

  const handleApprove = async (payment) => {
    const updatedPayments = payments.map((p) =>
      p.id === payment.id
        ? { ...p, status: "approved", verifiedAt: new Date().toISOString() }
        : p,
    );
    saveAndSync(updatedPayments);

    const allBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const updatedBookings = allBookings.map((b) =>
      b.code === payment.bookingCode
        ? { ...b, status: "confirmed", payment_status: "paid" }
        : b,
    );
    localStorage.setItem("all_bookings", JSON.stringify(updatedBookings));

    await mailService.sendPaymentApproved(payment.guestEmail, payment);
    alert(
      `✓ Đã DUYỆT thành công giao dịch #${payment.id}! Doanh thu đã được cộng vào hệ thống.`,
    );
  };

  const handleConfirmReject = async () => {
    if (!rejectingPayment) return;
    const reasonText =
      rejectReason.trim() || "Biên lai không hợp lệ hoặc sai số tiền";

    const updatedPayments = payments.map((p) =>
      p.id === rejectingPayment.id
        ? { ...p, status: "rejected", rejectReason: reasonText }
        : p,
    );
    saveAndSync(updatedPayments);

    await mailService.sendPaymentRejected(
      rejectingPayment.guestEmail,
      reasonText,
    );
    alert(
      `Đã TỪ CHỐI giao dịch #${rejectingPayment.id}. Email lý do đã gửi tới khách.`,
    );

    setRejectingPayment(null);
    setRejectReason("");
  };

  const totalVerifiedRevenue = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const approvedCount = payments.filter((p) => p.status === "approved").length;
  const rejectedCount = payments.filter((p) => p.status === "rejected").length;

  const filteredPayments = payments.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        p.bookingCode.toLowerCase().includes(q) ||
        p.guestName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Receipt size={16} /> Thẩm Định Thanh Toán Thực Tế
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Xác Thực Bằng Chứng Chuyển Khoản ({payments.length} Giao dịch)
          </h1>
        </div>

        <button
          onClick={loadPayments}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Doanh Thu Thực Thu
          </span>
          <h3 className="text-2xl font-black text-emerald-700">
            {formatVND(totalVerifiedRevenue)}
          </h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Chờ Thẩm Định
          </span>
          <h3 className="text-2xl font-black text-amber-600">{pendingCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Đã Duyệt
          </span>
          <h3 className="text-2xl font-black text-blue-700">{approvedCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Đã Từ Chối
          </span>
          <h3 className="text-2xl font-black text-rose-600">{rejectedCount}</h3>
        </div>
      </div>

      {/* Bảng */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang tải dữ liệu thanh toán..." />
        </div>
      ) : filteredPayments.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Mã Giao Dịch</th>
                <th className="py-4 px-4">Khách Hàng</th>
                <th className="py-4 px-4">Số Tiền</th>
                <th className="py-4 px-4 text-center">Bằng Chứng</th>
                <th className="py-4 px-4 text-center">Trạng Thái</th>
                <th className="py-4 px-5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="py-4 px-5 font-mono font-bold text-blue-900">
                    {p.id}
                  </td>
                  <td className="py-4 px-4">
                    <strong className="text-slate-900 block">
                      {p.guestName}
                    </strong>
                    <span className="text-slate-400">{p.guestEmail}</span>
                  </td>
                  <td className="py-4 px-4 font-black text-emerald-700">
                    {formatVND(p.amount)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => setSelectedProofImg(p.proofImage)}
                      className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg"
                    >
                      <Eye size={13} className="inline mr-1" />
                      Xem Bill
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${p.status === "approved" ? "bg-emerald-50 text-emerald-700" : p.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    {p.status === "pending" ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleApprove(p)}
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => setRejectingPayment(p)}
                          className="px-3 py-1.5 border border-rose-200 text-rose-600 font-bold rounded-xl text-xs"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Receipt}
          title="Chưa có bằng chứng thanh toán nào"
          description="Khi khách đặt phòng và tải ảnh chuyển khoản, giao dịch sẽ xuất hiện tại đây để Admin thẩm định."
        />
      )}

      {/* Modal xem bill */}
      {selectedProofImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white p-4 rounded-3xl max-w-xl w-full space-y-3">
            <img
              src={selectedProofImg}
              alt="Proof"
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedProofImg(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-3 text-xs">
            <h3 className="font-bold text-rose-600 text-sm">
              Lý Do Từ Chối Thanh Toán
            </h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do gửi về email cho khách..."
              className="w-full p-2.5 border rounded-xl"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 border rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold"
              >
                Từ chối & Gửi mail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
