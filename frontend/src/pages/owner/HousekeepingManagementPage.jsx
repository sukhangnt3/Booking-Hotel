// src/pages/owner/HousekeepingManagementPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Brush,
  FileEdit,
  X,
  BedDouble,
  PlusCircle,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import PropertySearchSelector from "@/components/common/PropertySearchSelector";

export default function HousekeepingManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const userRole = String(user?.role || user?.role_name || "").toLowerCase();
  const isAdmin = userRole.includes("admin") || user?.role_id === 1;
  const userEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFloor, setFilterFloor] = useState("all");
  const [search, setSearch] = useState("");

  const [editingNoteRoom, setEditingNoteRoom] = useState(null);
  const [noteContent, setNoteContent] = useState("");
  const [editingStaffRoom, setEditingStaffRoom] = useState(null);
  const [staffInput, setStaffInput] = useState("");

  // 1. Đồng bộ danh sách cơ sở CHUẨN XÁC từ HotelManagementPage
  const loadScopedHotels = () => {
    try {
      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const approvedIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      const rejectedIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);

      // Lọc cơ sở của user và ĐÃ ĐƯỢC DUYỆT (hoặc admin)
      const ownedApprovedHotels = localApps
        .filter((h) => {
          const hId = String(h.id || h.applicationId || "").trim();
          const hEmail = String(h.emailContact || h.email || "")
            .toLowerCase()
            .trim();
          const isMine = !userEmail || hEmail === userEmail || isAdmin;
          const isApproved =
            approvedIds.includes(hId) || h.status === "approved";
          const isRejected =
            rejectedIds.includes(hId) || h.status === "rejected";

          // Admin thấy tất cả đã duyệt, Owner thấy cơ sở của mình đã duyệt (hoặc chưa từ chối)
          return isMine && (isApproved || isAdmin) && !isRejected;
        })
        .map((h, idx) => {
          const id = String(h.id || h.applicationId || `HT-${idx + 1}`).trim();
          return {
            id,
            name: h.name || h.hotelNameVi || "Cơ sở lưu trú",
            city: h.province || h.city || "Việt Nam",
            address: h.address || h.streetAddress || "",
            image:
              h.image ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
          };
        });

      setMyHotels(ownedApprovedHotels);

      // Tự động chọn khách sạn đầu tiên nếu chưa chọn hoặc ID không hợp lệ
      let activeId = searchParams.get("hotelId") || selectedHotelId;
      const exists = ownedApprovedHotels.some(
        (h) => String(h.id) === String(activeId),
      );

      if ((!activeId || !exists) && ownedApprovedHotels.length > 0) {
        activeId = String(ownedApprovedHotels[0].id);
        setSelectedHotelId(activeId);
        setSearchParams({ hotelId: activeId });
      } else if (exists) {
        setSelectedHotelId(activeId);
      }

      return activeId;
    } catch (err) {
      console.error("Lỗi nạp cơ sở:", err);
      setMyHotels([]);
      return "";
    }
  };

  // 2. Nạp danh sách phòng thật của cơ sở đang chọn
  const loadRoomsForHotel = (hotelId) => {
    setLoading(true);
    try {
      if (!hotelId) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const masterRooms = JSON.parse(
        localStorage.getItem("pms_hotel_rooms_master") || "[]",
      );
      const savedHk = JSON.parse(
        localStorage.getItem("pms_housekeeping_rooms") || "[]",
      );

      // Lọc phòng thuộc đúng khách sạn đã chọn
      const matchedMaster = masterRooms.filter(
        (mr) =>
          String(mr.hotel_id || mr.hotelId).trim() === String(hotelId).trim(),
      );

      const combinedRooms = matchedMaster.map((mr) => {
        const hkData = savedHk.find(
          (h) =>
            String(h.id) === String(mr.id) &&
            String(h.hotel_id) === String(hotelId),
        );

        return {
          id: mr.id,
          hotel_id: String(mr.hotel_id || hotelId),
          hotel_name: mr.hotel_name || "",
          number: mr.room_number || mr.number || `P.${mr.id}`,
          type: mr.category || mr.name || mr.room_type || "Phòng tiêu chuẩn",
          floor: mr.floor
            ? String(mr.floor).includes("Tầng")
              ? mr.floor
              : `Tầng ${mr.floor}`
            : "Tầng 1",
          status: hkData?.status || mr.room_status || mr.status || "clean",
          housekeeper: hkData?.housekeeper || "Chưa phân công",
          notes: hkData?.notes || mr.description || "",
          lastCleaned:
            hkData?.lastCleaned ||
            new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
        };
      });

      setRooms(combinedRooms);
    } catch (err) {
      console.error("Lỗi nạp danh sách phòng:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // Chạy khi khởi động hoặc đổi user
  useEffect(() => {
    const activeHotelId = loadScopedHotels();
    loadRoomsForHotel(activeHotelId);
  }, [user]);

  // Khi đổi khách sạn trên selector
  useEffect(() => {
    if (selectedHotelId) {
      loadRoomsForHotel(selectedHotelId);
    }
  }, [selectedHotelId]);

  const selectedHotelObj = myHotels.find(
    (h) => String(h.id) === String(selectedHotelId),
  );

  // 3. Cập nhật trạng thái dọn dẹp trực tiếp
  const updateRoomStatus = (roomId, newStatus) => {
    const updated = rooms.map((r) => {
      if (r.id === roomId) {
        return {
          ...r,
          status: newStatus,
          lastCleaned:
            newStatus === "clean"
              ? new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : r.lastCleaned,
        };
      }
      return r;
    });

    setRooms(updated);

    // Đồng bộ vào pms_housekeeping_rooms
    const allHk = JSON.parse(
      localStorage.getItem("pms_housekeeping_rooms") || "[]",
    ).filter((h) => String(h.hotel_id) !== String(selectedHotelId));
    localStorage.setItem(
      "pms_housekeeping_rooms",
      JSON.stringify([...allHk, ...updated]),
    );

    // Đồng bộ trạng thái sang pms_hotel_rooms_master để bên Quản lý phòng cũng thấy
    const masterRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    const updatedMaster = masterRooms.map((mr) =>
      mr.id === roomId ? { ...mr, room_status: newStatus } : mr,
    );
    localStorage.setItem(
      "pms_hotel_rooms_master",
      JSON.stringify(updatedMaster),
    );
  };

  // 4. Lưu người phụ trách dọn phòng
  const handleSaveHousekeeper = (roomId, staffName) => {
    const name = staffName.trim() || "Chưa phân công";
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, housekeeper: name } : r,
    );
    setRooms(updated);

    const allHk = JSON.parse(
      localStorage.getItem("pms_housekeeping_rooms") || "[]",
    ).filter((h) => String(h.hotel_id) !== String(selectedHotelId));
    localStorage.setItem(
      "pms_housekeeping_rooms",
      JSON.stringify([...allHk, ...updated]),
    );
    setEditingStaffRoom(null);
  };

  // 5. Lưu ghi chú dọn phòng
  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!editingNoteRoom) return;

    const updated = rooms.map((r) =>
      r.id === editingNoteRoom.id ? { ...r, notes: noteContent } : r,
    );
    setRooms(updated);

    const allHk = JSON.parse(
      localStorage.getItem("pms_housekeeping_rooms") || "[]",
    ).filter((h) => String(h.hotel_id) !== String(selectedHotelId));
    localStorage.setItem(
      "pms_housekeeping_rooms",
      JSON.stringify([...allHk, ...updated]),
    );

    setEditingNoteRoom(null);
  };

  // Tầng thực tế của các phòng hiện có
  const availableFloors = useMemo(() => {
    const floors = new Set(rooms.map((r) => r.floor).filter(Boolean));
    return Array.from(floors).sort();
  }, [rooms]);

  // Bộ lọc
  const scopedRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterFloor !== "all" && r.floor !== filterFloor) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.number.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.housekeeper.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rooms, filterStatus, filterFloor, search]);

  const totalRoomsCount = scopedRooms.length;
  const cleanCount = scopedRooms.filter((r) => r.status === "clean").length;
  const dirtyCount = scopedRooms.filter((r) => r.status === "dirty").length;
  const inProgressCount = scopedRooms.filter(
    (r) => r.status === "in_progress",
  ).length;
  const maintenanceCount = scopedRooms.filter(
    (r) => r.status === "maintenance",
  ).length;
  const completionRate =
    totalRoomsCount > 0 ? Math.round((cleanCount / totalRoomsCount) * 100) : 0;

  const statusConfig = {
    clean: {
      label: "Sạch sẽ",
      color: "bg-emerald-50 text-emerald-700 border-emerald-300",
      icon: CheckCircle2,
    },
    dirty: {
      label: "Cần dọn",
      color: "bg-rose-50 text-rose-700 border-rose-300",
      icon: AlertTriangle,
    },
    in_progress: {
      label: "Đang dọn",
      color: "bg-amber-50 text-amber-800 border-amber-300",
      icon: Clock,
    },
    maintenance: {
      label: "Bảo trì",
      color: "bg-slate-100 text-slate-700 border-slate-300",
      icon: Brush,
    },
  };

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles size={16} /> Quản Trị Buồng Phòng Theo Từng Cơ Sở
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Theo Dõi Vệ Sinh Buồng Phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đang giám sát buồng phòng tại:{" "}
            <strong className="text-blue-900 font-black">
              {selectedHotelObj?.name || "Chưa chọn cơ sở"}
            </strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {myHotels.length > 0 && (
            <PropertySearchSelector
              hotels={myHotels}
              selectedHotelId={selectedHotelId}
              onSelectHotel={(id) => {
                setSelectedHotelId(id);
                setSearchParams({ hotelId: id });
              }}
              showAllOption={false}
              placeholder="Chọn cơ sở để quản lý..."
            />
          )}

          <button
            onClick={() => {
              const id = loadScopedHotels();
              loadRoomsForHotel(id);
            }}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer flex items-center justify-center shrink-0"
            title="Làm mới"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Trường hợp chưa có cơ sở nào được duyệt */}
      {myHotels.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Chưa có cơ sở nào đang mở bán"
          description="Cơ sở của bạn cần ở trạng thái 'Đang Mở Bán' (Admin đã duyệt) để bắt đầu điều phối buồng phòng."
          actionLabel="Xem Danh Sách Chỗ Nghỉ"
          onAction={() => navigate("/owner/hotels")}
        />
      ) : (
        <>
          {/* Dashboard chỉ số */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                  SẠCH SẴN SÀNG
                </span>
                <h3 className="text-2xl font-black text-emerald-900 mt-1">
                  {cleanCount} / {totalRoomsCount}
                </h3>
                <span className="text-[10px] text-emerald-700">
                  Phòng đón khách
                </span>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">
                  CẦN DỌN DẸP
                </span>
                <h3 className="text-2xl font-black text-rose-900 mt-1">
                  {dirtyCount}
                </h3>
                <span className="text-[10px] text-rose-700">Chờ vệ sinh</span>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">
                  ĐANG VỆ SINH
                </span>
                <h3 className="text-2xl font-black text-amber-900 mt-1">
                  {inProgressCount}
                </h3>
                <span className="text-[10px] text-amber-700">
                  Đang thực hiện
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">
                  ĐANG BẢO TRÌ
                </span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  {maintenanceCount}
                </h3>
                <span className="text-[10px] text-slate-500">
                  Đang sửa chữa
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-700">
                  Tiến độ buồng phòng sạch:
                </span>
                <span className="text-emerald-700 font-black text-sm">
                  {completionRate}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Thanh lọc */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
              {[
                { id: "all", label: "Tất cả" },
                { id: "clean", label: "🟢 Sạch" },
                { id: "dirty", label: "🔴 Cần Dọn" },
                { id: "in_progress", label: "🟡 Đang Dọn" },
                { id: "maintenance", label: "⚪ Bảo Trì" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setFilterStatus(st.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                    filterStatus === st.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border rounded-xl outline-none cursor-pointer"
              >
                <option value="all">Tất cả tầng</option>
                {availableFloors.map((fl) => (
                  <option key={fl} value={fl}>
                    {fl}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 md:w-64">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Tìm phòng, nhân viên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Danh sách phòng */}
          {loading ? (
            <div className="py-24 flex justify-center bg-white rounded-3xl border">
              <LoadingSpinner
                size="lg"
                label="Đang nạp danh sách buồng phòng..."
              />
            </div>
          ) : scopedRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {scopedRooms.map((room) => {
                const cfg = statusConfig[room.status] || statusConfig.clean;
                const Icon = cfg.icon;

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">
                            {room.number}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {room.type} • {room.floor}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${cfg.color}`}
                        >
                          <Icon
                            size={13}
                            className={
                              room.status === "in_progress"
                                ? "animate-spin"
                                : ""
                            }
                          />
                          {cfg.label}
                        </span>
                      </div>

                      <div className="mt-3.5 p-3 bg-slate-50 rounded-2xl border text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Phụ trách:</span>
                          <button
                            onClick={() => {
                              setEditingStaffRoom(room);
                              setStaffInput(
                                room.housekeeper === "Chưa phân công"
                                  ? ""
                                  : room.housekeeper,
                              );
                            }}
                            className="font-bold text-blue-900 hover:underline bg-white px-2 py-1 rounded-lg border border-slate-200 text-[11px] cursor-pointer"
                          >
                            👤 {room.housekeeper}
                          </button>
                        </div>

                        <p className="flex justify-between text-slate-500">
                          <span>Dọn lần cuối:</span>
                          <span className="font-mono text-slate-700 font-semibold">
                            {room.lastCleaned}
                          </span>
                        </p>

                        <div className="pt-2 border-t border-slate-200">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-slate-400 font-bold text-[10px] uppercase">
                              Ghi chú buồng phòng:
                            </span>
                            <button
                              onClick={() => {
                                setEditingNoteRoom(room);
                                setNoteContent(room.notes || "");
                              }}
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <FileEdit size={11} /> Sửa
                            </button>
                          </div>
                          <p className="text-slate-700 italic text-[11px] leading-relaxed line-clamp-2">
                            {room.notes || "Không có ghi chú"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => updateRoomStatus(room.id, "clean")}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Sạch
                      </button>
                      <button
                        onClick={() => updateRoomStatus(room.id, "dirty")}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Cần dọn
                      </button>
                      <button
                        onClick={() => updateRoomStatus(room.id, "in_progress")}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Đang dọn
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={BedDouble}
              title={`Cơ sở "${selectedHotelObj?.name}" chưa có phòng nào`}
              description="Hãy vào mục 'Quản lý phòng' để tạo danh sách phòng cho cơ sở này trước khi giám sát buồng phòng."
              actionLabel="+ Đi đến Quản Lý Phòng"
              onAction={() =>
                navigate(`/owner/rooms?hotelId=${selectedHotelId}`)
              }
            />
          )}
        </>
      )}

      {/* Modal đổi nhân viên phụ trách */}
      {editingStaffRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900">
                Phân Công Nhân Viên - {editingStaffRoom.number}
              </h3>
              <button
                onClick={() => setEditingStaffRoom(null)}
                className="cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Tên nhân viên dọn dẹp:
              </label>
              <input
                type="text"
                value={staffInput}
                onChange={(e) => setStaffInput(e.target.value)}
                placeholder="VD: Nguyễn Văn A, Tổ dọn 1..."
                className="w-full p-2.5 border rounded-xl text-xs outline-none focus:border-blue-600"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaffRoom(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveHousekeeper(editingStaffRoom.id, staffInput)
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ghi chú */}
      {editingNoteRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <FileEdit size={16} className="text-blue-600" /> Ghi Chú Buồng
                Phòng - {editingNoteRoom.number}
              </h3>
              <button
                onClick={() => setEditingNoteRoom(null)}
                className="cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung ghi chú cho nhân viên dọn:
                </label>
                <textarea
                  rows={3}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="VD: Khách check-in sớm lúc 12:00, bổ sung 2 gối thêm..."
                  className="w-full p-2.5 border rounded-2xl outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingNoteRoom(null)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  Lưu Ghi Chú
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
