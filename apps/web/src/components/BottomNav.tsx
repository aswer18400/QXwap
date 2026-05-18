import { Home, Inbox, Plus, ShoppingBag, User as UserIcon } from "lucide-react";
import type { View } from "../lib/types";
import { NavButton } from "./NavButton";

export function BottomNav({
  view,
  hasProfileView,
  onChange
}: {
  view: View;
  hasProfileView: boolean;
  onChange: (next: View) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      <NavButton
        active={view === "feed" && !hasProfileView}
        icon={<Home />}
        label="แนะนำ"
        onClick={() => onChange("feed")}
      />
      <NavButton
        active={view === "shop" && !hasProfileView}
        icon={<ShoppingBag />}
        label="ช็อป"
        onClick={() => onChange("shop")}
      />
      <NavButton
        active={view === "add" && !hasProfileView}
        icon={<Plus />}
        label="เพิ่มของ"
        onClick={() => onChange("add")}
      />
      <NavButton
        active={view === "inbox" && !hasProfileView}
        icon={<Inbox />}
        label="อินบ็อกซ์"
        onClick={() => onChange("inbox")}
      />
      <NavButton
        active={view === "profile" || hasProfileView}
        icon={<UserIcon />}
        label="โปรไฟล์"
        onClick={() => onChange("profile")}
      />
    </nav>
  );
}
