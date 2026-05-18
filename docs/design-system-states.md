# QXwap Design System & States

เอกสารนี้กำหนดระบบชิ้นส่วน UI ที่ใช้ซ้ำใน QXwap สำหรับทำ Figma component library และนำกลับไปใช้ในโค้ด frontend.

## 1. Design System Scope

Design System ของ QXwap ต้องครอบคลุม:

- Components: Button, Input, Card, Navbar, Sheet, Modal, Product Card
- Variants: size, tone, selected, active, owner/non-owner
- States: default, hover, pressed, focus, disabled, loading, empty, error, success
- Typography styles
- Color styles
- Spacing, radius, and shadow tokens
- Layout/touch target rules

## 2. Color Styles

### Brand

| Style | Token | Value | Usage |
| --- | --- | --- | --- |
| Brand / Primary | `brand.primary` | `#2F7BFF` | Xwap button, active nav, primary CTA |
| Brand / Dark | `brand.primaryHover` | `#0B63CE` | pressed/hover primary |
| Brand / Soft | `brand.soft` | `#EAF3FF` | selected chip, active nav bg |

### Surface

| Style | Token | Value | Usage |
| --- | --- | --- | --- |
| Surface / Page | `surface.page` | `#F7F8FA` | app background |
| Surface / Card | `surface.card` | `#FFFFFF` | cards, sheets, inputs |
| Surface / Muted | `surface.muted` | `#F2F4F7` | neutral chips, subtle panels |

### Text

| Style | Token | Value | Usage |
| --- | --- | --- | --- |
| Text / Primary | `text.primary` | `#101828` | titles, price, strong labels |
| Text / Secondary | `text.secondary` | `#667085` | helper text, owner meta |
| Text / Inverse | `text.inverse` | `#FFFFFF` | primary button text |

### Status

| Style | Token | Value | Usage |
| --- | --- | --- | --- |
| Status / Success | `status.success` | `#16A34A` | confirmed, completed |
| Status / Warning | `status.warning` | `#F59E0B` | pending, waiting |
| Status / Error | `status.error` | `#EF4444` | rejected, failed, danger |

## 3. Typography Styles

| Figma Style | CSS Usage | Size | Weight | Line height |
| --- | --- | ---: | ---: | ---: |
| Display / Brand | QXwap logo | 24-26 | 950 | 1.05 |
| Heading / Screen | screen title | 22-24 | 950 | 1.1 |
| Heading / Section | section heading | 18-20 | 900 | 1.15 |
| Title / Card | product title | 14-17 | 950 | 1.16-1.22 |
| Body / Default | normal content | 13-14 | 700 | 1.35 |
| Label / Strong | button/chip label | 11-13 | 900 | 1 |
| Caption / Meta | owner/helper/meta | 10.5-12 | 800 | 1.3 |
| Nav / Label | bottom nav | 9.5-10 | 900 | 1 |

Rules:

- Product title is the highest priority text inside product cards.
- Metadata and match text must never compete with the product title.
- Long Thai text should clamp to 1-2 lines in cards.

## 4. Spacing / Radius / Shadow Tokens

### Spacing Scale

| Token | Value | Usage |
| --- | ---: | --- |
| `space-1` | `4px` | micro gap, icon alignment |
| `space-2` | `8px` | chip gap, compact rows |
| `space-3` | `12px` | compact card padding |
| `space-4` | `16px` | default card/form padding |
| `space-5` | `20px` | section inner gap |
| `space-6` | `24px` | page block spacing |
| `space-8` | `32px` | large grouped sections |
| `space-10` | `40px` | hero/package spacing |

### Radius Scale

| Token | Value | Usage |
| --- | ---: | --- |
| `radius-xs` | `12px` | icon button, tiny controls |
| `radius-sm` | `16px` | input, search, compact control |
| `radius-md` | `18px` | media, inner cards |
| `radius-lg` | `20px` | normal cards |
| `radius-xl` | `24px` | large product/feed cards |
| `radius-pill` | `30px` | CTA pill, large action |
| `radius-modal` | `32px` | phone frame, sheet/modal |
| `radius-full` | `999px` | avatar, chip, circular controls |

### Shadow Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `shadow-soft` | `0 8px 22px rgba(16,24,40,.06)` | subtle list/surface lift |
| `shadow-card` | `0 14px 32px rgba(35,50,90,.09)` | product card, feed card |
| `shadow-raised` | `0 18px 42px rgba(32,45,85,.16)` | elevated card/modal |
| `shadow-primary` | `0 12px 28px rgba(23,107,255,.28)` | Xwap/primary button |
| `shadow-sheet` | `0 -18px 46px rgba(16,24,40,.18)` | bottom sheet |
| `shadow-nav` | `0 -10px 28px rgba(16,24,40,.10)` | sticky bottom nav |

### Animation / Transition Tokens

Source files:

- `apps/web/src/styles/animations.css`
- `apps/web/src/styles/layout.css`
- `apps/web/src/design-system/qxwap-design-tokens.css`
- `apps/web/src/design-system/qxwap-components.css`

| Token / Pattern | Value | Usage |
| --- | --- | --- |
| `motion-fast` | `140ms` | hover, active, color/background transition |
| `motion-base` | `220ms` | standard UI transition and screen entry target |
| `motion-slow` | `320ms` | spinner/loading and slower visible motion |
| `ease-standard` | `cubic-bezier(.2,.8,.2,1)` | default product easing |
| `screen-rise` | `rise 0.22s ease` | screen entry from opacity 0 + translateY(8px) |
| `button-pressed` | `translateY(1px)` | active/pressed feedback without layout shift |
| `loading-spin` | `qx-spin 320ms linear infinite` | loading indicator |

Rules:

- Motion must never block vertical scroll on mobile.
- Prefer opacity/transform over layout-affecting animation.
- Keep button size stable in loading state.
- Honor `prefers-reduced-motion: reduce` by disabling non-essential transitions/animations.

## 5. Core Components

### Button / Primary

Purpose: main app action.

Variants:

- `type=primary`
- `type=xwap`
- `type=danger`
- `type=secondary`
- `size=sm|md|lg`

States:

- default: blue bg, white text
- hover: darker blue
- pressed: darker blue, lower shadow
- focus: blue focus ring
- disabled: gray bg, muted text, no shadow
- loading: spinner + disabled interaction

Figma naming:

- `QXwap/Button/Primary`
- `QXwap/Button/Xwap`
- `QXwap/Button/Secondary`

### IconButton

Purpose: search, notification, profile, filter, save.

Variants:

- `icon=search|notification|user|feed|shop|add|inbox|save|xwap|filter|close|shipment|proof|send|wallet|credit|edit|delete|verified|package`
- `state=default|active|disabled`
- `badge=true|false`

States:

- default: white bg, light border
- active: blue soft bg, blue icon
- focus: visible ring
- disabled: low opacity

Minimum touch target: 42-44px.

### Icon Set

Source: `lucide-react` imports in `apps/web/src/**`.

Naming convention:

- Figma component: `Icon / Search`, `Icon / Notification`, `Icon / Xwap`
- Code import: use the lucide React export, for example `Search`, `Bell`, `HeartHandshake`
- SVG export: lowercase kebab names, for example `icon-search.svg`, `icon-notification.svg`, `icon-xwap.svg`

Required icons:

| Figma name | Code icon | Usage |
| --- | --- | --- |
| `Icon / Search` | `Search` | topbar, search sheet, shop |
| `Icon / Notification` | `Bell` | notification/offers entry |
| `Icon / User` | `User` | profile/avatar fallback |
| `Icon / Feed` | `Home` | bottom nav feed |
| `Icon / Shop` | `ShoppingBag` | bottom nav shop |
| `Icon / Add` | `Plus` | bottom nav add |
| `Icon / Inbox` | `Inbox` | bottom nav inbox |
| `Icon / Save` | `Bookmark`, `BookmarkCheck` | save/bookmark |
| `Icon / Xwap` | `HeartHandshake` | Xwap action |
| `Icon / Filter` | `SlidersHorizontal` | filter button/sheet |
| `Icon / Close` | `X` | sheet/modal close |
| `Icon / Shipment` | `Truck` | logistics/instant swap |
| `Icon / Proof` | `Camera` | pickup/delivery proof |
| `Icon / Send` | `Send` | offer/chat submit |
| `Icon / Wallet` | `WalletCards` | credit/wallet |
| `Icon / Credit Reward` | `Gift` | credit card/rewards |
| `Icon / Edit` | `Edit3` | owner edit |
| `Icon / Delete` | `Trash2` | owner delete |
| `Icon / Verified` | `CheckCircle2` | trust/success |
| `Icon / Package` | `PackageCheck` | deal/shipment status |

Rules:

- Use 24px viewBox for exported SVGs.
- Default stroke width is 2px to 2.25px.
- Nav icon visual size is 21px.
- Inline helper icons may be 16-18px.
- Decorative icons use `aria-hidden`.
- Icon-only controls require `aria-label`.

### Input / Text Field

Purpose: login, search, add product, profile edit.

Variants:

- `type=text|email|password|number|search`
- `state=default|focus|filled|error|disabled`

States:

- default: white bg, border default
- focus: blue border/ring
- filled: primary text
- error: red border + error message
- disabled: muted surface + muted text

### SearchBar

Purpose: global search / shop search.

Variants:

- `context=feed|shop|sheet`
- `mode=profile|product`

States:

- empty
- typing
- results
- no results
- loading

Interaction:

- Tap opens search sheet or focuses input.
- Query can route to profile results or product results.

### BottomNav

Items:

- Feed
- Shop
- Add
- Inbox
- Profile

States:

- default
- active
- pressed
- badge notification
- disabled only if feature unavailable

Rules:

- Add button is visually elevated.
- Bottom nav must not block content; main content needs bottom padding.

### ProductCard / Shop

Purpose: compact marketplace product card.

Required content:

- product image 1:1
- condition badge
- product title
- owner avatar/name
- wanted preview
- price/credit/open offer
- save button
- Xwap button

Variants:

- `layout=grid`
- `saved=true|false`
- `owner=true|false`
- `deal=swap|sell|buy|both`

States:

- default
- image loading
- saved
- pressed/opening detail
- owner controls available
- disabled offer for restricted user

### ProductCard / Feed Recommendation

Purpose: AI recommended swap card.

Required content:

- owner profile
- item image
- product title
- deal badge
- match score
- wanted tags
- save
- Xwap CTA

Variants:

- `match=high|medium|low`
- `login=guest|registered`
- `offerStatus=none|pending|accepted`

States:

- default
- saved
- loading
- empty recommendation
- login required

### Card / Base

Purpose: shared card container.

Variants:

- `type=flat|raised|interactive|status`
- `radius=md|lg|xl`

States:

- default
- hover
- pressed
- selected
- disabled

### Chip / Filter

Purpose: categories, filters, wanted tags.

Variants:

- `type=category|wanted|status|deal`
- `selected=true|false`

States:

- default
- selected
- pressed
- disabled

### Sheet / BottomSheet

Purpose: offer flow, filters, auth, search.

Variants:

- `type=offer|filter|auth|search`
- `height=content|medium|full`

States:

- open
- loading
- error
- success
- closing

Accessibility:

- Use dialog role.
- Trap focus when open.
- Close button has accessible label.
- Backdrop closes only non-destructive sheets.

#### OfferSheet

Code path: `apps/web/src/sheets/OfferSheet.tsx`

Purpose: lets a non-owner send an Xwap offer for a target item.

States:

- `item`: user selects one or more owned items.
- `cash`: user adds cash amount.
- `credit`: user adds Manu Credit amount.
- `message`: user sends message-only offer.
- `no-item`: user has no listings but can still offer message/cash/credit.
- `login-required`: guest sees login prompt.
- `restricted`: level 4/restricted user can view only.
- `own-item`: owner cannot Xwap their own item.
- `sent`: success status after submit.
- `error`: API failure.

#### FilterSheet

Code path: `apps/web/src/sheets/FilterSheet.tsx`

Purpose: controls Shop search/filter state.

States:

- `open`: sheet visible with current filter values.
- `applied`: active filters are saved into shared filter state.
- `cleared`: resets to `emptyFilters`.
- `error`: reserved for future API/filter sync failure.

#### AuthModal

Code path: `apps/web/src/sheets/AuthModal.tsx`

Purpose: authenticates user from protected journeys without losing context.

States:

- `login`: sign in with email/password.
- `register`: sign up with email/password.
- `error`: invalid credentials/API error.
- `loading`: recommended button state while request is in flight.

#### SearchSheet

Code path: `apps/web/src/sheets/SearchSheet.tsx`

Purpose: separates product search from profile/shop search.

States:

- `products`: query routes to Shop search.
- `profiles`: queries `/api/profiles?q=...`.
- `results`: shows matching profiles.
- `empty`: no matching profiles.
- `loading`: recommended debounce/loading visual while searching.

### Modal / Auth

Purpose: login/register prompt.

States:

- signin
- signup
- loading
- invalid credentials
- network error
- success

Rules:

- Invalid login returns visible error, not silent failure.
- CTA copy: `เข้าสู่ระบบเพื่อใช้งานคิวสวิฟต์`

### EmptyState

Purpose: no data states.

Variants:

- no feed items
- no shop results
- no offers
- no notifications
- no saved items
- no wallet transactions

States:

- empty
- error
- retrying

Required:

- short title
- one useful sentence
- one CTA

### LoadingState

Variants:

- full screen
- card skeleton
- button spinner
- sheet loading

Rules:

- Keep layout height stable.
- Do not shift cards after loading.

### ErrorState

Variants:

- API error
- upload error
- auth error
- offer submit error
- offline

Required:

- clear human message
- retry action when possible
- no raw stack traces in UI

### StatusBadge

Offer/deal statuses:

- pending
- accepted
- rejected
- cancelled
- confirmed
- shipping
- completed

Rules:

- Each status needs color, label, and icon if possible.
- Status badge must not be the primary CTA.

## 6. State Matrix

| State | Visual treatment | Interaction |
| --- | --- | --- |
| Default | normal contrast | enabled |
| Hover | slightly darker or raised | desktop only |
| Pressed | lower shadow / darker bg | tap feedback |
| Focus | visible blue ring | keyboard/accessibility |
| Disabled | gray bg, muted text | no action |
| Loading | spinner/skeleton | block duplicate submit |
| Empty | friendly blank state | CTA to next step |
| Error | red text/border + retry | recoverable |
| Success | green/status confirmation | continue flow |
| Selected | blue soft or dark chip | active filter/nav |

## 7. Accessibility Rules

- Minimum touch target: 44px.
- Focus ring must be visible on all interactive elements.
- Text contrast should pass WCAG AA for normal text.
- Icon-only buttons need aria-label.
- Sheet/modal should use dialog pattern.
- Bottom nav item must expose active state.
- Disabled buttons must not be focusable if action is impossible.
- Error messages should be tied to the field or action.

## 8. Component-to-Code Map

| Design Component | Prototype CSS / HTML | App Code Target |
| --- | --- | --- |
| App Shell | `.app`, `.topbar`, `main`, `.bottom-nav` | `apps/web/src/App.tsx`, `components/BottomNav.tsx` |
| Topbar | `.topbar`, `.brand`, `.icon-btn` | `components/Topbar.tsx` |
| Product Grid Card | `.shop-card`, `.shop-open`, `.shop-foot` | `components/ProductGridCard.tsx` |
| Feed Card | `.feed-market-card`, `.feed-market-main`, `.feed-market-xwap` | `screens/AiFeed.tsx` |
| Button | `.primary`, `.secondary`, `.danger`, `.shop-xwap` | shared Button component later |
| Sheet | `.sheet-backdrop`, `.sheet` | `sheets/*` |
| Input | `input`, `textarea`, `select` | forms/screens |
| Chip / Tag | `.pill`, `.tag`, `.category-rail button` | filter/tag components |

## 9. Figma Library Setup

Create Figma pages:

1. `00 Cover`
2. `01 Tokens`
3. `02 Components`
4. `03 Component States`
5. `04 Final Screens`
6. `05 Prototype Flows`
7. `06 Dev Handoff`

Create variables:

- Color variables from section 2
- Radius: `xs=12`, `sm=16`, `md=18`, `lg=20`, `xl=24`, `pill=30`, `modal=32`, `full=999`
- Spacing: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`
- Shadow: `soft`, `card`, `raised`, `primary`, `sheet`, `nav`
- Typography styles from section 3

Component variants should use:

- `state`
- `size`
- `tone`
- `selected`
- `disabled`
- `loading`
