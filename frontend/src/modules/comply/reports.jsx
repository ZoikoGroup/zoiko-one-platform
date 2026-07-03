import { useState } from "react";
import { FileText, BarChart3, Download, Calendar, FileSpreadsheet, FilePieChart } from "lucide-react";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);

  const reports = [
    { id: 1, title: "Compliance Summary Report", description: "Overall compliance status across all domains", icon: FileText, color: "emerald", type: "Summary", lastGenerated: "2026-06-15", format: "PDF" },
    { id: 2, title: "Audit Findings Report", description: "Detailed audit findings and remediation status", icon: FileSpreadsheet, color: "blue", type: "Audit", lastGenerated: "2026-06-14", format: "Excel" },
    { id: 3, title: "Risk Assessment Report", description: "Risk register analysis and treatment plans", icon: BarChart3, color: "orange", type: "Risk", lastGenerated: "2026-06-13", format: "PDF" },
    { id: 4, title: "Incident Analysis Report", description: "Incident trends and pattern analysis", icon: FilePieChart, color: "red", type: "Incident", lastGenerated: "2026-06-12", format: "PDF" },
    { id: 5, title: "Policy Compliance Report", description: "Policy adoption and acknowledgment metrics", icon: FileText, color: "purple", type: "Policy", lastGenerated: "2026-06-11", format: "PDF" },
    { id: 6, title: "Obligation Status Report", description: "Regulatory obligation tracking and deadlines", icon: Calendar, color: "teal", type: "Obligation", lastGenerated: "2026-06-10", format: "Excel" },
    { id: 7, title: "Control Effectiveness Report", description: "Control testing results and effectiveness ratings", icon: BarChart3, color: "indigo", type: "Control", lastGenerated: "2026-06-09", format: "PDF" },
    { id: 8, title: "Evidence Coverage Report", description: "Evidence repository completeness analysis", icon: FileSpreadsheet, color: "cyan", type: "Evidence", lastGenerated: "2026-06-08", format: "Excel" },
  ];

  const colorMap = {
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-600" },
    red: { bg: "bg-red-100", text: "text-red-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
    teal: { bg: "bg-teal-100", text: "text-teal-600" },
    indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
    cyan: { bg: "bg-cyan-100", text: "text-cyan-600" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and download compliance reports</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>Report period: All</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reports.map(report => {
          const c = colorMap[report.color];
          return (
            <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport(report)}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <report.icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{report.type}</p>
                  <p className="text-sm font-semibold text-gray-900">{report.title}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">{report.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Last: {report.lastGenerated}</span>
                <span className="font-medium">{report.format}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}