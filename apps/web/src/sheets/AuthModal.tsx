import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { useDialogA11y } from "../lib/useDialogA11y";
import type { User } from "../lib/types";

export function AuthModal({
  close,
  onAuth,
  message
}: {
  close: () => void;
  onAuth: (user: User) => void;
  message: string;
}) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [email, setEmail] = useState("mali@qxwap.app");
  const [password, setPassword] = useState("password123");
  const [err, setErr] = useState("");
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);

  async function submit(kind: "signin" | "signup") {
    try {
      const data = await api<{ user: User }>(`/auth/${kind}`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      onAuth(data.user);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-message" tabIndex={-1}>
        <div className="sheet-head">
          <h2 id="auth-title">
            {mode === "signup" ? "สร้างบัญชี QXwap" : mode === "forgot" ? "กู้คืนรหัสผ่าน" : "เข้าสู่ QXwap"}
          </h2>
          <button onClick={close} aria-label="ปิดหน้าต่างเข้าสู่ระบบ">
            <X aria-hidden="true" />
          </button>
        </div>
        <p className="auth-message" id="auth-message">{message}</p>
        <input
          aria-label="อีเมล"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          aria-label="รหัสผ่าน"
          placeholder="รหัสผ่าน"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err ? <p className="err" role="alert">{err}</p> : null}
        {mode === "forgot" ? (
          <>
            <p className="auth-message">ตอนนี้ยังไม่มีระบบส่งอีเมลอัตโนมัติ กรุณาสร้างบัญชีใหม่หรือเข้าสู่ระบบด้วยบัญชีเดิม</p>
            <button className="primary wide" onClick={() => setMode("signin")}>กลับไปเข้าสู่ระบบ</button>
          </>
        ) : (
          <>
            <button className="primary wide" onClick={() => submit(mode === "signup" ? "signup" : "signin")}>
              {mode === "signup" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
            </button>
            <button className="secondary" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "มีบัญชีแล้ว" : "สร้างบัญชีใหม่"}
            </button>
            <button className="secondary" onClick={() => setMode('forgot')}>ลืมรหัสผ่าน</button>
          </>
        )}
      </section>
    </div>
  );
}
