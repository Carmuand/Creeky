import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/**
 * Properties for the {@link ErrorBoundary} component.
 */
export interface ErrorBoundaryProps {
  /** Content rendered when no error was captured. */
  children: ReactNode;
  /** Content rendered after an error is captured. */
  fallback: ReactNode;
  /** Called with the captured error for reporting purposes. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

/**
 * State for the {@link ErrorBoundary} component.
 */
interface ErrorBoundaryState {
  /** Whether a render error was captured. */
  failed: boolean;
}

/**
 * React error boundary that isolates crashing subtrees.
 *
 * Used around non-essential heavy widgets (such as WebGL backgrounds)
 * so a failure degrades to the fallback instead of a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /** Initial state without captured errors. */
  state: ErrorBoundaryState = { failed: false };

  /**
   * Switches to the fallback after an error is thrown below.
   */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  /**
   * Forwards the captured error to the optional reporter.
   */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  /**
   * Renders the children or the fallback when failed.
   */
  render(): ReactNode {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
