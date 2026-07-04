import { useState, useEffect, useCallback } from "react";
import { PlayCircle, Plus, X } from "lucide-react";
import { useToast } from "../ToastContext";
import RunsTable from "./RunsTable";
import RunDetailPage from "./RunDetailPage";
import { fetchRuns, createRun } from "../../../service/payrollService";

export default function PayrollRunsPage() {
  const { addToast } = useToast();
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ period: "", payDate: "" });

  const loadRuns = useCallback(async () => {
    const data = await fetchRuns();
    setRuns(data);
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleCreateRun = async () => {
    if (!form.period || !form.payDate) {
      addToast?.("Please fill in the pay period and pay date.", "error");
      return;
    }
    setCreating(true);
    try {
      await createRun(form);
      addToast?.("Payroll run created.", "success");
      setShowCreateModal(false);
      setForm({ period: "", payDate: "" });
      await loadRuns();
    } catch {
      addToast?.("Failed to create payroll run. Please try again.", "error");
    } finally {
      setCreating(false);
    }
  };

  if (selectedRun) {
    return (
      <div className="p-6">
        <RunDetailPage run={selectedRun} onBack={() => setSelectedRun(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-7 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <PlayCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Payroll Runs</h1>
            <p className="text-slate-500 text-sm">{runs.length} total runs · Click any run to view detail</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          <Plus size={15} /> Create Run
        </button>
      </div>

      <RunsTable runs={runs} onSelect={setSelectedRun} />

      {showCreateModal && (
        <>
          <div className="fixed inset-0 z-30 bg-slate-900/20" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-800">Create Payroll Run</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Pay Period</label>
                  <input
                    type="text"
                    placeholder="e.g. Jul 1–15, 2026"
                    value={form.period}
                    onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Pay Date</label>
                  <input
                    type="date"
                    value={form.payDate}
                    onChange={(e) => setForm((f) => ({ ...f, payDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRun}
                  disabled={creating}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create Run"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}