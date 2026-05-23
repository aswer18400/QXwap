# QXwap UI Agent Pack

ไฟล์นี้เป็นชุด agent สำหรับยกเครื่อง UI, icon, parity QA, performance cleanup, และ customer-journey QA โดยไม่หลุดจากพฤติกรรมจริงของแอป

## 1. UI Icon Agent

- เป้าหมาย: ออกแบบ icon ใหม่ทั้งระบบให้คงความหมายเดิม แต่เปลี่ยน visual language เป็น 3D/soft-depth
- ขอบเขต:
  - bottom nav
  - top actions
  - feed / shop / detail / offer / profile / logistics / state icons
- อินพุตที่ต้องอ่าน:
  - `apps/web/src/components/AppIcons.tsx`
  - `apps/web/src/design-system/icons.ts`
  - `docs/design-system-icons.md`
  - `docs/figma-free-import-kit/icons/`
- นิยามงาน:
  - คงชื่อ semantic export เดิม
  - ห้ามเปลี่ยน meaning ของ icon
  - ต้องมี variant สำหรับ `default`, `active`, `disabled`, `inverse`
  - ใช้แนวทาง 3D แบบ soft extrusion, warm highlight, compact silhouette
- ผลลัพธ์ที่ต้องส่ง:
  - รายการ icon priority
  - prompt สำหรับสร้าง icon sheet
  - mapping ระหว่าง icon เดิมกับ icon ใหม่
  - diff จุดที่ต้องแก้ใน runtime และ Figma

### Prompt สำหรับ ChatGPT / image generation

> Design a full icon system for QXwap, a Thai swap-and-marketplace app. Create a cohesive 3D icon family with soft rounded geometry, shallow extrusion, gentle top-left highlights, warm cream reflections, graphite shadow cores, teal primary accents, and coral secondary accents. Preserve high recognizability at small mobile sizes. Required categories: bottom navigation, topbar actions, marketplace actions, offer/chat, logistics, trust/state, and utility filters. Each icon should read clearly on light glass surfaces and warm neutral backgrounds. Avoid realism, avoid emoji style, avoid neon, avoid gaming aesthetics. Output should feel premium, friendly, and mobile-product-ready.

## 2. UI Parity Agent

- เป้าหมาย: เช็กว่า prototype ใหม่, app runtime จริง, และเส้นทางลูกค้ามองเห็นเหมือนกัน
- อินพุตที่ต้องอ่าน:
  - `/tmp/qxwap-ui-redesign.html`
  - `apps/web/src/screens/*`
  - `apps/web/src/sheets/*`
  - `apps/web/src/styles/*`
- เช็กลิสต์:
  - text hierarchy
  - CTA placement
  - icon presence
  - card grouping
  - spacing density
  - mobile-first behavior
  - empty / error / loading states
  - route transitions
- ผลลัพธ์ที่ต้องส่ง:
  - mismatch list ตาม severity
  - file ownership สำหรับการแก้
  - screenshot proof before/after

## 3. Dev Cleanup Agent

- เป้าหมาย: ทำให้แอปเบาลงและไม่พก UI code เก่าที่ไม่ใช้
- อินพุตที่ต้องอ่าน:
  - `apps/web/src/styles/index.css`
  - `apps/web/src/styles/legacy.css`
  - `apps/web/src/components/*`
  - `apps/api/src/*`
- เช็กลิสต์:
  - unused CSS imports
  - dead components
  - duplicated layout helpers
  - overly heavy client bundles
  - route/query state leaks
  - mock/prototype copy ที่หลุดเข้าหน้า customer
- Validation ขั้นต่ำ:
  - `pnpm --filter @workspace/web-app typecheck`
  - `pnpm --filter @workspace/web-app build`
  - `pnpm --filter @workspace/api-server test`
  - `pnpm --filter @workspace/web-app test`

## 4. API / Database Stability Agent

- เป้าหมาย: ยืนยันว่า redesign ไม่ทำให้ flow เดิมเสีย
- จุดที่ต้องตรวจ:
  - item list / detail
  - search / filter / sort
  - auth gate
  - offer create / receive / accept / reject
  - shipment / logistics states
  - profile update
  - add product / edit product
- หลักการ:
  - redesign ห้ามเปลี่ยน payload contract
  - redesign ห้ามเปลี่ยน field naming ที่ frontend ส่งให้ API
  - route sanitation ต้องไม่ทำให้ deep link เสีย

## 5. Customer QA Persona Agents

### Agent 01: Guest Explorer

- เป้าหมาย: ดูของน่าแลกให้เร็วที่สุดโดยยังไม่ล็อกอิน
- พฤติกรรม: เปิด feed, shop, detail, campaign, profile ก่อนตัดสินใจสมัคร
- จุดเสี่ยง: auth gate, back navigation, dead tap

### Agent 02: Nearby Swap Hunter

- เป้าหมาย: หาเฉพาะของใกล้ตัว นัดรับง่าย
- พฤติกรรม: ใช้ nearby, radius, sort ใกล้ที่สุด, detail
- จุดเสี่ยง: location state, filter persistence, distance consistency

### Agent 03: Bargain Cash Buyer

- เป้าหมาย: หาของคุ้มและเทียบราคาไว
- พฤติกรรม: filter ราคา, sort ต่ำไปสูง, saved, detail
- จุดเสี่ยง: price filtering, save state, CTA clarity

### Agent 04: Hashtag Collector

- เป้าหมาย: ไล่ของตามความสนใจเฉพาะทาง
- พฤติกรรม: กด hashtag จาก feed/detail ไป search/shop
- จุดเสี่ยง: tag continuity, search handoff, result relevance

### Agent 05: Fast Seller / New Lister

- เป้าหมาย: ลงสินค้าชิ้นใหม่ให้เสร็จในครั้งเดียว
- พฤติกรรม: add product, upload image, tags, publish, edit
- จุดเสี่ยง: validation, draft retention, upload UX

### Agent 06: Offer Triage Seller

- เป้าหมาย: จัดการข้อเสนอหลายอันให้ไว
- พฤติกรรม: detail owner view, inbox, offer detail, accept / reject / counter
- จุดเสี่ยง: owner-only actions, state transitions, tab routing

### Agent 07: Trust-First Negotiator

- เป้าหมาย: เช็กความน่าเชื่อถือก่อนตอบรับดีล
- พฤติกรรม: detail, owner profile, chat, logistics detail
- จุดเสี่ยง: trust signals, context preservation, missing trade info

### Agent 08: Saved-and-Return User

- เป้าหมาย: บันทึกของไว้แล้วค่อยกลับมาดู
- พฤติกรรม: saved, notifications, deep links, reopen detail
- จุดเสี่ยง: saved persistence, unread markers, restore context

### Agent 09: Post-Accept Logistics User

- เป้าหมาย: จัดการสถานะหลังตกลงแลกแล้ว
- พฤติกรรม: inbox, offer detail, shipment, confirm receipt
- จุดเสี่ยง: post-deal status sync, proof fields, logistics branching

### Agent 10: Power User / Cross-Flow Multitasker

- เป้าหมาย: ใช้หลาย flow ต่อเนื่องใน session เดียว
- พฤติกรรม: feed → detail → profile → shop → search/filter/sort → saved → inbox → chat
- จุดเสี่ยง: stale query params, broken back stack, memory/performance

## 6. Suggested QA Order

1. Guest Explorer
2. Fast Seller / New Lister
3. Nearby Swap Hunter
4. Bargain Cash Buyer
5. Hashtag Collector
6. Offer Triage Seller
7. Trust-First Negotiator
8. Saved-and-Return User
9. Post-Accept Logistics User
10. Power User / Cross-Flow Multitasker

## 7. Exit Criteria

- ไม่มี dev/prototype copy บนหน้า customer
- icon language ใหม่ใช้ร่วมกันได้ทั้ง prototype และ runtime
- route สำคัญกดได้ครบ
- API/database behavior ไม่ regress
- dead CSS/component paths ถูกลบหรือถูกรายงานชัดเจน
