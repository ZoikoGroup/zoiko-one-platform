import React from 'react';
import { TrendingUp } from 'lucide-react';

const colorMap = {
  teal:    { bg: 'bg-teal-50',    icon: 'text-teal-600',    border: 'border-teal-100',   value: 'text-teal-700'   },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100',value: 'text-emerald-700'},
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100',  value: 'text-amber-700'  },
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    border: 'border-blue-100',   value: 'text-blue-700'   },
  purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  border: 'border-purple-100', value: 'text-purple-700' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    border: 'border-rose-100',   value: 'text-rose-700'   },
};

/**
 * StatCard component – displays an icon, a title and a numeric value.
 * Props:
 *  - icon: Lucide icon component
 *  - title: string label
 *  - value: number or string (or JSX for skeleton)
 *  - loading: boolean – shows shimmer when true
 *  - color: 'teal' | 'emerald' | 'amber' | 'blue' | 'purple' | 'rose'
 *  - trend: optional string (e.g. "+12%")
 */
export default function StatCard({ icon: Icon, title, value, loading, color = 'teal', trend }) {
  const c = colorMap[color] || colorMap.teal;
  return (
    <div className={`bg-white border ${c.border} rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className={`p-3 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        {Icon && <Icon className={`w-5 h-5 ${c.icon}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 truncate">{title}</p>
        {loading ? (
          <div className="w-16 h-7 bg-slate-200 rounded-lg animate-pulse" />
        ) : (
          <p className={`text-2xl font-extrabold ${c.value} leading-none`}>{value ?? '—'}</p>
        )}
        {trend && !loading && (
          <div className="flex items-center gap-1 mt-1.5">
            <TrendingUp size={11} className="text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}
