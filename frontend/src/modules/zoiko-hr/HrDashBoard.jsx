import React, { useState, useEffect, useMemo } from "react";
import HRPage from "../../components/HRPage";
import {
  Users,
  UserCheck,
  Calendar,
  Briefcase,
  Clock,
  TrendingUp,
  Bell,
  Download,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  BarChart3,
  RefreshCw,
  FileText,
  Settings,
  Mail,
  Phone,
  MapPin,
  Building2,
  TrendingDown,
  Award,
  Target,
  DollarSign,
  Users as UsersIcon,
  Activity as ActivityIcon,
  Calendar as CalendarIcon,
  CheckSquare as CheckSquareIcon,
  Clock as ClockIcon,
  FileBarChart as FileBarChartIcon,
  BarChart2 as BarChart2Icon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Award as AwardIcon,
  Target as TargetIcon,
  DollarSign as DollarSignIcon,
} from "lucide-react";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { getHrDashboardStats, getHrEmployees, getDepartments, getAttendanceDashboard, getLeaveDashboard, getCompensationDashboard, getPerformanceDashboard } from "../../service/hrService";

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Chart Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-500 text-lg font-medium mb-2">⚠️ Chart Error</div>
          <div className="text-red-400 text-sm">Unable to render chart data</div>
        </div>
      );
    }

    return this.props.children;
  }
}

const extractArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const HrDashBoard = () => {
  const [activeTab, setActiveTab] = useState("executive");
  const [timeRange, setTimeRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [dashboardData, setDashboardData] = useState({
    hrDashboard: null,
    employees: [],
    departments: [],
    attendance: [],
    leave: [],
    compensation: null,
    performance: null,
    operational: null,
  });

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const results = await Promise.allSettled([
        getHrDashboardStats(),
        getHrEmployees(),
        getDepartments(),
        getAttendanceDashboard(),
        getLeaveDashboard(),
        getCompensationDashboard(),
        getPerformanceDashboard(),
      ]);

      const [hrResult, employeesResult, departmentsResult, attendanceResult, leaveResult, compensationResult, performanceResult] = results;

      const extractArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };

      const safeValue = (result, transform = (v) => v) =>
        result.status === "fulfilled" ? transform(result.value) : (console.error("Dashboard fetch failed:", result.reason), null);

      const errors = results.filter((r) => r.status === "rejected");
      if (errors.length) {
        console.warn(`${errors.length} dashboard widget(s) failed to load`);
      }

      setDashboardData({
        hrDashboard: safeValue(hrResult, (v) => v || {}),
        employees: safeValue(employeesResult, extractArray) || [],
        departments: safeValue(departmentsResult, extractArray) || [],
        attendance: safeValue(attendanceResult, extractArray) || [],
        leave: safeValue(leaveResult, extractArray) || [],
        compensation: safeValue(compensationResult, (v) => v || {}),
        performance: safeValue(performanceResult, (v) => v || {}),
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleExport = (format) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dashboardData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `hr-dashboard-${new Date().toISOString().split('T')[0]}.${format}`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowExportMenu(false);
  };

  const getFilteredData = () => {
    if (timeRange === "week") {
      return {
        ...dashboardData,
        attendance: dashboardData.attendance?.slice(0, 7) || [],
      };
    } else if (timeRange === "month") {
      return {
        ...dashboardData,
        attendance: dashboardData.attendance?.slice(0, 30) || [],
      };
    }
    return dashboardData;
  };

  const filteredData = useMemo(() => getFilteredData(), [dashboardData, timeRange]);

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-[#FF6B00]/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <h2 className="text-3xl font-extrabold text-slate-800 mt-2">{value}</h2>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUpIcon size={16} /> : <TrendingDownIcon size={16} />}
              <span className="ml-1">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-r ${color} text-white flex items-center justify-center`}>
          <Icon size={26} />
        </div>
      </div>
    </div>
  );

  const KPICard = ({ title, value, subtitle, progress, color }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
          <p className="text-slate-400 text-xs mt-1">{subtitle}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-r ${color} text-white flex items-center justify-center`}>
          <AwardIcon size={20} />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const ChartCard = ({ title, children, className }) => (
    <div className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${className}`}>
      <h2 className="text-xl font-bold text-slate-800 mb-6">{title}</h2>
      {children}
    </div>
  );

  const AlertBadge = ({ type, message, time }) => {
    const typeConfig = {
      warning: { icon: AlertCircle, color: "text-amber-600 bg-amber-50 border-amber-200" },
      info: { icon: Bell, color: "text-blue-600 bg-blue-50 border-blue-200" },
      success: { icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
    };
    const config = typeConfig[type] || typeConfig.info;
    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${config.color} text-sm font-medium`}>
        <Icon size={18} />
        <span className="flex-1">{message}</span>
        <span className="text-xs opacity-70">{time}</span>
      </div>
    );
  };

  const renderExecutiveDashboard = () => (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={filteredData.hrDashboard?.total_employees || "0"}
          icon={UsersIcon}
          color="from-blue-500 to-cyan-500"
          trend="up"
          trendValue="+2.4%"
        />
        <StatCard
          title="Active Departments"
          value={filteredData.hrDashboard?.active_departments || "0"}
          icon={Building2}
          color="from-purple-500 to-pink-500"
          trend="up"
          trendValue="+1"
        />
        <StatCard
          title="Pending Requests"
          value={filteredData.hrDashboard?.pending_requests || "0"}
          icon={Clock}
          color="from-orange-500 to-red-500"
          trend="down"
          trendValue="-12%"
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <ChartCard title="Department Comparison" className="xl:col-span-2">
          <ChartErrorBoundary>
            {filteredData.departments && filteredData.departments.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={extractArray(filteredData.departments)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="employee_count" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-400 text-lg mb-2">📊 No department data available</div>
                <div className="text-gray-300 text-sm">Data will appear here when available</div>
              </div>
            )}
          </ChartErrorBoundary>
        </ChartCard>

        <ChartCard title="Compliance Score">
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Compliant", value: filteredData.hrDashboard?.compliance_score || 0, fill: "#10b981" },
                    { name: "Non-Compliant", value: 100 - (filteredData.hrDashboard?.compliance_score || 0), fill: "#ef4444" },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Tooltip />
                </Pie>
                <text x={50} y={50} textAnchor="middle" dominantBaseline="middle" className="fill-slate-800 text-2xl font-bold">
                  {`${filteredData.hrDashboard?.compliance_score || 0}%`}
                </text>
                <text x={50} y={70} textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-sm">
                  Compliance
                </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] rounded-2xl text-white font-medium hover:shadow-lg transition-all">
              Generate Report
            </button>
            <button className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white font-medium hover:shadow-lg transition-all">
              View Analytics
            </button>
            <button className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl text-white font-medium hover:shadow-lg transition-all">
              Manage Users
            </button>
            <button className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl text-white font-medium hover:shadow-lg transition-all">
              Settings
            </button>
          </div>
        </ChartCard>
      </div>
    </div>
  );

  const renderDepartmentDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(filteredData.departments || []).map((dept, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-[#FF6B00]/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] cursor-pointer group"
            onClick={() => alert(`Drill down into ${dept.department}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{dept.department}</h3>
                <p className="text-slate-500 text-sm mt-1">{dept.employee_count} employees</p>
              </div>
              <ChevronRight className="text-slate-400 group-hover:text-[#FF6B00] transition-colors" size={20} />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Compensation</span>
                  <span className="font-semibold">${dept.compensation_avg.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    style={{ width: Math.min(dept.compensation_avg / 1500, 100) * 100 * 0.7 }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  dept.headcount_status === 'expanding' ? 'bg-green-100 text-green-700' :
                  dept.headcount_status === 'stable' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {dept.headcount_status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOperationalDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Attendance Rate"
          value={`${filteredData.operational?.attendance_rate || 0}%`}
          subtitle="Current month average"
          progress={filteredData.operational?.attendance_rate}
          color="from-green-500 to-emerald-500"
        />
        <KPICard
          title="Leave Processing"
          value={`${filteredData.operational?.leave_processing_time || 0} days`}
          subtitle="Average processing time"
          progress={Math.max(0, 100 - (filteredData.operational?.leave_processing_time || 0) * 10)}
          color="from-orange-500 to-red-500"
        />
        <KPICard
          title="Recruitment Pipeline"
          value={filteredData.operational?.recruitment_pipeline?.hired || 0}
          subtitle={`${filteredData.operational?.recruitment_pipeline?.applications || 0} applications`}
          progress={Math.min(100, (filteredData.operational?.recruitment_pipeline?.hired || 0) * 5)}
          color="from-purple-500 to-pink-500"
        />
        <KPICard
          title="Onboarding Completion"
          value={`${filteredData.operational?.onboarding_completion || 0}%`}
          subtitle="Success rate"
          progress={filteredData.operational?.onboarding_completion}
          color="from-blue-500 to-cyan-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Recruitment Pipeline">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: "Applications", value: filteredData.operational?.recruitment_pipeline?.applications || 0, color: "#3b82f6" },
                { name: "Interviews", value: filteredData.operational?.recruitment_pipeline?.interviews || 0, color: "#8b5cf6" },
                { name: "Offers", value: filteredData.operational?.recruitment_pipeline?.offers || 0, color: "#ec4899" },
                { name: "Hired", value: filteredData.operational?.recruitment_pipeline?.hired || 0, color: "#10b981" },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attendance Overview">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: "Present", value: 94, fill: "#10b981" },
                  { name: "Remote", value: 22, fill: "#3b82f6" },
                  { name: "On Leave", value: 3, fill: "#f59e0b" },
                  { name: "Absent", value: 1, fill: "#ef4444" },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                <Tooltip />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );

  const renderPerformanceDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Performance Score"
          value={`${filteredData.performance?.performance_score || 0}%`}
          subtitle="Overall performance"
          progress={filteredData.performance?.performance_score}
          color="from-blue-500 to-cyan-500"
        />
        <KPICard
          title="Learning Progress"
          value={`${filteredData.performance?.learning_progress || 0}%`}
          subtitle="Training completion"
          progress={filteredData.performance?.learning_progress}
          color="from-purple-500 to-pink-500"
        />
        <KPICard
          title="Compensation Trend"
          value="+5.2%"
          subtitle="Year over year"
          progress={85}
          color="from-green-500 to-emerald-500"
        />
        <KPICard
          title="Compliance Status"
          value={`${filteredData.performance?.compliance_status || 0}%`}
          subtitle="Audit compliance"
          progress={filteredData.performance?.compliance_status}
          color="from-orange-500 to-red-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Performance Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData.performance?.compensation_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#FF6B00"
                strokeWidth={3}
                dot={{ fill: "#FF6B00", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quick Statistics">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UsersIcon size={20} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Total Employees</p>
                  <p className="text-sm text-slate-500">Active workforce</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-800">{filteredData.hrDashboard?.total_employees || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckSquareIcon size={20} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Completed Tasks</p>
                  <p className="text-sm text-slate-500">This month</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-800">1,847</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <TargetIcon size={20} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Goals Met</p>
                  <p className="text-sm text-slate-500">Target achievement</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-800">94%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <DollarSignIcon size={20} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Budget Utilized</p>
                  <p className="text-sm text-slate-500">Current quarter</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-800">$2.4M</span>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-4">
      {notifications.map((alert) => (
        <AlertBadge key={alert.id} {...alert} />
      ))}
    </div>
  );

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-[#FF6B00] animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <RefreshCw size={24} className="text-[#FF6B00]" />
        </div>
      </div>
      <p className="mt-4 text-slate-600 font-medium">Loading dashboard data...</p>
      <p className="text-sm text-slate-400">This may take a few moments</p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
        <AlertCircle size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h3>
      <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
      <button
        onClick={handleRefresh}
        className="px-6 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
      >
        <RefreshCw size={18} />
        Try Again
      </button>
    </div>
  );

  const renderNoDataState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-16 w-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <FileText size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">No data available</h3>
      <p className="text-slate-600 mb-6 text-center max-w-md">The dashboard data is currently unavailable. Please check back later.</p>
      <button
        onClick={handleRefresh}
        className="px-6 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
      >
        <RefreshCw size={18} />
        Refresh Data
      </button>
    </div>
  );

  const renderExportPanel = () => (
    <div className="absolute top-16 right-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl z-50">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Export Options</h3>
      <div className="space-y-2">
        <button
          onClick={() => handleExport('json')}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
        >
          Export as JSON
        </button>
        <button
          onClick={() => handleExport('csv')}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
        >
          Export as CSV
        </button>
        <button
          onClick={() => handleExport('pdf')}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
        >
          Export as PDF
        </button>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Time Range:</span>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white shadow-lg'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-transparent text-slate-800 p-6 font-sans min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#FF6B00]/10 via-[#FF8C38]/5 to-transparent border border-[#FF6B00]/15 p-8 shadow-[0_4px_20px_rgba(255,107,0,0.02)]">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-850">Zoiko HR Dashboard</h1>
              <p className="mt-2 text-slate-650 text-lg max-w-3xl">
                Manage workforce, attendance, leaves, recruitment from one unified platform.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Last Updated</p>
              <p className="text-sm font-medium text-slate-700">{lastUpdated.toLocaleTimeString()}</p>
              <p className="text-sm font-medium text-slate-700">{lastUpdated.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-6 bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={`${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'bg-slate-50 hover:bg-slate-100'}`}
          >
            <Filter size={20} />
          </button>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <Download size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Quick Access:</span>
          <button
            onClick={() => setActiveTab('executive')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'executive' ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Executive
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'department' ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Department
          </button>
          <button
            onClick={() => setActiveTab('operational')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'operational' ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Operational
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'performance' ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Performance
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Export Menu */}
      {showExportMenu && renderExportPanel()}

      {/* Notifications */}
      <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Bell size={20} className="text-amber-500" />
          Recent Notifications
        </h3>
        {renderAlerts()}
      </div>

      {/* Main Content */}
      {loading ? renderLoadingState() : error ? renderErrorState() : renderNoDataState()}
      {!loading && !error && !dashboardData.hrDashboard && (
        <div className="text-center py-20">
          <p className="text-slate-600">No dashboard data available</p>
        </div>
      )}

      {!loading && !error && dashboardData.hrDashboard && (
        <>
          {activeTab === 'executive' && renderExecutiveDashboard()}
          {activeTab === 'department' && renderDepartmentDashboard()}
          {activeTab === 'operational' && renderOperationalDashboard()}
          {activeTab === 'performance' && renderPerformanceDashboard()}
        </>
      )}
    </div>
  );
};

export default HrDashBoard;
