import { useEffect, useRef, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getMyProfile, updateMyProfile } from "../../../../service/employee";

export default function EssSettings() {
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    getMyProfile()
      .then((res) => {
        if (!mounted.current) return;
        const p = res.data || res;
        if (p.notificationPreferences) {
          setNotifications({
            email: p.notificationPreferences.email ?? true,
            sms: p.notificationPreferences.sms ?? false,
            push: p.notificationPreferences.push ?? true,
          });
        }
        if (p.language) setLanguage(p.language);
        if (p.timezone) setTimezone(p.timezone);
      })
      .catch(() => {
        if (mounted.current) {
          setNotifications({ email: true, sms: false, push: true });
          setLanguage("English");
          setTimezone("Asia/Kolkata");
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, []);

  const handleSave = () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    updateMyProfile({
      notificationPreferences: notifications,
      language,
      timezone,
    })
      .then(() => {
        if (!mounted.current) return;
        setSuccess(true);
        setTimeout(() => { if (mounted.current) setSuccess(false); }, 3000);
      })
      .catch((err) => {
        if (mounted.current) setError(err.message || "Failed to save settings");
      })
      .finally(() => {
        if (mounted.current) setSaving(false);
      });
  };

  if (loading) {
    return (
      <HRPage title="Settings" subtitle="Manage your personal preferences and notification settings.">
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Settings" subtitle="Manage your personal preferences and notification settings.">
      <div className="space-y-5 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
            Settings saved successfully!
          </div>
        )}

        <div className="p-6 rounded-xl bg-white border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">Notification Preferences</h3>
          {[
            { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
            { key: "sms", label: "SMS Notifications", desc: "Receive alerts via SMS" },
            { key: "push", label: "Push Notifications", desc: "Browser push alerts" },
          ].map((n) => (
            <div key={n.key} className="flex justify-between items-center py-3 border-t border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                <p className="text-xs text-gray-500">{n.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifications((prev) => ({ ...prev, [n.key]: !prev[n.key] }))}
                className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${
                  notifications[n.key] ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    notifications[n.key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-xl bg-white border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">Regional Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {["English", "Hindi", "Telugu", "Tamil"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {["Asia/Kolkata", "UTC", "America/New_York", "Europe/London"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </HRPage>
  );
}
