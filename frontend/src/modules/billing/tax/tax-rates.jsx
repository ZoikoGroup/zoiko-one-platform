import HRPage from "../../../components/HRPage";





export default function TaxPage() {
  return (
    <HRPage title="Tax" subtitle="Manage tax rates">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tax Rates</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Inactive</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Rate Directory</h3>
          <p className="text-sm text-gray-500">View and manage tax rates.</p>
        </div>
      </div>
    </HRPage>
  );
}
