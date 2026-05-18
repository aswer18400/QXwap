# QXwap Prototype & Handoff

เอกสารนี้อธิบายว่า prototype ของ QXwap ทำงานอย่างไร และต้องส่งต่ออะไรให้ Developer/Figma ต่อได้อย่างเป็นระบบ.

## 1. Prototype Files

| File | Purpose |
| --- | --- |
| `docs/qxwap-interactive-prototype.html` | Interactive prototype หลัก มีปุ่มและ flow กดได้ใน browser |
| `docs/qxwap-current-ui-handoff.html` | static UI handoff สำหรับภาพรวมหน้าจอ/components |
| `docs/qxwap-journey-wireframes.html` | journey wireframes |
| `docs/qxwap-overall-journey-flow.html` | overall journey map / happy-unhappy flow |
| `docs/design-final.md` | final UI requirements |
| `docs/design-system-states.md` | components, variants, states, tokens |

Local preview:

```bash
cd <repo-root>/docs
python3 -m http.server 8099
```

Open:

```text
http://localhost:8099/qxwap-interactive-prototype.html
```

Figma package should show this as an explicit link/card, not only as a filename:

```text
Interactive Prototype:
http://localhost:8099/qxwap-interactive-prototype.html

Final Package HTML:
http://localhost:8099/qxwap-figma-final-package.html
```

## 2. Prototype Flow

Prototype ต้องรองรับ flow หลักเหล่านี้:

1. Guest opens Feed
2. Guest taps Xwap / Save / Inbox / Profile
3. Login prompt appears
4. User signs in
5. Feed loads recommendations
6. User opens Shop
7. User searches / filters products
8. User opens Product Detail
9. User taps wanted tag
10. System routes to filtered Shop results
11. User taps Xwap
12. Offer sheet opens
13. User submits item/cash/credit/message offer
14. Offer appears in Inbox
15. Owner accepts/rejects/continues to chat
16. Deal progresses to shipment
17. Shipment proof flow records pickup/delivery steps

## 3. User Flows

### Flow A: Guest Browse → Login → Xwap

```text
Feed
→ tap product / Xwap
→ auth nudge or auth modal
→ sign in
→ return to intended action
→ offer sheet
→ submit offer
→ success toast
→ Inbox / offer pending
```

Expected behavior:

- Guest can browse Feed and Shop.
- Guest cannot save, offer, chat, manage profile.
- Login copy should be short: `เข้าสู่ระบบเพื่อใช้งานคิวสวิฟต์`.

### Flow B: Shop Search + Filter

```text
Shop
→ tap search
→ enter query
→ results update
→ tap filter
→ select category/deal/wanted
→ apply
→ product grid updates
→ tap product
→ detail page
```

Expected behavior:

- Search and filters combine, not override each other.
- Category chips show selected state.
- Empty result has CTA to clear filters.

### Flow C: Add Product

```text
Add
→ login required if guest
→ choose deal type
→ fill product info
→ upload image
→ add price/credit/wanted tags
→ publish
→ product appears in Feed/Shop/Profile
```

Expected behavior:

- Upload error is visible and recoverable.
- Wanted tags show on cards/detail.
- Product list refreshes after publish.

### Flow D: Offer / Xwap

```text
Product Detail or Feed Card
→ tap Xwap
→ offer sheet
→ select my item if available
→ optional cash
→ optional credit
→ optional message
→ submit
→ success
→ sent/received offer list
```

Expected behavior:

- User with no products can still send message/cash/credit offer.
- Restricted user can view only; Xwap action disabled or blocked.
- Offer API failure shows error message.

### Flow E: Inbox → Deal → Shipment

```text
Inbox
→ Offers tab
→ open offer
→ accept/reject/cancel/confirm
→ chat
→ shipment
→ pickup photo proof
→ delivery photo proof
→ complete deal
```

Expected behavior:

- Offer status is always visible.
- Rejection requires reason.
- Shipping fee responsibility is selectable.
- Shipment proof requires photo steps in final app.

### Flow F: Profile / Shop Owner

```text
Feed/Shop owner avatar
→ public profile
→ owner shop grid
→ product detail
→ Xwap
```

Expected behavior:

- Public profile differs from my profile.
- My profile shows edit/settings/listing management.
- Other profile shows follow/shop/items.
- Owner sees Edit/Delete only for own products.

## 4. Scenario Runner

The interactive prototype includes a `Flow lab` scenario runner.

Required scenarios:

- Login → Xwap
- No item offer
- Level 4 restricted
- Upload fail
- Offer fail
- No results
- Profile shop
- Owner tools
- Credit offer
- Chat + shipment
- Auth 401
- Offline recovery

Developer should use these as manual QA paths before implementing the same behavior in production code.

## 5. Interaction Notes

### Navigation

- Top QXwap brand returns to Feed.
- Bottom nav: Feed / Shop / Add / Inbox / Profile.
- Add button is elevated and centered.
- Notification icon opens offers/notifications context.

### Feed

- Feed priority:
  1. followed users
  2. credit card
  3. AI recommendations
- Xwap CTA must be visible and primary.
- Feed should not have heavy category filters.

### Shop

- Shop is product discovery.
- Use 2-column grid.
- Product image ratio: 1:1.
- Card tap opens detail.
- Save and Xwap are separate actions.
- Avoid nested buttons.

### Product Detail

- Non-owner sees Xwap.
- Owner sees Edit/Delete.
- Wanted tags are tappable.
- Related items can be shown below.

### Login / Auth

- Guest sees soft bottom nudge.
- Protected action opens auth modal.
- Invalid login shows 401-style error message, not generic crash.

### Sheet / Modal

- Bottom sheet should not exceed 80vh.
- Primary button remains reachable.
- Backdrop closes only safe/non-destructive sheets.
- Close icon must have accessible label.

### Error / Offline

- Upload failure: show clear message and retry path.
- Offer failure: keep user input in sheet.
- Offline recovery: show offline state, then allow retry.

## 6. Assets for Developer

### Required Asset Types

- Product placeholder images
- Profile avatar placeholders
- App icon / QXwap logo
- Empty state illustration or icon
- Shipment proof placeholder
- Category icons
- Bottom nav icons

### Export Rules

- Raster images: WebP or PNG
- Icons: SVG, 24px viewBox preferred
- Avatar placeholders: square source, rendered circular
- Product thumbnails: square 1:1
- Avoid exporting text baked into images

### Naming

```text
qxwap-logo.svg
icon-search.svg
icon-xwap-repeat.svg
icon-bookmark.svg
placeholder-product.webp
placeholder-avatar-user.webp
empty-offers.svg
shipment-proof-placeholder.webp
```

## 7. Figma File Organization

Recommended pages:

1. `00 Cover`
2. `01 Design Tokens`
3. `02 Components`
4. `03 Component States`
5. `04 Final UI Screens`
6. `05 User Flows`
7. `06 Prototype`
8. `07 Dev Handoff`
9. `99 Archive`

### Frame Naming

```text
Feed / Guest
Feed / Logged In
Shop / Default
Shop / Search Results
Shop / Empty
Product Detail / Non Owner
Product Detail / Owner
Offer Sheet / Default
Offer Sheet / No Items
Inbox / Offers
Inbox / Notifications
Profile / Mine
Profile / Public
Wallet / Default
Shipment / In Progress
Auth / Sign In
Auth / Error
```

### Component Naming

```text
QXwap/Button/Primary
QXwap/Button/Xwap
QXwap/Button/Icon
QXwap/Card/ProductGrid
QXwap/Card/FeedRecommendation
QXwap/Nav/Bottom
QXwap/Sheet/Offer
QXwap/Input/TextField
QXwap/Chip/WantedTag
QXwap/State/Empty
QXwap/State/Error
```

## 8. Developer Handoff Notes

### Source of Truth

- UI behavior source: `docs/qxwap-interactive-prototype.html`
- Visual requirement source: `docs/design-final.md`
- Component/state source: `docs/design-system-states.md`
- Production app source: `apps/web`

### Implementation Rules

- Do not change backend for pure UI work.
- Do not remove upload/session/image compatibility.
- Avoid nested interactive elements such as button inside button.
- Use real button elements for actions.
- Use `aria-label` for icon-only buttons.
- Preserve mobile-first behavior at 390px.
- Keep Feed/Shop/Profile flows separate but visually consistent.

### QA Before Dev Complete

- Feed scrolls smoothly.
- Shop grid has no horizontal scroll.
- Product card opens detail.
- Save toggles state.
- Xwap opens offer flow.
- Wanted tag filters Shop.
- Guest action opens login prompt.
- Login returns user to intended journey.
- Offer failure shows error.
- Upload failure shows error.
- Owner/non-owner controls are correct.

## 9. Behavior Reference Table

| Area | User action | Expected behavior |
| --- | --- | --- |
| Feed | tap brand | go home/feed |
| Feed | tap Xwap as guest | show login modal |
| Feed | tap Xwap as user | open offer sheet |
| Shop | tap card | open product detail |
| Shop | tap save as guest | show login modal |
| Shop | tap save as user | toggle saved |
| Shop | tap Xwap | open offer sheet/login |
| Search | submit query | show product/profile results |
| Wanted Tag | tap tag | set query/filter and open Shop |
| Add | upload fail | show error, keep form |
| Offer | submit fail | show error, keep entered values |
| Inbox | accept offer | status becomes accepted |
| Inbox | reject offer | require/select reason |
| Shipment | start pickup | require pickup proof step |
| Profile | tap public owner | open public profile shop |
