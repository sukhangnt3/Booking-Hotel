import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const HotelManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 1. FETCH VÀ XỬ LÝ TRẠNG THÁI (CHƯA ĐƯỢC ADMIN DUYỆT = CHỜ DUYỆT 100%)
  // ════════════════════════════════════════════════════════════════════════════
  const fetchMyHotels = async () => {
    setLoading(true);
    try {
      const currentUserId =
        user?.id || JSON.parse(localStorage.getItem("user") || "{}")?.id;
      const currentUserEmail = String(
        user?.email ||
          JSON.parse(localStorage.getItem("user") || "{}")?.email ||
          "",
      )
        .toLowerCase()
        .trim();

      // 1. Lấy danh sách từ API Backend
      let apiList = [];
      try {
        const res = await hotelService.getAll({
          isOwner: true,
          owner_id: currentUserId,
        });
        apiList = Array.isArray(res) ? res : res?.data || res?.hotels || [];
      } catch (e) {
        console.error("Lỗi API hotels:", e);
      }

      // 2. Lấy dữ liệu LocalStorage
      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const approvedHotelIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      const rejectedHotelIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);
      const deletedHotelIds = JSON.parse(
        localStorage.getItem("deleted_hotel_ids") || "[]",
      ).map(String);

      // Gộp API và Local
      const combined = [...apiList, ...localApps];
      const myHotelsMap = new Map();

      combined.forEach((h) => {
        const hotelId = String(
          h.id || h._id || h.hotel_id || h.applicationId || "",
        ).trim();
        const hotelName = String(h.hotelNameVi || h.name || "").trim();
        const hotelOwnerId = String(
          h.owner_id || h.user_id || h.userId || h.ownerId || "",
        ).trim();
        const hotelEmail = String(
          h.emailContact || h.email || h.signerEmail || h.user?.email || "",
        )
          .toLowerCase()
          .trim();

        // 🛑 BỎ QUA NẾU NẰM TRONG DANH SÁCH ĐÃ XOÁ
        if (
          !hotelId ||
          deletedHotelIds.includes(hotelId) ||
          deletedHotelIds.includes(hotelName) ||
          Boolean(h.is_deleted || h.isDeleted || h.deletedAt) ||
          h.status === "deleted"
        ) {
          return;
        }

        // Kiểm tra quyền sở hữu của user
        const isBelongToMe =
          !currentUserEmail ||
          (hotelEmail && hotelEmail === currentUserEmail) ||
          (currentUserId &&
            hotelOwnerId &&
            hotelOwnerId === String(currentUserId)) ||
          (!hotelEmail && !hotelOwnerId);

        if (isBelongToMe) {
          // 🛑 🛑 QUY TẮC PHÂN DUYỆT NGHIÊM NGẶT (CHẶN TUYỆT ĐỐI TỰ ĐỘNG MỞ BÁN) 🛑 🛑
          let finalStatus = "pending";

          // 1. Kiểm tra Từ chối
          if (
            rejectedHotelIds.includes(hotelId) ||
            h.status === "rejected" ||
            h.approval_status === "rejected"
          ) {
            finalStatus = "rejected";
          }
          // 2. CHỈ ĐƯỢC "approved" khi Admin đã thực sự duyệt (ID có trong approvedHotelIds hoặc approval_status === "approved")
          else if (
            approvedHotelIds.includes(hotelId) ||
            h.approval_status === "approved" ||
            (h.status === "approved" &&
              h.is_approved === true &&
              !h.is_new_registration)
          ) {
            finalStatus = "approved";
          }
          // 3. Mọi trường hợp còn lại (mới đăng ký, đang thẩm định) BẮT BUỘC là pending
          else {
            finalStatus = "pending";
          }

          const dedupeKey = hotelName.toLowerCase() || hotelId;

          // Nếu chưa có hoặc bản ghi mới là bản ghi có ID thật thì cập nhật
          if (
            !myHotelsMap.has(dedupeKey) ||
            (h.id && !String(h.id).startsWith("app_"))
          ) {
            myHotelsMap.set(dedupeKey, {
              ...h,
              id: hotelId,
              name: hotelName || "Khách sạn của tôi",
              status: finalStatus, // 👈 Đảm bảo hiển thị "Chờ Admin Duyệt" khi chưa duyệt
              type: h.hotelType || h.type || "Khách sạn",
              address: h.streetAddress || h.address || "Địa chỉ chỗ nghỉ",
              city: h.province || h.city || "Hồ Chí Minh",
              image:
                h.image ||
                h.hotelImages?.[0]?.url ||
                h.hotelImages?.[0]?.preview ||
                h.hotelImages?.[0] ||
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
              total_rooms: h.rooms?.length || h.total_rooms || 1,
              star_rating: h.starRating || h.star_rating || 5,
            });
          }
        }
      });

      setHotels(Array.from(myHotelsMap.values()));
    } catch (error) {
      console.error("Lỗi tải danh sách cơ sở:", error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHotels();
  }, [user]);

  // ════════════════════════════════════════════════════════════════════════════
  // 🗑️ 2. HÀM XÓA CƠ SỞ
  // ════════════════════════════════════════════════════════════════════════════
  const handleDelete = async (hotelObj) => {
    const hotelId = String(
      hotelObj?.id || hotelObj?.hotel_id || hotelObj?.applicationId || "",
    ).trim();
    const hotelName = String(
      hotelObj?.name || hotelObj?.hotelNameVi || "cơ sở này",
    ).trim();

    if (
      !window.confirm(
        `Xác nhận xóa hoàn toàn cơ sở lưu trú "${hotelName}"?\nSau khi xóa, cơ sở sẽ bị gỡ bỏ vĩnh viễn khỏi hệ thống.`,
      )
    )
      return;

    try {
      try {
        if (hotelService?.delete) {
          await hotelService.delete(hotelId);
        }
      } catch (apiErr) {
        console.warn("Backend delete:", apiErr);
      }

      // Thêm vào danh sách xoá
      const deletedList = JSON.parse(
        localStorage.getItem("deleted_hotel_ids") || "[]",
      ).map(String);
      if (hotelId && !deletedList.includes(hotelId)) deletedList.push(hotelId);
      if (hotelName && !deletedList.includes(hotelName))
        deletedList.push(hotelName);
      localStorage.setItem("deleted_hotel_ids", JSON.stringify(deletedList));

      // Xóa khỏi State ngay lập tức
      setHotels((prev) =>
        prev.filter((h) => {
          const currentId = String(
            h.id || h.hotel_id || h.applicationId || "",
          ).trim();
          const currentName = String(h.name || h.hotelNameVi || "").trim();
          return currentId !== hotelId && currentName !== hotelName;
        }),
      );

      // Xóa khỏi LocalStorage
      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const updatedApps = localApps.filter((a) => {
        const aId = String(a.id || a.applicationId || a.hotel_id || "").trim();
        const aName = String(a.name || a.hotelNameVi || "").trim();
        return aId !== hotelId && aName !== hotelName;
      });
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(updatedApps),
      );

      // Xóa khỏi danh sách đã duyệt
      const approvedHotelIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      const updatedApprovedIds = approvedHotelIds.filter(
        (id) => id !== hotelId && id !== hotelName,
      );
      localStorage.setItem(
        "approved_hotel_ids",
        JSON.stringify(updatedApprovedIds),
      );

      alert(`✓ Đã xóa vĩnh viễn cơ sở lưu trú "${hotelName}"!`);
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      alert("Lỗi khi xóa cơ sở: " + (err.message || "Vui lòng thử lại"));
    }
  };

  // Lọc theo trạng thái
  const filteredHotels = hotels.filter((h) => {
    if (statusFilter === "approved") return h.status === "approved";
    if (statusFilter === "pending") return h.status === "pending";
    if (statusFilter === "rejected") return h.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* ── 1. HEADER ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Quản Lý Danh Sách Cơ Sở Lưu Trú ({hotels.length} Cơ sở)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chủ cơ sở:{" "}
            <strong className="text-blue-900">
              {user?.full_name || user?.email}
            </strong>
          </p>
        </div>

        <button
          onClick={() => navigate("/register-owner")}
          className="bg-[#003580] hover:bg-blue-900 text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Plus size={16} /> Đăng Ký Thêm Cơ Sở Mới
        </button>
      </div>

      {/* ── 2. THANH THÔNG BÁO ── */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Quy trình thẩm định từng cơ sở độc lập:</p>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Mỗi cơ sở sau khi đăng ký sẽ được Admin duyệt riêng biệt. Cơ sở nào
            được duyệt sẽ chuyển sang <strong>"Đang Mở Bán"</strong>, cơ sở mới
            thêm sẽ hiển thị <strong>"Chờ Admin Duyệt"</strong>.
          </p>
        </div>
      </div>

      {/* ── 3. BỘ LỌC TRẠNG THÁI ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: "all", label: `Tất cả cơ sở (${hotels.length})` },
          { id: "approved", label: "Đang mở bán" },
          { id: "pending", label: "Chờ Admin duyệt" },
          { id: "rejected", label: "Bị từ chối" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 4. DANH SÁCH CÁC CƠ SỞ ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-2xl border border-slate-200">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách cơ sở của bạn..."
          />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHotels.map((hotel) => {
            const id = hotel.id;
            const status = hotel.status;

            return (
              <div
                key={id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-100">
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-3 right-3">
                      {status === "approved" ? (
                        <span className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> Đang Mở Bán
                        </span>
                      ) : status === "pending" ? (
                        <span className="bg-amber-500 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5 animate-pulse">
                          <Clock size={13} /> Chờ Admin Duyệt
                        </span>
                      ) : (
                        <span className="bg-rose-600 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5">
                          <XCircle size={13} /> Bị Từ Chối
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {hotel.type || "Khách sạn"}
                      </span>
                      {hotel.star_rating > 0 && (
                        <div className="flex items-center text-amber-500 text-xs font-bold">
                          <Star size={13} className="fill-amber-400 mr-0.5" />
                          {hotel.star_rating} Sao
                        </div>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">
                      {hotel.name}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-slate-500 line-clamp-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      {hotel.address}, {hotel.city}
                    </div>

                    {status === "pending" && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                        <AlertCircle
                          size={14}
                          className="shrink-0 text-amber-600"
                        />
                        <span>
                          Cơ sở này đang được Admin thẩm định trong 24h.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 mt-2">
                  <div className="flex items-center justify-between pt-3">
                    <button
                      onClick={() => handleDelete(hotel)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-bold cursor-pointer flex items-center gap-1 transition"
                    >
                      <Trash2 size={13} /> Xóa cơ sở
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/hotel/${id}`)}
                        className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1"
                      >
                        Xem trước <ExternalLink size={12} />
                      </button>

                      {status === "approved" ? (
                        <button
                          onClick={() => navigate(`/owner/rooms?hotelId=${id}`)}
                          className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
                        >
                          Quản lý phòng
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                          title="Cơ sở phải được Admin duyệt mới có thể mở bán phòng"
                        >
                          Chờ kích hoạt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Chưa có cơ sở nào trong mục này"
          description="Đăng ký thêm cơ sở mới để mở rộng chuỗi chỗ nghỉ của bạn."
          actionLabel="Đăng ký cơ sở mới"
          onAction={() => navigate("/register-owner")}
        />
      )}
    </div>
  );
};

export default HotelManagementPage;
