import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AntiCrashBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  declare props: Readonly<Props>;

  static getDerivedStateFromError(err: any): State {
    return { hasError: true };
  }

  componentDidCatch(err: any, info: ErrorInfo) {
    console.error("[AntiCrashBoundary]", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "#ff6666", padding: "20px", border: "1px solid #ff6666", borderRadius: "8px", background: "rgba(255,0,0,0.1)" }}>
          <h3 style={{margin: 0, fontSize: "14px"}}>Componente recuperado de um erro.</h3>
          <p style={{fontSize: "12px", opacity: 0.8}}>A funcionalidade pode estar limitada.</p>
        </div>
      );
    }
    return this.props.children || null;
  }
}