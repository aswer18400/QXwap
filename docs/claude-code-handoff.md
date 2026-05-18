# QXwap Claude Code Handoff

เอกสารนี้ใช้ส่งต่อให้ Claude Code หรือ AI/dev ตัวถัดไปทำงานต่อจากสถานะล่าสุดของโปรเจกต์ QXwap.

> Low-token start: อ่าน `/AI_START_HERE.md` ก่อนเสมอ แล้วเลือก task card ใน `docs/ai-context/`.
> ไฟล์นี้เป็น archive/handoff ฉบับยาว อ่านเฉพาะเมื่อ task card ชี้มาหรือจำเป็นต้องดูประวัติละเอียด.

## 1. Project Location

Local monorepo source of truth:

```text
<repo-root>
```

GitHub repo reference:

```text
https://github.com/aswer18400/QXwap
```

Important: GitHub main is the source of truth. Do not use old local folders as canonical state.

โครงสร้างหลัก:

```text
apps/web = React/Vite frontend
apps/api = Express/Postgres API
docs = Figma/design/prototype/handoff package
```

ห้ามย้ายกลับไปโครงสร้างเก่า และห้ามแตะ backend/database ถ้างานเป็น design handoff เท่านั้น.

## 2. Start Here — Decision Tree

อ่านก่อนทำอะไร:

```
1. อ่านไฟล์นี้จบก่อน
2. เปิด free import kit หรือ HTML prototype ตรวจภาพรวม
   → docs/figma-free-import-kit/README.md
   → http://localhost:8099/qxwap-figma-final-package.html

3. ตรวจสอบ Figma MCP quota:
   ถ้า quota ยังไม่กลับมา
   → ใช้ SVG fallback: ลาก docs/figma-free-import-kit/qxwap-free-figma-import-board.svg เข้า Figma
   → วางใน page ชื่อ "00 Free Import - QXwap Board"
   → Ungroup ถ้าต้องแก้แยกชิ้น
   → ต่อ prototype links มือเองตาม flows ใน board

   ถ้า quota กลับมา → รัน scripts ตามลำดับ:
   1. docs/figma-mcp-styles-script.js
   2. docs/figma-mcp-real-components-script.js
   3. docs/figma-mcp-component-screens-script.js
   4. docs/figma-mcp-prototype-wiring-script.js
   คู่มือ: docs/figma-mcp-styles-guide.md ถึง figma-mcp-prototype-wiring-guide.md

4. หลังจากดีไซน์นิ่ง ค่อยกลับมาแก้ frontend Feed แบบ minimal patch
5. ห้ามแตะ backend/database ถ้างานเป็น design handoff
6. ห้าม deploy จนกว่าจะสั่ง
7. GitHub main is the source of truth; do not use old local folders as canonical
```

## 3. Current Focus

ช่วงล่าสุดไม่ได้แก้ production app logic เป็นหลัก แต่กำลังจัดเอกสารและ Figma package ให้ครบสำหรับ:

- Final UI Screens
- Design System
- Component States
- Prototype Flow
- Journey Maps
- Level & Role Matrix
- QA Scenarios
- Release Gates
- Decision Log
- Build Plan
- Backlog
- Data Model
- Developer Handoff

ไฟล์หลักที่ใช้ capture เข้า Figma:

```text
docs/qxwap-figma-final-package.html
```

Interactive prototype:

```text
docs/qxwap-interactive-prototype.html
```

Local preview:

```bash
cd <repo-root>/docs
python3 -m http.server 8099
```

Open:

```text
http://localhost:8099/qxwap-figma-final-package.html
http://localhost:8099/qxwap-interactive-prototype.html
```

## 4. Figma File

Target Figma file:

```text
fileKey: 3BHvaNXqmDQJsqpfanxtHL
name: QXwap Feed Redesign Concepts
```

Latest full package capture:

```text
https://www.figma.com/design/3BHvaNXqmDQJsqpfanxtHL?node-id=67-2
```

Important addendum nodes already captured:

```text
55-2 Mobile Strip - 8 Core Screens
57-2 Spacing / Radius / Shadow Tokens
60-2 Sheet / Modal Components
61-2 Design Token Source Files
63-2 Icon Components
65-2 Animation / Transition Spec
66-2 Interactive Prototype Access
67-2 Full Final Figma Package
```

Note: Figma captures are raw HTML-to-Figma frames, not true Figma component instances yet. A later pass can convert them into proper Figma components/variables.

## 5. Design System Source Files

Production-ish design system files exist here:

```text
apps/web/src/design-system/tokens.json
apps/web/src/design-system/qxwap-design-tokens.css
apps/web/src/design-system/qxwap-components.css
apps/web/src/design-system/qxwap-tailwind-preset.js
apps/web/src/design-system/components-example.html
apps/web/src/design-system/README.md
apps/web/src/design-system.ts
```

Important token coverage already added:

- Color styles
- Typography styles
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px
- Radius scale: 12 / 16 / 18 / 20 / 24 / 30 / 32 / 999px
- Shadow tokens: soft / card / raised / primary / sheet / nav
- Motion tokens: 140ms / 220ms / 320ms / cubic-bezier(.2,.8,.2,1)
- Icon system: Lucide-style SVG, 24px viewBox, 44px touch target

Figma Variables import:

```text
Source: apps/web/src/design-system/tokens.json
Guide: docs/figma-variables-import.md
Method: Tokens Studio import → push to Figma Variables
```

Important: a direct Figma MCP attempt to create variables was blocked by the Figma Starter plan MCP tool-call limit. Use Tokens Studio manually, or retry native variable creation after tool quota is available.

Figma MCP component generation:

```text
Guide: docs/figma-mcp-components-guide.md
Script: docs/figma-mcp-components-script.js
Target page: 02 Components - MCP Generated
Method: Figma MCP use_figma after quota is available
```

Important: this script is ready but has not been executed yet because the same Figma MCP Starter plan tool-call limit blocked direct Figma writes.

Figma Text Styles + Effect Styles:

```text
Guide: docs/figma-mcp-styles-guide.md
Script: docs/figma-mcp-styles-script.js
Creates: 6 Text Styles + 6 Shadow Effect Styles
Method: Figma MCP use_figma after quota is available
```

Important: this script is also ready but has not been executed yet if the Figma MCP Starter plan tool-call limit is still active.

Figma real components + variants:

```text
Guide: docs/figma-mcp-real-components-guide.md
Script: docs/figma-mcp-real-components-script.js
Target page: 02 Components - Real Variants
Creates:
- P0 Button variants
- P0 Product Card variants
- P0 Bottom Nav variants
- P1 Input variants
- P1 Sheet variants
- P2 Chip and Icon variants
Method: Figma MCP use_figma after quota is available
```

Important: run this after Figma Variables and Text/Effect Styles are created, so variable binding works in Dev Mode.

Figma component-instance screens:

```text
Guide: docs/figma-mcp-component-screens-guide.md
Script: docs/figma-mcp-component-screens-script.js
Target page: 04 Screens - Component Instances
Archive page: 99 Archive - HTML Captures
Creates: 8 mobile screens rebuilt from real component instances
Method: Figma MCP use_figma after Step 1-3 and after quota is available
```

Important: this is Step 4. It should run only after `QXwap/Button`, `QXwap/Product Card`, `QXwap/Bottom Nav Item`, `QXwap/Input`, `QXwap/Sheet`, `QXwap/Chip`, and `QXwap/Icon` component sets exist.

Figma prototype wiring:

```text
Guide: docs/figma-mcp-prototype-wiring-guide.md
Script: docs/figma-mcp-prototype-wiring-script.js
Target page: 04 Screens - Component Instances
Creates: clickable prototype hotspots, overlays, helper flow frames, and flow labels
Wires:
- Guest -> Login -> Xwap
- Feed -> Detail -> Offer Sheet
- Shop -> Search/Filter -> Detail
- Add Product -> Review -> Publish Success -> Feed
- Inbox -> Accept Offer -> Shipment
- Restricted User -> Restricted Modal
Method: Figma MCP use_figma after Step 1-4 and after quota is available
```

Important: this is Step 5. The script is ready. A direct execution attempt on 2026-05-13 was blocked by the Figma MCP Starter plan tool-call limit, not by a script syntax error. Retry after quota is available. After running it, manually set `Screen / Feed` as the prototype starting point if Figma does not set it automatically.

Free fallback when Figma MCP quota is blocked:

```text
Guide: docs/figma-free-import-kit/README.md
Import board: docs/figma-free-import-kit/qxwap-free-figma-import-board.svg
Method: drag SVG into Figma manually
Cost: free, no MCP quota
Tradeoff: imports as an editable visual board, but does not create native Variables, Components, Variants, or automatic prototype links
```

Better no-cost native Figma fallback:

```text
Guide: docs/figma-console/README.md
All-in-one script: docs/figma-console/qxwap-all-in-one.js
Variable step: docs/figma-console/s0-variables.js
Method: copy script into Figma -> Plugins -> Development -> Open Console
Cost: free, no MCP quota
Creates: native Figma Variables, Text Styles, Effect Styles, Components/Variants, Screens, and Prototype wiring
Component binding: colors bind to fill/stroke/text fill variables; key FLOAT variables bind to button height, padding, item spacing, radius, card padding, sheet radius, and pill radius
```

Important: use the console path if the user needs real Variables/Components while MCP quota is blocked. The SVG import path is only a visual fallback.

## 6. Key Docs

Main docs:

```text
docs/qxwap-figma-final-package.html
docs/qxwap-interactive-prototype.html
docs/design-final.md
docs/design-system-states.md
docs/prototype-handoff.md
docs/developer-handoff.md
docs/development-plan.md
docs/testing-launch-maintenance.md
docs/user-level-journeys.md
docs/role-based-journeys.md
docs/project-index-glossary-risk.md
docs/figma-variables-import.md
docs/figma-mcp-components-guide.md
docs/figma-mcp-components-script.js
docs/figma-mcp-styles-guide.md
docs/figma-mcp-styles-script.js
docs/figma-mcp-real-components-guide.md
docs/figma-mcp-real-components-script.js
docs/figma-mcp-component-screens-guide.md
docs/figma-mcp-component-screens-script.js
docs/figma-mcp-prototype-wiring-guide.md
docs/figma-mcp-prototype-wiring-script.js
docs/figma-free-import-kit/README.md
docs/figma-free-import-kit/qxwap-free-figma-import-board.svg
docs/figma-console/README.md
docs/figma-console/s0-variables.js
docs/figma-console/qxwap-all-in-one.js
docs/design-system-icons.md
docs/figma-free-import-kit/icon-registry.json
apps/web/src/design-system/icons.ts
```

Recent addendum HTML files:

```text
docs/qxwap-mobile-strip-addendum.html
docs/qxwap-token-scale-addendum.html
docs/qxwap-sheet-components-addendum.html
docs/qxwap-token-source-files-addendum.html
docs/qxwap-icon-components-addendum.html
docs/qxwap-animation-transition-addendum.html
docs/qxwap-prototype-access-addendum.html
```

## 7. What Was Completed Recently

Completed design/Figma package gaps:

1. Mobile Strip now has all 8 screens:
   - Feed
   - Shop
   - Detail
   - Profile
   - Add Product
   - Offer Sheet
   - Inbox
   - Wallet / Shipment

2. Added spacing/radius/shadow tokens to package and docs.

3. Added Sheet/Modal component section:
   - `OfferSheet.tsx`
   - `FilterSheet.tsx`
   - `AuthModal.tsx`
   - `SearchSheet.tsx`

4. Linked real token source files in Figma package:
   - `tokens.json`
   - `qxwap-design-tokens.css`
   - `qxwap-components.css`
   - `qxwap-tailwind-preset.js`

5. Added icon component section and naming convention:
   - Figma: `Icon / Search`
   - Code: `Search`
   - Export: `icon-search.svg`

6. Added animation/transition spec:
   - `rise 0.22s ease`
   - motion fast/base/slow
   - reduced motion rules

7. Added interactive prototype link:
   - `http://localhost:8099/qxwap-interactive-prototype.html`

8. Captured latest full package into Figma node `67-2`.

## 8. Run & Verification

## 8.1 Dev Run Commands

Use these commands when Claude Code needs to run the actual app locally, not just the docs/prototype server.

API dev server:

```bash
cd <repo-root>
PGLITE_DATA_DIR=.data/qxwap-pglite-parity pnpm --filter @workspace/api-server dev
```

Web dev server:

```bash
cd <repo-root>
PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0
```

Expected local URLs:

```text
Web: http://localhost:5173
API health: http://localhost:8787/api/health
Docs/prototype: http://localhost:8099/qxwap-figma-final-package.html
Interactive prototype: http://localhost:8099/qxwap-interactive-prototype.html
```

Notes:

- API uses `tsx watch src/server.ts`.
- Web uses Vite.
- `PGLITE_DATA_DIR=.data/qxwap-pglite-parity` keeps local parity data isolated.
- If port `5173` is busy, check existing Vite process before changing ports because the browser context may already point to `localhost:5173`.

## 8.2 Verification Already Run

Repeated verification used:

```bash
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
p=HTMLParser(); p.feed(Path('docs/qxwap-figma-final-package.html').read_text())
print('html parse ok')
PY

rg -n "^<<<<<<<|^=======|^>>>>>>>" docs/qxwap-figma-final-package.html || true
curl -I --max-time 2 http://localhost:8099/qxwap-figma-final-package.html
```

For some code-token edits, this also passed:

```bash
pnpm run typecheck
```

## 9. Important Frontend Files

Current web app structure:

```text
apps/web/src/main.tsx
apps/web/src/App.tsx
apps/web/src/design-system.ts
apps/web/src/lib/
apps/web/src/components/
apps/web/src/screens/
apps/web/src/sheets/
apps/web/src/styles/
```

Sheets that must stay represented in Figma/docs:

```text
apps/web/src/sheets/OfferSheet.tsx
apps/web/src/sheets/FilterSheet.tsx
apps/web/src/sheets/AuthModal.tsx
apps/web/src/sheets/SearchSheet.tsx
```

Core screens:

```text
apps/web/src/screens/AiFeed.tsx
apps/web/src/screens/ShopPage.tsx
apps/web/src/screens/Detail.tsx
apps/web/src/screens/AddProduct.tsx
apps/web/src/screens/InboxPage.tsx
apps/web/src/screens/Profile.tsx
apps/web/src/screens/ProfileShop.tsx
apps/web/src/screens/WalletPage.tsx
```

## 10. Backend Reminder

Backend was not the focus of the latest design/Figma work. If Claude Code resumes implementation, inspect before editing:

```text
apps/api/src/server.ts
apps/api/src/db.ts
apps/api/src/session-store.ts
apps/api/tests/api.test.ts
```

Run:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
```

## 11. Next Recommended Work

ทำตามลำดับนี้:

1. อ่าน docs/claude-code-handoff.md ก่อน (ไฟล์นี้)

2. เปิด free import kit หรือ HTML prototype ตรวจภาพรวม:
   - `docs/figma-free-import-kit/README.md`
   - `http://localhost:8099/qxwap-figma-final-package.html`

3. ตรวจสอบ Figma MCP quota:
   - ถ้า quota ยังไม่กลับมา → ใช้ SVG fallback (ดู Section 2)
   - ถ้า quota กลับมา → รัน scripts ตามลำดับ (ดู Section 5)

4. หลังจากดีไซน์นิ่ง → ค่อยกลับมาแก้ frontend Feed แบบ minimal patch:
   - ตรวจ Section 12 Known Pending UI Bugs ก่อนเสมอ
   - ตรวจ Feed product list ยังอยู่ก่อนแก้ UI ใดๆ
   - Re-check feature parity กับ `docs/feature-parity.md`

5. ห้ามแตะ backend/database ถ้างานเป็น design handoff

6. ห้าม deploy จนกว่าจะสั่ง

7. GitHub repo `https://github.com/aswer18400/QXwap` = behavior reference เท่านั้น

If continuing app implementation (after design is stable):

- Run full build/test ก่อน
- Fix database/API ถ้ายังพัง
- Prioritize: auth/session → image upload → feed/shop data → offer flow → profile → search/filter → mobile scroll

## 12. Known Pending UI Bugs

These are not done. Claude Code should treat them as open UI bugs before calling the frontend finished.

### P0: Guest AuthNudge does not cover card/action rows clearly enough

Issue:

- Guest users can still see feed card/action areas in a way that feels usable, but protected actions should be visually gated.
- The current `AuthNudge` appears as a bottom nudge, but it does not clearly create the intended thin login layer over unavailable guest actions.

Expected:

- Guest can browse Feed/Shop.
- Guest protected actions should trigger login prompt.
- Guest UI should show a subtle bottom layer/nudge around 20% of viewport, Facebook-like, without putting "login first" text inside every button.

Likely files:

```text
apps/web/src/components/AuthNudge.tsx
apps/web/src/App.tsx
apps/web/src/screens/AiFeed.tsx
apps/web/src/styles/auth.css
apps/web/src/styles/feed.css
apps/web/src/styles/responsive.css
```

### P0: Feed product card is still hard to read at 390px

Issue:

- Feed card visual hierarchy can become crowded on 390px mobile width.
- Product title, owner, deal label, match score, tags, save/action row can compete with each other.

Expected:

- Product title is always readable first.
- Deal label and `84% match` should be secondary but visible.
- Metadata and offer/action row should not fight with product image/title.
- No horizontal scroll at 390px.

Likely files:

```text
apps/web/src/screens/AiFeed.tsx
apps/web/src/components/ProductGridCard.tsx
apps/web/src/styles/feed.css
apps/web/src/styles/responsive.css
```

### P1: Card height and scroll smoothness need real mobile QA

Issue:

- Feed cards may have inconsistent heights, making scroll rhythm feel rough.
- Past UI changes risk accidental nested overflow or touch targets interfering with vertical scroll.

Expected:

- Feed scroll is smooth on Android Chrome/mobile viewport.
- Product card tap still opens detail.
- Xwap button still opens offer sheet.
- No card gesture or overlay blocks vertical scroll.
- Bottom nav must not cover final card content.

Likely files:

```text
apps/web/src/screens/AiFeed.tsx
apps/web/src/components/BottomNav.tsx
apps/web/src/styles/feed.css
apps/web/src/styles/layout.css
apps/web/src/styles/bottom-nav.css
apps/web/src/styles/responsive.css
```

### P0: Feed product list disappeared after UI edits — verify before touching

Issue:

- ในอดีตมีกรณีที่แก้ CSS/component แล้ว product card หายออกจาก Feed ทั้งหมด โดยไม่มี error
- สาเหตุอาจเป็น conditional render, empty state ที่ trigger ผิด, หรือ data dependency ที่หลุด

Expected:

- Feed ต้องแสดง product cards จากข้อมูลจริงก่อนเริ่มแก้ใดๆ
- ถ้าไม่เห็น card ให้ตรวจ API response และ state ก่อน — อย่าสรุปว่าเป็น CSS bug

Action before any Feed edit:

```bash
# เปิด API + Web แล้วตรวจว่า Feed โหลด product จริงไหม
# ถ้าหาย → debug ก่อน แก้ UI ทีหลัง
curl http://localhost:8787/api/feed | head -c 200
```

Likely files:

```text
apps/web/src/screens/AiFeed.tsx
apps/web/src/lib/
apps/api/src/server.ts
```

### P1: Guest vs logged-in layout separation is not clean enough

Issue:

- Guest state, login prompt, registered user state, and restricted user state need clearer visual separation.
- User level/status should only show when logged in.
- Protected actions should not look fully available to guests/restricted users.

Expected:

- Guest level is effectively Level 0 / Guest, but visible status labels for levels should not show until login.
- Logged-in registered users can use full feature flow unless restricted.
- Restricted users can view but cannot Xwap.
- Login prompt copy should stay short and consistent: `เข้าสู่ระบบเพื่อใช้งานคิวสวิฟต์` or protected action popup copy.

Likely files:

```text
apps/web/src/lib/format.ts
apps/web/src/components/AuthNudge.tsx
apps/web/src/screens/AiFeed.tsx
apps/web/src/screens/Profile.tsx
apps/web/src/screens/ProfileShop.tsx
apps/web/src/sheets/OfferSheet.tsx
```

## 13. Constraints

- Do not deploy unless explicitly requested.
- Do not guess real secrets.
- GitHub repo `https://github.com/aswer18400/QXwap` main is source of truth.
- Do not remove compatibility for image/upload/session.
- Do not rewrite the whole UI unless explicitly asked.
- Preserve monorepo structure.
- For documentation/Figma-only work, do not touch backend/database.
- For code edits, use minimal patches and run verification.
