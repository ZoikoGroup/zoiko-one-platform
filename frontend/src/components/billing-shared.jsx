import { AlertCircle, RefreshCw } from "lucide-react";

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
    </div>
  );
}

export function LoadingState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center"><RefreshCw size={24} className="text-violet-600" /></div>
      </div>
      <p className="mt-4 text-slate-600 font-medium">{message || "Loading..."}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry, fullPage, title }) {
  const content = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4"><AlertCircle size={32} /></div>
      {title && <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>}
      <p className="text-sm text-slate-600 mb-6 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-6 py-3 bg-linear-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg">
          <RefreshCw size={18} /> Try Again
        </button>
      )}
    </div>
  );
  return content;
}

export function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-slate-300 mb-3" />}
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      {message && <p className="text-xs text-slate-400">{message}</p>}
    </div>
  );
}
