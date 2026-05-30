import { CreditIcon } from "./AppIcons";

export function CreditBadge({
  amount,
  label = "เครดิต",
  className
}: {
  amount: number;
  label?: string;
  className?: string;
}) {
  return (
    <span className={["app-credit-badge", className || ""].filter(Boolean).join(" ")}>
      <CreditIcon size={15} />
      <b>{amount}</b>
      <small>{label}</small>
    </span>
  );
}
