import { useState, useMemo } from "react";
import PageHeader from "../../../components/PageHeader";
import { Package, Barcode, FolderTree, Ruler, ToggleLeft, Plus } from "lucide-react";
import { getItems } from "../mock-data/itemsData";

const TABS = [
  { key: "master-records", label: "Item Master Records", icon: Package },
  { key: "skus", label: "SKUs & Item Codes", icon: Barcode },
  { key: "categories", label: "Item Categories", icon: FolderTree },
  { key: "uom", label: "Units of Measure", icon: Ruler },
  { key: "status", label: "Active / Inactive Status", icon: ToggleLeft },
];

export default function ItemsPage() {
  const [activeTab, setActiveTab] = useState("master-records");
  const items = useMemo(() => getItems(), []);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Items"
        description="Manage item master records, SKUs, categories, units of measure, and status."
      />

      <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 overflow-x-auto px-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-[#FF7A00] text-[#FF7A00]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "master-records" && <MasterRecordsTab items={items} />}
          {activeTab === "skus" && <SkusTab />}
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "uom" && <UnitsOfMeasureTab />}
          {activeTab === "status" && <StatusTab />}
        </div>
      </div>
    </div>
  );
}

function MasterRecordsTab({ items }) {
  const columns = [
    { key: "name", label: "Name" },
    { key: "sku", label: "SKU" },
    { key: "category", label: "Category" },
    { key: "uom", label: "UOM" },
    { key: "unitPrice", label: "Unit Price", render: (v) => `$${v}` },
    { key: "quantity", label: "Qty" },
    { key: "minStock", label: "Min Stock" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status", render: (v) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
        {v}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Create and manage item master records including descriptions, pricing, and default settings.
        </p>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-orange-50/40 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {col.render ? col.render(item[col.key]) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{items.length} items total</p>
    </div>
  );
}

function SkusTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Define and manage SKUs and item codes for inventory tracking and identification.
      </p>
    </div>
  );
}

function CategoriesTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Organise items into categories for better classification and reporting.
      </p>
    </div>
  );
}

function UnitsOfMeasureTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Configure units of measure such as pieces, kilograms, litres, boxes, and more.
      </p>
    </div>
  );
}

function StatusTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Manage active and inactive status for items to control visibility in transactions and reports.
      </p>
    </div>
  );
}
