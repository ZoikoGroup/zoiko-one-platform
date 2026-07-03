import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, RefreshCw, AlertCircle, Loader2, Play, Ban, XCircle, RotateCcw } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { contractApi } from "../../../service/billingService";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "—";
const formatCurrency = (v) => v != null ? `$${Number(v).toLocaleString()}` : "—";

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-blue-100 text-blue-700",
    expired: "bg-gray-100 text-gray-600",
    terminated: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </span>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contractApi.get(id);
      setContract(data);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load contract");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchContract(); }, [fetchContract]);

  const handleAction = async (action, actionFn) => {
    setActionLoading(action);
    try {
      await actionFn();
      await fetchContract();
    } catch (err) {
      setError(err?.detail || err?.message || `Failed to ${action} contract`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <HRPage title="Contract Detail" subtitle="Loading contract details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </HRPage>
    );
  }

  if (error && !contract) {
    return (
      <HRPage title="Contract Detail" subtitle="Error loading contract">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchContract} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </HRPage>
    );
  }

  if (!contract) {
    return (
      <HRPage title="Contract Detail" subtitle="Contract not found">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Contract not found</p>
        </div>
      </HRPage>
    );
  }

  const isPending = contract.status === "pending";
  const isActive = contract.status === "active";

  return (
    <HRPage
      title={`Contract ${contract.contract_number || `#${id}`}`}
      subtitle={<StatusBadge status={contract.status} />}
      actions={
        <button onClick={() => navigate("/billing/contracts")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contract Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(contract.total_value ?? contract.contract_value)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Duration</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatDate(contract.start_date)} — {formatDate(contract.end_date)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Auto-Renewal</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{contract.auto_renew ? "Yes" : "No"}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
              <p className="text-gray-900 mt-0.5">{contract.customer_name || contract.customer_id || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</p>
              <p className="text-gray-900 mt-0.5">{formatDate(contract.start_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</p>
              <p className="text-gray-900 mt-0.5">{formatDate(contract.end_date)}</p>
            </div>
            {contract.billing_period && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Period</p>
                <p className="text-gray-900 mt-0.5">{contract.billing_period}</p>
              </div>
            )}
            {contract.terms && (
              <div className="col-span-full">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Terms & Conditions</p>
                <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">{contract.terms}</p>
              </div>
            )}
          </div>
        </div>

        {(isPending || isActive) && (
          <div className="flex gap-3">
            {isPending && (
              <button
                onClick={() => handleAction("activate", () => contractApi.activate(id))}
                disabled={actionLoading === "activate"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Activate
              </button>
            )}
            {isActive && (
              <>
                <button
                  onClick={() => handleAction("cancel", () => contractApi.cancel(id))}
                  disabled={actionLoading === "cancel"}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Cancel
                </button>
                <button
                  onClick={() => navigate(`/billing/contracts/${id}/renew`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Renew
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </HRPage>
  );
}
