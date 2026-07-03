import React from "react";
import PageHeader from "../../components/PageHeader";
import { Globe, Plug, Database, Cloud, ShieldCheck, CheckCircle2, XCircle, Mail, MessageSquare } from "lucide-react";

export default function IntegrationsPage() {
  const integrations = [
    { name: "Stripe", desc: "Payment gateway & subscription billing", icon: Cloud, status: "Connected", connected: true },
    { name: "Twilio", desc: "SMS & voice communication services", icon: Plug, status: "Connected", connected: true },
    { name: "AWS S3", desc: "Document & media file storage", icon: Database, status: "Connected", connected: true },
    { name: "SendGrid", desc: "Transactional email delivery", icon: Mail, status: "Connected", connected: true },
    { name: "Slack", desc: "Team notifications & alerts", icon: MessageSquare, status: "Disconnected", connected: false },
    { name: "HubSpot", desc: "CRM & customer management", icon: Globe, status: "Pending", connected: false },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Integrations"
        description="Connect third-party services and manage API integrations across your platform."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-lg font-bold text-slate-800 flex items-center gap-2">
          <Globe className="h-5 w-5 text-[#FF7A00]" /> Connected Services
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 border border-orange-100 text-[#FF7A00]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-300" />
                )}
                <span className={`text-[10px] font-semibold ${item.connected ? "text-emerald-600" : "text-slate-400"}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-slate-800">Integration Metrics</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-2xl font-bold text-slate-800">4</p>
            <p className="text-xs text-slate-400 mt-1">Active</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-2xl font-bold text-slate-800">2</p>
            <p className="text-xs text-slate-400 mt-1">Disconnected</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-2xl font-bold text-slate-800">99.7%</p>
            <p className="text-xs text-slate-400 mt-1">Uptime</p>
          </div>
        </div>
      </div>
    </div>
  );
}

