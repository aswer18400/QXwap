import type { ReactNode } from "react";

export function AppLayout({
  topbar,
  bottomNav,
  authNudge,
  focused = false,
  withTopbar = false,
  guest = false,
  children
}: {
  topbar?: ReactNode;
  bottomNav?: ReactNode;
  authNudge?: ReactNode;
  focused?: boolean;
  withTopbar?: boolean;
  guest?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`app-shell${focused ? " app-shell--focused" : ""}${withTopbar ? " app-shell--with-topbar" : ""}${guest ? " guest" : ""}`}>
      {topbar}
      {children}
      {bottomNav}
      {authNudge}
    </div>
  );
}
