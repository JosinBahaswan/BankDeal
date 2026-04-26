import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (typeof console !== "undefined") console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div role="alert" style={{ padding: 20, background: "#fff1f0", color: "#3b0b0b", borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13 }}>{String(this.state.error?.message || "An unexpected error occurred.")}</div>
        </div>
      );
    }

    return this.props.children;
  }
}
