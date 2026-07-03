import { useState } from "react";
import { Save, Bell, Shield, Users, Database, RefreshCw } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    autoReminders: true,
    evidenceApproval: true,
    riskThreshold: 15,
    auditNotification: true,
    retentionPeriod: "7",
    defaultAssignee: "",
  });

  const handleChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
  const handleSave = () => {
    localStorage.setItem("complySettings", JSON.stringify(settings));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure compliance module preferences and defaults</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-700">Auto-reminders for obligations</p><p className="text-xs text-gray-500">Send reminder emails for upcoming deadlines</p></div>
              <input type="checkbox" checked={settings.autoReminders} onChange={e => handleChange("autoReminders", e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            </label>
            <label className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-700">Evidence approval notifications</p><p className="text-xs text-gray-500">Notify when evidence requires review</p></div>
              <input type="checkbox" checked={settings.evidenceApproval} onChange={e => handleChange("evidenceApproval", e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            </label>
            <label className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-700">Audit notifications</p><p className="text-xs text-gray-500">Alerts for upcoming and ongoing audits</p></div>
              <input type="checkbox" checked={settings.auditNotification} onChange={e => handleChange("auditNotification", e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            </label>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Risk Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Risk Threshold Score</label>
              <p className="text-xs text-gray-500 mb-1">Scores above this are considered critical</p>
              <input type="number" value={settings.riskThreshold} onChange={e => handleChange("riskThreshold", parseInt(e.target.value))} className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Data Retention</h3>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Retention Period (years)</label>
            <p className="text-xs text-gray-500 mb-1">How long to retain compliance records</p>
            <input type="number" value={settings.retentionPeriod} onChange={e => handleChange("retentionPeriod", e.target.value)} className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>
    </div>
  );
}
