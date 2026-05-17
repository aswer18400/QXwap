import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { useDialogA11y } from "../lib/useDialogA11y";
import type { User } from "../lib/types";

type AuthMode = "signin" | "signup" | "forgot";

export function AuthModal({
  close,
  onAuth,
  message
}: {
  close: () => void;
  onAuth: (user: User) => void;
  message: string;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("mali@qxwap.app");
  const [password, setPassword] = useState("password123");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);

  async function submit(kind: AuthMode = mode) {
    setErr("");
    setNotice("");
    try {
      if (kind === "forgot") {
        setNotice("Password reset is not enabled yet. Please create a new account or contact support.");
        return;
      }

      const data = await api<{ user: User }>(`/auth/${kind}`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      onAuth(data.user);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const title = mode === "signup" ? "Create QXwap account" : mode === "forgot" ? "Forgot password" : "Sign in to QXwap";
  const primaryLabel = mode === "signup" ? "Create account" : mode === "forgot" ? "Show reset instructions" : "Sign in";

  return (
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-message" tabIndex={-1}>
        <div className="sheet-head">
          <h2 id="auth-title">{title}</h2>
          <button onClick={close} aria-label="Close auth dialog">
            <X aria-hidden="true" />
          </button>
        </div>
        <p className="auth-message" id="auth-message">{message}</p>
        <input
          aria-label="Email"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "forgot" ? (
          <input
            aria-label="Password"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : null}
        {err ? <p className="err" role="alert">{err}</p> : null}
        {notice ? <p className="auth-message" role="status">{notice}</p> : null}
        <button className="primary wide" onClick={() => submit()}>
          {primaryLabel}
        </button>
        {mode === "signin" ? (
          <>
            <button type="button" onClick={() => setMode("signup")}>Create account</button>
            <button type="button" onClick={() => setMode("forgot")}>Forgot password?</button>
          </>
        ) : (
          <button type="button" onClick={() => setMode("signin")}>Back to sign in</button>
        )}
      </section>
    </div>
  );
}
