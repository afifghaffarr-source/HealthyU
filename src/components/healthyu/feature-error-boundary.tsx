import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props {
  /** Nama fitur untuk log + microcopy (mis. "AI Coach", "Scan makanan"). */
  feature: string;
  children: ReactNode;
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Per-feature error boundary. Isolasi crash satu fitur (mis. scan/AI coach)
 * agar halaman lain tetap jalan. Pakai untuk surface AI yang rawan error
 * runtime: stream chat, kamera scan, reports generator, dsb.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    reportLovableError(error, { boundary: "feature_error_boundary", feature: this.props.feature });
    console.error(`[feature:${this.props.feature}]`, error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return (
      <div className="mx-auto my-6 max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-3 text-base font-semibold text-foreground">
          {this.props.feature} sedang bermasalah
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tenang, fitur lain tetap bisa kamu pakai. Coba muat ulang bagian ini.
        </p>
        <button
          onClick={this.reset}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Coba lagi
        </button>
      </div>
    );
  }
}