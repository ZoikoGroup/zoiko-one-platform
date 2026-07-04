import { X } from "lucide-react";

export default function PayslipStub({ payslip, onClose }) {
  if (!payslip) return null;

  const earningsRows = [
    { label: "Basic Pay", amount: payslip.basicPay },
    { label: "HRA", amount: payslip.hra },
    { label: "Special Allowance", amount: payslip.specialAllowance },
    { label: "Overtime", amount: payslip.overtime || 0 },
  ];

  const deductionRows = [
    { label: "TDS / Income Tax", amount: payslip.tds },
    { label: "Provident Fund (PF)", amount: payslip.pf },
    { label: "ESI", amount: payslip.esi },
    { label: "Professional Tax", amount: payslip.professionalTax },
  ];

  const totalEarnings = earningsRows.reduce((s, r) => s + r.amount, 0);
  const totalDeductions = deductionRows.reduce((s, r) => s + r.amount, 0);
  const netPay = totalEarnings - totalDeductions;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/20" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-5 text-white flex items-center justify-between rounded-t-3xl">
            <div>
              <p className="text-lg font-extrabold">Payslip Stub</p>
              <p className="text-xs opacity-75">{payslip.period} · {payslip.employee}</p>
            </div>
            <button onClick={onClose} className="rounded-xl p-1.5 bg-white/10 hover:bg-white/20">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Company header */}
            <div className="text-center border-b border-slate-100 pb-4">
              <p className="text-sm font-bold text-slate-800">Zoiko Technologies Pvt. Ltd.</p>
              <p className="text-xs text-slate-400">Bandra Kurla Complex, Mumbai</p>
              <p className="text-xs text-slate-400 mt-1">Pay Period: {payslip.period}</p>
            </div>

            {/* Employee info */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 rounded-2xl p-4">
              {[
                ["Employee", payslip.employee],
                ["Employee ID", payslip.employeeId],
                ["Department", payslip.department],
                ["Pay Date", payslip.payDate],
                ["Bank Account", payslip.bankAccount],
                ["PAN", payslip.pan],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-semibold text-slate-800">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3">Earnings</h4>
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 overflow-hidden">
                {earningsRows.map((r) => (
                  <div key={r.label} className="flex justify-between px-5 py-2.5 border-b border-emerald-100 last:border-b-0 text-sm">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="font-semibold text-slate-800">₹{Number(r.amount).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-3 bg-emerald-100 text-sm font-bold">
                  <span>Total Earnings</span>
                  <span>₹{totalEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3">Deductions</h4>
              <div className="bg-red-50 rounded-2xl border border-red-100 overflow-hidden">
                {deductionRows.map((r) => (
                  <div key={r.label} className="flex justify-between px-5 py-2.5 border-b border-red-100 last:border-b-0 text-sm">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="font-semibold text-slate-800">₹{Number(r.amount).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-3 bg-red-100 text-sm font-bold">
                  <span>Total Deductions</span>
                  <span>₹{totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white text-center shadow-lg">
              <p className="text-xs opacity-75">Net Pay</p>
              <p className="text-3xl font-extrabold">₹{netPay.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
