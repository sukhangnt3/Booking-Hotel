// src/pages/admin/UserManagementPage.jsx
import React, { useState } from "react";

const UserManagementPage = () => {
  const [users, setUsers] = useState([
    { id: "u1", name: "Linh Admin", email: "admin@gmail.com", role: "ADMIN", active: true },
    { id: "u2", name: "Pham Owner", email: "owner@gmail.com", role: "OWNER", active: true },
    { id: "u3", name: "Hoang Guest", email: "guest@gmail.com", role: "GUEST", active: false },
  ]);

  // 1. Hàm xử lý thay đổi vai trò (Sẽ kết nối API ở đây)
  const handleRoleChange = async (userId, newRole) => {
    // Cập nhật State giao diện ngay lập tức
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    // TODO: BẬT ĐOẠN NÀY KHI KẾT NỐI BACKEND
    /*
    try {
      await axios.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      alert("Đã cập nhật vai trò thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật vai trò:", error);
      alert("Cập nhật vai trò thất bại!");
    }
    */
  };

  // 2. Hàm xử lý bật/tắt trạng thái (Khóa / Mở khóa)
  const toggleUserStatus = async (userId) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u))
    );

    // TODO: BẬT ĐOẠN NÀY KHI KẾT NỐI BACKEND
    /*
    try {
      await axios.patch(`/api/admin/users/${userId}/status`);
    } catch (error) {
      console.error("Lỗi đổi trạng thái:", error);
    }
    */
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Quản Lý Người Dùng</h1>
        <p className="text-xs text-slate-500">Phân quyền tài khoản và kích hoạt/khóa tài khoản.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="p-4">Tài Khoản</th>
              <th className="p-4">Vai Trò</th>
              <th className="p-4">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition">
                {/* Thông tin tài khoản */}
                <td className="p-4">
                  <p className="font-bold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>

                {/* Dropdown Phân Quyền */}
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">OWNER</option>
                    <option value="GUEST">GUEST</option>
                  </select>
                </td>

                {/* Trạng thái hoạt động */}
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      u.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {u.active ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>

                {/* Nút hành động */}
                <td className="p-4 text-right">
                  <button
                    onClick={() => toggleUserStatus(u.id)}
                    className={`px-3 py-1.5 font-bold text-xs rounded-xl text-white transition ${
                      u.active
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {u.active ? "Khóa Tài Khoản" : "Mở Khóa"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementPage;