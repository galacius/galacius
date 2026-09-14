import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../atoms/button";
import { CheckIcon, CopyIcon } from "../atoms/icon";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null, copied: false });

  copyError = () => {
    const { error } = this.state;
    if (!error) return;
    const text = `${error.message}\n${error.stack ?? ""}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    const { error, copied } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="font-semibold text-destructive">Something went wrong</p>
          <div className="relative w-full max-w-xl">
            <pre className="overflow-auto rounded bg-muted p-4 text-left text-xs text-muted-foreground">
              {error.message}
              {"\n"}
              {error.stack}
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              aria-label="Copy error"
              onClick={this.copyError}
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-success" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </Button>
          </div>
          <Button type="button" variant="link" onClick={this.reset} className="text-sm">
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
