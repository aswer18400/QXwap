import type { Item } from "../lib/types";
import { formatLocaleNumber } from "../lib/format";

export function Price({ item, compact }: { item: Item; compact?: boolean }) {
  if (item.deal.open_to_offers && !item.deal.price_cash && !item.deal.price_cash_unknown) {
    return <strong className="price">เปิดรับข้อเสนอ</strong>;
  }
  const priceLabel = formatLocaleNumber(item.deal.price_cash, "", { maximumFractionDigits: 0 });
  const cash = item.deal.price_cash_unknown
    ? "ยังไม่ระบุราคา"
    : priceLabel
      ? `${compact ? "฿" : "เงินเพิ่ม ฿"}${priceLabel}`
      : "";
  return (
    <strong className={`price ${compact ? "compact" : ""}`}>
      {[cash].filter(Boolean).join(" · ")}
    </strong>
  );
}
