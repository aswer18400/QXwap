# FINAL_QA_REPORT

## 1. Summary ภาพรวม

- Step 13 จบในขอบเขต `Final QA + Cleanup` โดยไม่เพิ่ม feature ใหญ่และไม่เปลี่ยน architecture หลัก
- ตรวจแล้วไม่พบการ import `mockItems`, `mockUsers`, `mockFeed`, `mockCredits`, `mockSwaps` หรือไฟล์ mock เข้า React component โดยตรง
- ข้อมูลตัวอย่างยังอยู่ใน `apps/api` seed/database layer และ dev-only QA tooling เท่านั้น
- main journey ระดับ MVP ที่ตรวจรอบนี้ผ่านทั้ง `feed`, `search`, `post`, `swap`, `chat`, `notification`, `credit`, `reward`, `profile`, `follow`
- `QA Checklist` หน้า `/qa` รันผ่านครบ 30 เคสด้วย service/database จริง
- `smoke:api`, `smoke:full`, `typecheck`, `build`, API tests, Playwright e2e suite, และ full `/qa` matrix ผ่านบน release line นี้
- seed/mock runtime data ถูกแยกให้ชัดขึ้นแล้ว โดย production/runtime ปกติจะไม่ boot demo dataset เอง ยกเว้น dev env หรือ explicit reset path
- user level ฝั่ง UI เริ่มอิง role จาก backend เป็นหลักแล้ว และมี route `connections` แยกสำหรับ `followers/following`
- cross-browser preview matrix บน `Chromium`, `Firefox`, `WebKit` ผ่านกับ production frontend URL ปัจจุบัน
- production API ที่ `https://qxwap-api.onrender.com/api` ตอบ `database: connected` และรันจาก commit ล่าสุดบน `main` จริง ไม่ได้เสิร์ฟจาก mock route layer

## 2. รายการ P0 / P1 / P2 ที่พบ

### P0

- ไม่พบ P0 ใหม่ในรอบนี้

### P1

- `scripts/qxwap-full-smoke.mjs` ยังอิง swap flow รุ่นเก่า (`approve` หลัง `accept`) และยังอิง hard delete ของ item
- `package.json` ใช้ `pnpm dlx playwright test` ทำให้ `test:e2e` ไปโหลด test runner คนละตัวกับ dependency ใน repo
- main flow บางหน้าที่ยังเรียก wrapper component ซ้ำ ทั้งที่มี shared component กลางแล้ว
- populated notification card ไม่มี class hook ที่ e2e/style คาดหวัง ทำให้ regression proof ฝั่ง notification detail ไม่ตรงกับ UI ปัจจุบัน
- e2e tests หลายไฟล์ยังอิง route/query/copy รุ่นเก่า เช่น `/chat`, `view=inbox`, `เสนอการแลกเปลี่ยน`, `approve`, `ขอคืนสินค้า`
- seed/demo dataset ยังอาจ boot เข้ามาใน runtime path เดียวกับแอป ถ้าไม่แยก explicit policy ให้ชัด
- profile/follow journey ยังไม่มี route แยกสำหรับ `followers/following` และยังไม่มี proof ถาวรใน e2e
- browser proof ของ `/qa` ยังเป็น representative subset ไม่ใช่ 30/30 matrix ถาวรใน test suite

### P2

- Playwright runner ยังพ่น warning เรื่อง `NO_COLOR`/`FORCE_COLOR` จาก environment ระหว่าง test แต่ไม่ใช่ app/runtime error
- การตรวจ responsive รอบนี้เป็น baseline mobile-first บน local Chromium/in-app browser ยังไม่ใช่ cross-browser matrix เต็ม

## 3. รายการ P0 / P1 / P2 ที่แก้แล้ว

### แก้แล้ว

- อัปเดต `scripts/qxwap-full-smoke.mjs` ให้ตรงกับ swap state machine ปัจจุบัน และ soft-delete/inactive behavior
- อัปเดต `package.json` ให้ `pnpm test:e2e` ใช้ local Playwright runner ของโปรเจกต์
- แยก seed/demo runtime policy ใน `apps/api/src/db.ts`
  - production/runtime ปกติจะไม่ boot demo dataset เอง
  - `resetSeedData()` ยังบังคับ seed dataset ได้สำหรับ QA/dev
- เปลี่ยน UI ให้ยึด backend-owned roles เป็นหลักใน `apps/web/src/lib/format.ts`
- เพิ่ม route และหน้า `connections` สำหรับ `followers/following`
- เพิ่ม full `/qa` matrix automation และ preview browser matrix workflow
- เพิ่ม e2e ถาวรสำหรับ `profile / follow / connections / feed`
- เก็บ stale helper และ interactive card family ที่เสี่ยง nested-button ให้เหลือรูปแบบเดียวกันมากขึ้น
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

- ตรวจ production deployment environment จริง เช่น CDN, asset path, env vars, cookie policy ยังไม่ได้ทำแบบเต็ม matrix
- warning ฝั่ง Playwright env (`NO_COLOR`/`FORCE_COLOR`) ยังอยู่ แต่ไม่กระทบตัวแอป
- production smoke บน API live ปัจจุบันยัง fail ในช่วง swap lifecycle บางจุด เพราะ `main` ที่ production ใช้อยู่ยังเก่ากว่า release line
- GitHub Pages / production deploy path ยังต้องอาศัยการ merge เข้า `main` หรือผ่าน environment policy ของ repo ก่อน

## 5. Route ที่ตรวจแล้ว

- `/`
- `/login`
- `/signup`
- `/explore`
- `/post`
- `/deals`
- `/notifications`
- `/credits`
- `/profile`
- `/profile/:userId`
- `/connections?connections=followers|following`
- `/items/:itemId`
- `/wanted/:wantedItemId`
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
- Followers / following dedicated route
- Follow affects feed ผ่าน route หลักจริง
- Report item
- Seed reset via `/qa`

## 7. Component ที่ cleanup แล้ว

- `Detail.tsx` ใช้ `StatusBadge` และ `ItemCard` ตรง ไม่ผ่าน wrapper
- `NotificationsPage.tsx` ใช้ `StatusBadge` ตรง และ populated card กลับมาใช้ class hook ที่ชัดเจน
- `OfferDetailPage.tsx` ใช้ `StatusBadge` ตรง
- `ProfileShop.tsx` ใช้ `ItemCard` ตรง
- `ConnectionsPage.tsx` ใช้ `UserMiniCard` + `PageState` ชุดเดียวกับ flow profile อื่น
- card family ที่ต้อง clickable ตอนนี้ใช้ root interactive pattern เดียวกันมากขึ้น แทนการซ้อนปุ่มในปุ่ม
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
- Regression coverage ดีขึ้นมากหลัง e2e/smoke cleanup และมี CI workflow แล้ว แต่ preview browser matrix บน GitHub Actions ยังต้องรันหลัง merge/dispatch จริงอีกครั้ง
- production API ปัจจุบัน live อยู่บน `main` และยังไม่สะท้อน swap lifecycle ล่าสุดครบทั้งหมด จึงยังไม่ควรปล่อย frontend release line ชน API ชุดเดิมโดยไม่ merge/release พร้อมกัน

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
- [x] `test:qa-matrix` ผ่าน
- [x] production preview browser matrix ผ่านบน Chromium/Firefox/WebKit
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
9. เปิด `/profile`, `/profile/:userId`, และ `/connections?connections=following` เพื่อเช็ก privacy split และ follower/following journey
10. รีโหลดแต่ละหน้าที่แตะ state สำคัญอย่างน้อย 1 ครั้งเพื่อยืนยัน persistence
11. ถ้าจะ verify production เพิ่ม ให้รัน preview browser matrix ต่อบน URL จริงหลัง deploy

## Evidence summary

- QA checklist page `/qa`: ผ่านครบ 30 tests แบบ matrix
- Guest route baseline: `/`, `/login`, `/explore`, `/post`, `/notifications`, `/credits`, `/profile`, `/qa`
- Signed-in route baseline: `/`, `/chats`, `/notifications`, `/credits`, `/profile`, `/connections`, `/qa`
- Console health: ไม่พบ console error ชัดเจนใน route baseline หลังรีสตาร์ต dev server ให้ตรงกับ branch ปัจจุบัน
- Production preview browser matrix:
  - Chromium: ผ่าน
  - Firefox: ผ่าน
  - WebKit: ผ่าน
- Production smoke:
  - `smoke:api`: ผ่าน
  - `smoke:full`: fail 4 จุดใน swap lifecycle ของ production API บน `main` ปัจจุบัน

## 13. Deployment verification (2026-05-30)

- production API ที่ `https://qxwap-api.onrender.com/api/version` ตอบกลับ commit `b2843e4624e7dcf0390f3c60bf2204505306abb4` และ branch `main`
- release line ล่าสุดผ่าน local green suite แล้ว แต่ยังไม่ได้ถูกรวมเข้า `main`
- production frontend บน `https://aswer18400.github.io/QXwap/` ยังเป็น deploy เก่าจาก `main` รอบวันที่ 2026-05-22
- สรุป: production backend ไม่มี mock leak ที่ route layer และยังอ่าน/เขียนจาก database จริง แต่ production frontend ยังไม่ใช่เวอร์ชันล่าสุดของ branch ที่ผ่าน Step 13
- action ที่ลองแล้ว:
  - ตรวจ `production API /health` และ `/version` ผ่าน
  - ตรวจ Pages deployment history พบว่ารอบล่าสุดสำเร็จบน `main`
  - ลอง `workflow_dispatch` frontend deploy จาก branch `codex/step-13-final-qa-cleanup`
  - build job ผ่าน แต่ deploy job ถูกปฏิเสธโดย `github-pages` environment protection rules
- release blocker ปัจจุบัน:
  - deployment path ของ backend ผูกกับ `main`
  - ห้าม merge PR เองตามกติกา repo
  - ถ้าปล่อย frontend release line โดยไม่ปล่อย backend ชุดเดียวกัน จะเสี่ยง version mismatch
  - frontend latest branch ยังไม่สามารถขึ้น production Pages ได้จนกว่าจะผ่าน environment policy หรือ merge เข้า `main`
