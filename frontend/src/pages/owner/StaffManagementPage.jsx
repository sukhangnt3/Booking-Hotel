// src/pages/owner/StaffManagementPage.jsx
import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Plus,
  Search,
  Key,
  Lock,
  Unlock,
  Trash2,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";

export default function StaffManagementPage() {
  const { user } = useAuthStore();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Quản lý cơ sở của chủ nhà
  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelFilter, setSelectedHotelFilter] = useState("all");

  // Modal tạo tài khoản lễ tân
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    hotel_id: "",
    hotel_name: "",
  });

  const userEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  // 1. Tải danh sách khách sạn của Owner & Danh sách Lễ tân
  const loadData = () => {
    setLoading(true);

    // Tải các khách sạn thuộc sở hữu của chủ nhà
    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );
    const ownerHotels = localApps.filter((h) => {
      const hEmail = String(h.emailContact || h.email || "")
        .toLowerCase()
        .trim();
      return hEmail === userEmail || user?.role === "admin";
    });
    setMyHotels(ownerHotels);

    // Tải danh sách tài khoản nhân viên lễ tân
    const allUsers = JSON.parse(
      localStorage.getItem("pms_users_master") || "[]",
    );
    const staffOnly = allUsers.filter(
      (u) => u.role === "receptionist" || u.role === "staff",
    );
    setStaffList(staffOnly);

    if (ownerHotels.length > 0 && !createForm.hotel_id) {
      setCreateForm((prev) => ({
        ...prev,
        hotel_id: String(ownerHotels[0].id || ownerHotels[0].applicationId),
        hotel_name: ownerHotels[0].name || ownerHotels[0].hotelNameVi,
      }));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // ➕ 2. CHỦ NHÀ CẤP TÀI KHOẢN LỄ TÂN MỚI
  const handleCreateStaff = (e) => {
    e.preventDefault();
    const cleanEmail = createForm.email.toLowerCase().trim();

    const selectedHotelObj = myHotels.find(
      (h) => String(h.id || h.applicationId) === String(createForm.hotel_id),
    );

    const newStaffUser = {
      id: `STAFF-${Date.now().toString().slice(-4)}`,
      full_name: createForm.full_name,
      email: cleanEmail,
      phone: createForm.phone,
      role: "receptionist", // 👈 Tự động gắn quyền Lễ tân
      hotel_id: createForm.hotel_id,
      hotel_name: selectedHotelObj?.name || createForm.hotel_name,
      active: true,
      created_by: userEmail,
      created_at: new Date().toISOString().split("T")[0],
      last_login: "Chưa vào ca",
    };

    // 1. Lưu vào danh sách tài khoản toàn hệ thống
    const allUsers = JSON.parse(
      localStorage.getItem("pms_users_master") || "[]",
    );
    const updatedUsers = [
      newStaffUser,
      ...allUsers.filter((u) => u.email !== cleanEmail),
    ];
    localStorage.setItem("pms_users_master", JSON.stringify(updatedUsers));

    // 2. Thêm email vào danh sách lễ tân được phép truy cập
    const staffEmails = JSON.parse(
      localStorage.getItem("staff_emails") || "[]",
    );
    if (!staffEmails.includes(cleanEmail)) staffEmails.push(cleanEmail);
    localStorage.setItem("staff_emails", JSON.stringify(staffEmails));

    // 3. Ghi nhớ phân quyền role vĩnh viễn
    const roleOverrides = JSON.parse(
      localStorage.getItem("user_role_overrides") || "{}",
    );
    roleOverrides[cleanEmail] = "receptionist";
    localStorage.setItem("user_role_overrides", JSON.stringify(roleOverrides));

    alert(
      `✓ Đã cấp tài khoản Lễ tân thành công cho [${newStaffUser.full_name}]!\nEmail: ${cleanEmail}\nNhân viên có thể đăng nhập ngay để trực ca.`,
    );

    setIsCreateModalOpen(false);
    setCreateForm({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      hotel_id: myHotels[0]?.id || "",
      hotel_name: myHotels[0]?.name || "",
    });
    loadData();
  };

  // 🔒 Khóa / Mở khóa tài khoản lễ tân
  const handleToggleLockStaff = (staff) => {
    const actionText = staff.active ? "KHÓA" : "MỞ KHÓA";
    if (
      !window.confirm(
        `Xác nhận ${actionText} quyền truy cập của lễ tân "${staff.full_name}"?`,
      )
    )
      return;

    const allUsers = JSON.parse(
      localStorage.getItem("pms_users_master") || "[]",
    );
    const updated = allUsers.map((u) =>
      u.email === staff.email ? { ...u, active: !u.active } : u,
    );
    localStorage.setItem("pms_users_master", JSON.stringify(updated));

    loadData();
  };

  // 🗑️ Xóa nhân viên lễ tân
  const handleDeleteStaff = (staff) => {
    if (!window.confirm(`Xác nhận xóa tài khoản lễ tân "${staff.full_name}"?`))
      return;

    const allUsers = JSON.parse(
      localStorage.getItem("pms_users_master") || "[]",
    );
    const updatedUsers = allUsers.filter((u) => u.email !== staff.email);
    localStorage.setItem("pms_users_master", JSON.stringify(updatedUsers));

    const staffEmails = JSON.parse(
      localStorage.getItem("staff_emails") || "[]",
    );
    localStorage.setItem(
      "staff_emails",
      JSON.stringify(staffEmails.filter((e) => e !== staff.email)),
    );

    loadData();
  };

  const filteredStaff = staffList.filter((s) => {
    if (
      selectedHotelFilter !== "all" &&
      String(s.hotel_id) !== String(selectedHotelFilter)
    )
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
            <UserCheck size={16} /> Phân Quyền Nhân Sự Khách Sạn (Front Desk
            Staff)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Nhân Viên Lễ Tân ({staffList.length} Nhân sự)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chủ khách sạn có toàn quyền tạo tài khoản, cấp mật khẩu và phân công
            lễ tân trực ca
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> + Cấp Tài Khoản Lễ Tân
          </button>
          <button
            onClick={loadData}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── TOOLBAR: TÌM KIẾM & LỌC THEO CƠ SỞ ── */}
      <div className="bg-white p-4 rounded-3xl border shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên lễ tân, email hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
          />
        </div>

        {myHotels.length > 0 && (
          <select
            value={selectedHotelFilter}
            onChange={(e) => setSelectedHotelFilter(e.target.value)}
            className="px-3 py-2.5 text-xs font-bold bg-slate-50 border rounded-xl outline-none cursor-pointer"
          >
            <option value="all">🏢 Tất cả cơ sở ({myHotels.length})</option>
            {myHotels.map((h) => (
              <option
                key={h.id || h.applicationId}
                value={h.id || h.applicationId}
              >
                🏨 {h.name || h.hotelNameVi}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── BẢNG DANH SÁCH LỄ TÂN ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang tải danh sách nhân sự..." />
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Nhân Viên Lễ Tân</th>
                <th className="py-4 px-4">Cơ Sở Phân Công</th>
                <th className="py-4 px-4">Số Điện Thoại</th>
                <th className="py-4 px-4">Đăng Nhập Cuối</th>
                <th className="py-4 px-4 text-center">Trạng Thái</th>
                <th className="py-4 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStaff.map((s) => (
                <tr
                  key={s.email}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-black flex items-center justify-center text-xs">
                        {s.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong className="text-slate-900 text-sm block">
                          {s.full_name}
                        </strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {s.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <span className="font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1">
                      <Building2 size={12} /> {s.hotel_name || "BezTower Hotel"}
                    </span>
                  </td>

                  <td className="py-4 px-4 font-mono font-semibold">
                    {s.phone}
                  </td>
                  <td className="py-4 px-4 text-slate-500">{s.last_login}</td>

                  <td className="py-4 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${s.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}
                    >
                      {s.active ? "Đang trực ca" : "Tạm khóa"}
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleLockStaff(s)}
                        className={`p-2 rounded-xl transition ${s.active ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                        title={s.active ? "Khóa tài khoản" : "Mở khóa"}
                      >
                        {s.active ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(s)}
                        className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl transition"
                        title="Xóa nhân viên"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={UserCheck}
          title="Chưa có nhân viên lễ tân nào"
          description="Bấm nút '+ Cấp Tài Khoản Lễ Tân' để tạo nhân sự trực ca đầu tiên cho khách sạn."
          actionLabel="+ Cấp tài khoản ngay"
          onAction={() => setIsCreateModalOpen(true)}
        />
      )}

      {/* ── ➕ MODAL CẤP TÀI KHOẢN LỄ TÂN MỚI ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <UserCheck size={18} className="text-amber-600" /> Cấp Tài Khoản
                Lễ Tân Khách Sạn
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên nhân viên lễ tân *
                </label>
                <input
                  required
                  placeholder="VD: Lê Thị Thu Trang"
                  value={createForm.full_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, full_name: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email đăng nhập *
                </label>
                <input
                  required
                  type="email"
                  placeholder="trang.letan@gmail.com"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    required
                    placeholder="0912345678"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phone: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mật khẩu khởi tạo *
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phân công làm việc tại cơ sở *
                </label>
                <select
                  value={createForm.hotel_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, hotel_id: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold text-blue-900 cursor-pointer"
                >
                  {myHotels.map((h) => (
                    <option
                      key={h.id || h.applicationId}
                      value={h.id || h.applicationId}
                    >
                      🏨 {h.name || h.hotelNameVi}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Tài khoản này sẽ có quyền:{" "}
                <b>
                  Check-in, Check-out khách, ghi nợ Minibar và yêu cầu dọn buồng
                  phòng
                </b>
                . Không xem được doanh thu hay tài khoản ngân hàng của chủ nhà.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white rounded-xl font-bold shadow-md"
                >
                  Cấp Tài Khoản Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
