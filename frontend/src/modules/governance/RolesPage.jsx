import React, { useState } from "react";
import PageHeader from "../../components/PageHeader";
import { Users, UserCheck, Shield, Key, Plus, Search, MoreVertical, Edit2, Trash2 } from "lucide-react";

export default function RolesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const stats = [
    { title: "Total Users", value: "142", icon: Users, color: "from-blue-600 to-cyan-500" },
    { title: "Active Admins", value: "8", icon: UserCheck, color: "from-indigo-600 to-purple-500" },
    { title: "Security Roles", value: "5", icon: Shield, color: "from-orange-600 to-pink-500" },
    { title: "Active Sessions", value: "14", icon: Key, color: "from-emerald-600 to-teal-500" },
  ];

  const initialUsers = [
    { id: 1, name: "Alexander Vance", email: "alexander@zoiko.com", role: "Super Admin", status: "Active", joined: "2024-01-15" },
    { id: 2, name: "Marcus Thorne", email: "marcus.t@zoiko.com", role: "Admin", status: "Active", joined: "2024-02-01" },
    { id: 3, name: "Evelyn Carter", email: "e.carter@zoiko.com", role: "HR Administrator", status: "Active", joined: "2024-03-10" },
    { id: 4, name: "David Kim", email: "d.kim@zoiko.com", role: "Billing Manager", status: "Active", joined: "2024-04-18" },
    { id: 5, name: "Sarah Jenkins", email: "sarah.j@zoiko.com", role: "Security Auditor", status: "Inactive", joined: "2024-05-22" },
    { id: 6, name: "Liam O'Connor", email: "l.oconnor@zoiko.com", role: "Compliance Officer", status: "Active", joined: "2024-06-05" },
  ];

  const filteredUsers = initialUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <PageHeader 
        title="User and Roles" 
        description="Manage system users, define access levels, and assign granular security roles."
        action={
          <button className="flex items-center gap-2 rounded-full bg-[#FF7A00] hover:bg-[#e56e00] text-white px-4 py-2.5 text-sm font-semibold transition shadow-[0_4px_14px_rgba(255,122,0,0.3)]">
            <Plus className="h-4 w-4" /> Add User
          </button>
        }
      />

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, idx) => (
          <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#FF7A00]/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{s.title}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-850">{s.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">System Users</h3>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users, roles, emails..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:border-[#FF7A00]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="text-sm text-slate-650 hover:bg-slate-50/50 transition duration-150">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-850">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === "Super Admin" ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/25" :
                      u.role === "Admin" ? "bg-blue-500/10 text-blue-600 border border-blue-500/25" :
                      "bg-purple-500/10 text-purple-600 border border-purple-500/25"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      u.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25" : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-500">{u.joined}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2 text-slate-400">
                      <button className="p-1 hover:text-[#FF7A00] transition" aria-label="Edit user"><Edit2 className="h-4 w-4" /></button>
                      <button className="p-1 hover:text-red-500 transition" aria-label="Delete user"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
