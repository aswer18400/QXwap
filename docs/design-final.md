# QXwap Design Final

เอกสารนี้คือ checklist สำหรับหน้าตาแอปเวอร์ชัน final ก่อนส่งต่อ Figma / Design System / Design-to-Code โดยอิงจาก prototype ปัจจุบันใน `docs/qxwap-interactive-prototype.html`

## 1. Final UI Screens

ต้องมีหน้าจอ final ครบตาม flow ปัจจุบันของ QXwap:

| Screen | Purpose | Must include |
| --- | --- | --- |
| Feed | หน้าแนะนำการแลก | follow rail, credit card, AI recommended feed, product card, Xwap CTA, login nudge |
| Shop | marketplace grid | search, filter, category rail, 2-column product grid, save, Xwap, product owner |
| Product Detail | รายละเอียดสินค้า | image, title, owner profile, deal type, price/credit, wanted tags, Xwap, owner actions |
| Add Product | เพิ่มสินค้า | deal type, title, description, category, condition, image upload, price, credit, wanted tags |
| Offer Sheet | ส่งข้อเสนอ Xwap | item offer, cash, credit, message, submit, error state |
| Inbox | ข้อเสนอและแจ้งเตือน | tabs: offers / notifications, offer status, action buttons |
| Chat | คุยกับคู่แลก | conversation header, messages, input, send |
| Profile | โปรไฟล์ผู้ใช้/ร้าน | avatar, display name, level, follower count, shop tabs, saved, settings |
| Wallet | QXwap Credit | balance, transactions, deposit/test action, rules |
| Shipment / Deal Progress | แลกทันที/ขนส่ง | stages, pickup proof, delivery proof, reject reason, fee responsibility |
| Auth Modal | login/register | email, password, submit, error, loading |
| Empty/Error States | fallback states | useful CTA, clear error message, retry path |

## 2. Visual Direction

QXwap ต้องดูเป็น mobile marketplace ที่เน้นการแลกของ ไม่ใช่ generic ecommerce.

- Mobile-first, ใช้งานหลักที่ 390 x 844
- พื้นหลังสว่าง `#F7F8FA`
- การ์ดสีขาว มุมมน 20-28px
- ปุ่มหลักสีฟ้า QXwap
- ใช้พื้นที่แน่นพอดี อ่านง่าย ไม่ใส่คำอธิบายเยอะ
- Product card ต้องเห็นรูปก่อน ชื่อสินค้า และ action ชัด
- Feed ต้องรู้สึกเป็น “AI แนะนำการแลก”
- Shop ต้องรู้สึกเป็น marketplace grid จริง

## 3. Color Tokens

### Primitive

| Token | Value | Usage |
| --- | --- | --- |
| `blue-50` | `#EAF3FF` | active nav, selected chip |
| `blue-500` | `#2F7BFF` | primary button, Xwap CTA |
| `blue-700` | `#0B63CE` | active text, strong brand |
| `gray-50` | `#F7F8FA` | app background |
| `gray-100` | `#F2F4F7` | muted chip |
| `gray-300` | `#D0D5DD` | secondary border |
| `gray-500` | `#667085` | secondary text |
| `gray-900` | `#101828` | primary text |
| `white` | `#FFFFFF` | card/sheet/input |
| `red-500` | `#EF4444` | error/danger |
| `green-600` | `#16A34A` | success |
| `amber-500` | `#F59E0B` | warning/pending |

### Semantic

| Token | Value |
| --- | --- |
| `brand.primary` | `blue-500` |
| `brand.primaryHover` | `blue-700` |
| `surface.page` | `gray-50` |
| `surface.card` | `white` |
| `surface.soft` | `blue-50` |
| `text.primary` | `gray-900` |
| `text.secondary` | `gray-500` |
| `border.default` | `#E7ECF3` |
| `status.error` | `red-500` |
| `status.success` | `green-600` |
| `status.warning` | `amber-500` |

## 4. Typography

ใช้ system font / Inter-like sans-serif.

| Style | Size | Line height | Weight | Usage |
| --- | ---: | ---: | ---: | --- |
| Display / Brand | 24-26 | 1.05 | 950 | QXwap logo |
| Screen title | 22-24 | 1.1 | 950 | Feed/Shop/Profile heading |
| Card title | 14-17 | 1.16-1.22 | 950 | Product title |
| Body | 13-14 | 1.35 | 700 | Content |
| Meta | 11-12 | 1.3 | 800 | Owner/city/helper |
| Chip label | 10.5-12 | 1 | 900 | badges/tags |
| Nav label | 9.5-10 | 1 | 900 | bottom nav |

Rules:

- ห้ามใช้ text ใหญ่หลายจุดใน card เดียว
- Product name ใหญ่สุดใน card
- Match / condition / metadata ต้องรองลงมา
- CTA ต้องอ่านง่ายและ contrast ผ่าน

## 5. Icon System

ใช้ icon line style เดียวกันทั้งแอป:

- Stroke width: 2.25px
- Icon size: 20-24px
- Nav icon: 21px
- Action icon button: 42-44px touch area
- Floating add button: 56px

Required icons:

- Search
- Bell / notification
- User
- Home / Feed
- Bag / Shop
- Plus / Add
- Inbox
- Bookmark
- Repeat / Xwap
- Sliders / Filter
- Truck / Shipment
- Camera / Upload
- Send / Chat
- Wallet / Credit

## 6. Layout / Spacing / Grid

### Mobile App Frame

- Primary frame: `390 x 844`
- Small mobile QA: `360 x 780`
- Large mobile QA: `430 x 932`
- Desktop preview can center the mobile app frame

### App Shell

- Topbar height: 72-78px
- Bottom nav height: 78-82px
- Main content bottom padding: 120px minimum
- Horizontal page padding: 14-20px
- Safe area bottom must be supported

### Card Rules

- Card radius: 20-24px
- Large card radius: 28px
- Product image radius: 16-18px
- Card gap: 10-14px
- Section gap: 12-16px
- Touch target minimum: 44px

### Shop Grid

- 2 columns on mobile
- Gap: 10-14px
- Product image aspect ratio: 1:1
- Card content order:
  1. Image
  2. Product title
  3. Owner / shop
  4. Wanted preview
  5. Price / credit + Xwap button

## 7. Responsive Requirements

| Width | Behavior |
| --- | --- |
| 360px | no horizontal scroll, tighter gaps, text clamp required |
| 390px | primary target, all main flows must pass |
| 430px | same layout, slightly more breathing room |
| tablet/desktop | mobile frame centered unless building web-expanded layout |

Rules:

- No card content should create horizontal scroll
- Long Thai text must clamp or wrap cleanly
- Bottom nav must not cover primary CTA permanently
- Sheet/modal max-height should be under 80vh

## 8. Component States

Required states for final design:

| Component | States |
| --- | --- |
| PrimaryButton / XwapButton | default, hover, pressed, disabled, loading |
| SecondaryButton | default, hover, pressed, disabled |
| IconButton | default, active, disabled, notification badge |
| BottomNavItem | default, active, pressed |
| ProductCard | default, saved, loading image, owner, non-owner |
| WantedTag | default, selected, pressed |
| FilterChip | default, selected, disabled |
| Input | default, focus, filled, error, disabled |
| Sheet / Modal | open, closing, loading, error |
| OfferCard | pending, accepted, rejected, cancelled, confirmed |
| EmptyState | guest, no data, search empty, error retry |

## 9. Image Rules

- Product image is always square 1:1 in Shop
- Feed can use larger feature layouts but must remain scrollable
- Use object-fit: cover
- Show fallback placeholder if image missing
- Profile avatar must be circular
- Shipment proof image should show timestamp/status in the flow

## 10. Final QA Checklist

ก่อนถือว่า Design Final ผ่าน:

- Feed อ่านออกใน 390px
- Shop grid ไม่แตกและไม่มีปุ่มซ้อนปุ่ม
- Product detail CTA ชัด
- Xwap action ชัดทุกที่
- Search/filter ใช้งานได้ด้วยนิ้ว
- Login nudge ไม่บัง content หลักจนอ่านไม่ได้
- Bottom nav ไม่ทับ card/action สำคัญ
- Empty/error states มี CTA
- Owner/non-owner controls ดูแยกกัน
- สี primary / disabled / error แยกออกชัด
- Text contrast ผ่านสำหรับพื้นขาวและพื้นฟ้า
- ไม่มี horizontal scroll ที่ 390px

## 11. Figma Deliverable Structure

ใน Figma ควรแยกเป็น pages:

1. Cover
2. Design Tokens
3. Components
4. Final UI Screens
5. Mobile User Flows
6. Happy / Unhappy Cases
7. Prototype
8. Dev Handoff

Component naming:

- `QXwap/Button/Primary`
- `QXwap/Button/Xwap`
- `QXwap/Nav/BottomItem`
- `QXwap/Card/Product`
- `QXwap/Card/FeedRecommendation`
- `QXwap/Sheet/Offer`
- `QXwap/Input/Text`
- `QXwap/Chip/WantedTag`

Variant naming:

- `state=default|pressed|disabled|loading|selected|error`
- `size=sm|md|lg`
- `tone=primary|neutral|danger|success|warning`

