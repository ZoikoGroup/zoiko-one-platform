import React from "react";
import PageHeader from "../../components/PageHeader";
import { Shield, ShieldAlert, Cpu, Lock, ToggleLeft, RefreshCw, Key, AlertTriangle } from "lucide-react";

export default function SecurityPage() {
  const stats = [
    { title: "Security Score", value: "98/100", label: "Grade A+", icon: Shield, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    { title: "MFA Adoption", value: "98.4%", label: "+1.2% this week", icon: Lock, color: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
    { title: "Blocked Threats", value: "1,248", label: "Last 24 Hours", icon: ShieldAlert, color: "text-red-400 bg-red-500/10 border-red-500/25" },
    { title: "WAF Firewall", value: "Active", label: "Rule Version 4.2", icon: Cpu, color: "text-purple-400 bg-purple-500/10 border-purple-500/25" },
  ];

  const recentAlerts = [
    { id: 1, severity: "High", msg: "Brute-force login attempt blocked from WAF-US-EAST-1", time: "10 mins ago", details: "IP: 198.51.100.42 (WAF block code: 403)" },
    { id: 2, severity: "Medium", msg: "Admin credentials loaded with mock token fallback trigger", time: "42 mins ago", details: "Email: admin@zoiko.com (Internal Fallback Mode)" },
    { id: 3, severity: "Low", msg: "SSH config audit completed", time: "2 hours ago", details: "All checks passed (Compliance standard CIS-v8)" },
    { id: 4, severity: "Low", msg: "Weekly SSL/TLS certificate rotation scheduled", time: "1 day ago", details: "Provider: Let's Encrypt (Autorenew enabled)" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader 
        title="Security Center" 
        description="Monitor system authentication controls, cryptographic settings, firewall metrics, and real-time security events."
      />

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, idx) => (
          <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{s.title}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-850">{s.value}</p>
                <p className="mt-1 text-xs text-slate-400">{s.label}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alerts Log */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Security Alerts & Logs</h3>
            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition">
              <RefreshCw className="h-3 w-3" /> Refresh Logs
            </button>
          </div>

          <div className="space-y-3">
            {recentAlerts.map((a) => (
              <div key={a.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition">
                <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                  a.severity === "High" ? "bg-red-500/10 text-red-500" :
                  a.severity === "Medium" ? "bg-yellow-500/10 text-amber-600" :
                  "bg-slate-200 text-slate-500"
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      a.severity === "High" ? "text-red-500" :
                      a.severity === "Medium" ? "text-amber-600" :
                      "text-slate-400"
                    }`}>{a.severity} Severity</span>
                    <span className="text-xs text-slate-400">{a.time}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{a.msg}</p>
                  <p className="mt-1 text-xs text-slate-500 truncate">{a.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Access controls config */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Security Policies</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Enforce MFA</p>
                  <p className="text-xs text-slate-500">Require MFA for all users</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">Enabled</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">API Key Expiry</p>
                  <p className="text-xs text-slate-500">Automatically rotate keys</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full uppercase">90 Days</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Session Timeout</p>
                  <p className="text-xs text-slate-500">Auto log out on inactivity</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full uppercase">15 Mins</span>
              </div>
            </div>
          </div>

          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition">
            <Key className="h-4 w-4" /> Configure API Credentials
          </button>
        </div>
      </div>
    </div>
  );
}
