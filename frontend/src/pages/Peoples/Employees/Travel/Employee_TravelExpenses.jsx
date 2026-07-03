import { useEffect, useMemo, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { CheckCircle } from "lucide-react";
import { getTravel, createTravelExpense } from "../../../../service/employee";

const statusColor = {
  Reimbursed: "text-green-600 bg-green-50",
  Pending: "text-yellow-600 bg-yellow-50",
  Rejected: "text-red-600 bg-red-50",
};

function getStatusClass(st) {
  return statusColor[st] || "text-gray-500 bg-gray-100";
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("reimburs") || v.includes("paid")) return "Reimbursed";
  if (v.includes("pending") || v.includes("submitted")) return "Pending";
  if (v.includes("reject")) return "Rejected";
  return s ? String(s) : "Pending";
}

export default function TravelExpenses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ trip: "", category: "Hotel", amount: "" });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getTravel();
        const data = res?.data || res?.items || res || [];
        const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const filtered = arr.filter((t) => {
          const isExpense = t.type === "expense" || t.category || normalizeStatus(t.status) !== "Approved";
          return t.amount || t.expense_amount || t.category;
        });
        if (mounted) setExpenses(filtered);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load expenses");
        setExpenses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const expenseRows = useMemo(() => {
    return expenses.map((e, i) => ({
      id: e.id || e.expense_id || `EXP-${String(i + 1).padStart(3, "0")}`,
      trip: e.destination || e.location || e.trip || e.reason || "",
      category: e.category || "Other",
      amount: `₹${String(e.amount || e.expense_amount || "0")}`,
      status: normalizeStatus(e.status),
    }));
  }, [expenses]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createTravelExpense({
        description: form.trip,
        expense_type: form.category,
        amount: parseFloat(form.amount) || 0,
      });
      setShowForm(false);
      setForm({ trip: "", category: "Hotel", amount: "" });
      setSuccess("Your expense claim has been submitted successfully! It is under process and will be reviewed by the admin.");
      setTimeout(() => setSuccess(null), 5000);
      const res = await getTravel();
      const data = res?.data || res?.items || res || [];
      const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setExpenses(arr.filter((t) => t.amount || t.expense_amount || t.category));
    } catch (err) {
      setFormError(err?.message || "Failed to submit expense claim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HRPage title="Travel Expenses" subtitle="Submit and track your business travel reimbursements.">
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading expenses...</span>
        </div>
      )}

      {!loading && success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold flex items-center gap-2">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {!loading && error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div />
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              + Claim Expense
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="p-6 rounded-xl bg-white border-2 border-emerald-600">
              <h3 className="text-base font-bold text-gray-900 mb-4">New Expense Claim</h3>
              {formError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Trip</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai Visit"
                    value={form.trip}
                    onChange={(e) => setForm((f) => ({ ...f, trip: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {["Hotel", "Flight", "Cab", "Meals", "Transport", "Other"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {saving ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            {expenseRows.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-medium">No expense claims found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Expense ID", "Trip", "Category", "Amount", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenseRows.map((e) => (
                      <tr key={e.id} className="border-t border-gray-100">
                        <td className="px-5 py-3.5 text-xs font-semibold text-gray-400">{e.id}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-900">{e.trip}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">{e.category}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{e.amount}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusClass(e.status)}`}>{e.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </HRPage>
  );
}
