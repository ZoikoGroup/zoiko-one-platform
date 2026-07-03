import HRPage from "../../../components/HRPage";





export default function ReceivablesPage() {
  return (
    <HRPage title="Receivables" subtitle="Manage receivables">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Receivables</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Overdue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Bad Debt</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receivables Overview</h3>
          <p className="text-sm text-gray-500">View and manage outstanding receivables.</p>
        </div>
      </div>
    </HRPage>
  );
}
