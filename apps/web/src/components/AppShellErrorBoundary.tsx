import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCcw } from "./AppIcons";

type RouteContext = {
  view: string;
  pathname: string;
  search: string;
  inboxTab?: string;
  selectedId?: string | null;
  offerId?: string | null;
  profileId?: string | null;
  editingItemId?: string | null;
  campaignId?: string | null;
  userId?: string | null;
};

type Props = {
  children: ReactNode;
  resetKey: string;
  onGoHome: () => void;
  routeContext: RouteContext;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppShellErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดระหว่างแสดงผล"
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const routeErrorPayload = {
      routeContext: this.props.routeContext,
      message: error instanceof Error ? error.message : "unknown render error",
      stack: error instanceof Error ? error.stack || "" : "",
      componentStack: info.componentStack,
      caughtAt: new Date().toISOString()
    };
    if (typeof window !== "undefined") {
      (window as Window & { __QXWAP_LAST_ROUTE_ERROR__?: typeof routeErrorPayload }).__QXWAP_LAST_ROUTE_ERROR__ = routeErrorPayload;
    }
    console.error("QXwap route render error", routeErrorPayload);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const routeSummary = [
      this.props.routeContext.view,
      this.props.routeContext.offerId ? `offer:${this.props.routeContext.offerId}` : "",
      this.props.routeContext.selectedId ? `item:${this.props.routeContext.selectedId}` : "",
      this.props.routeContext.profileId ? `profile:${this.props.routeContext.profileId}` : ""
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <section className="screen shell-error-state" role="alert">
        <div className="panel shell-error-card">
          <small className="shell-error-kicker">เกิดปัญหาชั่วคราว</small>
          <h1>หน้านี้แสดงผลไม่ครบ เรากำลังกู้หน้าให้ใช้งานต่อได้</h1>
          <p>ข้อมูลบางส่วนจากหน้านี้ทำให้การแสดงผลสะดุด แต่แอปยังใช้งานต่อได้ ลองกลับหน้าหลักหรือโหลดหน้าใหม่อีกครั้ง</p>
          <div className="shell-error-actions">
            <button type="button" className="primary" onClick={this.props.onGoHome}>
              กลับหน้าหลัก
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCcw size={16} /> โหลดหน้าใหม่
            </button>
          </div>
          {routeSummary ? <small className="shell-error-note">เส้นทาง: {routeSummary}</small> : null}
          {this.state.message ? <small className="shell-error-note">รายละเอียด: {this.state.message}</small> : null}
        </div>
      </section>
    );
  }
}
