import type { ReactNode } from "react";
import {
  BadgePlus,
  CircleDollarSign,
  Gift,
  Handshake,
  ShoppingCart,
  Tag
} from "./AppIcons";

type StatusKind = "dealType" | "swap" | "notification" | "credit" | "report" | "reward" | "item";

const defaultLabelMap: Record<StatusKind, Record<string, string>> = {
  dealType: {
    swap: "แลกเท่านั้น",
    sell: "ขาย",
    buy: "ต้องการซื้อ",
    both: "ขายหรือแลก"
  },
  swap: {
    draft: "กำลังเตรียมข้อเสนอ",
    pending: "รอตอบรับ",
    accepted: "ตอบรับแล้ว",
    countered: "มีข้อเสนอโต้กลับ",
    scheduled: "นัดรับพร้อมแล้ว",
    handover_pending: "กำลังส่งมอบ",
    rejected: "ปฏิเสธแล้ว",
    expired: "หมดเวลาแล้ว",
    cancelled: "ยกเลิกแล้ว",
    completed: "แลกสำเร็จแล้ว",
    reported: "มีการรายงานปัญหา"
  },
  notification: {
    unread: "ใหม่",
    read: "อ่านแล้ว"
  },
  credit: {
    active: "เครดิตสะสม",
    earned: "ได้เครดิต",
    spent: "ใช้เครดิต"
  },
  report: {
    open: "รอตรวจสอบ",
    reviewed: "กำลังตรวจ",
    resolved: "ปิดแล้ว",
    rejected: "ไม่รับเรื่อง"
  },
  reward: {
    available: "แลกได้",
    redeemed: "แลกแล้ว",
    exhausted: "ของหมด",
    out_of_stock: "ของหมด",
    inactive: "ยังไม่เปิดให้แลก"
  },
  item: {
    active: "พร้อมคุย",
    pending_swap: "กำลังอยู่ระหว่างดีล",
    inactive: "ปิดรับข้อเสนอ",
    sold: "ขายแล้ว",
    swapped: "แลกแล้ว",
    paused: "พักรายการ"
  }
};

function iconFor(kind: StatusKind, status: string): ReactNode {
  if (kind === "dealType") {
    if (status === "swap") return <Handshake size={14} />;
    if (status === "sell") return <Tag size={14} />;
    if (status === "buy") return <ShoppingCart size={14} />;
    return <BadgePlus size={14} />;
  }
  if (kind === "credit") return <CircleDollarSign size={14} />;
  if (kind === "reward") return <Gift size={14} />;
  return null;
}

export function StatusBadge({
  kind,
  status,
  label,
  emphasized = false,
  className
}: {
  kind: StatusKind;
  status: string;
  label?: string;
  emphasized?: boolean;
  className?: string;
}) {
  const resolvedLabel = label || defaultLabelMap[kind][status] || status;
  return (
    <span
      className={[
        "app-status-badge",
        `app-status-badge--${kind}`,
        `app-status-badge--${status}`,
        emphasized ? "app-status-badge--emphasized" : "",
        className || ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {iconFor(kind, status)}
      {resolvedLabel}
    </span>
  );
}
