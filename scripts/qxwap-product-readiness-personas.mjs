export const severityWeights = {
  blocker: 20,
  critical: 12,
  major: 6,
  minor: 2
};

export const personas = [
  {
    id: "agent-1",
    role: "First-time user",
    summary: "มือใหม่ที่ยังไม่เข้าใจ mental model ของระบบและต้องการแรงพยุงตลอด flow",
    focus: [
      "signup/login และสิ่งที่เกิดขึ้นหลัง auth",
      "guest gates และ CTA ที่ชวนไปต่อ",
      "create item flow ว่าหนักเกินไปหรือไม่",
      "search/filter/inbox/chat ว่าเข้าใจลำดับง่ายหรือไม่"
    ]
  },
  {
    id: "agent-2",
    role: "Power user",
    summary: "ผู้ใช้ที่กดเร็ว สลับหลาย flow ต่อเนื่อง และเจอ race conditions ได้ง่าย",
    focus: [
      "double-submit / duplicate offers / duplicate chat",
      "rapid filter/sort/load-more churn",
      "edit/delete interruption",
      "schedule and shipment state regressions"
    ]
  },
  {
    id: "agent-3",
    role: "Mobile user",
    summary: "ผู้ใช้จอเล็ก เน็ตช้า ใช้ touch เป็นหลัก และไวต่อ layout shift หรือ CTA overlap",
    focus: [
      "mobile shell, bottom nav, auth dock overlap",
      "slow network feedback",
      "offer detail readability on small screens",
      "keyboard/upload/location disruption on add flow"
    ]
  },
  {
    id: "agent-4",
    role: "Accessibility user",
    summary: "ผู้ใช้ keyboard, screen reader, zoom, contrast และต้องการ semantics ที่ถูกต้องจริง",
    focus: [
      "custom ARIA widgets and keyboard contract",
      "form error semantics and focus recovery",
      "accessible names, tab order, focus indicators",
      "large text and zoom reflow"
    ]
  },
  {
    id: "agent-5",
    role: "Edge-case user",
    summary: "ผู้ใช้ที่กรอกผิด รีเฟรช ปิดหน้า กลับมาใหม่ หรือเจอ session/network drift ระหว่างทาง",
    focus: [
      "deep-route refresh/recovery",
      "session expiry and unauthorized recovery",
      "draft durability on add item",
      "invalid input and repeated state transitions"
    ]
  }
];

export const seededBugReports = [
  {
    id: "ftu-guest-gates-value",
    personaId: "agent-1",
    title: "Guest gates ยังอธิบายคุณค่าและ next step ไม่พอ",
    hypothesis: "ผู้ใช้ใหม่ drop-off เพราะเปิดหน้าที่ถูกล็อกแล้วไม่เข้าใจว่าล็อกไปเพื่ออะไรและควรทำอะไรต่อ",
    steps: [
      "เปิดหน้า add / inbox / notifications / profile โดยยังไม่เข้าสู่ระบบ",
      "สังเกตข้อความ, CTA, และสิ่งที่ผู้ใช้จะได้หลังล็อกอิน"
    ],
    expected: "Guest gate ชัดว่าปลดล็อกอะไรและมี CTA เดียวที่พาไปต่ออย่างมั่นใจ",
    actual: "หลายหน้ามี login gate แล้ว แต่ value proposition และ next step ยังไม่คมพอสำหรับผู้ใช้ใหม่",
    severity: "major",
    suggestion: "เพิ่ม value bullets ที่ผูกกับ flow ของหน้านั้นและ CTA เดียวที่ชัดขึ้น",
    tags: ["ux", "conversion", "guest-gate"]
  },
  {
    id: "ftu-no-post-auth-onboarding",
    personaId: "agent-1",
    title: "หลัง auth ยังไม่มี onboarding หรือ handoff ที่ชัด",
    hypothesis: "ผู้ใช้ใหม่ไม่รู้ว่าจะทำอะไรต่อหลังเข้าสู่ระบบสำเร็จ",
    steps: [
      "สมัครหรือเข้าสู่ระบบจากหน้าใดหน้าหนึ่ง",
      "ดูว่าหน้าถัดไปพาผู้ใช้ไปทำอะไร"
    ],
    expected: "หลัง auth สำเร็จควรมี restoration หรือ handoff ที่ตรงกับ intent เดิม",
    actual: "ตอนนี้ flow ส่วนใหญ่เพียงปิด modal / reload data และปล่อยให้ผู้ใช้เดาทางเอง",
    severity: "critical",
    suggestion: "รักษา intent เดิมหลัง auth และพาไปจุดที่ค้างอยู่พร้อม cue ที่ชัด",
    tags: ["ux", "auth", "onboarding", "conversion"]
  },
  {
    id: "ftu-add-form-heavy",
    personaId: "agent-1",
    title: "หน้าเพิ่มสินค้าเริ่มต้นหนักเกินไปสำหรับผู้ลงสินค้าครั้งแรก",
    hypothesis: "ผู้ใช้ใหม่ drop-off เพราะ form ใหญ่และไม่เห็น progress ที่ช่วยให้กล้าทำต่อ",
    steps: [
      "เปิด add item หลังเข้าสู่ระบบ",
      "เริ่มกรอกฟอร์มโดยยังไม่มีรูป/location/wanted tags"
    ],
    expected: "ฟอร์มแบ่งเป็นก้อนเข้าใจง่ายและช่วยผู้ใช้ไล่จากงานง่ายไปยาก",
    actual: "ฟอร์มยาวและมีหลาย dependency ที่ทำให้ผู้ใช้ใหม่ชะงัก",
    severity: "major",
    suggestion: "ลด cognitive load ด้วย progressive disclosure และ progress cues ที่ชัดขึ้น",
    tags: ["ux", "create-item", "conversion"]
  },
  {
    id: "power-duplicate-offers",
    personaId: "agent-2",
    title: "ส่งข้อเสนอซ้ำได้เมื่อกดเร็ว",
    hypothesis: "ผู้ใช้ไม่ไว้ใจระบบเมื่อกด CTA แล้วเกิด offers ซ้ำและ count เพี้ยน",
    steps: [
      "เปิด offer sheet ของ item หนึ่งชิ้น",
      "กรอกข้อมูลครบแล้วกดส่งข้อเสนอรัว ๆ"
    ],
    expected: "ผู้ใช้ตั้งใจส่ง 1 ครั้ง ต้องเกิด 1 logical offer เท่านั้น",
    actual: "client lock มีแค่ local state และ server ไม่มี idempotency key สำหรับ offers",
    severity: "critical",
    suggestion: "เพิ่ม client reentrancy guard แบบ synchronous และ server-side idempotency/dedupe",
    tags: ["functional", "offers", "idempotency"]
  },
  {
    id: "power-schedule-reset",
    personaId: "agent-2",
    title: "การแก้ schedule/shipment เสี่ยงรีเซ็ต confirmation",
    hypothesis: "ดีล drop-off เพราะสถานะที่เคย confirm แล้วหายไปเองหลังมีคนแก้ schedule อีกครั้ง",
    steps: [
      "ยอมรับ offer จากทั้งสองฝั่ง",
      "ให้ฝั่งหนึ่งยืนยัน schedule แล้วอีกฝั่งกลับมา save shipment ใหม่",
      "รีโหลดทั้งสองมุมมอง"
    ],
    expected: "confirmation state ควร preserve หรือ invalidate แบบ explicit",
    actual: "มีความเสี่ยงที่ confirmation จะถูกเขียนทับเหลือเฉพาะผู้ใช้ล่าสุด",
    severity: "critical",
    suggestion: "merge confirmation state แทน overwrite และแสดง invalidation rule ให้ชัดถ้ามี",
    tags: ["functional", "shipment", "state-machine"]
  },
  {
    id: "power-duplicate-chat",
    personaId: "agent-2",
    title: "แชตเสี่ยงส่งซ้ำเมื่อกดเร็วหรือเน็ตแกว่ง",
    hypothesis: "ผู้ใช้ power user รู้สึกว่าระบบ lag หรือ broken เพราะแชตส่งซ้ำ/เด้ง state แปลก",
    steps: [
      "เปิดห้องแชตของ offer ที่ active",
      "พิมพ์ข้อความแล้วกดส่งหลายครั้งอย่างรวดเร็ว"
    ],
    expected: "หนึ่ง intention = หนึ่ง message",
    actual: "ยังไม่มี server-side dedupe และมี polling ที่เพิ่มความสับสนของ state",
    severity: "major",
    suggestion: "ทำ idempotent send หรือ server dedupe พร้อม optimistic state ที่ชัด",
    tags: ["functional", "chat", "idempotency"]
  },
  {
    id: "mobile-auth-dock-overlap",
    personaId: "agent-3",
    title: "auth dock และ shell ซ้อน CTA บนจอเล็ก",
    hypothesis: "ผู้ใช้ mobile drop-off เพราะ CTA สำคัญชนกันหรือถูกบัง",
    steps: [
      "เปิดหน้าที่มี guest dock บน viewport เล็ก",
      "เลื่อนหน้า add / profile / inbox บนจอ 320-360px"
    ],
    expected: "dock ไม่บัง CTA หลักและ content ยังอ่านจบได้",
    actual: "มีความเสี่ยง overlap ระหว่าง dock, bottom nav, และ content สำคัญ",
    severity: "major",
    suggestion: "ลดความสูง dock และจัด safe area/spacing ให้ชัดใน mobile shell",
    tags: ["mobile", "layout", "guest-gate"]
  },
  {
    id: "mobile-slow-network-broken-state",
    personaId: "agent-3",
    title: "feed/shop บนเน็ตช้าดูเหมือนพังมากกว่ากำลังโหลด",
    hypothesis: "ผู้ใช้ mobile เข้าใจผิดว่าหน้าพังเมื่อ API ช้าและยังไม่มี loading semantics ที่ชัดพอ",
    steps: [
      "เปิด home หรือ shop บน slow 3G",
      "รอสถานะ loading และการฟื้นตัว"
    ],
    expected: "ผู้ใช้เข้าใจได้ว่าระบบกำลังโหลดและยังใช้งานต่อได้",
    actual: "บางสถานะดูเหมือน blank/dead page หรือ error state ไม่ชัด",
    severity: "critical",
    suggestion: "ทำ loading/error recovery ที่บอกสถานะและ next step ชัดขึ้น",
    tags: ["mobile", "performance", "loading", "error-handling"]
  },
  {
    id: "mobile-offer-detail-disabled-ambiguity",
    personaId: "agent-3",
    title: "offer detail มีปุ่ม disabled/sticky หลายจุดที่ไม่อธิบายเหตุผลบนมือถือ",
    hypothesis: "ผู้ใช้มือถือ drop-off เพราะมองไม่ออกว่าทำไม action ถึงกดไม่ได้และต้องทำอะไรก่อน",
    steps: [
      "เปิด offer detail บนมือถือในหลายสถานะของดีล",
      "พิจารณาปุ่ม primary และ sticky action bar"
    ],
    expected: "ทุก action สำคัญบอกเหตุผลได้เมื่อยังทำไม่ได้",
    actual: "มี state ที่ปุ่ม disabled แต่เหตุผลไม่พอหรืออ่านยากบนจอเล็ก",
    severity: "critical",
    suggestion: "ทำ inline explanation หรือ state hint ใกล้ CTA ทุกจุดที่ block flow",
    tags: ["mobile", "ux", "offer-detail"]
  },
  {
    id: "a11y-radiogroup-contract",
    personaId: "agent-4",
    title: "custom radio/tab/listbox ยังไม่ทำ keyboard contract ครบ",
    hypothesis: "ผู้ใช้ keyboard/screen reader ใช้งานฟอร์มสำคัญไม่ได้เพราะ role กับ behavior ไม่ตรงกัน",
    steps: [
      "เปิด add item / search / filter",
      "ลองใช้ Tab และ Arrow keys บน radiogroup/tab/listbox"
    ],
    expected: "composite widgets ต้องมี roving focus, selected state, และ arrow navigation ถูกต้อง",
    actual: "มีการใส่ ARIA role แต่ interaction ยังคล้าย button ธรรมดา",
    severity: "blocker",
    suggestion: "ปรับ widget เหล่านี้ให้เป็น native control หรือทำ keyboard contract ให้ครบ",
    tags: ["accessibility", "keyboard", "forms"]
  },
  {
    id: "a11y-nested-button-feed",
    personaId: "agent-4",
    title: "feed card มี nested interactive controls ที่ผิด semantics",
    hypothesis: "การมี button ซ้อน button ทำให้ focus/activation และ SR tree เพี้ยนข้าม browser",
    steps: [
      "เปิด feed",
      "พยายามโฟกัสการ์ดหลักและ wanted tag ใน card เดียวกัน"
    ],
    expected: "ทุก control focus และ activate ได้อิสระโดย semantics ถูกต้อง",
    actual: "feed card หลักเป็น button ที่มี tag buttons ซ้อนอยู่ข้างใน",
    severity: "blocker",
    suggestion: "แยก clickable card container ออกจาก sub-actions หรือเปลี่ยนเป็น non-button wrapper",
    tags: ["accessibility", "html-semantics", "feed"]
  },
  {
    id: "a11y-form-errors-not-programmatic",
    personaId: "agent-4",
    title: "form errors ยังไม่ผูกกับ field อย่างเป็นระบบ",
    hypothesis: "ผู้ใช้ assistive tech drop-off เพราะ error โผล่ขึ้นมาแต่ไม่รู้ว่าผิดที่ field ไหน",
    steps: [
      "ส่ง add item หรือ form schedule แบบ invalid",
      "ตรวจ aria-invalid, aria-describedby, focus และ spoken error"
    ],
    expected: "field invalid ต้องโฟกัสได้และ error announce ได้",
    actual: "หลายฟอร์มยังเป็น error ข้อความลอย ไม่ผูกกับ input",
    severity: "critical",
    suggestion: "เพิ่ม field-level semantics และ first-invalid focus pattern ให้ครอบทุกฟอร์มสำคัญ",
    tags: ["accessibility", "forms", "error-handling"]
  },
  {
    id: "edge-session-expired-recovery",
    personaId: "agent-5",
    title: "session หมดกลาง flow แล้วยังไม่มี recovery path กลางที่ดี",
    hypothesis: "ผู้ใช้ drop-off เมื่อ session หมดแล้วระบบแสดง generic error แทนที่จะพา re-auth พร้อมรักษา intent",
    steps: [
      "ล็อกอินแล้วเปิด add/chat/notifications",
      "ล้าง session หรือ sign out จากอีก tab",
      "ลอง submit/reload ต่อ"
    ],
    expected: "ระบบควร clear session, เปิด login, และรักษา context ที่ตั้งใจทำ",
    actual: "API errors ถูกส่งขึ้น UI แบบรายจุดและ cached user อาจค้างอยู่",
    severity: "critical",
    suggestion: "ทำ centralized 401/session-expired handler พร้อม intent restoration",
    tags: ["auth", "session", "error-recovery"]
  },
  {
    id: "edge-deep-route-restore",
    personaId: "agent-5",
    title: "refresh บน deep routes ยังเสี่ยงตก state ค้าง",
    hypothesis: "ผู้ใช้ที่ refresh/open link ใหม่บน chat/offer_detail/campaign จะหลุด flow เพราะ route restore fallback ยังไม่ปลอดภัยพอ",
    steps: [
      "เปิด chat / offer_detail / campaign",
      "ทำให้ fetch fail หรือ resource หาย แล้ว refresh"
    ],
    expected: "ระบบ fallback ไปหน้าปลอดภัยพร้อมบอก recovery step",
    actual: "id อาจถูก clear แต่ view เดิมยังอยู่ ทำให้เกิด state ก้ำกึ่ง",
    severity: "critical",
    suggestion: "ผูก route restore failure กับ safe view fallback ที่ deterministic",
    tags: ["routing", "error-recovery", "deep-link"]
  },
  {
    id: "edge-add-draft-loss",
    personaId: "agent-5",
    title: "draft ของ add item ยังสูญหายบางส่วนเมื่อ refresh/reopen",
    hypothesis: "ผู้ใช้ทิ้ง flow เมื่อรูป/location/state ที่กรอกไปแล้วหายหลัง refresh หรือ reconnect",
    steps: [
      "กรอก add item พร้อมรูปและ location",
      "refresh / close tab / reopen"
    ],
    expected: "draft สำคัญควรถูกกู้คืนหรือมี warning ก่อนสูญหาย",
    actual: "มีเพียง text subset ที่ persist ได้ ส่วน media/location/picker state หาย",
    severity: "major",
    suggestion: "ขยาย draft persistence หรือเตือนก่อน user ทำ action ที่ทำให้ข้อมูลหาย",
    tags: ["draft", "create-item", "error-recovery"]
  }
];

export function countSeverity(issues) {
  return issues.reduce(
    (summary, issue) => {
      summary[issue.severity] = (summary[issue.severity] || 0) + 1;
      return summary;
    },
    { blocker: 0, critical: 0, major: 0, minor: 0 }
  );
}

export function totalSeverityPenalty(issues) {
  return issues.reduce((sum, issue) => sum + (severityWeights[issue.severity] || 0), 0);
}
