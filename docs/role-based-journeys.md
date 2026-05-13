# QXwap Role-Based Journeys

เอกสารนี้แยก Journey ตามบทบาทของผู้ใช้งานในระบบ เพื่อให้ไม่ตกหล่น flow ของคนแต่ละฝ่าย.

## 1. Roles

| Role | Meaning | Main Goal |
| --- | --- | --- |
| Guest | คนที่ยังไม่ login | browse และเข้าใจ QXwap |
| Buyer / Xwap Requester | คนที่สนใจสินค้าและส่งข้อเสนอ | ส่งข้อเสนอ Xwap |
| Seller / Item Owner | เจ้าของสินค้า | รับ/จัดการข้อเสนอ |
| Trader / Both-side User | คนที่ทั้งลงขายและขอแลก | จัดการทั้ง listings และ offers |
| Credit User | คนที่ใช้เครดิต | ใช้เครดิตเพิ่มข้อเสนอ |
| Courier / Pickup Partner | ผู้รับ-ส่งของ | นัดรับ ถ่ายรูปยืนยัน ส่งของ |
| Admin / CMS | หลังบ้าน | จำกัดสิทธิ์ จัดการผู้ใช้/สินค้า/เครดิต |
| Support / Moderator | ทีมช่วยเหลือ/ตรวจสอบ | รับเรื่อง แก้ dispute/moderation |

## 2. Guest Journey

```text
Open app
→ Feed
→ Shop
→ Product Detail
→ Public Profile
→ tap protected action
→ Login Prompt
→ Signup / Signin
```

Allowed:

- Browse Feed
- Browse Shop
- Search/filter
- Product detail
- Public profile

Blocked:

- Save
- Xwap
- Add product
- Inbox
- Chat
- Wallet

## 3. Buyer / Xwap Requester Journey

Goal: หาสินค้าที่สนใจแล้วส่งข้อเสนอแลก.

```text
Login
→ Feed / Shop
→ Search / filter
→ Product Detail
→ Tap Xwap
→ Offer Sheet
→ Select item if available
→ Add cash / credit / message
→ Submit offer
→ Inbox Sent
→ Wait for owner response
→ Chat / Shipment if accepted
```

Edge cases:

- Buyer has no products.
- Buyer sends cash-only offer.
- Buyer sends credit-only offer.
- Buyer cancels pending offer.
- Buyer is restricted.
- Offer API fails.

## 4. Seller / Item Owner Journey

Goal: ลงสินค้าและจัดการข้อเสนอที่เข้ามา.

```text
Login
→ Add Product
→ Upload images
→ Add wanted tags
→ Publish
→ Product appears in Feed/Shop/Profile
→ Receive offer notification
→ Inbox Received
→ Review offered items/cash/credit/message
→ Accept / Reject
→ Chat
→ Shipment / Deal complete
```

Owner-specific UI:

- Edit product
- Delete product
- View request count
- View received offers
- Accept/reject/cancel/confirm

Edge cases:

- Upload image fails.
- Product has no price but open offer.
- Seller rejects and selects reason.
- Seller is restricted after listing product.
- Seller deletes product with pending offers.

## 5. Trader / Both-side User Journey

Goal: เป็นทั้งคนลงสินค้าและคนขอแลกใน account เดียว.

```text
Login
→ Manage my listings
→ Browse other listings
→ Send offers
→ Receive offers
→ Compare sent/received in Inbox
→ Accept best match
→ Close or update listings
```

Requirements:

- Inbox must separate sent and received clearly.
- Profile must show only my listings under my profile.
- Public profile must show another user's listings.
- Owner controls must not leak to non-owner views.

## 6. Credit User Journey

Goal: ใช้ QXwap Credit เพื่อเพิ่มน้ำหนักข้อเสนอ.

```text
Login
→ Feed credit card
→ Wallet
→ View balance
→ Product Detail
→ Xwap
→ Add credit amount
→ Submit offer
→ Transaction recorded
→ Offer accepted/rejected
→ Credit hold/release or spend
```

Rules:

- Credit cannot be withdrawn as cash.
- Credit display should be visible in Feed/Wallet/Offer Sheet.
- Product card should not over-explain credit.
- If offer is cancelled/rejected, credit handling must be clear.

Edge cases:

- Not enough credit.
- Transaction failure.
- Credit reversal.
- User becomes restricted.

## 7. Courier / Pickup Partner Journey

Goal: นัดรับและส่งของสำหรับ Instant Swap.

```text
Accepted offer
→ Shipment created
→ Fee responsibility selected
→ Pickup scheduled
→ Courier arrives
→ Pickup photo proof
→ Status: picked up
→ Delivery photo proof
→ Status: delivered
→ Buyer/Seller confirm
→ Deal completed
```

Required fields:

- offer id
- pickup address/slot
- delivery address/slot
- fee responsibility
- pickup proof image
- delivery proof image
- tracking/status

Edge cases:

- Pickup failed.
- Delivery failed.
- Photo proof missing.
- User rejects received item.
- Dispute opened.

## 8. Admin / CMS Journey

Goal: จัดการระบบหลังบ้านและความปลอดภัย.

```text
Admin login
→ Dashboard
→ Review users/items/offers
→ Set user level
→ Restrict bad user
→ Moderate listing/image
→ Adjust credit
→ Review reports/disputes
→ Audit log
```

Admin actions:

- Set account level.
- Set featured/good user.
- Set fast responder.
- Restrict/unrestrict user.
- Hide/delete item.
- Adjust wallet/credit.
- Review disputes.

Requirements:

- Admin actions must be audited.
- Level 4 restriction must block both UI and API.
- Admin panel is future phase, but fields must be prepared.

## 9. Support / Moderator Journey

Goal: ช่วยเหลือผู้ใช้และจัดการปัญหา.

```text
User reports issue
→ Support opens case
→ Review user/order/offer/chat/shipment
→ Request evidence
→ Resolve or escalate
→ Notify users
→ Close case
```

Case types:

- scam / fraud concern
- shipment issue
- damaged item
- wrong item
- payment/credit concern
- abusive chat
- listing violation

Requirements:

- Support should see enough context without exposing unnecessary private data.
- Every decision should be logged.
- User-facing copy should be calm and clear.

## 10. Role Matrix

| Feature | Guest | Buyer | Seller | Trader | Credit User | Courier | Admin | Support |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Browse | yes | yes | yes | yes | yes | limited | yes | yes |
| Search/filter | yes | yes | yes | yes | yes | no | yes | yes |
| Product detail | yes | yes | yes | yes | yes | limited | yes | yes |
| Add product | no | optional | yes | yes | yes | no | no | no |
| Xwap offer | no | yes | yes | yes | yes | no | no | no |
| Receive offer | no | if owner | yes | yes | yes | no | view | view |
| Wallet/credit | no | basic | basic | basic | full | no | manage | view |
| Shipment proof | no | confirm | confirm | confirm | confirm | yes | view | view |
| Restrict user | no | no | no | no | no | no | yes | escalate |
| Moderate item | no | no | no | no | no | no | yes | escalate |

## 11. Must-Not-Miss Cases

- Guest clicks every protected action.
- Buyer has no product but sends offer.
- Seller receives multiple offers on one product.
- One user is both seller and buyer.
- Credit offer is rejected.
- User becomes restricted while offers are pending.
- Courier pickup photo is missing.
- Shipment is rejected/disputed.
- Admin restricts user and API blocks Xwap.
- Support reviews a dispute without editing live data accidentally.

