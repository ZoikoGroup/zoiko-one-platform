import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CreditCard, RefreshCw, AlertCircle, Loader2, CheckCircle,
  FileText, User, Layers, Clock, FileEdit, Activity, Shield, Ban,
  DollarSign, Calendar, Hash, Receipt, Building, Phone, Mail,
  XCircle, Send, RotateCcw, Info,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { paymentApi, invoiceApi, customerApi, auditApi, refundApi } from "../../../service/billingService";
import { formatDisplayCurrency, formatDisplayDate, extractArray } from "../../../utils/billing-helpers";

const STATUS_STYLES = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-blue-100 text-blue-700",
  partially_refunded: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || "bg-gray-100 text-gray-600";
  const icons = { completed: CheckCircle, pending: Clock, failed: XCircle, refunded: RefreshCw, partially_refunded: RefreshCw, cancelled: Ban };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s}`}>
      <Icon size={12} /> {status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown"}
    </span>
  );
}

const TABS = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "invoice", label: "Invoice", icon: Receipt },
  { key: "customer", label: "Customer", icon: User },
  { key: "allocation", label: "Allocation", icon: Layers },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "notes", label: "Notes", icon: FileEdit },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "audit", label: "Audit", icon: Shield },
];

function TabNav({ tabs, active, onChange }) {
  return (
    <nav className="flex gap-0 border-b border-gray-200 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              active === tab.key ? "border-violet-600 text-violet-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}>
            <Icon className="h-4 w-4" /> {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundType, setRefundType] = useState("full");

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payData, allocData, attemptData] = await Promise.all([
        paymentApi.get(id),
        paymentApi.listAllocations(id).catch(() => ({ allocations: [] })),
        paymentApi.listAttempts(id).catch(() => ({ attempts: [] })),
      ]);
      setPayment(payData);
      setAllocations(extractArray(allocData));
      setAttempts(extractArray(attemptData));

      const invoiceId = payData.invoice_id || (Array.isArray(allocData) ? allocData[0]?.invoice_id : allocData?.allocations?.[0]?.invoice_id);
      if (invoiceId) {
        invoiceApi.get(invoiceId).then(setInvoice).catch(() => {});
      }

      if (payData.customer_id) {
        customerApi.get(payData.customer_id).then(setCustomer).catch(() => {});
      }

      auditApi.list({ resource_type: "payment", resource_id: id, per_page: 20 })
        .then((d) => setAuditLogs(extractArray(d)))
        .catch(() => {});
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load payment");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPayment(); }, [fetchPayment]);

  const handleReconcile = async () => {
    setActionLoading("reconcile");
    try {
      await paymentApi.reconcile(id);
      await fetchPayment();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to reconcile payment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (status) => {
    setActionLoading(status);
    try {
      await paymentApi.updateStatus(id, status);
      await fetchPayment();
    } catch (err) {
      setError(err?.detail || err?.message || `Failed to update payment status`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async () => {
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) { setError("Refund amount must be greater than 0"); return; }
    const refundable = parseFloat(payment.amount || 0);
    if (amt > refundable) { setError(`Refund amount cannot exceed refundable amount of ${refundable}`); return; }
    setActionLoading("refund");
    setError(null);
    try {
      const refund = await refundApi.create({
        customer_id: Number(payment.customer_id),
        payment_id: Number(id),
        refund_number: "auto",
        refund_type: refundType === "full" ? "full" : "partial",
        amount: amt,
        currency: payment.currency || "USD",
        reason: refundReason || undefined,
      });
      await refundApi.complete(refund.id).catch((completeErr) => {
        console.warn("Refund created but completion failed:", completeErr);
        setError("Refund was created but could not be completed automatically. Please reconcile manually.");
      });
      setShowRefundModal(false);
      setRefundAmount("");
      setRefundReason("");
      setRefundType("full");
      await fetchPayment();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to process refund");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <HRPage title="Payment Detail" subtitle="Loading payment details...">
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>
      </HRPage>
    );
  }

  if (error && !payment) {
    return (
      <HRPage title="Payment Detail" subtitle="Error loading payment">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchPayment} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </HRPage>
    );
  }

  if (!payment) {
    return (
      <HRPage title="Payment Detail" subtitle="Payment not found">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Payment not found</p>
        </div>
      </HRPage>
    );
  }

  const btnClass = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
  const isActing = (a) => actionLoading === a;
  const allocatedTotal = allocations.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const remaining = parseFloat(payment.amount || 0) - allocatedTotal;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatDisplayCurrency(payment.amount, payment.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Method</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">{payment.payment_method_type || payment.payment_type?.replace(/_/g, " ") || "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
          <div className="mt-2"><StatusBadge status={payment.status} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatDisplayDate(payment.payment_date || payment.created_at)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Information</h3>
        <div className="grid grid-cols-2 gap-x-8">
          <InfoRow label="Payment Number" value={payment.payment_number || `#${payment.id}`} />
          <InfoRow label="Transaction ID" value={payment.transaction_id || payment.gateway_transaction_id} />
          <InfoRow label="Customer" value={payment.customer_name || payment.customer?.name || `Customer #${payment.customer_id}`} />
          <InfoRow label="Currency" value={payment.currency || "USD"} />
          <InfoRow label="Reference" value={payment.reference_number} />
          <InfoRow label="Gateway" value={payment.gateway} />
          <InfoRow label="Gateway Fee" value={payment.gateway_fee > 0 ? formatDisplayCurrency(payment.gateway_fee) : "—"} />
          <InfoRow label="Exchange Rate" value={payment.exchange_rate && payment.exchange_rate !== 1 ? payment.exchange_rate : "—"} />
          <InfoRow label="Allocated" value={formatDisplayCurrency(allocatedTotal)} />
          {remaining > 0 && <InfoRow label="Unallocated" value={formatDisplayCurrency(remaining)} />}
          <InfoRow label="Created" value={formatDisplayDate(payment.created_at)} />
          {payment.updated_at && <InfoRow label="Updated" value={formatDisplayDate(payment.updated_at)} />}
        </div>
      </div>

      {payment.status === "pending" && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          This payment is pending. Mark as completed when cleared by bank, then reconcile allocations.
        </div>
      )}
    </div>
  );

  const renderInvoice = () => {
    const inv = invoice || (payment.invoice_id ? { id: payment.invoice_id, invoice_number: `#${payment.invoice_id}` } : null);
    if (!inv) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Receipt size={16} className="text-violet-500" /> Invoice</h3>
          <div className="text-center py-8 text-slate-400">
            <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No invoice linked to this payment</p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{inv.invoice_number}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatDisplayCurrency(inv.total_amount || inv.amount, inv.currency)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
              }`}>{inv.status?.replace(/_/g, " ") || "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Receipt size={16} className="text-violet-500" /> Invoice Details</h3>
          <div className="grid grid-cols-2 gap-x-8">
            <InfoRow label="Invoice Number" value={inv.invoice_number} />
            <InfoRow label="Total Amount" value={formatDisplayCurrency(inv.total_amount || inv.amount, inv.currency)} />
            <InfoRow label="Paid Amount" value={formatDisplayCurrency(inv.paid_amount, inv.currency)} />
            <InfoRow label="Balance Due" value={formatDisplayCurrency(parseFloat(inv.total_amount || 0) - parseFloat(inv.paid_amount || 0), inv.currency)} />
            <InfoRow label="Status" value={<span className="capitalize">{inv.status?.replace(/_/g, " ")}</span>} />
            <InfoRow label="Payment Terms" value={inv.payment_terms} />
            <InfoRow label="Issue Date" value={formatDisplayDate(inv.issue_date)} />
            <InfoRow label="Due Date" value={formatDisplayDate(inv.due_date)} />
            {inv.currency && <InfoRow label="Currency" value={inv.currency} />}
          </div>
        </div>
      </div>
    );
  };

  const renderCustomer = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={16} className="text-violet-500" /> Customer Details</h3>
      {customer ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
              {(customer.display_name || customer.company_name || customer.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">{customer.display_name || customer.company_name || customer.name}</p>
              {customer.customer_code && <p className="text-sm text-slate-500">{customer.customer_code}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8">
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Mobile" value={customer.mobile} />
            <InfoRow label="Currency" value={customer.currency} />
            <InfoRow label="Payment Terms" value={customer.payment_terms?.replace(/_/g, " ")} />
            <InfoRow label="Tax ID" value={customer.tax_id} />
            <InfoRow label="Customer Type" value={customer.customer_type} />
          </div>
          {customer.billing_address && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Billing Address</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{customer.billing_address}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400">
          <User size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Customer details not available</p>
          <p className="text-xs text-slate-400 mt-1">Customer #{payment.customer_id}</p>
        </div>
      )}
    </div>
  );

  const renderAllocation = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Layers size={16} className="text-violet-500" /> Allocations ({allocations.length})</h3>
      {allocations.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Layers size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No allocations for this payment</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Invoice</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allocations.map((alloc, i) => (
                <tr key={alloc.id || i} className="text-sm text-gray-900 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{alloc.invoice_number || alloc.invoice_id || "—"}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatDisplayCurrency(alloc.amount)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{formatDisplayDate(alloc.created_at)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      alloc.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                      alloc.status === "pending" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{alloc.status || "completed"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex justify-between text-sm text-slate-600 mb-1">
          <span>Total Payment</span>
          <span className="font-medium text-slate-800">{formatDisplayCurrency(payment.amount)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600 mb-1">
          <span>Allocated</span>
          <span className="font-medium text-slate-800">{formatDisplayCurrency(allocatedTotal)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium border-t border-slate-200 pt-2 mt-1">
          <span>{remaining > 0 ? "Unallocated" : remaining < 0 ? "Over-allocated" : "Balance"}</span>
          <span className={remaining > 0 ? "text-amber-600" : remaining < 0 ? "text-red-600" : "text-emerald-600"}>
            {formatDisplayCurrency(Math.abs(remaining))}
          </span>
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => {
    const events = [];
    events.push({ icon: CreditCard, label: "Payment created", date: payment.created_at, color: "bg-violet-500" });

    if (payment.payment_date) {
      events.push({ icon: Calendar, label: "Payment date", date: payment.payment_date, color: "bg-blue-500" });
    }

    if (allocations.length > 0) {
      const allocDate = allocations[0]?.created_at || payment.updated_at;
      events.push({ icon: Layers, label: `Allocated to ${allocations.length} invoice(s)`, date: allocDate, color: "bg-indigo-500" });
    }

    if (payment.status === "completed" || payment.reconciled_at) {
      events.push({ icon: CheckCircle, label: "Payment reconciled", date: payment.reconciled_at || payment.updated_at, color: "bg-emerald-500" });
    }

    if (payment.status === "failed") {
      events.push({ icon: XCircle, label: "Payment failed", date: payment.updated_at, color: "bg-red-500" });
    }

    if (payment.status === "refunded" || payment.status === "partially_refunded") {
      events.push({ icon: RotateCcw, label: "Payment refunded", date: payment.updated_at, color: "bg-blue-500" });
    }

    if (payment.status === "cancelled") {
      events.push({ icon: Ban, label: "Payment cancelled", date: payment.updated_at, color: "bg-amber-500" });
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-violet-500" /> Timeline</h3>
        <div className="space-y-4">
          {events.map((ev, i) => (
            <div key={i} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full ${ev.color} text-white flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <ev.icon size={14} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{ev.label}</p>
                <p className="text-xs text-slate-400">{formatDisplayDate(ev.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNotes = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileEdit size={16} className="text-violet-500" /> Notes</h3>
      {payment.notes ? (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{payment.notes}</p>
      ) : (
        <div className="text-center py-8 text-slate-400">
          <FileEdit size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No notes for this payment</p>
        </div>
      )}
    </div>
  );

  const renderActivity = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity size={16} className="text-violet-500" /> Payment Attempts ({attempts.length})</h3>
      {attempts.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Activity size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No payment attempts recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.map((att, i) => (
            <div key={att.id || i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                att.status === "success" || att.status === "completed" ? "bg-emerald-100 text-emerald-600" :
                att.status === "failed" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
              }`}>
                {att.status === "success" || att.status === "completed" ? <CheckCircle size={14} /> :
                 att.status === "failed" ? <XCircle size={14} /> : <Clock size={14} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 capitalize">{att.status || "attempt"}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    att.status === "success" || att.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    att.status === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                  }`}>{att.status || "—"}</span>
                </div>
                {att.message && <p className="text-xs text-slate-500 mt-0.5">{att.message}</p>}
                {att.gateway_response && <p className="text-xs text-slate-400 mt-0.5">Gateway: {att.gateway_response}</p>}
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{formatDisplayDate(att.created_at || att.attempted_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAudit = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shield size={16} className="text-violet-500" /> Audit Trail</h3>
      {auditLogs.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Shield size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No audit log entries</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Action</th>
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Details</th>
                <th className="text-left py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.map((log, i) => (
                <tr key={log.id || i} className="text-sm text-gray-900 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      log.action === "created" ? "bg-violet-100 text-violet-700" :
                      log.action === "updated" ? "bg-blue-100 text-blue-700" :
                      log.action === "deleted" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{log.action || log.event_type || "—"}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.user_name || log.user_id || log.performed_by || "—"}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{log.details || log.description || log.message || "—"}</td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{formatDisplayDate(log.created_at || log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "invoice": return renderInvoice();
      case "customer": return renderCustomer();
      case "allocation": return renderAllocation();
      case "timeline": return renderTimeline();
      case "notes": return renderNotes();
      case "activity": return renderActivity();
      case "audit": return renderAudit();
      default: return renderOverview();
    }
  };

  return (
    <>
    <HRPage
      title={`Payment ${payment.payment_number || `#${id}`}`}
      subtitle={<StatusBadge status={payment.status} />}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/billing/payments")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="mb-6">
            <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />
          </div>
          {renderTabContent()}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {payment.status === "pending" && (
                <>
                  <button onClick={() => handleUpdateStatus("completed")} disabled={isActing("completed")}
                    className={`${btnClass} w-full text-white bg-emerald-600 hover:bg-emerald-700`}>
                    {isActing("completed") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Mark as Completed
                  </button>
                  <button onClick={() => handleUpdateStatus("failed")} disabled={isActing("failed")}
                    className={`${btnClass} w-full text-red-700 bg-red-50 hover:bg-red-100`}>
                    {isActing("failed") ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Mark as Failed
                  </button>
                </>
              )}

              {payment.status === "completed" && (
                <button onClick={handleReconcile} disabled={isActing("reconcile")}
                  className={`${btnClass} w-full text-white bg-emerald-600 hover:bg-emerald-700`}>
                  {isActing("reconcile") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Reconcile
                </button>
              )}

              {payment.status === "completed" && (
                <button onClick={() => { setRefundType("full"); setRefundAmount(String(parseFloat(payment.amount || 0))); setRefundReason(""); setShowRefundModal(true); }}
                  className={`${btnClass} w-full text-blue-700 bg-blue-50 hover:bg-blue-100`}>
                  <RotateCcw className="h-4 w-4" />
                  Refund Payment
                </button>
              )}

              {payment.status !== "cancelled" && payment.status !== "refunded" && (
                <button onClick={() => handleUpdateStatus("cancelled")} disabled={isActing("cancelled")}
                  className={`${btnClass} w-full text-amber-700 bg-amber-50 hover:bg-amber-100`}>
                  {isActing("cancelled") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Cancel Payment
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-medium">{formatDisplayCurrency(payment.amount, payment.currency)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Allocated</span><span className="font-medium text-emerald-600">{formatDisplayCurrency(allocatedTotal)}</span></div>
              {remaining > 0 && <div className="flex justify-between"><span className="text-slate-500">Unallocated</span><span className="font-medium text-amber-600">{formatDisplayCurrency(remaining)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Fee</span><span className="font-medium">{payment.gateway_fee > 0 ? formatDisplayCurrency(payment.gateway_fee) : "—"}</span></div>
              <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-2 mt-2">
                <span>Net</span><span>{formatDisplayCurrency(parseFloat(payment.amount || 0) - parseFloat(payment.gateway_fee || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HRPage>
    {showRefundModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (actionLoading !== "refund") setShowRefundModal(false); }}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Refund Payment</h3>
          <p className="text-sm text-gray-500 mb-4">Refundable amount: {formatDisplayCurrency(payment.amount, payment.currency)}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Refund Type</label>
              <div className="flex gap-2">
                <button onClick={() => { setRefundType("full"); setRefundAmount(String(parseFloat(payment.amount || 0))); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${refundType === "full" ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  Full Refund
                </button>
                <button onClick={() => { setRefundType("partial"); setRefundAmount(""); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${refundType === "partial" ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  Partial Refund
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Refund Amount ({payment.currency || "USD"}) *</label>
              <input type="number" min="0.01" step="0.01" max={parseFloat(payment.amount || 0)} value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Max: {formatDisplayCurrency(payment.amount, payment.currency)}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason</label>
              <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2}
                placeholder="Optional reason for refund..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowRefundModal(false)} disabled={actionLoading === "refund"}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
            <button onClick={handleRefund} disabled={actionLoading === "refund" || !refundAmount || parseFloat(refundAmount) <= 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
              {actionLoading === "refund" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {actionLoading === "refund" ? "Processing..." : "Process Refund"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
