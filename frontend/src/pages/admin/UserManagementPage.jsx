import React, { useState } from "react";

const UserManagementPage = () => {
  const [users, setUsers] = useState([
    { id: 1, name: "Nguyễn Văn A", email: "vana@gmail.com", role: "CUSTOMER", status: "active" },
    { id: 2, name: "Trần Thị B", email: "thib@gmail.com", role: "HOST", status: "active" },
    { id: 3, name: "Lê Hoàng C", email: "hoangc@gmail.com", role: "CUSTOMER", status: "banned" },
  ]);

  const toggleStatus = (id) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "banned" : "active" } : u)));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Quản Lý Người Dùng</h2>
        <p className="text-xs text-slate-500 mt-1">Quản lý danh sách tài khoản, phân quyền và khóa/mở tài khoản.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b uppercase text-[10px] font-bold text-slate-500">
            <tr>
              <th className="p-4">Họ và Tên</th>
              <th className="p-4">Email</th>
              <th className="p-4">Vai trò</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-900">{u.name}</td>
                <td className="p-4 text-slate-500">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    u.role === 'HOST' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => toggleStatus(u.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
                      u.status === 'active'
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {u.status === 'active' ? '🔒 Khóa TK' : '🔓 Mở khóa'}
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