// src/pages/owner/HousekeepingPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Check,
  Building2,
  BedDouble,
  UserCheck,
  Send,
  X,
  Smartphone,
  Printer,
  User,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function HousekeepingPage() {
  const { user } = useAuthStore();
  const userRole = String(user?.role || user?.role_name || "").toLowerCase();
  const isReceptionist = userRole === "receptionist" || userRole === "staff";
  const isAdmin = userRole.includes("admin") || user?.role_id === 1;
  const userEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");

  const [tasks, setTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCleaner, setFilterCleaner] = useState("all"); // Lọc theo nhân viên
  const [search, setSearch] = useState("");

  // 👥 Danh sách nhân viên buồng phòng
  const cleanersList = [
    {
      id: "CL-1",
      name: "Nguyễn Thị Lan",
      area: "Tầng 1 - 2",
      phone: "0912.345.671",
    },
    {
      id: "CL-2",
      name: "Trần Văn Nam",
      area: "Tầng 3 - 4",
      phone: "0912.345.672",
    },
    {
      id: "CL-3",
      name: "Lê Thị Hoa",
      area: "Ca tối & Đột xuất",
      phone: "0912.345.673",
    },
  ];

  // Modal cử nhân viên dọn phòng
  const [assignModalTask, setAssignModalTask] = useState(null);
  const [selectedCleanerName, setSelectedCleanerName] = useState("");

  // Modal tạo yêu cầu dọn phòng mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomType, setNewRoomType] = useState("Phòng Tiêu Chuẩn");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [assignedCleanerOnCreate, setAssignedCleanerOnCreate] = useState("");

  // 1. TẢI CƠ SỞ
  const loadScopedHotels = () => {
    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );
    const approvedIds = JSON.parse(
      localStorage.getItem("approved_hotel_ids") || "[]",
    ).map(String);
    const rejectedIds = JSON.parse(
      localStorage.getItem("rejected_hotel_ids") || "[]",
    ).map(String);

    let scopedList = [];

    const approvedHotels = localApps
      .filter(
        (h) =>
          approvedIds.includes(String(h.id || h.applicationId)) &&
          !rejectedIds.includes(String(h.id || h.applicationId)) &&
          h.status === "approved",
      )
      .map((h) => ({
        id: String(h.id || h.applicationId),
        name: h.name || h.hotelNameVi || h.hotel_name || "Cơ sở lưu trú",
        city: h.province || h.city || "Việt Nam",
      }));

    if (isReceptionist) {
      const assignedHotelId = String(user?.hotel_id || "");
      const matched = approvedHotels.find((h) => h.id === assignedHotelId);

      if (matched) {
        scopedList = [matched];
      } else if (user?.hotel_name) {
        scopedList = [
          {
            id: assignedHotelId || "HT-1",
            name: user.hotel_name,
            city: "Việt Nam",
          },
        ];
      } else {
        scopedList =
          approvedHotels.length > 0
            ? approvedHotels
            : localApps.map((h) => ({
                id: String(h.id || h.applicationId),
                name: h.name || h.hotelNameVi || "Cơ sở lưu trú",
                city: h.province || "Việt Nam",
              }));
      }
    } else if (isAdmin) {
      scopedList =
        approvedHotels.length > 0
          ? approvedHotels
          : localApps.map((h) => ({
              id: String(h.id || h.applicationId),
              name: h.name || h.hotelNameVi || "Cơ sở lưu trú",
              city: h.province || "Việt Nam",
            }));
    } else {
      scopedList = approvedHotels.filter((h) => {
        const app = localApps.find(
          (a) => String(a.id || a.applicationId) === h.id,
        );
        const ownerMail = String(app?.emailContact || app?.email || "")
          .toLowerCase()
          .trim();
        return ownerMail === userEmail;
      });
    }

    setMyHotels(scopedList);
    if (scopedList.length > 0) {
      setSelectedHotelId(String(scopedList[0].id));
    }
    return scopedList;
  };

  // 2. TẢI CÁC PHIẾU DỌN DẸP
  const loadTasks = () => {
    const hotelsList = loadScopedHotels();
    const currentHotelName = hotelsList[0]?.name || user?.hotel_name || "KS2";

    const savedTasks = JSON.parse(
      localStorage.getItem("housekeeping_tasks") || "[]",
    );

    if (savedTasks.length === 0) {
      const initial = [
        {
          id: "HK-101",
          hotel_id: hotelsList[0]?.id || "1",
          hotel_name: currentHotelName,
          room_number: "P.101",
          room_type: "Deluxe King Hướng Biển",
          status: "dirty",
          priority: "urgent",
          assigned_to: "Chưa phân công",
          created_at: "10:30 Hôm nay",
          notes: "Khách vừa check-out, cần thay toàn bộ ga gối và khử khuẩn",
        },
        {
          id: "HK-102",
          hotel_id: hotelsList[0]?.id || "1",
          hotel_name: currentHotelName,
          room_number: "P.202",
          room_type: "Phòng Suite Gia Đình",
          status: "cleaning",
          priority: "normal",
          assigned_to: "Nguyễn Thị Lan",
          created_at: "09:15 Hôm nay",
          notes: "Đang hút bụi, bổ sung 2 chai nước và set trà",
        },
        {
          id: "HK-103",
          hotel_id: hotelsList[0]?.id || "1",
          hotel_name: currentHotelName,
          room_number: "P.301",
          room_type: "Phòng Tiêu Chuẩn Giường Đôi",
          status: "clean",
          priority: "normal",
          assigned_to: "Trần Văn Nam",
          created_at: "08:00 Hôm nay",
          notes: "Đã dọn sạch sẽ, thơm tho, sẵn sàng đón khách mới",
        },
      ];
      localStorage.setItem("housekeeping_tasks", JSON.stringify(initial));
      setTasks(initial);
    } else {
      setTasks(savedTasks);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  const selectedHotelObj =
    myHotels.find((h) => String(h.id) === String(selectedHotelId)) ||
    myHotels[0];

  const updateTaskStatus = (taskId, newStatus) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t,
    );
    setTasks(updated);
    localStorage.setItem("housekeeping_tasks", JSON.stringify(updated));
  };

  // 🎯 CỬ NHÂN VIÊN ĐẾN DỌN PHÒNG
  const handleAssignCleaner = () => {
    if (!assignModalTask || !selectedCleanerName) return;

    const updated = tasks.map((t) =>
      t.id === assignModalTask.id
        ? {
            ...t,
            assigned_to: selectedCleanerName,
            status: "cleaning",
            assigned_time: new Date().toLocaleTimeString("vi-VN"),
          }
        : t,
    );
    setTasks(updated);
    localStorage.setItem("housekeeping_tasks", JSON.stringify(updated));
    alert(
      `✓ Đã gửi thông báo giao phòng ${assignModalTask.room_number} cho nhân viên [${selectedCleanerName}]!`,
    );
    setAssignModalTask(null);
    setSelectedCleanerName("");
  };

  // TẠO PHIẾU YÊU CẦU MỚI
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newRoomNumber) return;

    const newTask = {
      id: `HK-${Date.now().toString().slice(-4)}`,
      hotel_id: String(selectedHotelObj?.id || user?.hotel_id || ""),
      hotel_name: selectedHotelObj?.name || user?.hotel_name || "Cơ sở lưu trú",
      room_number: newRoomNumber,
      room_type: newRoomType,
      status: assignedCleanerOnCreate ? "cleaning" : "dirty",
      priority: newPriority,
      assigned_to: assignedCleanerOnCreate || "Chưa phân công",
      created_at: new Date().toLocaleTimeString("vi-VN"),
      notes: newNotes || "Lễ tân yêu cầu dọn phòng",
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    localStorage.setItem("housekeeping_tasks", JSON.stringify(updated));
    setIsModalOpen(false);
    setNewRoomNumber("");
    setNewNotes("");
    setAssignedCleanerOnCreate("");
    alert(`✓ Đã phát lệnh dọn phòng [${newRoomNumber}]!`);
  };

  // LỌC DANH SÁCH
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedHotelObj?.id) {
        const matchId = String(t.hotel_id) === String(selectedHotelObj.id);
        const matchName =
          selectedHotelObj?.name &&
          String(t.hotel_name || "")
            .toLowerCase()
            .trim() === String(selectedHotelObj.name).toLowerCase().trim();
        if (!matchId && !matchName && myHotels.length > 1) return false;
      }

      if (filterStatus !== "all" && t.status !== filterStatus) return false;

      // 🎯 LỌC THEO NHÂN VIÊN ĐƯỢC GIAO
      if (filterCleaner !== "all" && t.assigned_to !== filterCleaner)
        return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          t.room_number?.toLowerCase().includes(q) ||
          t.room_type?.toLowerCase().includes(q) ||
          t.assigned_to?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tasks, selectedHotelObj, filterStatus, filterCleaner, search, myHotels]);

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles size={16} /> Điều Phối & Phân Việc Buồng Phòng
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Nhiệm Vụ Dọn Phòng Của Nhân Viên
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cơ sở:{" "}
            <strong className="text-blue-900 font-bold">
              {selectedHotelObj?.name || user?.hotel_name}
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Nút In danh sách giao việc cầm tay */}
          <button
            onClick={() => window.print()}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
            title="In bảng phân công việc"
          >
            <Printer size={15} /> In Phiếu Phân Việc
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> + Phát Lệnh Dọn Phòng
          </button>

          <button
            onClick={loadTasks}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── THANH CHỌN XEM VIỆC CỦA TỪNG NHÂN VIÊN (GIÚP NHÂN VIÊN BIẾT MÌNH ĐƯỢC GIAO PHÒNG NÀO) ── */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-3xl shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-amber-400" />
            <h3 className="text-sm font-black tracking-tight">
              Giao Diện Tra Cứu Việc Của Từng Nhân Viên Buồng Phòng
            </h3>
          </div>
          <span className="text-[11px] text-blue-200">
            (Nhân viên mở máy chỉ cần bấm vào tên mình để xem việc)
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterCleaner("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterCleaner === "all"
                ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            👥 Tất cả nhân viên
          </button>

          {cleanersList.map((cleaner) => {
            const cleanerTasksCount = tasks.filter(
              (t) => t.assigned_to === cleaner.name && t.status !== "clean",
            ).length;

            return (
              <button
                key={cleaner.id}
                onClick={() => setFilterCleaner(cleaner.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  filterCleaner === cleaner.name
                    ? "bg-amber-400 text-slate-950 font-black shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <span>
                  👤 {cleaner.name} ({cleaner.area})
                </span>
                {cleanerTasksCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {cleanerTasksCount} phòng
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BỘ LỌC TRẠNG THÁI & TÌM KIẾM ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between gap-3 items-center">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              filterStatus === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tất cả ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus("dirty")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === "dirty"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            <span>🧹 Cần dọn</span>
          </button>
          <button
            onClick={() => setFilterStatus("cleaning")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === "cleaning"
                ? "bg-amber-500 text-slate-950"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            <span>⏳ Đang dọn dẹp</span>
          </button>
          <button
            onClick={() => setFilterStatus("clean")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === "clean"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            <span>✨ Phòng đã sạch</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm số phòng, tên nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* ── THÔNG BÁO NẾU ĐANG LỌC RIÊNG CỦA MỘT NHÂN VIÊN ── */}
      {filterCleaner !== "all" && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 flex justify-between items-center text-xs">
          <div>
            Đang hiển thị danh sách phòng được giao cho: <b>{filterCleaner}</b>
          </div>
          <button
            onClick={() => setFilterCleaner("all")}
            className="font-bold underline text-blue-900 cursor-pointer"
          >
            Xem tất cả
          </button>
        </div>
      )}

      {/* ── DANH SÁCH CÁC THẺ PHÒNG ── */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 relative hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-2xl font-black text-slate-900 block">
                    {task.room_number}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {task.room_type}
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${
                    task.status === "dirty"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : task.status === "cleaning"
                        ? "bg-amber-50 text-amber-800 border border-amber-300"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-300"
                  }`}
                >
                  {task.status === "dirty"
                    ? "Chưa Dọn"
                    : task.status === "cleaning"
                      ? "Đang Dọn"
                      : "Phòng Sạch"}
                </span>
              </div>

              {/* NHÂN VIÊN ĐƯỢC CỬ PHỤ TRÁCH */}
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">
                    Nhân viên được giao:
                  </span>
                  <strong
                    className={
                      task.assigned_to === "Chưa phân công"
                        ? "text-rose-600 font-bold"
                        : "text-blue-900 font-black"
                    }
                  >
                    {task.assigned_to}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <b>Ghi chú:</b> {task.notes}
              </p>

              {/* CÁC THAO TÁC THỰC THI */}
              <div className="pt-2 border-t flex flex-col gap-2">
                {task.status === "dirty" && (
                  <button
                    onClick={() => {
                      setAssignModalTask(task);
                      setSelectedCleanerName(cleanersList[0]?.name || "");
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <UserCheck size={15} /> Cử nhân viên dọn phòng
                  </button>
                )}

                {task.status === "cleaning" && (
                  <button
                    onClick={() => updateTaskStatus(task.id, "clean")}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check size={15} /> Xác nhận đã dọn sạch
                  </button>
                )}

                {task.status === "clean" && (
                  <button
                    onClick={() => updateTaskStatus(task.id, "dirty")}
                    className="w-full py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Đánh dấu bẩn lại
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-3">
          <Sparkles size={40} className="mx-auto text-slate-300" />
          <p className="text-base font-bold text-slate-700">
            {filterCleaner !== "all"
              ? `Nhân viên ${filterCleaner} hiện không có phòng nào cần dọn!`
              : "Tất cả các phòng đều đã sạch sẽ sẵn sàng đón khách!"}
          </p>
        </div>
      )}

      {/* ── MODAL: CỬ NHÂN VIÊN RA DỌN PHÒNG ── */}
      {assignModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <UserCheck size={18} className="text-blue-600" /> Điều Phối Nhân
                Viên Dọn Phòng
              </h3>
              <button
                onClick={() => setAssignModalTask(null)}
                className="cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-600">
              Phòng cần dọn:{" "}
              <b className="text-blue-900 text-sm">
                {assignModalTask.room_number}
              </b>{" "}
              ({assignModalTask.room_type})
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Chọn nhân viên trực tiếp làm nhiệm vụ:
              </label>
              <select
                value={selectedCleanerName}
                onChange={(e) => setSelectedCleanerName(e.target.value)}
                className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
              >
                {cleanersList.map((c) => (
                  <option key={c.id} value={c.name}>
                    👤 {c.name} ({c.area} - {c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
              💡 Sau khi bấm <b>Giao Việc Ngay</b>, nhân viên sẽ thấy phòng này
              xuất hiện trong mục việc cá nhân của họ để đến làm.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setAssignModalTask(null)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAssignCleaner}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Send size={14} /> Giao Việc Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TẠO LỆNH DỌN PHÒNG MỚI ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-slate-900">
              Phát Lệnh Dọn Phòng Mới
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số phòng *
                </label>
                <input
                  required
                  placeholder="VD: P.102, P.305"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold text-blue-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cử sẵn nhân viên (Tùy chọn)
                </label>
                <select
                  value={assignedCleanerOnCreate}
                  onChange={(e) => setAssignedCleanerOnCreate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium cursor-pointer"
                >
                  <option value="">Chưa phân công (Cử người sau)</option>
                  {cleanersList.map((c) => (
                    <option key={c.id} value={c.name}>
                      👤 {c.name} ({c.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú công việc
                </label>
                <textarea
                  rows={3}
                  placeholder="Khách yêu cầu bổ sung 2 khăn tắm và dọn phòng khách..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer"
                >
                  Phát Lệnh Dọn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
