# QXwap Project Index, Glossary & Risk Register

เอกสารนี้เป็นสารบัญกลางและตัวช่วยลดความสับสนก่อนส่งต่อทีม design/dev/QA.

## 1. Project Index

| Area | File | Use When |
| --- | --- | --- |
| Final design | `docs/design-final.md` | ตรวจหน้าตา final screens, color, typography, layout |
| Design system | `docs/design-system-states.md` | ทำ component library, variants, states |
| AI start | `AI_START_HERE.md` | จุดเริ่มต้นที่ต้องอ่านก่อนทุกงาน |
| AI task cards | `docs/ai-context/` | เลือกอ่านตาม sprint เพื่อลด token |
| Development plan | `docs/development-plan.md` | วาง phase frontend/backend/database/API |
| Testing launch maintenance | `docs/testing-launch-maintenance.md` | QA, beta, launch, maintenance |
| User level journeys | `docs/user-level-journeys.md` | แยก journey ตาม level 0-4 |
| Role journeys | `docs/role-based-journeys.md` | แยก journey ตาม role เช่น buyer/seller/admin |
| Figma free import kit | `docs/figma-free-import-kit/README.md` | นำเข้า Figma แบบไม่ใช้ MCP quota |
| Figma console scripts | `docs/figma-console/README.md` | สร้าง variables/components/screens ผ่าน console |

## 2. Glossary

| Term | Meaning | Notes |
| --- | --- | --- |
| QXwap | ชื่อแอป | Mobile-first swap marketplace |
| Xwap | action เสนอแลก | ใช้แทนคำว่าเสนอแลก |
| Wanted tags | สิ่งที่เจ้าของสินค้าอยากได้ | ใช้ค้นหา/filter ได้ |
| Open offer | เปิดรับข้อเสนอ | ไม่จำกัดเฉพาะสินค้าหรือราคา |
| Credit | QXwap credit | ใช้เพิ่มข้อเสนอ ถอนเงินสดไม่ได้ |
| Guest | Level 0 | ยังไม่ login, browse only |
| Registered User | Level 1 | login แล้ว ใช้ marketplace core ได้ |
| Active User | Level 2 | ผู้ใช้ที่มี activity/trust signals |
| Credit-enabled User | Level 3 | ใช้ credit features ได้ |
| Restricted User | Level 4 | ดูได้แต่ Xwap/offer ถูกจำกัด |
| Buyer / Requester | คนขอแลก | ส่ง offer ไปยังสินค้า |
| Seller / Owner | เจ้าของสินค้า | รับและจัดการ offer |
| Trader | ทั้งลงสินค้าและขอแลก | มี sent/received offers |
| Courier | คนรับส่งของ | จัดการ pickup/delivery proof |
| Admin / CMS | หลังบ้าน | จัดการ level, moderation, credit |
| Support | ทีมช่วยเหลือ | dispute, abuse, issue handling |

## 3. Scope Boundaries

### MVP Must Have

- Auth/session
- Feed
- Shop
- Product detail
- Add/edit/delete own product
- Image upload/display
- Search/filter/wanted tag
- Xwap offer
- No-product offer
- Inbox offers
- Profile/avatar persistence
- Owner/non-owner permission

### Beta Should Have

- Notifications
- Chat
- Wallet/credit ledger
- Shipment proof states
- Analytics events
- Closed beta feedback process

### Later Phase

- Full Admin/CMS
- Real payment provider
- Maps provider
- Email/SMS provider
- Push notifications
- App Store / Play Store release

## 4. Risk Register

| Risk | Severity | Why It Matters | Mitigation |
| --- | --- | --- | --- |
| DB/API broken | P0 | app cannot persist real marketplace data | repair migrations/API health before UI integration |
| Stale prototype mistaken as app | P1 | old HTML prototype files were removed from GitHub main | use `apps/web` and `docs/figma-free-import-kit` only |
| Nested buttons in cards | P1 | tap/save/detail actions break | keep card/action buttons separate |
| Owner permission leak | P0 | non-owner could edit/delete | enforce in UI and API |
| Level 4 bypass | P0 | restricted users could still offer via API | server-side authorization checks |
| Image path mismatch | P1 | product/profile images disappear in prod | normalize upload URLs and asset helper |
| Credit confusion | P1 | users may think credits equal cash | copy + wallet rules + no withdrawal path |
| Offer with no products missing | P1 | core requirement breaks | allow message/cash/credit offer without offer_items |
| Service worker stale cache | P2 | deployed app serves old UI | versioning/cache reset strategy |
| Figma raw frames only | P2 | not true component library | later convert raw frames into components/tokens |

## 5. Open Decisions

| Decision | Current Status | Owner |
| --- | --- | --- |
| Payment provider | not selected | Product/business |
| Courier partner | not selected | Ops/business |
| Maps provider | not selected | Dev/product |
| Admin CMS scope | later phase | Product/dev |
| Real-time method | polling first, SSE later | Dev |
| Credit hold/reversal rules | needs final business rule | Product/business |

## 6. Next Best Development Step

1. Run backend/API tests and inspect DB migration state.
2. Repair database/API/auth if broken.
3. Make Feed/Shop use real API data.
4. Verify image upload/display.
5. Implement Xwap offer flow with no-product offer.
6. QA mobile 390px.
