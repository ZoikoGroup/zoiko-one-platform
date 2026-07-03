import { useState, useEffect } from "react";
import { getSettings, updateSettings } from "../../service/insightsService";
import { SlidersHorizontal, Bell, Clock, Download, Eye, Moon, Sun, Save } from "lucide-react";

export default function InsightsSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !settings) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Catch silently
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure automated reporting generation schedules, access thresholds and charts configurations</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden">
        {/* Section 1 */}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Distribution Schedules</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Monthly Digests</p>
                <p className="text-xs text-gray-500">Dispatch summaries reports automatically on the 1st day of each month</p>
              </div>
              <button
                onClick={() => handleToggle("emailMonthlyDigest")}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.emailMonthlyDigest ? "bg-indigo-600" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.emailMonthlyDigest ? "translate-x-5" : ""}`} />
              </button>
            </label>
          </div>
        </div>

        {/* Section 2 */}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <SlidersHorizontal className="w-5 h-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Charts Framework Layout</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Layout Canvas Preference</p>
                <p className="text-xs text-gray-500">Pick theme styling palette mode configurations</p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => handleChange("chartPreferences", { ...settings.chartPreferences, theme: "light" })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 ${settings.chartPreferences?.theme === "light" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  onClick={() => handleChange("chartPreferences", { ...settings.chartPreferences, theme: "dark" })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 ${settings.chartPreferences?.theme === "dark" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Transitions Rendering</p>
                <p className="text-xs text-gray-500">Animate lines and plots on dashboard metric shifts</p>
              </div>
              <button
                onClick={() => handleChange("chartPreferences", { ...settings.chartPreferences, enableAnimations: !settings.chartPreferences?.enableAnimations })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.chartPreferences?.enableAnimations ? "bg-indigo-600" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.chartPreferences?.enableAnimations ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3">
        {saved && <span className="text-sm font-medium text-green-600">Preferences updated successfully!</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors shadow-sm"
        >
          <Save size={16} /> {saving ? "Saving Changes..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}