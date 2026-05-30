import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { TextareaField } from "./FormFields";
import { QuickFilterList } from "./QuickFilterList";

const reportReasons = [
  "ข้อมูลไม่ตรง",
  "สแปม",
  "ไม่เหมาะสม",
  "หลอกลวง",
  "คุกคาม"
];

export function ReportModal({
  open,
  targetType,
  onClose,
  onSubmit
}: {
  open: boolean;
  targetType: "item" | "user" | "chat" | "swap";
  onClose: () => void;
  onSubmit: (payload: { reason: string; note: string }) => void;
}) {
  const [reason, setReason] = useState(reportReasons[0]);
  const [note, setNote] = useState("");

  return (
    <Modal open={open} title="รายงานปัญหา" onClose={onClose}>
      <div className="app-report-modal">
        <small>กำลังรายงาน {targetType}</small>
        <QuickFilterList
          items={reportReasons.map((item) => ({
            key: item,
            label: item,
            active: reason === item,
            onClick: () => setReason(item)
          }))}
        />
        <TextareaField
          label="รายละเอียดเพิ่มเติม"
          placeholder="บอกสั้น ๆ ว่าเกิดอะไรขึ้น"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="app-report-modal__actions">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => onSubmit({ reason, note: note.trim() })}>ส่งรายงาน</Button>
        </div>
      </div>
    </Modal>
  );
}
