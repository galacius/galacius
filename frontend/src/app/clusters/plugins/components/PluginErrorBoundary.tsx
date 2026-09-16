import { Component, ErrorInfo, ReactNode } from "react";
import { PluginCrashedError } from "./PluginCrashedError";

interface Props {
  children: ReactNode;
  onGoToMarketplace?: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary that catches plugin import() failures
 * and displays a crash recovery UI.
 */
export class PluginErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Plugin load error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <PluginCrashedError onGoToMarketplace={this.props.onGoToMarketplace} />;
    }

    return this.props.children;
  }
}
