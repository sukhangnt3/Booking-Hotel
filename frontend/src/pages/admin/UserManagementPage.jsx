import React, { useState } from "react";

const UserManagementPage = () => {
  const [users, setUsers] = useState([
    {
      id: "u1",
      name: "Linh Admin",
      email: "admin@gmail.com",
      role: "ADMIN",
      active: true,
    },
    {
      id: "u2",
      name: "Pham Owner",
      email: "owner@gmail.com",
      role: "OWNER",
      active: true,
    },
    {
      id: "u3",
      name: "Hoang Guest",
      email: "guest@gmail.com",
      role: "GUEST",
      active: false,
    },
  ]);

  const toggleUser = (id) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          Quản Lý Người Dùng
        </h1>
        <p className="text-xs text-slate-500">
          Phân quyền tài khoản và kích hoạt/khóa tài khoản.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="p-4">Tài Khoản</th>
              <th className="p-4">Vai Trò</th>
              <th className="p-4">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4">
                  <p className="font-bold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-slate-100 font-bold text-xs rounded-md">
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                  >
                    {u.active ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => toggleUser(u.id)}
                    className={`px-3 py-1.5 font-bold text-xs rounded-lg text-white ${u.active ? "bg-rose-600" : "bg-emerald-600"}`}
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
