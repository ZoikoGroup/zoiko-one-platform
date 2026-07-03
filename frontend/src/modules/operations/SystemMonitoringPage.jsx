import React from "react";
import PageHeader from "../../components/PageHeader";
import { Activity, Server, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";

export default function SystemMonitoringPage() {
  const services = [
    { name: "API Gateway", status: "Operational", uptime: "99.99%", icon: Server },
    { name: "Database Cluster", status: "Operational", uptime: "99.95%", icon: HardDrive },
    { name: "Cache Layer (Redis)", status: "Operational", uptime: "100%", icon: Cpu },
    { name: "Message Queue", status: "Operational", uptime: "99.98%", icon: Activity },
    { name: "CDN & Edge", status: "Degraded", uptime: "98.50%", icon: Wifi },
    { name: "Auth Service", status: "Operational", uptime: "99.99%", icon: Server },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="System Monitoring"
        description="Real-time health, uptime, and performance metrics for all platform services."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#FF7A00]" /> Metrics
          </h3>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-400">Avg Response Time</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">64<span className="text-sm font-medium text-slate-400">ms</span></p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-400">Error Rate (24h)</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">0.12<span className="text-sm font-medium text-slate-400">%</span></p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-400">Active Requests</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">1,247</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#FF7A00]" /> Service Health
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((svc, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                    svc.status === "Operational" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-600"
                  }`}>
                    <svc.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{svc.name}</p>
                    <p className="text-xs text-slate-400">Uptime: {svc.uptime}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-semibold ${
                  svc.status === "Operational" ? "text-emerald-600" : "text-amber-600"
                }`}>
                  {svc.status === "Operational" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
