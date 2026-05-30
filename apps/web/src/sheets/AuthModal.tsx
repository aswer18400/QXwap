import { type FormEvent, useEffect, useState } from "react";
import { X } from "../components/AppIcons";
import { BrandMark } from "../components/BrandMark";
import { useDialogA11y } from "../lib/useDialogA11y";
import type { User } from "../lib/types";
import { userService } from "../services";

export type AuthMode = "signin" | "signup";

export function AuthModal({
  close,
  onAuth,
  message,
  initialMode = "signin"
}: {
  close: () => void;
  onAuth: (user: User) => void;
  message: string;
  initialMode?: AuthMode;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);

  useEffect(() => {
    setMode(initialMode);
    setErr("");
  }, [initialMode]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErr("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const kind = mode === "signup" ? "signup" : "signin";
    if (mode === "signup" && password !== confirmPassword) {
      setErr("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (mode === "signup" && !accepted) {
      setErr("กรุณายอมรับเงื่อนไขการใช้งานก่อนสร้างบัญชี");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const nextUser: User =
        kind === "signup"
          ? await userService.signUp({
              email,
              password,
              ...(displayName.trim() ? { display_name: displayName.trim() } : {})
            })
          : await userService.signIn({ email, password });
      onAuth(nextUser);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet auth-sheet auth-sheet--reference" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-message" tabIndex={-1}>
        <div className="sheet-head">
          <div className="auth-sheet-brand">
            <BrandMark size={38} />
            <div className="auth-sheet-brand-copy">
              <span className="auth-sheet-kicker">QXwap Access</span>
              <h2 id="auth-title">{mode === "signup" ? "สร้างบัญชี QXwap" : "เข้าสู่ QXwap"}</h2>
            </div>
          </div>
          <button onClick={close} aria-label="ปิดหน้าต่างเข้าสู่ระบบ">
            <X aria-hidden="true" />
          </button>
        </div>
        <p className="auth-message" id="auth-message">{message}</p>
        <div className="auth-sheet-benefits" aria-hidden="true">
          <span>ติดตามดีลต่อเนื่อง</span>
          <span>แชทและข้อเสนอผูกกับบัญชี</span>
          <span>กลับมาทำต่อได้ทันที</span>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" ? (
            <label>
              ชื่อที่แสดง
              <input
                aria-label="ชื่อที่แสดง"
                autoComplete="name"
                placeholder="เช่น Raynee"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
          ) : null}
          <label>
            อีเมล
            <input
              aria-label="อีเมล"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            รหัสผ่าน
            <input
              aria-label="รหัสผ่าน"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mode === "signup" ? (
            <>
              <label>
                ยืนยันรหัสผ่าน
                <input
                  aria-label="ยืนยันรหัสผ่าน"
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
              <label className="check auth-terms">
                <input
                  aria-label="ยอมรับเงื่อนไขการใช้งาน"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  type="checkbox"
                />
                <span>ยอมรับเงื่อนไขการใช้งานของ QXwap</span>
              </label>
            </>
          ) : null}
          {err ? <p className="err auth-error" role="alert">{err}</p> : null}
          <button className="primary wide" disabled={loading} type="submit">
            {loading ? "กำลังตรวจสอบ..." : mode === "signup" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
          </button>
          <button className="secondary" disabled={loading} type="button" onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}>
            {mode === "signup" ? "มีบัญชีแล้ว" : "สร้างบัญชีใหม่"}
          </button>
        </form>
      </section>
    </div>
  );
}
