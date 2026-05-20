import type { Item } from "../lib/types";

export function Price({ item, compact }: { item: Item; compact?: boolean }) {
  if (item.deal.open_to_offers && !item.deal.price_cash && !item.deal.price_credit && !item.deal.price_cash_unknown) {
    return <strong className="price">เปิดรับข้อเสนอ</strong>;
  }
  const cash = item.deal.price_cash_unknown
    ? "ไม่ทราบราคา"
    : item.deal.price_cash
      ? `${compact ? "฿" : "เงินเพิ่ม ฿"}${item.deal.price_cash.toLocaleString()}`
      : "";
  const credit = item.deal.price_credit
    ? `${compact ? "เครดิต " : "เครดิต +"}${item.deal.price_credit.toLocaleString()}`
    : "";
  return (
    <strong className={`price ${compact ? "compact" : ""}`}>
      {[cash, credit].filter(Boolean).join(" · ")}
      {item.deal.open_to_offers ? " · คุยได้" : ""}
    </strong>
  );
}
