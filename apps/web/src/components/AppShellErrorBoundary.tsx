import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCcw } from "./AppIcons";

type Props = {
  children: ReactNode;
  resetKey: string;
  onGoHome: () => void;
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
    console.error("QXwap route render error", error, info);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

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
          {this.state.message ? <small className="shell-error-note">รายละเอียด: {this.state.message}</small> : null}
        </div>
      </section>
    );
  }
}
