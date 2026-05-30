import type { ReactElement } from "react";
import { AddProductNavIcon, HomeNavIcon, InboxNavIcon, ProfileNavIcon, SearchNavIcon } from "./AppIcons";
import type { View } from "../lib/types";
import { NavButton } from "./NavButton";

export type BottomNavItem = {
  id: string;
  label: string;
  icon: ReactElement;
  isActive: (view: View, hasProfileView: boolean) => boolean;
  nextView: View;
  className?: string;
};

export const bottomNavItems: BottomNavItem[] = [
  {
    id: "feed",
    label: "หน้าหลัก",
    icon: <HomeNavIcon />,
    isActive: (view, hasProfileView) => view === "feed" && !hasProfileView,
    nextView: "feed"
  },
  {
    id: "search",
    label: "ค้นหา",
    icon: <SearchNavIcon />,
    isActive: (view, hasProfileView) => (view === "shop" || view === "following" || view === "search" || view === "filter" || view === "sort") && !hasProfileView,
    nextView: "shop"
  },
  {
    id: "add",
    label: "ลงประกาศ",
    icon: <AddProductNavIcon />,
    isActive: (view, hasProfileView) => view === "add" && !hasProfileView,
    nextView: "add",
    className: "bottom-nav-center"
  },
  {
    id: "inbox",
    label: "แชต",
    icon: <InboxNavIcon />,
    isActive: (view, hasProfileView) => (view === "inbox" || view === "chat" || view === "offer_detail") && !hasProfileView,
    nextView: "inbox"
  },
  {
    id: "profile",
    label: "โปรไฟล์",
    icon: <ProfileNavIcon />,
    isActive: (view, hasProfileView) => view === "profile" || view === "saved" || view === "profile_edit" || hasProfileView,
    nextView: "profile"
  }
];

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
      {bottomNavItems.map((item) => (
        <NavButton
          key={item.id}
          active={item.isActive(view, hasProfileView)}
          icon={item.icon}
          iconSize={18}
          label={item.label}
          className={item.className}
          onClick={() => onChange(item.nextView)}
        />
      ))}
    </nav>
  );
}
