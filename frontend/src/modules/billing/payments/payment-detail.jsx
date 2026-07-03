import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, RefreshCw, AlertCircle, Loader2, CheckCircle, Activity, Link } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { paymentApi } from "../../../service/billingService";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "—";
const formatCurrency = (v) => v != null ? `$${Number(v).toLocaleString()}` : "—";

function StatusBadge({ status }) {
  const styles = {
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-amber-100 text-amber-700",
    partially_refunded: "bg-amber-100 text-amber-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown"}
    </span>
  );
}

export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payData, allocData, attemptData] = await Promise.all([
        paymentApi.get(id),
        paymentApi.listAllocations(id).catch(() => []),
        paymentApi.listAttempts(id).catch(() => []),
      ]);
      setPayment(payData);
      setAllocations(Array.isArray(allocData) ? allocData : allocData?.allocations || []);
      setAttempts(Array.isArray(attemptData) ? attemptData : attemptData?.attempts || []);
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

  if (loading) {
    return (
      <HRPage title="Payment Detail" subtitle="Loading payment details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
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

  return (
    <HRPage
      title={`Payment ${payment.payment_number || `#${id}`}`}
      subtitle={<StatusBadge status={payment.status} />}
      actions={
        <button onClick={() => navigate("/billing/payments")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(payment.amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Method</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{payment.payment_method_type || payment.payment_method || "—"}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
            <div className="mt-2"><StatusBadge status={payment.status} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Date</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDate(payment.payment_date || payment.created_at)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
              <p className="text-gray-900 mt-0.5">{payment.customer_name || payment.customer_id || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</p>
              <p className="text-gray-900 mt-0.5">{payment.transaction_id || payment.gateway_transaction_id || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</p>
              <p className="text-gray-900 mt-0.5">{payment.currency || "USD"}</p>
            </div>
            {payment.reference_number && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</p>
                <p className="text-gray-900 mt-0.5">{payment.reference_number}</p>
              </div>
            )}
          </div>
        </div>

        {payment.status === "pending" && (
          <div className="flex gap-3">
            <button
              onClick={handleReconcile}
              disabled={actionLoading === "reconcile"}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "reconcile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Reconcile
            </button>
          </div>
        )}

        {allocations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocations</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Invoice</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allocations.map((alloc, i) => (
                    <tr key={alloc.id || i} className="text-sm text-gray-900">
                      <td className="py-3 px-4">{alloc.invoice_number || alloc.invoice_id || "—"}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(alloc.amount)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(alloc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {attempts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Attempts</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attempts.map((att, i) => (
                    <tr key={att.id || i} className="text-sm text-gray-900">
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(att.created_at || att.attempted_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          att.status === "success" || att.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : att.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {att.status || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{att.message || att.gateway_response || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </HRPage>
  );
}
