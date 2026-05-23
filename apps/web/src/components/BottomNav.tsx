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
        className="bottom-nav-item"
        active={view === "feed" && !hasProfileView}
        icon={<HomeNavIcon />}
        iconSize={20}
        label="แนะนำ"
        onClick={() => onChange("feed")}
      />
      <NavButton
        className="bottom-nav-item"
        active={(view === "shop" || view === "following") && !hasProfileView}
        icon={<ShopNavIcon />}
        iconSize={20}
        label="ช็อป"
        onClick={() => onChange("shop")}
      />
      <div className="bottom-nav-center">
        <NavButton
          active={view === "add" && !hasProfileView}
          icon={<AddProductNavIcon />}
          iconSize={24}
          label="เพิ่มของ"
          onClick={() => onChange("add")}
        />
      </div>
      <NavButton
        className="bottom-nav-item"
        active={view === "inbox" && !hasProfileView}
        icon={<InboxNavIcon />}
        iconSize={20}
        label="ข้อเสนอ"
        onClick={() => onChange("inbox")}
      />
      <NavButton
        className="bottom-nav-item"
        active={view === "profile" || view === "saved" || view === "profile_edit" || hasProfileView}
        icon={<ProfileNavIcon />}
        iconSize={20}
        label="โปรไฟล์"
        onClick={() => onChange("profile")}
      />
    </nav>
  );
}
