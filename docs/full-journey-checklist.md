# QXwap Full Journey Checklist

Last updated: 2026-05-20
Source basis: `apps/web/src/*`, current API tests, and latest local `pnpm gate:production`

Status legend:
- `AUTO PASS` = covered by automated test/build/smoke already
- `MANUAL` = needs browser/device clicking to fully validate visual/interaction behavior
- `HIGH PRIORITY` = should be re-run on the real deployed URL after next deploy

## 1. Global App Shell

### 1.1 Initial app load
- Entry: open `/`
- Expected:
  - Top bar shows `QXwap`
  - Search icon visible
  - Notification bell visible
  - Bottom nav shows `แนะนำ`, `ช็อป`, `เพิ่มของ`, `อินบ็อกซ์`, `โปรไฟล์`
  - If loading, text shows `กำลังโหลด QXwap...`
  - If offline, banner shows `ออฟไลน์อยู่ บางข้อมูลอาจยังไม่อัปเดตจนกว่าจะเชื่อมต่ออีกครั้ง`
- Status: `AUTO PASS` for load/smoke, `MANUAL` for visual polish

### 1.2 Global auth route behavior
- Entry: open `/login`, `/signin`, `/signup`
- Expected:
  - Auth modal opens automatically
  - `/login` and `/signin` open sign-in mode
  - `/signup` opens sign-up mode
  - Closing modal clears route back to app base path
- Status: `AUTO PASS` for route wiring, `HIGH PRIORITY MANUAL` on Pages/live browser

### 1.3 Global error/toast behavior
- Trigger: API/network failure
- Expected:
  - Toast appears with backend message or network message
  - User can dismiss toast by tapping it
- Status: `MANUAL`

## 2. Top Bar

### 2.1 Brand button
- Text/control: `QXwap`
- Click result:
  - Returns to feed view
  - Clears selected detail view
  - Clears profile overlay view
- Status: `MANUAL`

### 2.2 Search button
- Icon button with aria `ค้นหา`
- Click result:
  - Opens search sheet
- Status: `MANUAL`

### 2.3 Notification bell
- Icon button with aria `ข้อเสนอและโนติฟิเคชัน`
- Click result:
  - Opens inbox
  - Switches to notifications tab
- Status: `MANUAL`

## 3. Bottom Navigation

### 3.1 `แนะนำ`
- Click result: opens feed screen
- Status: `MANUAL`

### 3.2 `ช็อป`
- Click result: opens shop screen
- Status: `MANUAL`

### 3.3 `เพิ่มของ`
- Click result: opens add-product screen
- Status: `MANUAL`

### 3.4 `อินบ็อกซ์`
- Click result:
  - if guest: Login CTA screen
  - if logged in: inbox screen
- Status: `MANUAL`

### 3.5 `โปรไฟล์`
- Click result:
  - if guest: Login CTA screen
  - if logged in: own profile screen
- Status: `MANUAL`

## 4. Feed Screen (`แนะนำ`)

### 4.1 Follow rail
- Visible texts: user avatar chips, short display names, optional level dots
- Click result:
  - opens that user profile
- Status: `MANUAL`

### 4.2 Credit card panel
- Guest expected text:
  - `กระเป๋าเครดิต`
  - `เข้าสู่ระบบเพื่อดูยอดเครดิต`
  - button `เข้าสู่ระบบ`
- Logged-in expected text:
  - `กระเป๋าเครดิต`
  - `<balance> เครดิต`
  - button `เปิดกระเป๋า`
- Click result:
  - guest: auth modal
  - logged in: wallet page
- Status: `AUTO PASS` for wallet data load, `MANUAL` for UI

### 4.3 Feed heading
- Expected text: `AI แนะนำการแลก`
- Status: `MANUAL`

### 4.4 Empty state
- Expected text: `ยังไม่มีรายการแนะนำ ลองติดตามผู้ใช้หรือเพิ่มของที่คุณมี`
- Status: `MANUAL`

### 4.5 Feed owner row on each card
- Click owner avatar/name
- Expected:
  - opens owner profile
- Status: `MANUAL`

### 4.6 Feed item main card
- Visible expected:
  - hero image
  - image-count badge when product has >1 image
  - condition pill
  - title
  - deal type
  - optional `ตอบไว`
  - optional `ผู้ใช้งานดีเด่น`
  - price block
  - optional wanted text
- Click result:
  - opens detail page
- Status: `AUTO PASS` for data path, `MANUAL` for UI

### 4.7 Feed wanted tags
- Click result:
  - switches to shop
  - applies tag as search/filter
- Status: `AUTO PASS`

### 4.8 Feed save button
- Button text:
  - `บันทึก` or `บันทึกแล้ว`
- Click result:
  - toggles bookmark state
- Status: `MANUAL`

### 4.9 Feed Xwap button
- Button text: `Xwap`
- Expected:
  - guest: login prompt
  - owner item: disabled
  - restricted account: disabled
  - normal user: opens offer sheet
- Status: `AUTO PASS` for core flow, `MANUAL` for UI states

## 5. Shop Screen (`ช็อป`)

### 5.1 Search input
- Placeholder: `ค้นหาของที่อยากแลกหรือซื้อ`
- Typing result:
  - updates `q`
  - refreshes item list with debounce
- Status: `AUTO PASS` for search API, `MANUAL` for UI debounce behavior

### 5.2 Filter button
- Text:
  - `ตัวกรอง`
  - or `ตัวกรอง N`
- Click result:
  - opens filter sheet
- Status: `MANUAL`

### 5.3 Category rail
- Buttons:
  - `ทั้งหมด`
  - one button per category from constants
- Click result:
  - applies category filter
  - selected state shows checkmark prefix
- Status: `MANUAL`

### 5.4 Filter summary strip
- Text prefix: `กำลังคัดกรอง:`
- Button: `แก้ตัวกรอง`
- Click result:
  - reopens filter sheet
- Status: `MANUAL`

### 5.5 Section head
- Expected text:
  - `ช็อปสินค้า`
  - `<count> รายการ`
- Status: `MANUAL`

### 5.6 Empty shop state
- Expected text: `ยังไม่เจอสินค้าที่ตรงเงื่อนไข ลองล้างตัวกรองหรือค้นหาคำอื่น`
- Status: `MANUAL`

### 5.7 Product grid card
- Visible expected:
  - square product image
  - optional image-count badge
  - bookmark button
  - condition pill
  - title
  - wanted preview
  - price
  - `Xwap` button
  - up to 2 wanted tags
- Clicks:
  - image/title/card: open detail
  - bookmark: toggle save
  - `Xwap`: open offer sheet
  - wanted tag: search by tag
- Status: `AUTO PASS` for main data path, `MANUAL` for full click map

## 6. Filter Sheet

### 6.1 Header
- Expected text: `ตัวกรองช็อป`
- Close button aria: `ปิดตัวกรอง`
- Status: `MANUAL`

### 6.2 Inputs and controls
- `ราคาต่ำสุด`
- `ราคาสูงสุด`
- Checkbox `รวมรายการเปิดกว้างทุกข้อเสนอ`
- Select `ระยะใกล้เคียง`
- Select `หมวดหมู่`
- Select `ประเภทดีล`
- Select `สภาพ`
- Input `สิ่งที่อยากได้`
- Toggle chips:
  - `เฉพาะคนที่ติดตาม`
  - `ตอบไว`
  - `ผู้ใช้งานดีเด่น`
- Select `เรียงตาม`
- Status: `AUTO PASS` for backend query support, `MANUAL` for every control

### 6.3 Footer buttons
- `ล้างตัวกรอง` => resets to `emptyFilters`
- `ใช้ตัวกรอง` => closes sheet, keeps current values
- Status: `MANUAL`

## 7. Search Sheet

### 7.1 Header
- Expected text: `ค้นหา`
- Close button aria: `ปิดการค้นหา`
- Status: `MANUAL`

### 7.2 Search mode tabs
- `สินค้า`
- `โปรไฟล์`
- Status: `MANUAL`

### 7.3 Product search mode
- Input placeholder: `ค้นหาสินค้า`
- Button text: `ค้นหาในช็อป`
- Click result:
  - closes sheet
  - opens shop
  - applies query
- Status: `MANUAL`

### 7.4 Profile search mode
- Input placeholder: `ค้นหาร้านค้าหรือผู้ใช้`
- Result card expected:
  - avatar
  - display name / username
  - city
  - listing count
  - level chip when viewer logged in
- Empty state text: `ไม่พบโปรไฟล์`
- Click result:
  - opens that profile
- Status: `MANUAL`

## 8. Auth Modal

### 8.1 Sign-in mode
- Title: `เข้าสู่ QXwap`
- Fields:
  - `อีเมล`
  - `รหัสผ่าน`
- Checkbox text: `จำอีเมลไว้ในเครื่องนี้`
- Button text:
  - `เข้าสู่ระบบ`
  - secondary `สร้างบัญชีใหม่`
- Link button: `ลืมรหัสผ่าน`
- Success:
  - closes modal
  - loads user session data
- Status: `AUTO PASS` for auth path, `MANUAL` for copy/validation flow

### 8.2 Sign-up mode
- Title: `สร้างบัญชี QXwap`
- Fields:
  - `ชื่อที่แสดง`
  - `อีเมล`
  - `รหัสผ่าน`
  - `ยืนยันรหัสผ่าน`
- Checkbox text:
  - `ยอมรับเงื่อนไขการใช้งานและรับ Manu Credit เริ่มต้น`
- Buttons:
  - `สร้างบัญชี`
  - secondary `มีบัญชีแล้ว`
- Errors:
  - `รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน`
  - `กรุณายอมรับเงื่อนไขการใช้งานก่อนสร้างบัญชี`
- Status: `AUTO PASS` for signup API, `MANUAL` for all field states

### 8.3 Forgot mode
- Title: `กู้คืนรหัสผ่าน`
- Message:
  - `ตอนนี้ยังไม่มีระบบส่งอีเมลอัตโนมัติ กรุณาสร้างบัญชีใหม่หรือเข้าสู่ระบบด้วยบัญชีเดิม`
- Button:
  - `กลับไปเข้าสู่ระบบ`
- Status: `MANUAL`

## 9. Add Product Screen

### 9.1 Guest state
- Expected:
  - title `ลงสินค้าใหม่`
  - button `เข้าสู่ระบบ`
- Status: `MANUAL`

### 9.2 Header
- New product title: `ลงสินค้าใหม่`
- Edit product title: `แก้ไขสินค้า`
- Status: `MANUAL`

### 9.3 Deal type buttons
- One button each:
  - `แลก`
  - `ขาย`
  - `ซื้อ`
  - `ทั้งแลกและขาย`
  - labels depend on `dealLabels`
- Expected:
  - selected state visibly changes
- Status: `MANUAL`

### 9.4 Core fields
- `ชื่อสินค้า`
- description textarea
- category select
- condition select
- `พื้นที่นัดรับหรือจัดส่ง`
- Status: `MANUAL`

### 9.5 Product images block
- Title: `รูปสินค้า`
- Counter: `N/5 รูป`
- Helper text:
  - `เพิ่มได้เรื่อย ๆ จนครบ 5 รูป รูปแรกจะถูกใช้เป็นภาพหลักของสินค้า`
- Button text:
  - `เพิ่มรูปสินค้า`
  - or `กำลังอัปโหลดรูป...`
- Expected:
  - preview cards appear
  - first image label `ภาพหลัก`
  - later images `ภาพที่ N`
  - remove button per image
  - empty text `ยังไม่ได้เลือกรูปสินค้า`
- Critical validation:
  - 1 product must remain 1 product even if 2-5 images uploaded
  - no more than 5 total images
- Status: `AUTO PASS` for API regression, `HIGH PRIORITY MANUAL` for browser/device file-picker flow

### 9.6 Pricing and offer controls
- `ราคาเงินสด เช่น 100`
- `เครดิต เช่น 1000`
- Checkbox `เปิดรับข้อเสนออื่นเพิ่มเติม`
- Status: `MANUAL`

### 9.7 Wanted fields
- textarea `อยากได้อะไรตอบแทนเป็นพิเศษ`
- repeated tag input placeholder `เช่น กล้องฟิล์ม, รองเท้าเทนนิส, บัตรคอนเสิร์ต`
- button `+ เพิ่มสิ่งที่อยากได้`
- Status: `MANUAL`

### 9.8 Submit button
- New mode: `เผยแพร่สินค้า`
- Edit mode: `บันทึกสินค้า`
- Saving state: `กำลังบันทึก...`
- Success:
  - clears draft for new item
  - opens detail of saved item
- Status: `AUTO PASS` for data path, `HIGH PRIORITY MANUAL` for UI/device flow

## 10. Product Detail Screen

### 10.1 Back button
- Text: `กลับ`
- Click result:
  - returns to previous app state
- Status: `MANUAL`

### 10.2 Product gallery
- Expected:
  - horizontal carousel
  - left/right arrow buttons
  - image-count badge
  - dot indicators
  - thumbnail row when more than 1 image
- Click/scroll result:
  - current image changes
- Critical validation:
  - one product with multiple images must show one detail page, not multiple products
- Status: `MANUAL HIGH PRIORITY`

### 10.3 Save button
- Aria:
  - `บันทึก <title>` or `เลิกบันทึก <title>`
- Click result:
  - toggles bookmark
- Status: `MANUAL`

### 10.4 Product info
- Title
- Price block
- Description
- Info grid:
  - `หมวด`
  - `สภาพ`
  - `ดีล`
  - `พื้นที่`
- Wanted section:
  - heading `อยากได้`
  - wanted hero image
  - first wanted tag or `เปิดรับข้อเสนอ`
  - fallback copy `เสนอของที่ใกล้เคียงหรือเพิ่มเงิน/เครดิตได้`
- Wanted tags section:
  - each tag clickable
- Status: `MANUAL`

### 10.5 Owner panel
- Expected text:
  - owner name
  - `สมาชิก QXwap`
- Status: `MANUAL`

### 10.6 Trust panel
- Expected:
  - panel renders below owner block
- Status: `MANUAL`

### 10.7 Owner actions
- Buttons:
  - `แก้ไข`
  - `ลบ`
- Expected:
  - visible only to owner
- Status: `AUTO PASS` for permission model, `MANUAL` for UI

### 10.8 Non-owner action
- Button:
  - `Xwap`
  - or `ดูได้เท่านั้น` for restricted account
- Status: `AUTO PASS` for disabled logic, `MANUAL` for UI

### 10.9 Related items
- Heading: `รายการใกล้เคียง`
- Click result:
  - applies tag/category jump
- Status: `MANUAL`

## 11. Offer Sheet

### 11.1 Guest state
- Expected:
  - title `Xwap`
  - text `กรุณาเข้าสู่ระบบก่อนเพื่อใช้งานต่อ`
  - button `เข้าสู่ระบบ`
  - button `ปิด`
- Status: `MANUAL`

### 11.2 Restricted account state
- Expected:
  - title `Xwap`
  - text `บัญชีนี้ถูกจำกัดสิทธิ์ สามารถดูได้เท่านั้น`
  - button `ปิด`
- Status: `MANUAL`

### 11.3 Own-item state
- Expected:
  - title `Xwap`
  - text `ไม่สามารถขอแลกสินค้าของตัวเอง`
  - button `ปิด`
- Status: `MANUAL`

### 11.4 Normal offer flow
- Header:
  - `Xwap: <item title>`
- Controls:
  - close button
  - my item checkboxes or empty helper text
  - message textarea
  - `เพิ่มเงินสด`
  - `เพิ่ม Manu Credit`
  - checkbox `แลกทันทีถ้าของอยู่ใกล้กัน`
  - shipping payer select
  - pickup window input
  - button `ส่ง Xwap`
- Success text:
  - `ส่ง Xwap แล้ว`
- Status: `AUTO PASS` for API flow, `MANUAL` for full interaction

## 12. Inbox Page

### 12.1 Guest state
- Login CTA title: `ข้อเสนอ`
- button `เข้าสู่ระบบ`
- Status: `MANUAL`

### 12.2 Header and tabs
- Title: `อินบ็อกซ์`
- Tabs:
  - `Xwap`
  - `โนติฟิเคชัน`
- Status: `MANUAL`

### 12.3 Offers tab item card
- Expected:
  - sender profile button
  - owner profile button
  - target item button with title and status
  - message
  - `เงินสด X · เครดิต Y`
  - logistics line when instant swap
  - rejection reason when present
- Status: `AUTO PASS` for backend flow, `MANUAL` for UI

### 12.4 Shipment box
- If shipment not started:
  - button `เริ่มขนส่ง`
- If shipment exists:
  - `รับของแล้ว`
  - `กำลังส่ง`
  - `ส่งของแล้ว`
- Status: `AUTO PASS` for API path, `MANUAL` for UI

### 12.5 Reject reason selector
- Label: `เหตุผลถ้าปฏิเสธ`
- Options:
  - `สภาพสินค้าไม่ตรง`
  - `ระยะทางหรือขนส่งไม่สะดวก`
  - `มูลค่าข้อเสนอไม่เหมาะสม`
  - `เปลี่ยนใจ`
- Status: `MANUAL`

### 12.6 Offer actions
- Buttons:
  - `ยอมรับ`
  - `ปฏิเสธ`
  - `ยกเลิก`
  - `ยืนยันสำเร็จ`
- Status: `AUTO PASS` for core backend path, `MANUAL` for UI

### 12.7 Empty states
- Offers tab empty: `ยังไม่มี Xwap`
- Notifications tab empty: `ยังไม่มีโนติฟิเคชัน`
- Status: `MANUAL`

## 13. Wallet Page

### 13.1 Guest state
- Login CTA title: `เครดิต`
- button `เข้าสู่ระบบ`
- Status: `MANUAL`

### 13.2 Hero
- Kicker: `กระเป๋าเครดิต`
- Title with balance: `<balance> เครดิต`
- Copy: `เครดิตใช้เพิ่มข้อเสนอและรางวัลการแลก ยังไม่รองรับการถอนเป็นเงินสด`
- Rule text: `เติมขั้นต่ำ 50 เครดิตต่อครั้ง`
- Status: `MANUAL`

### 13.3 Deposit controls
- Presets:
  - `+100`, `+250`, `+500`, `+1000`
- Input label: `จำนวนเครดิต`
- CTA text:
  - `เติม N เครดิต`
  - saving state `กำลังอัปเดตยอดเครดิต...`
- Validation:
  - minimum 50
  - maximum 50000
- Status: `AUTO PASS` for deposit API, `MANUAL` for UI

### 13.4 Transactions
- Heading: `รายการเคลื่อนไหวล่าสุด`
- Empty state: `ยังไม่มีรายการเครดิตในบัญชีนี้`
- Row data:
  - description
  - Thai locale date/time
  - signed amount
- Status: `AUTO PASS` for data path, `MANUAL` for UI

## 14. Profile Page

### 14.1 Guest state
- Login CTA title: `บัญชีผู้ใช้`
- button `เข้าสู่ระบบ`
- Status: `MANUAL`

### 14.2 Hero area
- Expected:
  - avatar
  - `บัญชีของฉัน` or `หน้าร้านผู้ใช้งาน`
  - profile name
  - bio/fallback intro
  - chips for username/listing count/city
  - level card
  - quick actions `ดูข้อเสนอ`, `กระเป๋าเครดิต` for own profile
- Status: `MANUAL`

### 14.3 Avatar editor
- Buttons:
  - `เปลี่ยนรูป`
  - when file selected: `เปลี่ยนรูปที่เลือก`
  - clear button
- Helper copy:
  - `เลือกภาพใหม่แล้วกดบันทึกการเปลี่ยนแปลง`
  - or `พร้อมอัปโหลด: <filename>`
- Status: `AUTO PASS` for API persistence, `HIGH PRIORITY MANUAL` for file-picker/browser flow

### 14.4 Summary cards
- Cards:
  - `รายการที่ลง`
  - `คะแนนความน่าเชื่อถือ`
  - `ระดับบัญชี`
- Status: `MANUAL`

### 14.5 Menu strip
- Own profile:
  - `ร้านของฉัน`
  - `ข้อเสนอ`
  - `บันทึกไว้`
  - `กระเป๋าเครดิต`
  - `แก้ไขโปรไฟล์`
  - `การจัดส่ง`
- Public profile:
  - `ร้านค้า`
  - `ข้อเสนอ`
  - `การจัดส่ง`
- Status: `MANUAL`

### 14.6 Shop tab inside profile
- Product tabs:
  - `มีอยู่`
  - `อยากได้`
- Empty states:
  - own: `ยังไม่มีสินค้าในร้าน`
  - public: `ผู้ใช้นี้ยังไม่มีสินค้า`
- Status: `MANUAL`

### 14.7 Saved tab
- Empty state: `ยังไม่มีรายการที่บันทึกไว้`
- Status: `MANUAL`

### 14.8 Settings tab
- Section title: `ข้อมูลร้านและบัญชี`
- Fields:
  - `ชื่อที่แสดง`
  - `ชื่อผู้ใช้`
  - `เมืองหรือจุดนัดรับ`
  - `แนะนำตัว`
- Buttons:
  - `บันทึกการเปลี่ยนแปลง`
  - `ออกจากระบบ`
- Error message area:
  - `บันทึกโปรไฟล์ไม่สำเร็จ` or API error text
- Status: `AUTO PASS` for data path, `MANUAL` for UI

### 14.9 Wallet redirect card in settings/credits
- Title: `กระเป๋าเครดิต`
- Button: `เปิดกระเป๋าเครดิต`
- Status: `MANUAL`

### 14.10 Danger zone
- Title: `โซนอันตราย`
- Button:
  - `ลบบัญชีถาวร`
  - saving state `กำลังลบบัญชี...`
- Confirmation flow:
  - first confirm text
  - second confirm text
- Status: `MANUAL HIGH PRIORITY`

### 14.11 Shipping info tab
- Title: `การจัดส่งและนัดรับ`
- Own-profile button: `เปิดหน้าข้อเสนอ`
- Status: `MANUAL`

## 15. Current Automated Coverage Snapshot

- `pnpm run typecheck` => PASS
- `pnpm --filter @workspace/api-server test` => PASS
- `pnpm --filter @workspace/web-app build` => PASS
- `pnpm gate:production` => PASS
- Automated API/UI smoke currently covers:
  - signup/signin/session
  - upload
  - create item
  - search/filter
  - multi-image item persistence
  - idempotent create-item dedupe
  - offer send/accept/shipment
  - notifications
  - wallet deposit
  - profile avatar persistence
  - logout

## 16. Immediate Manual Regression Targets After Next Deploy

- Add product with 2, 3, 4, 5 images on the real mobile/browser target
- Confirm only one product card is created per publish action
- Swipe detail carousel left/right on phone
- Edit profile avatar from file picker on phone
- Tap every profile menu and verify layout/content states
- Re-run `/login`, `/signup`, bookmark, offer, shipment, wallet, and delete-account confirmation on live site
