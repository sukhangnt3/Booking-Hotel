import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Building2,
  MapPin,
  BedDouble,
  Settings,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  ExternalLink,
  DoorOpen,
} from "lucide-react";

// UI Kit & Common Components
import { Button, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services
import { hotelService } from "@/services";

const HotelManagementPage = () => {
  const navigate = useNavigate();

  // ─── 1. STATES KẾT NỐI API ───
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // ─── 2. GỌI API LẤY DANH SÁCH KHÁCH SẠN CỦA OWNER ───
  const fetchMyHotels = async () => {
    setLoading(true);
    try {
      // Gọi API lấy danh sách khách sạn của chủ nhà
      const res = await hotelService.getAll({ isOwner: true });
      const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
      setHotels(list);
    } catch (error) {
      console.error("Lỗi khi tải danh sách khách sạn của tôi:", error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHotels();
  }, []);

  // ─── 3. XÓA CHỖ NGHỈ ───
  const handleDeleteHotel = async (e, hotelId, hotelName) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa chỗ nghỉ "${hotelName}" không? Dữ liệu phòng và đơn đặt sẽ bị xóa vĩnh viễn.`,
      )
    ) {
      return;
    }

    setDeletingId(hotelId);
    try {
      await hotelService.delete(hotelId);
      setHotels((prev) => prev.filter((h) => (h.id || h.hotel_id) !== hotelId));
    } catch (err) {
      alert("Không thể xóa khách sạn: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* ─── HEADER & NÚT THÊM MỚI ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Kênh Đối Tác
            </span>
            <Badge variant="primary" size="sm">
              {hotels.length} Chỗ nghỉ
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Khách Sạn Của Tôi
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Quản lý danh sách chỗ nghỉ, cập nhật thông tin phòng và theo dõi
            trạng thái phê duyệt từ sàn.
          </p>
        </div>

        <Button
          onClick={() => navigate("/owner/register-hotel")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 h-12 rounded-2xl shadow-lg shadow-emerald-100 shrink-0"
          leftIcon={<Plus size={18} />}
        >
          Thêm Chỗ Nghỉ Mới
        </Button>
      </div>

      {/* ─── DANH SÁCH KHÁCH SẠN THẬT ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách chỗ nghỉ của bạn..."
          />
        </div>
      ) : hotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotels.map((hotel) => {
            const id = hotel.id || hotel.hotel_id || hotel._id;
            const isDeleting = deletingId === id;
            const isApproved = hotel.status === "approved" || hotel.is_approved;
            const image =
              hotel.image ||
              hotel.images?.[0]?.path ||
              hotel.images?.[0] ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";

            return (
              <div
                key={id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* ẢNH & BADGE TRẠNG THÁI */}
                  <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                    <img
                      src={image}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Badge trạng thái duyệt */}
                    <div className="absolute top-3 right-3 z-10">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                          <CheckCircle2 size={13} /> Đã Duyệt & Mở Bán
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                          <Clock size={13} /> Chờ Admin Duyệt
                        </span>
                      )}
                    </div>

                    {/* Điểm đánh giá */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                      <StarRating
                        rating={hotel.star_rating || hotel.stars || 5}
                        size={12}
                      />
                      <span className="text-[11px] opacity-90">
                        ({hotel.review_count || 0} đánh giá)
                      </span>
                    </div>
                  </div>

                  {/* THÔNG TIN CHI TIẾT */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                        {hotel.type || "Khách sạn / Resort"}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 leading-snug group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {hotel.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium line-clamp-1">
                      <MapPin size={14} className="text-emerald-600 shrink-0" />
                      <span>
                        {hotel.address}, {hotel.city}
                      </span>
                    </div>

                    {/* Chỉ số phòng */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5">
                        <BedDouble size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Tổng phòng
                          </p>
                          <p className="font-black text-slate-800 text-sm">
                            {hotel.total_rooms || hotel.totalRooms || 0} phòng
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-2xl flex items-center gap-2.5">
                        <DoorOpen size={16} className="text-emerald-600" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-emerald-600">
                            Đang hoạt động
                          </p>
                          <p className="font-black text-emerald-800 text-sm">
                            {hotel.active_rooms || hotel.activeRooms || 0} phòng
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NÚT THAO TÁC (ACTIONS) */}
                <div className="p-6 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/owner/hotels/edit/${id}`)}
                      className="w-full text-xs font-bold border-slate-200 hover:bg-slate-50 rounded-xl"
                      leftIcon={<Settings size={14} />}
                    >
                      Sửa Thông Tin
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => navigate(`/owner/rooms?hotelId=${id}`)}
                      className="w-full text-xs font-black bg-[#006ce4] hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-100"
                      leftIcon={<BedDouble size={14} />}
                    >
                      Quản Lý Phòng
                    </Button>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => window.open(`/hotel/${id}`, "_blank")}
                      className="text-xs text-slate-500 hover:text-emerald-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink size={13} /> Xem trang công khai
                    </button>

                    <button
                      disabled={isDeleting}
                      onClick={(e) => handleDeleteHotel(e, id, hotel.name)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      <Trash2 size={13} />{" "}
                      {isDeleting ? "Đang xóa..." : "Xóa chỗ nghỉ"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Bạn chưa đăng chỗ nghỉ nào"
          description="Bắt đầu tiếp cận hàng triệu du khách trên GoStay bằng cách đăng ký chỗ nghỉ đầu tiên của bạn ngay hôm nay."
          actionLabel="Tạo chỗ nghỉ đầu tiên"
          onAction={() => navigate("/owner/register-hotel")}
        />
      )}
    </div>
  );
};

export default HotelManagementPage;
