import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, RefreshCw, AlertCircle, Loader2, Send, CheckCircle, Ban, Repeat, Printer, Copy, CreditCard, Undo2, DollarSign } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { invoiceApi } from "../../../service/billingService";
import { formatDisplayCurrency, formatDisplayDate } from "../../../utils/billing-helpers";

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
        invoiceApi.listItems(id).catch(() => { /* error logged by api layer */ return []; }),
        invoiceApi.listStatusHistory(id).catch(() => { /* error logged by api layer */ return []; }),
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

  const handleDuplicate = async () => {
    if (!invoice?.customer_id) return;
    setActionLoading("duplicate");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const dueDate = invoice.due_date && invoice.issue_date
        ? new Date(Date.now() + Math.max(0, new Date(invoice.due_date) - new Date(invoice.issue_date))).toISOString().slice(0, 10)
        : today;
      const created = await invoiceApi.create({
        customer_id: Number(invoice.customer_id),
        issue_date: today,
        due_date: dueDate,
        currency: invoice.currency || "USD",
        notes: invoice.notes || undefined,
        payment_terms: invoice.payment_terms || "net_30",
        po_number: invoice.po_number || undefined,
        discount_percentage: Number(invoice.discount_percentage || 0),
      });
      const newId = created.id || created.invoice_id;
      if (items.length > 0) {
        await invoiceApi.bulkSetItems(newId, items.map((item) => ({
          product_id: item.product_id || undefined,
          description: item.description || item.name || "Item",
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0),
          discount_percentage: Number(item.discount_percentage || 0),
          tax_percentage: Number(item.tax_percentage || 0),
          total: Number(item.total_price || item.total || 0),
        })));
      }
      navigate(`/billing/invoices/${newId}`);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to duplicate invoice");
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
  const invoiceTotal = Number(invoice.total_amount ?? invoice.amount ?? 0);
  const balanceDue = Number(invoice.balance_due ?? invoice.amount_due ?? 0);
  const paidAmount = Math.max(0, invoiceTotal - balanceDue);

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Customer</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">{invoice.customer_name || `Customer #${invoice.customer_id || "—"}`}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {invoice.currency || "USD"} - {invoice.payment_terms?.replace(/_/g, " ") || "standard terms"} - issued {formatDisplayDate(invoice.issue_date || invoice.created_at)}
                </p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Paid</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">{formatDisplayCurrency(paidAmount)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Balance</p>
                <p className="mt-1 text-lg font-bold text-amber-700">{formatDisplayCurrency(balanceDue)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Due</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatDisplayDate(invoice.due_date)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Actions</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <Printer className="h-3.5 w-3.5" /> PDF
              </button>
              <button onClick={handleDuplicate} disabled={actionLoading === "duplicate"} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {actionLoading === "duplicate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Duplicate
              </button>
              <button onClick={() => navigate(`/billing/payments?invoice_id=${id}`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <CreditCard className="h-3.5 w-3.5" /> Payment
              </button>
              <button onClick={() => navigate(`/billing/credit-notes?invoice_id=${id}`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <Undo2 className="h-3.5 w-3.5" /> Credit
              </button>
              {isPending && (
                <button onClick={() => handleAction("send", () => invoiceApi.markSent(id))} disabled={actionLoading === "send"} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send Invoice
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Invoice Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDisplayCurrency(invoice.total_amount ?? invoice.amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Balance Due</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDisplayCurrency(invoice.balance_due ?? invoice.amount_due)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Due Date</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDisplayDate(invoice.due_date)}</p>
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
              <p className="text-gray-900 mt-0.5">{formatDisplayDate(invoice.issue_date || invoice.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</p>
              <p className="text-gray-900 mt-0.5">{formatDisplayDate(invoice.due_date)}</p>
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
                      <td className="py-3 px-4 text-right">{formatDisplayCurrency(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatDisplayCurrency(item.total_price ?? item.quantity * item.unit_price)}</td>
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
                      <td className="py-3 px-4 whitespace-nowrap">{formatDisplayDate(entry.created_at || entry.timestamp)}</td>
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
