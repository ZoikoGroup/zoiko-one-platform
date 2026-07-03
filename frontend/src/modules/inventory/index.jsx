import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, Plus, Search } from "lucide-react";

const TABS = [
  { key: "items", label: "Items" },
  { key: "locations", label: "Locations" },
  { key: "stock", label: "Stock" },
  { key: "receiving", label: "Receiving" },
  { key: "goods-issue", label: "Goods Issue" },
  { key: "transfers", label: "Transfers" },
  { key: "stock-counts", label: "Stock Counts" },
  { key: "reorder", label: "Reorder" },
  { key: "assets", label: "Assets" },
  { key: "reports", label: "Reports" },
];

export default function InventoryModule() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname.split("/").pop() || "items";
  const [activeTab, setActiveTab] = useState(currentTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
    navigate(`/inventory/${key}`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage stock, locations, assets, and inventory operations.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-full text-sm font-semibold hover:bg-[#FF7A00]/90 transition">
          <Plus className="h-4 w-4" /> New Item
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${
              activeTab === tab.key ? "bg-[#FF7A00] text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total Items", value: "0" },
          { label: "Low Stock", value: "0", color: "text-amber-600" },
          { label: "Out of Stock", value: "0", color: "text-red-600" },
          { label: "Pending Receiving", value: "0" },
          { label: "Active Assets", value: "0" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color || "text-slate-800"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider capitalize">{activeTab.replace("-", " ")}</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-full outline-none focus:border-[#FF7A00]"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">SKU</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4">Quantity</th>
              <th className="py-3 pr-4">Location</th>
              <th className="py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="6" className="py-12 text-center text-sm text-slate-400">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No {activeTab.replace("-", " ")} data yet. Add your first item to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
