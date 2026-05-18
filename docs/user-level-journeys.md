# QXwap User Level Journeys

เอกสารนี้แยก journey ตามระดับผู้ใช้งาน เพื่อไม่ให้ตกหล่น use case สำคัญของ Guest, Registered User, Credit-enabled User และ Restricted User.

## 1. User Levels

| Level | Name | Meaning | Main Permission |
| --- | --- | --- | --- |
| 0 | Guest | ยังไม่ได้เข้าสู่ระบบ | browse only |
| 1 | Registered User | เข้าสู่ระบบแล้ว | ใช้ฟีเจอร์ marketplace หลัก |
| 2 | Active QXwap User | ผู้ใช้ที่มีประวัติใช้งาน/แลกของ | เหมือน Level 1 + trust indicators |
| 3 | QServeep / Credit-enabled User | สมัคร/เปิดใช้ credit/payment แล้ว | ใช้เครดิตเพิ่มข้อเสนอ/ธุรกรรมเครดิต |
| 4 | Restricted User | ถูกจำกัดสิทธิ์โดย CMS/admin | ดูได้ แต่แลกไม่ได้ |

หมายเหตุ:

- Level 0 เห็นสถานะเป็น Guest แบบไม่ต้อง login.
- Level 1-4 เห็นสถานะของตัวเองเมื่อ login แล้วเท่านั้น.
- Level 4 ยัง login ได้และดูข้อมูลได้ แต่ต้องถูก block จาก Xwap/offer actions.

## 2. Level 0: Guest Journey

### Goal

ผู้ใช้ใหม่เข้ามาดูว่า QXwap คืออะไร และเริ่มสนใจสินค้า/การแลก.

### Happy Path

```text
Open app
→ Feed
→ browse recommendations
→ Shop
→ search product
→ Product Detail
→ tap Xwap / Save / Inbox / Profile
→ login prompt
→ sign in or sign up
→ continue intended action
```

### Allowed

- Browse Feed
- Browse Shop
- Search products
- Open Product Detail
- View public profile
- View non-sensitive product data

### Blocked

- Save/bookmark
- Send Xwap offer
- Add product
- Inbox
- Chat
- Wallet
- Edit profile
- Manage listings

### Required UI

- Soft bottom login nudge.
- Protected action opens modal: `กรุณาเข้าสู่ระบบก่อนเพื่อใช้งานต่อ`.
- Main login CTA copy: `เข้าสู่ระบบเพื่อใช้งานคิวสวิฟต์`.
- Button label should not contain long explanation.

### Edge Cases

- Guest taps Xwap from Feed.
- Guest taps Xwap from Detail.
- Guest taps Save in Shop.
- Guest taps Add.
- Guest taps Inbox.
- Guest taps Profile.
- Guest clicks wanted tag and moves to Shop.

## 3. Level 1: Registered User Journey

### Goal

ผู้ใช้ที่เข้าสู่ระบบแล้วสามารถใช้งาน marketplace และเริ่ม Xwap ได้.

### Happy Path: Browse → Xwap

```text
Login
→ Feed loads automatically
→ open product
→ tap Xwap
→ offer sheet
→ enter message/cash/credit optional
→ submit
→ Inbox sent/received
```

### Happy Path: Add Product

```text
Add
→ choose deal type
→ fill title/description/category/condition
→ upload image
→ add wanted tags
→ publish
→ item appears in Feed/Shop/Profile
```

### Allowed

- Save/bookmark
- Add/edit/delete own products
- Send offer
- Send offer even with no products using message/cash/credit
- Inbox offers
- Chat
- Edit own profile
- Follow users

### Blocked

- Edit/delete other users' products
- Admin controls
- Credit-only features if credit account is not enabled

### Required UI

- No login nudge.
- Owner controls only on own items.
- Non-owner sees Xwap.
- Profile clearly separates my profile vs public profile.

### Edge Cases

- User logs in and feed must load without refresh.
- User has no products but wants to Xwap.
- User tries to edit another person's product.
- User uploads image and upload fails.
- Offer submit fails.

## 4. Level 2: Active QXwap User Journey

### Goal

ผู้ใช้ที่มีประวัติใช้งาน เริ่มมี trust signal และ engagement มากขึ้น.

### Happy Path

```text
Login
→ Feed personalized by behavior
→ sees better match recommendations
→ sends/receives offers
→ chat
→ completes swap
→ profile signals improve
```

### Allowed

- Same as Level 1
- More visible trust indicators if available
- Fast responder / good user badge if eligible
- Higher recommendation confidence

### Required UI

- Show user status only after login.
- Public profile can show rating/fast responder/featured when available.
- Do not label this as "trust level" if product language says user level.

### Edge Cases

- User has rating but no listings.
- User has listings but poor response time.
- User follows people but no new feed items.
- User receives many offers on one product.

## 5. Level 3: QServeep / Credit-enabled User Journey

### Goal

ผู้ใช้เปิดใช้เครดิต สามารถสะสม/ใช้เครดิตเพื่อเพิ่มข้อเสนอได้.

### Happy Path: Credit Offer

```text
Login
→ Wallet / Feed credit card
→ Product Detail
→ Xwap
→ add item + credit
→ submit offer
→ wallet transaction recorded
→ offer status pending
```

### Allowed

- Same as Level 1/2
- Use credits in offers
- View wallet
- View transactions
- Earn credits from app activities/completed swaps

### Blocked / Rules

- Credits cannot be withdrawn as cash.
- Credits cannot be treated as cash payout.
- Real payment top-up should not be enabled until provider/rules are approved.

### Required UI

- Feed shows credit card.
- Credit text should be short: `แค่เริ่มสะสมเครดิต`.
- Product cards should not over-explain credit.
- Offer sheet lets user add credit amount.
- Wallet explains non-cash-withdrawal rule.

### Edge Cases

- Not enough credits.
- Credit transaction fails.
- Offer cancelled and credit needs reversal/hold release.
- Payment provider webhook fails in future phase.

## 6. Level 4: Restricted User Journey

### Goal

ผู้ใช้ถูกจำกัดสิทธิ์โดย CMS/admin: ยังดูแอปได้ แต่ทำ action เสี่ยงไม่ได้.

### Happy Path

```text
Login
→ Feed/Shop visible
→ Product Detail visible
→ tap Xwap
→ blocked prompt
→ user can continue browsing
```

### Allowed

- Browse Feed
- Browse Shop
- Search/filter
- Open Product Detail
- View public profiles
- View own profile/status

### Blocked

- Send Xwap offer
- Accept/reject/confirm offer if restriction requires
- Add product, if policy says restricted cannot list
- Chat, if restriction includes communication block
- Credit/payment actions, if account is restricted

### Required UI

- User sees restricted status only after login.
- Xwap button disabled or opens restriction modal.
- Copy should be clear, not accusatory.
- Example: `บัญชีนี้ถูกจำกัดการแลกชั่วคราว กรุณาติดต่อทีม QXwap`.

### Edge Cases

- User becomes restricted while logged in.
- User has pending offers before restriction.
- User owns listed products while restricted.
- User attempts direct API action despite disabled UI.

## 7. Cross-Level Matrix

| Feature | Guest L0 | Registered L1 | Active L2 | Credit L3 | Restricted L4 |
| --- | --- | --- | --- | --- | --- |
| Browse Feed | yes | yes | yes | yes | yes |
| Browse Shop | yes | yes | yes | yes | yes |
| Search/filter | yes | yes | yes | yes | yes |
| Product Detail | yes | yes | yes | yes | yes |
| Wanted tag click | yes | yes | yes | yes | yes |
| Save item | login required | yes | yes | yes | blocked or yes by policy |
| Add product | login required | yes | yes | yes | blocked |
| Edit own product | no | yes | yes | yes | blocked or limited |
| Xwap offer | login required | yes | yes | yes + credit | blocked |
| Offer with no products | login required | yes | yes | yes | blocked |
| Inbox | login required | yes | yes | yes | read-only or limited |
| Chat | login required | yes | yes | yes | blocked or read-only |
| Wallet | login required | basic | basic | full | blocked/read-only |
| Admin/CMS | no | no | no | no | no |

## 8. Required Error / Unhappy Journeys

### Auth

```text
Guest protected action
→ login modal
→ invalid credentials
→ visible 401-style error
→ retry
```

### Empty Search

```text
Shop
→ search unknown term
→ no results
→ CTA clear filters
```

### Upload Fail

```text
Add product
→ upload image
→ upload fails
→ show error
→ keep form data
→ retry
```

### Offer Fail

```text
Offer sheet
→ enter item/cash/credit/message
→ submit
→ API fails
→ show error
→ keep offer data
→ retry
```

### Restricted Action

```text
Restricted user
→ tap Xwap
→ restriction modal
→ action blocked
→ user returns to browsing
```

### Offline

```text
User browsing
→ network lost
→ show offline/error state
→ retry when online
```

## 9. Design / Dev Checklist

- [ ] Every level has a defined home/feed behavior.
- [ ] Every protected action has login/restriction behavior.
- [ ] Guest copy is short and consistent.
- [ ] Level 4 cannot bypass UI through API.
- [ ] Offer with no products is supported for logged-in non-restricted users.
- [ ] Credit-only UI appears only for credit-enabled users.
- [ ] Profile level wording says user level, not trust level.
- [ ] Public profile and my profile are visually different.
- [ ] Pending offers survive user level changes.
- [ ] Admin/CMS fields exist for future restriction management.

