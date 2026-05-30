# FINAL_QA_REPORT

## 1. Summary ภาพรวม

- Step 13 จบในขอบเขต `Final QA + Cleanup` โดยไม่เพิ่ม feature ใหญ่และไม่เปลี่ยน architecture หลัก
- ตรวจแล้วไม่พบการ import `mockItems`, `mockUsers`, `mockFeed`, `mockCredits`, `mockSwaps` หรือไฟล์ mock เข้า React component โดยตรง
- ข้อมูลตัวอย่างยังอยู่ใน `apps/api` seed/database layer และ dev-only QA tooling เท่านั้น
- main journey ระดับ MVP ที่ตรวจรอบนี้ผ่านทั้ง `feed`, `search`, `post`, `swap`, `chat`, `notification`, `credit`, `reward`, `profile`, `follow`
- `QA Checklist` หน้า `/qa` รันผ่านครบ 30 เคสด้วย service/database จริง
- `smoke:api`, `smoke:full`, `typecheck`, `build`, API tests, และ Playwright e2e suite ผ่านหลัง cleanup รอบนี้

## 2. รายการ P0 / P1 / P2 ที่พบ

### P0

- ไม่พบ P0 ใหม่ในรอบนี้

### P1

- `scripts/qxwap-full-smoke.mjs` ยังอิง swap flow รุ่นเก่า (`approve` หลัง `accept`) และยังอิง hard delete ของ item
- `package.json` ใช้ `pnpm dlx playwright test` ทำให้ `test:e2e` ไปโหลด test runner คนละตัวกับ dependency ใน repo
- main flow บางหน้าที่ยังเรียก wrapper component ซ้ำ ทั้งที่มี shared component กลางแล้ว
- populated notification card ไม่มี class hook ที่ e2e/style คาดหวัง ทำให้ regression proof ฝั่ง notification detail ไม่ตรงกับ UI ปัจจุบัน
- e2e tests หลายไฟล์ยังอิง route/query/copy รุ่นเก่า เช่น `/chat`, `view=inbox`, `เสนอการแลกเปลี่ยน`, `approve`, `ขอคืนสินค้า`

### P2

- Playwright runner ยังพ่น warning เรื่อง `NO_COLOR`/`FORCE_COLOR` จาก environment ระหว่าง test แต่ไม่ใช่ app/runtime error
- การตรวจ responsive รอบนี้เป็น baseline mobile-first บน local Chromium/in-app browser ยังไม่ใช่ cross-browser matrix เต็ม

## 3. รายการ P0 / P1 / P2 ที่แก้แล้ว

### แก้แล้ว

- อัปเดต `scripts/qxwap-full-smoke.mjs` ให้ตรงกับ swap state machine ปัจจุบัน และ soft-delete/inactive behavior
- อัปเดต `package.json` ให้ `pnpm test:e2e` ใช้ local Playwright runner ของโปรเจกต์
- ตัด wrapper usage ออกจาก main flow แล้วใช้ shared component ตรง:
  - `ProfileProductCard` -> `ItemCard`
  - `ProductGridCard` -> `ItemCard`
  - `DealTypeBadge` -> `StatusBadge`
- ลบไฟล์ wrapper ที่ไม่ถูกใช้งานแล้ว:
  - `apps/web/src/components/ProfileProductCard.tsx`
  - `apps/web/src/components/ProductGridCard.tsx`
  - `apps/web/src/components/DealTypeBadge.tsx`
  - `apps/web/src/components/WantedPreviewCard.tsx`
- เพิ่ม `className` support ให้ `NotificationItem` และคืน `notification-offer-card` hook ให้ notification populated state
- อัปเดต e2e suite ให้ตรงกับ route/copy/flow ปัจจุบันของแอป

### ไม่ต้องแก้เพิ่ม

- ไม่พบ mock leak ใน component tree จึงไม่มี patch เฉพาะจุดด้านนี้
- ไม่พบ console error ชัดเจนใน guest/signed-in route baseline หลังรีสตาร์ต dev server ให้ตรงกับ branch ปัจจุบัน

## 4. รายการสิ่งที่ยังเหลือก่อน production จริง

- ตรวจ cross-browser จริงบน Safari/Firefox/Edge production build ยังไม่ได้ทำในรอบนี้
- ตรวจ production deployment environment จริง เช่น CDN, asset path, env vars, cookie policy ยังไม่ได้ทำในรอบนี้
- warning ฝั่ง Playwright env (`NO_COLOR`/`FORCE_COLOR`) ยังอยู่ แต่ไม่กระทบตัวแอป
- ควรย้าย representative `/qa` runs และ smoke artifacts เข้า CI ถาวรใน sprint ถัดไป

## 5. Route ที่ตรวจแล้ว

- `/`
- `/login`
- `/explore`
- `/post`
- `/deals`
- `/notifications`
- `/credits`
- `/profile`
- `/items/:itemId`
- `/swap/:offerId`
- `/chats`
- `/chat/:offerId`
- `/chats/:chatId`
- `/qa`

## 6. Flow ที่ทดสอบแล้ว

- Guest home/feed render + auth prompts
- Login entry route + auth dialog
- Explore/search results + empty recovery
- Create item
- Create wanted item
- Save / unsave item
- Follow / unfollow + feed source change
- Create swap request
- Accept / reject / counter / expire / cancel / complete swap
- Shipment + receipt confirmation
- Send chat message + reload persistence
- Notifications unread/read + deep link
- Credit earned + redeem success + insufficient balance + out of stock
- Public profile privacy
- Own profile credit visibility
- Report item
- Seed reset via `/qa`

## 7. Component ที่ cleanup แล้ว

- `Detail.tsx` ใช้ `StatusBadge` และ `ItemCard` ตรง ไม่ผ่าน wrapper
- `NotificationsPage.tsx` ใช้ `StatusBadge` ตรง และ populated card กลับมาใช้ class hook ที่ชัดเจน
- `OfferDetailPage.tsx` ใช้ `StatusBadge` ตรง
- `ProfileShop.tsx` ใช้ `ItemCard` ตรง
- ลบ wrapper component ที่ไม่ถูกใช้งานแล้ว 4 ไฟล์

## 8. Mock data leak ที่แก้แล้ว

- ตรวจด้วย `rg` แล้วไม่พบ mock import ใน `apps/web/src`
- dev/test-only fixtures อยู่ใน:
  - `apps/api/src/db.ts`
  - `apps/api/src/server.ts` dev endpoints
  - `apps/web/src/services/qaService.ts`
- สรุปคือไม่มี mock leak ที่ต้อง patch เพิ่มใน component tree รอบนี้

## 9. Service layer ที่ใช้งานจริง

- `userService`
- `profileService`
- `feedService`
- `itemService`
- `wantedItemService`
- `followService`
- `savedItemService`
- `swapService`
- `chatService`
- `notificationService`
- `creditService`
- `rewardService`
- `reviewService`
- `reportService`
- `mediaService`
- `qaService`

## 10. Known risks

- Route/flow ระดับ MVP ผ่านแล้ว แต่ยังไม่มี production browser matrix จริง
- `/qa` ถูก guard ด้วย dev mode แล้ว แต่ควรตรวจ deploy config อีกครั้งว่าฝั่ง production build ไม่ expose route นี้
- Regression coverage ดีขึ้นมากหลัง e2e/smoke cleanup แต่ยังพึ่ง local runtime อยู่ ไม่ใช่ hosted preview CI artifact

## 11. Production readiness checklist

- [x] ไม่มี hardcoded mock import ใน React component
- [x] action สำคัญผ่าน service/database layer
- [x] feed เป็น follow-based source จริง
- [x] search ใช้งานจริงผ่าน service
- [x] post item / wanted item persist หลัง reload
- [x] swap journey ผ่าน end-to-end ระดับ MVP
- [x] chat / notification persist หลัง reload
- [x] credit/reward logic ไม่สื่อว่าเป็นเงินจริง
- [x] profile public/private แยกข้อมูลถูก
- [x] `/qa` ใช้งานได้จริงและ `reset seed` ทำงาน
- [x] `smoke:api` ผ่าน
- [x] `smoke:full` ผ่าน
- [x] `test:e2e` ผ่าน
- [x] `typecheck` ผ่าน
- [x] `build` ผ่าน

## 12. Manual test steps

1. รัน API และ web dev server
2. เปิด `/qa`
3. กด `Reset seed data`
4. รันอย่างน้อยชุดต่อไปนี้:
   - `Feed success`
   - `Create item`
   - `Create wanted item`
   - `Create swap request`
   - `Accept swap request`
   - `Complete swap`
   - `Send chat message`
   - `Credit redeem success`
   - `Public profile privacy check`
5. เปิด `/explore` และเปิด item detail อย่างน้อย 1 รายการ
6. เปิด `/swap/:offerId` จากผล test เพื่อดู accepted/completed state
7. เปิด `/notifications` แล้วยืนยันว่า deep link กลับไปหน้าที่เกี่ยวข้องได้
8. เปิด `/credits` แล้วยืนยันว่า copy ใช้คำ `QX Credit` / `เครดิตกิจกรรม` เท่านั้น
9. เปิด `/profile` และ `/profile/:userId` เพื่อเช็ก privacy split
10. รีโหลดแต่ละหน้าที่แตะ state สำคัญอย่างน้อย 1 ครั้งเพื่อยืนยัน persistence

## Evidence summary

- QA checklist page `/qa`: ผ่านครบ 30 tests
- Guest route baseline: `/`, `/login`, `/explore`, `/post`, `/notifications`, `/credits`, `/profile`, `/qa`
- Signed-in route baseline: `/`, `/chats`, `/notifications`, `/credits`, `/profile`, `/qa`
- Console health: ไม่พบ console error ชัดเจนใน route baseline หลังรีสตาร์ต dev server ให้ตรงกับ branch ปัจจุบัน
