import React from "react";
import PageHeader from "../../components/PageHeader";
import { Bell, Mail, MessageSquare, Send, Settings, CheckCheck, AlertCircle } from "lucide-react";

export default function NotificationsPage() {
  const templates = [
    { channel: "Email", icon: Mail, desc: "Transactional & marketing emails via SMTP", status: "Active", sent: "48,240" },
    { channel: "SMS", icon: Send, desc: "OTP, alerts & notifications via Twilio", status: "Active", sent: "12,830" },
    { channel: "In-App", icon: Bell, desc: "Push notifications & toast alerts", status: "Active", sent: "94,100" },
    { channel: "Slack", icon: MessageSquare, desc: "Team alerts & webhook messages", status: "Paused", sent: "1,420" },
  ];

  const recent = [
    { title: "Subscription Renewal Reminder", channel: "Email", time: "2 min ago", status: "Delivered" },
    { title: "MFA Code - Login Attempt", channel: "SMS", time: "15 min ago", status: "Delivered" },
    { title: "New Organization Onboarded", channel: "In-App", time: "1 hr ago", status: "Delivered" },
    { title: "Deployment Failed: API v2.4", channel: "Slack", time: "3 hrs ago", status: "Failed" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Notifications"
        description="Configure messaging channels, notification templates, and delivery preferences."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#FF7A00]" /> Channels
          </h3>
          <div className="space-y-3">
            {templates.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 border border-orange-100 text-[#FF7A00]">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.channel}</p>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    t.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {t.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">{t.sent} sent</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-800 flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-[#FF7A00]" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {recent.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-400">{r.channel} • {r.time}</p>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-semibold ${
                  r.status === "Delivered" ? "text-emerald-600" : "text-red-500"
                }`}>
                  {r.status === "Delivered" ? <CheckCheck className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
