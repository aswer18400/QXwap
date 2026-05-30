import type { Transaction } from "../lib/types";
import { formatDateTimeValue, formatIntegerValue } from "../lib/format";

export function CreditHistoryItem({ transaction }: { transaction: Transaction }) {
  return (
    <div className="wallet-transaction-row app-credit-history-item">
      <div>
        <b>{transaction.description || "รายการเครดิต"}</b>
        <span>{formatDateTimeValue(transaction.created_at)}</span>
      </div>
      <strong className={transaction.amount >= 0 ? "plus" : "minus"}>
        {transaction.amount >= 0 ? "+" : ""}
        {formatIntegerValue(transaction.amount)}
      </strong>
    </div>
  );
}
