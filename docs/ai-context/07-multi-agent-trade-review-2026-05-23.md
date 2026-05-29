# 07 Multi-Agent Trade Review - 2026-05-23

รีวิวนี้สรุปจากเอเจนต์ 6 ตัวที่เช็กแอปจริงบน `http://127.0.0.1:5173` โดยแยกมุมมองเป็น `UX`, `UI`, `PO`, `Guest`, `Requester`, และ `Owner`.

เป้าหมายคือเช็กว่า journey ของ QXwap ไปได้ครบจริงหรือยังในฐานะ:

- คนดูของก่อนสมัคร
- คนส่งข้อเสนอแลก
- เจ้าของสินค้าที่ต้องรับข้อเสนอและปิดดีล

## Scope

- Runtime app จริงบน branch `codex/ui-redesign-full-integration`
- Frontend routes หลักและ deep links
- Offer lifecycle จริงระดับ `browse -> detail -> xwap -> offer detail -> chat -> accept`
- Auth gating และ role isolation
- UI parity กับ prototype direction

## Agent Roster

- `UX Reviewer`: friction, trust, journey continuity
- `UI Reviewer`: layout, hierarchy, loading states, route-level visual parity
- `PO Reviewer`: acceptance coverage และ business-readiness
- `Guest Persona`: คนดูของก่อนล็อกอิน
- `Requester Persona`: คนส่งข้อเสนอ
- `Owner Persona`: คนรับข้อเสนอ/เจ้าของสินค้า

## Test Side Effects

รีวิวนี้มี side effects จริงใน dev data:

- ส่งข้อความแชตทดสอบ 1 ข้อความในดีล `หนังสือ Design Systems`
- ส่งข้อเสนอ Xwap ใหม่อย่างน้อย 1 รายการ
- กด `ตอบรับข้อเสนอ` 1 ครั้ง ทำให้ดีลหนึ่งขยับไปสถานะ `รออีกฝ่ายยืนยัน`

## Executive Summary

ภาพรวมคือแอป `ไปได้ไกลแล้วในระดับ flow จริง` แต่ยัง `ไม่พร้อม production` สำหรับ trade journey เต็มรูปแบบ เพราะมี blocker ที่กระทบความเชื่อมั่นโดยตรงอยู่หลายจุด:

1. `Sign-out` ไม่ตัด session จริง
2. `Xwap` CTA หลักบน product detail พาไปผิด flow
3. `Offer summary` ฝั่ง requester ยังทำให้เข้าใจผิดได้
4. `Owner/Profile context` รั่วข้ามคน
5. `Following / Campaign / Category / Filter` ยังมีจุดที่ URL เปลี่ยนแต่ผลลัพธ์ไม่ตรง
6. `Nested button` และ `bottom nav overlay` ยังทำให้ interaction ไม่เสถียร
7. Loading หลาย route ยังเป็น blank hold หรือ splash ยาวเกิน จนเหมือนแอปค้าง

## Route / Function Matrix

| Area | Guest | Requester | Owner | Status | Notes |
|---|---|---|---|---|---|
| Feed browse | ผ่าน | ผ่าน | ผ่าน | `PASS` | discovery หลักใช้งานได้จริง |
| Banner -> Campaign | ผ่าน | ผ่าน | ผ่าน | `PARTIAL` | CTA ไป shop ว่างในบาง campaign |
| Search | ผ่าน | ผ่าน | ผ่าน | `PASS` | product/profile search ใช้งานได้ |
| Sort | ผ่าน | ผ่าน | ผ่าน | `PASS` | เป็นหน้าที่ลงตัวที่สุดตอนนี้ |
| Category chip | พัง | น่าจะกระทบ | น่าจะกระทบ | `FAIL` | URL เปลี่ยนแต่ list ไม่เปลี่ยนจริง |
| Filter apply | พังบางกรณี | ผ่านบางกรณี | ผ่านบางกรณี | `PARTIAL` | guest เจอ result ไม่สอดคล้องกับ filter |
| Nearby | ผ่านบางส่วน | ผ่านบางส่วน | ผ่านบางส่วน | `PARTIAL` | error มี แต่ recovery ไม่ดี |
| Product detail open | ผ่าน | ผ่าน | ผ่าน | `PASS` | deep link เปิดได้ |
| Save / Bookmark | gate ได้ | ผ่าน | ผ่าน | `PARTIAL` | guest topbar saved entry พัง |
| Xwap from shop card | gate/ผ่าน | ผ่าน | N/A | `PASS` | เป็น flow ที่แน่นสุด |
| Xwap from detail CTA | พัง | พัง | N/A | `FAIL` | พาไปผิด route หรือโดน bottom nav ทับ |
| Offer submit | N/A | ผ่าน | N/A | `PASS` | modal -> offer detail ไปได้จริง |
| Sent offers clarity | N/A | ยังไม่ชัด | N/A | `PARTIAL` | card อ่านยาก/summary ผิดฝั่ง |
| Received offers | gate | N/A | ผ่านบาง path | `PARTIAL` | owner inbox ไม่เสถียรเท่า notification path |
| Offer detail | gate | ผ่าน | ผ่าน | `PASS` | accept/reject/chat เปิดได้ |
| Chat | gate | ผ่าน | ผ่าน | `PARTIAL` | entry จาก inbox ยังพังบางจุด |
| Notifications | gate | ไม่ครบ | ผ่าน | `PARTIAL` | deep-link ใช้ได้ แต่ requester-side confirmation ยังไม่พอ |
| Own profile | gate | ผ่าน | ผ่าน | `PARTIAL` | context isolation พัง |
| Public profile | ผ่าน | ผ่าน | ผ่าน | `PARTIAL` | trust surface บางเกิน |
| Add product | gate | N/A | ผ่านบางส่วน | `PARTIAL` | validation และ publish confidence ยังไม่พอ |
| Profile edit | gate | N/A | พังด้าน auth isolation | `FAIL` | เปิด edit ของคนอื่นได้เมื่อ context รั่ว |
| Following | N/A | ผ่านบางส่วน | ผ่านบางส่วน | `FAIL` | route มี แต่ logic/social loop ยังไม่ครบ |
| Sign out | N/A | พัง | พัง | `FAIL` | session ไม่หลุดจริง |

## Persona Reviews

## Guest Explorer

### What works

- เข้า `/` หรือ `?view=feed` แล้ว browse ได้ทันที
- เปิด campaign, public seller profile, item detail, search, filter, sort ได้
- protected routes อย่าง `?view=add`, `?view=inbox`, `?view=profile`, `?view=notifications` มี auth gate

### What breaks

- topbar `บันทึกไว้` จาก feed กดแล้วไม่ไปไหน
- category chip เปลี่ยน URL แต่ไม่เปลี่ยนรายการจริง
- filter บางค่าเปลี่ยน URL แต่ผลไม่สอดคล้อง
- CTA `Xwap` บน detail ถูก bottom nav ทับ หรือพาไป login/profile gate แบบไม่ตรงบริบท

### Guest confidence problems

- auth-gated screens รอนานบน `กำลังเตรียม QXwap...` ก่อนค่อยเห็น gate
- save กับ Xwap ใช้ auth pattern คนละแบบ
- login-gated pages บางเกินไปจนดูเหมือนหน้าโหลดไม่ครบ ไม่ใช่ deliberate conversion step

## Requester / Offerer

### What works

- เปิด shop, search, sort, filter ได้
- กด `Xwap` จาก shop card แล้ว modal เปิดจริง
- เลือก item ของตัวเอง, ใส่ note, ใส่ cash, ส่งข้อเสนอได้
- หลังส่ง พาไป `offer_detail` จริง
- เปิด chat จาก offer detail และส่งข้อความ follow-up ได้

### What breaks

- `Xwap` จาก detail พัง: ไม่เปิด modal
- tab `ส่งแล้ว` ใน inbox แสดง summary ทำให้อ่านผิดว่าเสนออะไร
- หน้า notifications ไม่ยืนยัน requester-side actions ได้ดีพอ
- default inbox เปิด `ได้รับ` ก่อน ทำให้ข้อเสนอที่เพิ่งส่งดูเหมือนหาย

### Requester trust problems

- offer card สื่อไม่ชัดว่า `ฉันต้องการอะไร` กับ `ฉันเสนออะไร`
- ไม่มี success confirmation ที่หนักแน่นพอหลังส่งข้อเสนอ
- ไม่มี requester notification ที่ช่วยยืนยันว่า trade ได้เกิดขึ้นแล้ว

## Owner / Poster

### What works

- restore session เข้ามาเป็น owner ได้
- own profile และ own listings เปิดได้
- own item detail บาง path แสดง `แก้ไข / ลบ`
- edit item เปิดด้วยข้อมูล prefill ได้
- notifications ไป offer detail ได้
- accept offer และ chat ใช้งานได้จริง

### What breaks

- sign-out ไม่ทำงาน
- owner/detail context ไม่เสถียร: item เดิมบางครั้งกลายเป็น shopper view
- profile context รั่วไปเป็นผู้เสนอ แล้ว `ร้านของฉัน` กู้กลับไม่ได้
- `แก้ไขโปรไฟล์` เปิดข้อมูลของคนอื่นได้เมื่อ context รั่ว
- `เปลี่ยนรูปโปรไฟล์` ไม่ทำอะไร
- หลัง accept offer ไม่มี next-step controls เพื่อปิดดีลจริง

### Owner confidence problems

- inbox received ไม่เสถียรเทียบกับ notification path
- add product ยังให้ความรู้สึก draft-heavy
- validation ตอน publish รอบแรกยังไม่ช่วยพอ

## UX Review Synthesis

## Highest friction moments

1. ผู้ใช้ตั้งใจแลกของแล้วกด `Xwap` บน detail แต่ถูกพาไปคนละ journey
2. ผู้ใช้กด `ออกจากระบบ` แล้ว session ยังอยู่
3. guest เจอหน้า protected route ที่ดูเหมือนค้างก่อนค่อย gate
4. campaign สัญญาว่าจะพาไปหาของที่เกี่ยวข้อง แต่ลงที่ empty results
5. public profile และ detail gallery ยังให้ trust ไม่พอสำหรับการตัดสินใจแลก

## UX consistency gaps

- Save กับ Xwap ใช้ auth pattern คนละแบบ
- sent offer กับ received offer ยังเล่า story ของดีลไม่คม
- post-accept state ยังไม่มี journey ต่อให้ user รู้ว่าต้องทำอะไร

## UI Review Synthesis

## Layout / interaction issues

- `nested button` ใน feed และ inbox ทำให้ tap targets ซ้อนกัน
- `bottom nav` ทับ content จริงทั้ง mobile และ desktop บางหน้า
- `add` มี floating publish surface โผล่ทับ form
- `detail` ช่วงล่างแน่นและชนกันเชิงสายตา
- `profile_edit` และ `campaign` มี CTA contrast ต่ำเกินไป

## Loading / polish issues

- `filter`, `add`, `inbox`, `profile_edit`, `saved`, `detail` มี cold-load ที่ดูเป็นหน้าขาวหรือ generic hold นานเกิน
- บางหน้าดูเหมือน placeholder แม้ logic ทำงานแล้ว เช่น `search`, `notifications`

## Best current screens

- `?view=sort`
- `?view=saved`
- `?view=filter` หลังโหลดเสร็จ
- `?view=offer_detail&offer=...` เมื่อเปิดด้วย route ที่ถูกต้อง

## PO Review Synthesis

## What is ready enough to build on

- Feed discovery
- Search / sort / filter shell
- Shop-card Xwap flow
- Offer detail
- Chat entry from offer detail
- Saved items
- Notifications deep-link

## What is not ready for production

- Auth/session isolation
- Offer correctness and sent-summary trust
- Following/social loop
- Public trust/profile parity
- Campaign/tag -> result relevance
- Full accepted-deal -> logistics -> confirm completion journey

## Critical / High Findings

## P0 Must Fix Before Production

1. `Sign-out broken`
   - Route: `?view=profile`
   - Impact: session trust, privacy, guest/member switching, QA by role

2. `Xwap CTA on detail broken`
   - Route: `?item=06c72c17-9e2c-4052-9759-ee865d5adacb`
   - Impact: core trade conversion point

3. `Profile context leak`
   - Route family: `?view=offer_detail&offer=...` -> `?profile=...` -> `?view=profile`
   - Impact: owner context lost, wrong profile edit target, authorization risk

4. `Edit profile can open another user's data`
   - Route: `?view=profile_edit`
   - Impact: permission boundary and trust breach

5. `Nested buttons in feed/inbox`
   - Routes: `?view=feed`, `?view=inbox`
   - Impact: wrong-action routing, accessibility, mis-taps

## P1 Should Fix Next

1. category/filter result mismatch
2. inbox `แชต` button routing bug
3. campaign CTA -> empty results
4. inbox default tab not aligned with requester post-submit expectation
5. owner post-accept flow has no actionable next steps
6. bottom nav overlay on mobile/desktop
7. cold-load blank states on protected and heavy routes

## P2 Polish / Trust Improvements

1. stronger public profile trust signals
2. clearer detail gallery affordances
3. better sent/received offer anatomy
4. nearby recovery guidance
5. richer notification triage
6. cleaner add-product validation and draft handling

## Recommended Fix Order

1. `auth/session/profile isolation`
   - sign out
   - owner/profile context reset
   - protected-route gating timing

2. `core trade conversion`
   - detail `Xwap` CTA
   - sent/received offer data clarity
   - inbox chat routing

3. `owner close-the-deal journey`
   - accept -> next step actions
   - logistics / นัดรับ / วิธีส่ง / ยืนยันรับของ

4. `discovery correctness`
   - category/filter correctness
   - campaign/tag result relevance
   - following/follow CTA

5. `interaction cleanup and visual stability`
   - nested button cleanup
   - bottom nav overlay
   - loading skeletons instead of blank holds
   - CTA contrast on add/profile-edit/campaign

## Suggested Next Sprint

Sprint goal: `Trade Journey Reliability Pass`

Scope:

- Fix `sign-out`
- Fix detail `Xwap` CTA
- Fix profile context leaks
- Fix inbox `แชต` routing
- Fix category/filter correctness on shop
- Add owner post-accept next-step actions

Validation minimum:

- Guest flow fresh browser
- Requester send-offer flow
- Owner receive-and-accept flow
- Typecheck
- Web build
- API tests

## Bottom Line

QXwap ตอนนี้ `มี flow จริงที่ใช้ได้แล้วหลายส่วน` และไม่ได้อยู่ในช่วง mockup เปล่าแล้ว แต่จุดที่ยังพังคือจุดที่แตะ `trust`, `identity`, และ `core trade action` โดยตรง ซึ่งเป็นสามอย่างที่ marketplace แบบแลกของห้ามพัง

ถ้าจะเอาให้ผู้ใช้ “กล้าส่งข้อเสนอและกล้าปิดดีล” รอบถัดไปต้องเน้นแก้ reliability ของ role/session กับ trade CTA ก่อนเรื่อง visual polish เพิ่มเติม
