import React from "react";
import PageHeader from "../../components/PageHeader";
import { Network, Key, BarChart3, Activity, ShieldCheck, Terminal } from "lucide-react";

export default function ApiManagementPage() {
  const endpoints = [
    { method: "GET", path: "/api/v1/users", calls: "12.4K", latency: "42ms", status: "Healthy" },
    { method: "POST", path: "/api/v1/orders", calls: "8.1K", latency: "128ms", status: "Healthy" },
    { method: "GET", path: "/api/v1/products", calls: "24.7K", latency: "38ms", status: "Healthy" },
    { method: "PUT", path: "/api/v1/subscriptions", calls: "3.2K", latency: "95ms", status: "Degraded" },
    { method: "DELETE", path: "/api/v1/accounts", calls: "1.8K", latency: "210ms", status: "Healthy" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="API Management"
        description="Monitor, manage, and secure all API endpoints powering the Zoiko platform."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-[#FF7A00]" /> API Keys
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              <span className="text-xs font-mono text-slate-600">prod_zk_••••••a3f8</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              <span className="text-xs font-mono text-slate-600">stg_zk_••••••b2c1</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              <span className="text-xs font-mono text-slate-600">dev_zk_••••••e7d4</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200">Revoked</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#FF7A00]" /> Endpoint Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Path</th>
                  <th className="py-2 px-3 text-right">Calls</th>
                  <th className="py-2 px-3 text-right">Latency</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {endpoints.map((ep, idx) => (
                  <tr key={idx} className="text-sm hover:bg-slate-50/50 transition">
                    <td className="py-3 px-3">
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        ep.method === "GET" ? "bg-emerald-50 text-emerald-700" :
                        ep.method === "POST" ? "bg-blue-50 text-blue-700" :
                        ep.method === "PUT" ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">{ep.path}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{ep.calls}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{ep.latency}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-xs font-semibold ${
                        ep.status === "Healthy" ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {ep.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
