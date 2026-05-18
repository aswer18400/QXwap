import { Camera, CheckCircle2, PackageCheck, Truck } from "lucide-react";

export function TrustPanel() {
  return (
    <section className="trust-panel">
      <b>
        <CheckCircle2 size={17} /> แลกอย่างมั่นใจ
      </b>
      <span>
        <Truck size={15} /> เลือกนัดรับผ่านขนส่งได้
      </span>
      <span>
        <Camera size={15} /> ถ่ายรูปยืนยันตอนรับและส่งของ
      </span>
      <span>
        <PackageCheck size={15} /> มีเหตุผลปฏิเสธและประวัติข้อเสนอในข้อเสนอ
      </span>
    </section>
  );
}
