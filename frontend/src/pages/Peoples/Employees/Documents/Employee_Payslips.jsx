import { useEffect, useMemo, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getDocuments } from "../../../../service/employee";

function parseCurrency(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[₹,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export default function Payslips() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawDocs, setRawDocs] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getDocuments({ category: "payslip" });
        const data = res?.data || res?.items || res?.data?.items || [];
        if (mounted) setRawDocs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load payslips");
        setRawDocs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const payslips = useMemo(() => {
    return rawDocs
      .map((d) => {
        const title = d.title || d.name || d.document_type || "";
        const gross = d.gross || d.gross_pay || parseCurrency(d.amount || 0) || "₹0";
        const deductions = d.deductions || d.total_deductions || "₹0";
        const net = d.net || d.net_pay || d.amount || "₹0";
        const status = d.status || d.document_status || "Generated";
        const month = d.month || d.period || title;
        const id = d.id || d.document_id || title;
        return { id, month, gross, deductions, net, status };
      })
      .sort((a, b) => String(b.month).localeCompare(String(a.month)));
  }, [rawDocs]);

  const stats = useMemo(() => {
    if (payslips.length === 0) {
      return { gross: "₹0", deductions: "₹0", net: "₹0" };
    }
    const latest = payslips[0];
    return {
      gross: latest.gross,
      deductions: latest.deductions,
      net: latest.net,
    };
  }, [payslips]);

  if (loading) {
    return (
      <HRPage title="My Payslips" subtitle="Download your monthly salary slips.">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading payslips...</span>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="My Payslips" subtitle="Download your monthly salary slips.">
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      {!error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-7">
            {[
              { label: "Last Month CTC", value: stats.gross, color: "text-indigo-600" },
              { label: "Last Deductions", value: stats.deductions, color: "text-red-600" },
              { label: "Last Net Pay", value: stats.net, color: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-xl bg-white border border-gray-200 text-center">
                <p className={`text-3xl font-extrabold ${s.color} m-0 mb-1`}>{s.value}</p>
                <p className="text-xs text-gray-500 m-0">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            {payslips.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No payslips found.</div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Month", "Gross Pay", "Deductions", "Net Pay", "Action"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p) => (
                    <tr key={p.id || p.month} className="border-t border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{p.month}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{p.gross}</td>
                      <td className="px-5 py-3.5 text-sm text-red-600">{p.deductions}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">{p.net}</td>
                      <td className="px-5 py-3.5">
                        <button className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 border-none rounded-md text-xs font-semibold cursor-pointer hover:bg-indigo-100">
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </HRPage>
  );
}
