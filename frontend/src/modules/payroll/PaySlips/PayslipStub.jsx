import { X } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";

export default function PayslipStub({ payslip, onClose, currencyCode = "INR" }) {
  if (!payslip) return null;

  const fmt = (n) => formatCurrency(n || 0, currencyCode);

  const earningsRows = [
    { label: "Basic Pay", amount: payslip.basicPay },
    { label: "HRA", amount: payslip.hra },
    { label: "Special Allowance", amount: payslip.specialAllowance },
    { label: "Overtime", amount: payslip.overtime || 0 },
    { label: "Additional Compensation", amount: payslip.additionalCompensation || 0 },
  ];

  const deductionRows = [
    { label: "TDS / Income Tax", amount: payslip.tds },
    { label: "Provident Fund (PF)", amount: payslip.pf },
    { label: "ESI", amount: payslip.esi },
    { label: "Professional Tax", amount: payslip.professionalTax },
    { label: "Social Security", amount: payslip.socialSecurity || 0 },
    { label: "Medicare", amount: payslip.medicare || 0 },
    { label: "NI Employee", amount: payslip.niEmployee || 0 },
  ];

  const computedEarnings = earningsRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const computedDeductions = deductionRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalEarnings = (Number(payslip.totalEarnings) || 0) || computedEarnings;
  const totalDeductions = (Number(payslip.totalDeductions) || 0) || computedDeductions;
  const netPay = payslip.netPay != null ? Number(payslip.netPay) : totalEarnings - totalDeductions;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-[#1A1816]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#221D1A] rounded-[18px] shadow-[0_24px_48px_rgba(0,0,0,0.15)] w-full max-w-2xl max-h-[90vh] overflow-auto">
          <div className="bg-[#19C58A] px-6 py-5 text-white flex items-center justify-between">
            <div>
              <p className="text-lg font-extrabold">Payslip Stub</p>
              <p className="text-[12px] opacity-75">{payslip.period} · {payslip.employee}</p>
            </div>
            <button onClick={onClose} className="rounded-[12px] p-1.5 bg-white/15 hover:bg-white/25 transition-all duration-200">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center border-b border-[#E5E0D9] dark:border-[#38312D] pb-4">
              <p className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Zoiko Technologies Pvt. Ltd.</p>
              <p className="text-[13px] text-[#9E9690]">Bandra Kurla Complex, Mumbai</p>
              <p className="text-[13px] text-[#9E9690] mt-1">Pay Period: {payslip.period}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[13px] bg-[#F8F7F4] dark:bg-[#2A2520] rounded-[18px] p-4">
              {[
                ["Employee", payslip.employee],
                ["Employee ID", payslip.employeeId],
                ["Department", payslip.department],
                ["Pay Date", payslip.payDate],
                ["Bank Account", payslip.bankAccount],
                ["PAN", payslip.pan],
                ["Payable Days", payslip.payableDays != null && payslip.totalWorkingDays != null
                  ? `${payslip.payableDays} / ${payslip.totalWorkingDays}` : null],
              ].filter(([, val]) => val !== null).map(([label, val]) => (
                <div key={label}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">{label}</p>
                  <p className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8] mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {payslip.payableDays != null && payslip.totalWorkingDays != null &&
              payslip.payableDays < payslip.totalWorkingDays && (
              <div className="rounded-[14px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 flex items-start gap-2">
                <span className="text-amber-500 text-[13px] mt-0.5">⚠</span>
                <p className="text-[12px] text-amber-700 dark:text-amber-400">
                  Prorated for <strong>{payslip.payableDays} of {payslip.totalWorkingDays}</strong> payable working days
                  this period ({Math.round((payslip.payableDays / payslip.totalWorkingDays) * 100)}% of full pay) —
                  basic, HRA, and special allowance below are already scaled down for recorded absence/unpaid leave.
                </p>
              </div>
            )}

            <div>
              <h4 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-3">Earnings</h4>
              <div className="bg-[#19C58A]/5 rounded-[18px] border border-[#19C58A]/15 overflow-hidden">
                {earningsRows.map((r) => (
                  <div key={r.label} className="flex justify-between px-5 py-2.5 border-b border-[#19C58A]/10 last:border-b-0 text-[13px]">
                    <span className="text-[#6B6560] dark:text-[#A69B93]">{r.label}</span>
                    <span className="font-semibold text-[#1A1816] dark:text-[#F0EDE8]">{fmt(r.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-3 bg-[#19C58A]/10 text-[13px] font-bold text-[#19C58A]">
                  <span>Total Earnings</span>
                  <span>{fmt(totalEarnings)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-3">Deductions</h4>
              <div className="bg-[#FF6E86]/5 rounded-[18px] border border-[#FF6E86]/15 overflow-hidden">
                {deductionRows.map((r) => (
                  <div key={r.label} className="flex justify-between px-5 py-2.5 border-b border-[#FF6E86]/10 last:border-b-0 text-[13px]">
                    <span className="text-[#6B6560] dark:text-[#A69B93]">{r.label}</span>
                    <span className="font-semibold text-[#1A1816] dark:text-[#F0EDE8]">{fmt(r.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-3 bg-[#FF6E86]/10 text-[13px] font-bold text-[#FF6E86]">
                  <span>Total Deductions</span>
                  <span>{fmt(totalDeductions)}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#19C58A] rounded-[18px] p-5 text-white text-center shadow-[0_4px_14px_rgba(25,197,138,0.3)]">
              <p className="text-[12px] opacity-75">Net Pay</p>
              <p className="text-[32px] font-extrabold">{fmt(netPay)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}