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
        iconSize={18}
        label="แนะนำ"
        onClick={() => onChange("feed")}
      />
      <NavButton
        active={(view === "shop" || view === "following") && !hasProfileView}
        icon={<ShopNavIcon />}
        iconSize={18}
        label="ช็อป"
        onClick={() => onChange("shop")}
      />
      <NavButton
        active={view === "add" && !hasProfileView}
        icon={<AddProductNavIcon />}
        iconSize={18}
        label="เพิ่มของ"
        onClick={() => onChange("add")}
      />
      <NavButton
        active={view === "inbox" && !hasProfileView}
        icon={<InboxNavIcon />}
        iconSize={18}
        label="ข้อเสนอ"
        onClick={() => onChange("inbox")}
      />
      <NavButton
        active={view === "profile" || view === "saved" || view === "profile_edit" || hasProfileView}
        icon={<ProfileNavIcon />}
        iconSize={18}
        label="โปรไฟล์"
        onClick={() => onChange("profile")}
      />
    </nav>
  );
}
