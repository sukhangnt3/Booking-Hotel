import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  BedDouble,
  Users,
  Trash2,
  X,
  ChevronDown,
  Building2,
  Camera,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { roomService, hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const RoomManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);

  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    name: "",
    room_area: 28,
    capacity: 2,
    bed_type: "1 Giường đôi lớn",
    sell_price: 650000,
    room_count: 5,
    image: "",
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ════════════════════════════════════════════════════════════════════════════
  // 🏢 1. TẢI DANH SÁCH CƠ SỞ CỦA OWNER
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadHotels = async () => {
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

        let apiList = [];
        try {
          const res = await hotelService.getAll({
            isOwner: true,
            owner_id: currentUserId,
          });
          apiList = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        } catch (e) {}

        const localApps = JSON.parse(
          localStorage.getItem("pending_partner_applications") || "[]",
        );
        const combined = [...apiList, ...localApps];

        const myHotelsMap = new Map();
        combined.forEach((h) => {
          const hotelId = String(
            h.id || h.applicationId || h.hotel_id || "",
          ).trim();
          const hotelName = String(
            h.hotelNameVi || h.name || "Khách sạn của tôi",
          ).trim();
          const hotelOwnerId = String(
            h.owner_id || h.user_id || h.userId || h.ownerId || "",
          ).trim();
          const hotelEmail = String(
            h.emailContact || h.email || h.signerEmail || h.user?.email || "",
          )
            .toLowerCase()
            .trim();

          const isBelongToMe =
            !currentUserEmail ||
            (hotelEmail && hotelEmail === currentUserEmail) ||
            (currentUserId &&
              hotelOwnerId &&
              hotelOwnerId === String(currentUserId)) ||
            (!hotelEmail && !hotelOwnerId);

          if (isBelongToMe && hotelId) {
            const dedupeKey = hotelName.toLowerCase() || hotelId;

            if (!myHotelsMap.has(dedupeKey)) {
              // Lấy phòng từ nhiều nguồn khả dĩ
              const existingRooms =
                h.rooms ||
                h.roomTypes ||
                h.data?.rooms ||
                JSON.parse(
                  localStorage.getItem(`hotel_rooms_${hotelId}`) || "[]",
                );

              myHotelsMap.set(dedupeKey, {
                ...h,
                id: hotelId,
                name: hotelName,
                city: h.province || h.city || "Hà Nội",
                rooms: Array.isArray(existingRooms) ? existingRooms : [],
              });
            }
          }
        });

        const list = Array.from(myHotelsMap.values());
        setHotels(list);

        const queryHotelId = searchParams.get("hotelId");
        if (
          queryHotelId &&
          list.some((h) => String(h.id) === String(queryHotelId))
        ) {
          setSelectedHotelId(String(queryHotelId));
        } else if (list.length > 0) {
          const firstId = String(list[0].id);
          setSelectedHotelId(firstId);
          setSearchParams({ hotelId: firstId });
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách cơ sở:", err);
      }
    };

    loadHotels();
  }, [user]);

  // ════════════════════════════════════════════════════════════════════════════
  // 🛏️ 2. TẢI TẤT CẢ CÁC PHÒNG ĐÃ TẠO (KHÔNG BỎ SÓT BẤT KỲ PHÒNG NÀO)
  // ════════════════════════════════════════════════════════════════════════════
  const fetchRooms = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let rawRooms = [];

      let targetHotel = hotels.find(
        (h) => String(h.id) === String(selectedHotelId),
      );

      if (!targetHotel) {
        const localApps = JSON.parse(
          localStorage.getItem("pending_partner_applications") || "[]",
        );
        targetHotel = localApps.find(
          (a) =>
            String(a.id || a.applicationId || a.hotel_id) ===
              String(selectedHotelId) ||
            String(a.name || a.hotelNameVi)
              .trim()
              .toLowerCase() === String(selectedHotelId).trim().toLowerCase(),
        );
      }

      // 1. Đọc phòng từ bộ nhớ riêng của khách sạn (theo ID và theo Tên)
      let customSavedRooms = JSON.parse(
        localStorage.getItem(`hotel_rooms_${selectedHotelId}`) || "[]",
      );

      if (
        (!Array.isArray(customSavedRooms) || customSavedRooms.length === 0) &&
        targetHotel?.name
      ) {
        customSavedRooms = JSON.parse(
          localStorage.getItem(
            `hotel_rooms_${targetHotel.name.toLowerCase()}`,
          ) || "[]",
        );
      }

      if (Array.isArray(customSavedRooms) && customSavedRooms.length > 0) {
        rawRooms = customSavedRooms;
      }

      // 2. Nếu chưa có, thử lấy từ API
      if (rawRooms.length === 0) {
        try {
          const res = await (roomService.getByHotelId
            ? roomService.getByHotelId(selectedHotelId)
            : roomService.getAll({ hotel_id: selectedHotelId }));
          const apiRooms = Array.isArray(res)
            ? res
            : res?.data || res?.rooms || [];
          if (apiRooms.length > 0) rawRooms = apiRooms;
        } catch (e) {}
      }

      // 3. Nếu vẫn chưa có, lấy từ mảng phòng đăng ký gốc
      if (rawRooms.length === 0 && targetHotel) {
        const candidateRooms =
          targetHotel.rooms ||
          targetHotel.roomTypes ||
          targetHotel.data?.rooms ||
          targetHotel.data?.roomTypes ||
          [];

        if (Array.isArray(candidateRooms) && candidateRooms.length > 0) {
          rawRooms = candidateRooms;
        }
      }

      // 4. Nếu là cơ sở hoàn toàn mới chưa có phòng nào: tạo phòng mặc định đầu tiên
      if (rawRooms.length === 0 && targetHotel) {
        const defaultPrice = Number(
          targetHotel.weekdayPrice ||
            targetHotel.min_price ||
            targetHotel.base_price ||
            targetHotel.price ||
            targetHotel.salePrice ||
            targetHotel.data?.weekdayPrice ||
            650000,
        );

        const defaultRoom = {
          id: `room_${selectedHotelId}_1`,
          name:
            targetHotel.roomName ||
            targetHotel.data?.roomName ||
            "Phòng Deluxe Giường Đôi (Tiêu Chuẩn)",
          room_area: 28,
          capacity: 2,
          bed_type: "1 Giường đôi lớn",
          sell_price: defaultPrice,
          weekdayPrice: defaultPrice,
          room_count: 5,
          image:
            targetHotel.image ||
            targetHotel.hotelImages?.[0]?.url ||
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
        };

        rawRooms = [defaultRoom];

        // Lưu ngay để đồng bộ
        localStorage.setItem(
          `hotel_rooms_${selectedHotelId}`,
          JSON.stringify(rawRooms),
        );
      }

      // 5. Lọc bỏ các phòng đã bấm nút Xóa
      const deletedRoomIds = JSON.parse(
        localStorage.getItem("deleted_room_ids") || "[]",
      )
        .map(String)
        .filter((id) => id.trim() !== "");

      const finalRooms = rawRooms
        .filter((r) => {
          const rId = String(r.id || r.room_id || "").trim();
          return !rId || !deletedRoomIds.includes(rId);
        })
        .map((r, idx) => ({
          id: r.id || `room_${selectedHotelId}_${idx + 1}`,
          name: r.name || r.roomName || `Phòng Hạng ${idx + 1}`,
          room_area: Number(r.room_area || r.roomSize || r.size || 28),
          capacity: Number(r.capacity || r.maxAdults || 2),
          bed_type: r.bed_type || r.bedType || "1 Giường đôi lớn",
          sell_price: Number(
            r.sell_price || r.weekdayPrice || r.price || 650000,
          ),
          weekdayPrice: Number(
            r.sell_price || r.weekdayPrice || r.price || 650000,
          ),
          room_count: Number(r.room_count || r.totalRooms || r.quantity || 5),
          image:
            r.image ||
            r.roomImages?.[0]?.url ||
            targetHotel?.image ||
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
        }));

      setRooms(finalRooms);
    } catch (err) {
      console.error("Lỗi tải loại phòng:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedHotelId, hotels]);

  // Tải ảnh phòng
  const handleRoomImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 800;
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedRoomImage = canvas.toDataURL("image/jpeg", 0.75);
        setRoomFormData((prev) => ({ ...prev, image: compressedRoomImage }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      name: room.name || "",
      room_area: room.room_area || 28,
      capacity: room.capacity || 2,
      bed_type: room.bed_type || "1 Giường đôi lớn",
      sell_price: room.sell_price || room.weekdayPrice || 650000,
      room_count: room.room_count || 5,
      image: room.image || "",
    });
    setIsModalOpen(true);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 💾 3. LƯU PHÒNG MỚI & ĐỒNG BỘ TOÀN DIỆN VÀO HỆ THỐNG
  // ════════════════════════════════════════════════════════════════════════════
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const currentHotelId = String(selectedHotelId);
    const selectedHotelObj = hotels.find(
      (h) => String(h.id) === currentHotelId,
    );
    const currentHotelName = String(selectedHotelObj?.name || "").trim();

    try {
      let updatedRooms = [];

      if (editingRoom) {
        // Sửa phòng đã có
        const roomId = editingRoom.id;
        try {
          if (roomService?.update)
            await roomService.update(roomId, roomFormData);
        } catch (e) {}

        updatedRooms = rooms.map((r) =>
          r.id === roomId
            ? {
                ...r,
                ...roomFormData,
                weekdayPrice: Number(roomFormData.sell_price),
                sell_price: Number(roomFormData.sell_price),
              }
            : r,
        );
      } else {
        // Tạo thêm phòng mới (Phòng thứ 2, 3...)
        const newRoomId = `room_${currentHotelId}_${Date.now()}`;
        const newRoomObj = {
          id: newRoomId,
          ...roomFormData,
          name: roomFormData.name,
          sell_price: Number(roomFormData.sell_price),
          weekdayPrice: Number(roomFormData.sell_price),
          room_count: Number(roomFormData.room_count),
          capacity: Number(roomFormData.capacity),
          room_area: Number(roomFormData.room_area),
          hotel_id: currentHotelId,
        };

        try {
          if (roomService?.create) await roomService.create(newRoomObj);
        } catch (e) {}

        updatedRooms = [...rooms, newRoomObj];
      }

      // 1. Cập nhật State React ngay trên màn hình
      setRooms(updatedRooms);

      // 2. Lưu vào bộ nhớ theo cả ID và Tên khách sạn
      localStorage.setItem(
        `hotel_rooms_${currentHotelId}`,
        JSON.stringify(updatedRooms),
      );
      if (currentHotelName) {
        localStorage.setItem(
          `hotel_rooms_${currentHotelName.toLowerCase()}`,
          JSON.stringify(updatedRooms),
        );
      }

      // 3. 🛑 ĐỒNG BỘ VÀO pending_partner_applications ĐỂ TRANG CHỦ & TRANG ĐẶT PHÒNG NHẬN DIỆN CẢ 2 PHÒNG
      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const updatedApps = localApps.map((a) => {
        const aId = String(a.id || a.applicationId || a.hotel_id || "").trim();
        const aName = String(a.name || a.hotelNameVi || "").trim();

        if (
          aId === currentHotelId ||
          aName === currentHotelName ||
          aName.toLowerCase() === currentHotelName.toLowerCase()
        ) {
          const prices = updatedRooms.map((r) =>
            Number(r.sell_price || r.weekdayPrice || 650000),
          );
          const minPrice = Math.min(...prices);

          return {
            ...a,
            rooms: updatedRooms,
            roomTypes: updatedRooms,
            weekdayPrice: minPrice,
            min_price: minPrice,
            price: minPrice,
          };
        }
        return a;
      });
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(updatedApps),
      );

      // 4. Cập nhật danh sách khách sạn trong state
      setHotels((prev) =>
        prev.map((h) => {
          if (String(h.id) === currentHotelId || h.name === currentHotelName) {
            return { ...h, rooms: updatedRooms, roomTypes: updatedRooms };
          }
          return h;
        }),
      );

      setIsModalOpen(false);
    } catch (err) {
      alert("Không thể lưu: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setSubmitting(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🗑️ 4. HÀM XÓA PHÒNG
  // ════════════════════════════════════════════════════════════════════════════
  const handleDelete = async (roomId, roomName) => {
    const cleanId = String(roomId || "").trim();
    const cleanName = String(roomName || "").trim();
    const currentHotelId = String(selectedHotelId);

    if (!window.confirm(`Xác nhận xóa vĩnh viễn hạng phòng "${cleanName}"?`))
      return;

    try {
      try {
        if (roomService?.delete) {
          await roomService.delete(cleanId);
        }
      } catch (apiErr) {
        console.warn("Backend delete room:", apiErr);
      }

      // Lưu ID vào danh sách đã xóa
      const deletedList = JSON.parse(
        localStorage.getItem("deleted_room_ids") || "[]",
      ).map(String);
      if (cleanId && !deletedList.includes(cleanId)) deletedList.push(cleanId);
      localStorage.setItem("deleted_room_ids", JSON.stringify(deletedList));

      // Cập nhật State
      const updatedRooms = rooms.filter((r) => String(r.id).trim() !== cleanId);
      setRooms(updatedRooms);

      // Cập nhật LocalStorage
      localStorage.setItem(
        `hotel_rooms_${currentHotelId}`,
        JSON.stringify(updatedRooms),
      );

      // Cập nhật pending_partner_applications
      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const updatedApps = localApps.map((a) => {
        if (String(a.id || a.applicationId || a.hotel_id) === currentHotelId) {
          return { ...a, rooms: updatedRooms, roomTypes: updatedRooms };
        }
        return a;
      });
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(updatedApps),
      );

      alert(`✓ Đã xóa hạng phòng "${cleanName}" thành công!`);
    } catch (err) {
      console.error("Lỗi khi xóa phòng:", err);
      alert("Không thể xóa phòng: " + err.message);
    }
  };

  const selectedHotelObj = hotels.find(
    (h) => String(h.id) === String(selectedHotelId),
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* INPUT FILE ẨN ĐỔI ẢNH */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRoomImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* ── 1. HEADER & CHỌN CƠ SỞ ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 size={16} /> Kênh Quản Trị Hạng Phòng
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Quản Lý Phòng & Bảng Giá Theo Cơ Sở
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn cơ sở lưu trú để thiết lập giá bán, số lượng phòng và hình ảnh
            phòng
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {hotels.length > 0 && (
            <div className="relative flex-1 sm:w-72">
              <select
                value={selectedHotelId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedHotelId(newId);
                  setSearchParams({ hotelId: newId });
                }}
                className="w-full bg-blue-50/70 border-2 border-blue-200 text-blue-950 text-xs font-black px-3.5 py-3 rounded-xl outline-none focus:border-[#003580] appearance-none pr-8 cursor-pointer shadow-xs"
              >
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    🏢 {h.name} ({h.city})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-700 pointer-events-none"
              />
            </div>
          )}

          <button
            onClick={() => {
              setEditingRoom(null);
              setRoomFormData({
                name: "",
                room_area: 28,
                capacity: 2,
                bed_type: "1 Giường đôi lớn",
                sell_price: 650000,
                room_count: 5,
                image: "",
              });
              setIsModalOpen(true);
            }}
            disabled={!selectedHotelId}
            className="bg-[#003580] hover:bg-blue-900 text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition shrink-0 disabled:opacity-50 cursor-pointer shadow-md"
          >
            <Plus size={16} /> Thêm Hạng Phòng Mới
          </button>
        </div>
      </div>

      {/* ── 2. BẢNG DANH SÁCH HẠNG PHÒNG ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-2xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang tải danh mục phòng..." />
        </div>
      ) : rooms.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">
              Đang xem phòng của:{" "}
              <strong className="text-blue-900 text-sm">
                {selectedHotelObj?.name}
              </strong>
            </span>
            <span className="text-slate-500 font-semibold">
              Tổng cộng:{" "}
              <strong className="text-slate-900">{rooms.length}</strong> loại
              phòng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5">Hạng phòng & Hình ảnh</th>
                  <th className="py-3.5 px-4">Diện tích</th>
                  <th className="py-3.5 px-4">Sức chứa</th>
                  <th className="py-3.5 px-4">Loại giường</th>
                  <th className="py-3.5 px-4 text-right">Giá bán / đêm</th>
                  <th className="py-3.5 px-4 text-center">Tồn kho</th>
                  <th className="py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rooms.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                            {r.image ? (
                              <img
                                src={r.image}
                                alt={r.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block text-sm">
                              {r.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Mã: #{r.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold">
                        {r.room_area} m²
                      </td>
                      <td className="py-4 px-4 font-semibold">
                        Tối đa {r.capacity} khách
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-600">
                        {r.bed_type}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-[#ff5b00] text-sm">
                        {formatVND(r.sell_price || r.weekdayPrice)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {r.room_count} phòng
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(r)}
                            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Sửa giá & ảnh
                          </button>

                          <button
                            onClick={() => handleDelete(r.id, r.name)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition cursor-pointer"
                            title="Xóa phòng này"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={BedDouble}
          title={`Chưa có hạng phòng nào cho cơ sở "${selectedHotelObj?.name || ""}"`}
          description="Hãy tạo các hạng phòng để bắt đầu đón khách đặt trên hệ thống."
          actionLabel="Thêm hạng phòng đầu tiên"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* ── 3. MODAL SỬA / THÊM PHÒNG ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {editingRoom
                    ? "Cập Nhật Hạng Phòng & Ảnh"
                    : "Thêm Hạng Phòng Mới"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cơ sở:{" "}
                  <strong className="text-blue-900">
                    {selectedHotelObj?.name}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-20 rounded-lg bg-slate-200 border-2 border-dashed border-slate-300 hover:border-blue-500 overflow-hidden flex items-center justify-center cursor-pointer relative shadow-inner group"
                >
                  {roomFormData.image ? (
                    <img
                      src={roomFormData.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:opacity-90"
                    />
                  ) : (
                    <div className="text-center p-1 text-slate-400">
                      <Camera
                        size={20}
                        className="mx-auto mb-1 text-slate-500"
                      />
                      <span className="text-[10px] font-bold block">
                        Tải ảnh phòng
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <p className="font-bold text-slate-800 text-xs">
                    Hình ảnh thực tế của phòng
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Tải ảnh sắc nét từ máy tính.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Upload size={12} />{" "}
                    {roomFormData.image ? "Đổi ảnh khác" : "Chọn ảnh từ máy"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Tên Hạng phòng *
                </label>
                <input
                  value={roomFormData.name}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:border-[#003580] outline-none"
                  placeholder="VD: Deluxe King Hướng Biển, Suite Gia Đình..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Giá bán / Đêm (VNĐ) *
                  </label>
                  <input
                    type="number"
                    value={roomFormData.sell_price}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        sell_price: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-black text-[#ff5b00] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Số phòng trong kho *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={roomFormData.room_count}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        room_count: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Diện tích (m²)
                  </label>
                  <input
                    type="number"
                    value={roomFormData.room_area}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        room_area: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Sức chứa (Người lớn)
                  </label>
                  <input
                    type="number"
                    value={roomFormData.capacity}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Cấu hình giường
                </label>
                <input
                  value={roomFormData.bed_type}
                  onChange={(e) =>
                    setRoomFormData({
                      ...roomFormData,
                      bed_type: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none"
                  placeholder="VD: 1 Giường đôi lớn hoặc 2 Giường đơn"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {submitting ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagementPage;
