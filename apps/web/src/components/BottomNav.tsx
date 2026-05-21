import { AddProductNavIcon, HomeNavIcon, InboxNavIcon, ProfileNavIcon, ShopNavIcon } from "./AppIcons";
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
        icon={<HomeNavIcon />}
        label="แนะนำ"
        onClick={() => onChange("feed")}
      />
      <NavButton
        active={(view === "shop" || view === "following") && !hasProfileView}
        icon={<ShopNavIcon />}
        label="ช็อป"
        onClick={() => onChange("shop")}
      />
      <NavButton
        active={view === "add" && !hasProfileView}
        icon={<AddProductNavIcon />}
        label="เพิ่มของ"
        onClick={() => onChange("add")}
      />
      <NavButton
        active={view === "inbox" && !hasProfileView}
        icon={<InboxNavIcon />}
        label="อินบ็อกซ์"
        onClick={() => onChange("inbox")}
      />
      <NavButton
        active={view === "profile" || view === "saved" || view === "profile_edit" || hasProfileView}
        icon={<ProfileNavIcon />}
        label="โปรไฟล์"
        onClick={() => onChange("profile")}
      />
    </nav>
  );
}
