import React from "react";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";

export default class BillingSettingsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[BillingSettings] Error caught by boundary:", error);
    if (errorInfo) console.error("[BillingSettings] Component stack:", errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "Unknown error";
      return (
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Billing Configuration</h1>
              <p className="text-sm text-gray-500 mt-1">Enterprise billing module settings</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              A rendering error occurred in the Billing Settings page. This has been logged.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={this.handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                <RefreshCw size={16} />
                Retry
              </button>
              <button onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all">
                <RotateCcw size={16} />
                Reload
              </button>
            </div>
            <details className="mt-6 text-left max-w-lg mx-auto">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View Error Details</summary>
              <pre className="mt-2 p-3 bg-red-50 rounded-lg text-xs text-red-700 overflow-auto max-h-40">
                {errorMsg}
                {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ""}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
