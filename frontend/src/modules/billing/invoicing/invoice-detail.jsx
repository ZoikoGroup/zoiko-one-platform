import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, RefreshCw, AlertCircle, Loader2, Send, CheckCircle, Ban, XCircle, Repeat, History } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { invoiceApi } from "../../../service/billingService";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "—";
const formatCurrency = (v) => v != null ? `$${Number(v).toLocaleString()}` : "—";

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    pending: "bg-blue-100 text-blue-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    partially_paid: "bg-amber-100 text-amber-700",
    cancelled: "bg-slate-100 text-slate-500",
    void: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown"}
    </span>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invData, itemsData, historyData] = await Promise.all([
        invoiceApi.get(id),
        invoiceApi.listItems(id).catch(() => []),
        invoiceApi.listStatusHistory(id).catch(() => []),
      ]);
      setInvoice(invData);
      setItems(Array.isArray(itemsData) ? itemsData : itemsData?.items || []);
      setStatusHistory(Array.isArray(historyData) ? historyData : historyData?.history || []);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleAction = async (action, actionFn) => {
    setActionLoading(action);
    try {
      await actionFn();
      await fetchInvoice();
    } catch (err) {
      setError(err?.detail || err?.message || `Failed to ${action} invoice`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <HRPage title="Invoice Detail" subtitle="Loading invoice details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </HRPage>
    );
  }

  if (error && !invoice) {
    return (
      <HRPage title="Invoice Detail" subtitle="Error loading invoice">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchInvoice} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </HRPage>
    );
  }

  if (!invoice) {
    return (
      <HRPage title="Invoice Detail" subtitle="Invoice not found">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Invoice not found</p>
        </div>
      </HRPage>
    );
  }

  const isDraft = invoice.status === "draft";
  const isPending = invoice.status === "pending" || invoice.status === "sent";

  return (
    <HRPage
      title={`Invoice ${invoice.invoice_number || `#${id}`}`}
      subtitle={<StatusBadge status={invoice.status} />}
      actions={
        <button onClick={() => navigate("/billing/invoices")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Invoice Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(invoice.total_amount ?? invoice.amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Balance Due</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(invoice.balance_due ?? invoice.amount_due)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Due Date</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDate(invoice.due_date)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{items.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
              <p className="text-gray-900 mt-0.5">{invoice.customer_name || invoice.customer_id || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</p>
              <p className="text-gray-900 mt-0.5">{formatDate(invoice.issue_date || invoice.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</p>
              <p className="text-gray-900 mt-0.5">{formatDate(invoice.due_date)}</p>
            </div>
            {invoice.currency && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</p>
                <p className="text-gray-900 mt-0.5">{invoice.currency}</p>
              </div>
            )}
            {invoice.notes && (
              <div className="col-span-full">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</p>
                <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Qty</th>
                    <th className="text-right py-3 px-4">Unit Price</th>
                    <th className="text-right py-3 px-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={item.id || i} className="text-sm text-gray-900">
                      <td className="py-3 px-4">{item.description || item.name || "Item"}</td>
                      <td className="py-3 px-4 text-right">{item.quantity ?? 1}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.total_price ?? item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(isDraft || isPending) && (
          <div className="flex gap-3">
            {isDraft && (
              <button
                onClick={() => handleAction("finalize", () => invoiceApi.finalize(id))}
                disabled={actionLoading === "finalize"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "finalize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Finalize
              </button>
            )}
            {isPending && (
              <button
                onClick={() => handleAction("send", () => invoiceApi.markSent(id))}
                disabled={actionLoading === "send"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Mark Sent
              </button>
            )}
            <button
              onClick={() => handleAction("cancel", () => invoiceApi.cancel(id))}
              disabled={actionLoading === "cancel"}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Cancel
            </button>
            <button
              onClick={() => handleAction("recalculate", () => invoiceApi.recalculate(id))}
              disabled={actionLoading === "recalculate"}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "recalculate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
              Recalculate
            </button>
          </div>
        )}

        {statusHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">From</th>
                    <th className="text-left py-3 px-4">To</th>
                    <th className="text-left py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statusHistory.map((entry, i) => (
                    <tr key={entry.id || i} className="text-sm text-gray-900">
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(entry.created_at || entry.timestamp)}</td>
                      <td className="py-3 px-4"><StatusBadge status={entry.from_status} /></td>
                      <td className="py-3 px-4"><StatusBadge status={entry.to_status} /></td>
                      <td className="py-3 px-4 text-gray-500">{entry.reason || entry.notes || "—"}</td>
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
