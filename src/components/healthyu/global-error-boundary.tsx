import { Component, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    reportLovableError(error, { boundary: "global_error_boundary" });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground">Terjadi kesalahan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.error.message || "Sesuatu yang tidak terduga terjadi."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Coba lagi
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }
}