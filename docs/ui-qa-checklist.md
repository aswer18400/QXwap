# QXwap Frontend UI Click-Through QA Checklist

Use this checklist when verifying owner gating, search/filter, and profile photo persistence through the actual frontend UI before staging deploy.

Estimated time: 25-35 minutes for all three sections.

## Setup (one time)

### 1. Start API

```bash
cd <repo-root>
PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev
```

Wait for `http://localhost:8787` ready log. Open `http://localhost:8787/api/health` in any tab and confirm `database: "connected"` and `required_tables === required_tables_expected`.

### 2. Start Web

In a second terminal:

```bash
cd <repo-root>
PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0
```

Wait for Vite ready log.

### 3. Open two browser sessions at 390px

- Window A: Chrome normal mode at `http://localhost:5173`
- Window B: Chrome incognito at `http://localhost:5173`

Both windows: DevTools (Cmd+Opt+I) -> toggle device toolbar (Cmd+Shift+M) -> set "iPhone 12 Pro" or custom 390x844.

### 4. Create two accounts

In Window A:
- Tap login -> signup -> email `qa-owner@qxwap.app` / password `password123`
- Confirm landing on Feed with avatar in top right

In Window B (incognito):
- Tap login -> signup -> email `qa-other@qxwap.app` / password `password123`
- Confirm landing on Feed with avatar in top right

---

## Section 1: Owner Gating (Edit/Delete visibility)

Goal: Verify owner sees Edit/Delete on own items, non-owner and guest do not, and the API rejects forbidden actions.

### 1.1 Owner creates an item (Window A)

- [ ] Tap `+` (Add) in bottom nav -> Add Product screen opens
- [ ] Choose deal type `Swap` icon card
- [ ] Title: `QA Owner Item 001`
- [ ] Description: `owner-gating test`
- [ ] Category: `Other`
- [ ] Condition: `Good`
- [ ] Wanted text: `something fair`
- [ ] Add wanted tag: `qa_test` (via `+`)
- [ ] Tap `Save` or equivalent submit
- [ ] **Expected:** App auto-navigates to detail screen of the new item; Feed/Shop refresh contains the new item

### 1.2 Owner sees Edit/Delete on Detail (Window A)

- [ ] On the Detail of `QA Owner Item 001`, scroll down past `อยากได้` and `owner-panel`
- [ ] **Expected:** Two buttons visible: `แก้ไข` (Edit) and `ลบ` (Delete)
- [ ] **Expected:** No `Xwap` button on this item

### 1.3 Owner can Edit successfully (Window A)

- [ ] Tap `แก้ไข`
- [ ] Change title to `QA Owner Item 001 v2`
- [ ] Tap Save
- [ ] **Expected:** Return to detail with updated title; no error toast

### 1.4 Non-owner does NOT see Edit/Delete (Window B)

- [ ] In Window B, go to Shop tab; search for `QA Owner Item 001 v2`
- [ ] Tap the card to open Detail
- [ ] **Expected:** No `แก้ไข` and no `ลบ` buttons
- [ ] **Expected:** `Xwap` button visible at the bottom

### 1.5 Non-owner Edit attempt is blocked by API (Window B, optional)

Open DevTools Network tab in Window B, then run in Console:

```js
fetch('/api/items/<ITEM_ID>', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'HACK' }) }).then(r => r.status)
```

Replace `<ITEM_ID>` with the id from URL or `localStorage`. **Expected:** status `403`.

### 1.6 Non-owner Delete attempt is blocked by API (Window B, optional)

```js
fetch('/api/items/<ITEM_ID>', { method: 'DELETE', credentials: 'include' }).then(r => r.status)
```

**Expected:** status `403`. Then refresh Window A and confirm the item still exists.

### 1.7 Guest does NOT see Edit/Delete

- [ ] Open a third tab incognito (or sign out from Window B)
- [ ] Find the same item from Shop
- [ ] Open Detail
- [ ] **Expected:** No Edit/Delete; tapping `Xwap` shows the login prompt instead of opening Offer sheet

### 1.8 Owner can Delete (Window A)

- [ ] Back to Window A detail of `QA Owner Item 001 v2`
- [ ] Tap `ลบ` -> confirm
- [ ] **Expected:** Navigates back; Feed and Shop no longer show that item
- [ ] **Expected:** Window B refresh -> item gone

If 1.4 or 1.7 fails (Edit/Delete leaking to non-owner): block deploy, capture screenshot of Detail in Window B, and re-check `item.viewer.is_owner` server response with `curl /api/items/<id>` from Window B's session cookie.

---

## Section 2: Search / Filter

Goal: Verify search input, category rail, FilterSheet options, wanted-tag deep link, and combinations.

Use Window A (signed in) at 390px on Shop screen for all of section 2 unless noted.

### 2.1 Seed two distinctive items

Repeat Section 1.1 to create two items as Window A user:
- `QA SHOP A Vintage Camera` in category `Electronics`, condition `Good`, deal `Swap`, wanted text `เลนส์มือสองสภาพดี`, tags `qa_lens`, `เลนส์`
- `QA SHOP B Mountain Bike` in category `Sports`, condition `Fair`, deal `Sell`, price 4500, no open-to-offers, wanted text `เงินสด`, tags `bike`

### 2.2 Search by title

- [ ] In Shop search box, type `QA SHOP A`
- [ ] Wait ~300ms for debounce
- [ ] **Expected:** Only the Vintage Camera card shows; counter at top shows `1 รายการ`

### 2.3 Search by description

- [ ] Clear search; type `alloy frame`
- [ ] **Expected:** Mountain Bike shows (if seeded with that description) OR matches if you used the suggested description

### 2.4 Search by wanted text in Thai

- [ ] Clear search; type `เลนส์มือสอง`
- [ ] **Expected:** Vintage Camera shows

### 2.5 No-match search returns empty state

- [ ] Type `QXWAP_NEVER_EXISTS_XYZ`
- [ ] **Expected:** `ยังไม่เจอสินค้าที่ตรงเงื่อนไข...` empty message shows; counter `0 รายการ`

### 2.6 Category rail filter

- [ ] Clear search
- [ ] Tap `Electronics` in category rail
- [ ] **Expected:** Only Electronics items show; pressed state visible (`✓` prefix)
- [ ] Tap `ทั้งหมด`
- [ ] **Expected:** Full list returns

### 2.7 Search + category combination (AND)

- [ ] Search `QA SHOP A`
- [ ] Tap `Electronics` in category rail
- [ ] **Expected:** Vintage Camera shows
- [ ] Tap `Sports`
- [ ] **Expected:** Empty state (AND filter: A is not Sports)

### 2.8 FilterSheet condition + deal_type + wanted_tag

- [ ] Tap `ตัวกรอง` button (top right of Shop)
- [ ] In sheet: Condition = `Fair`, Deal type = `ขายเป็นเงินสด`, Wanted = `bike`, Min price `4000`, Max price `5000`
- [ ] Tap `ใช้ตัวกรอง`
- [ ] **Expected:** Filter button shows count (>=4); Mountain Bike only

### 2.9 Filter sort: price desc

- [ ] Re-open `ตัวกรอง`
- [ ] Clear with `ล้างตัวกรอง`
- [ ] Sort = `ราคาสูงไปต่ำ`
- [ ] Apply
- [ ] **Expected:** Items reorder; most expensive on top

### 2.10 Wanted tag deep link

- [ ] Clear filters
- [ ] Go to Feed or any Detail page that shows a wanted tag chip
- [ ] Tap a wanted tag chip (e.g., `#qa_lens` from Vintage Camera detail)
- [ ] **Expected:** App switches to Shop; search input filled with `qa_lens`; filter applies; matching item highlighted

### 2.11 Following chip (if you follow someone)

- [ ] Open FilterSheet -> chip `เฉพาะคนที่ติดตาม`
- [ ] **Expected:** If you do not follow anyone, list becomes empty; if you follow someone, only their items show

### 2.12 Clear filters

- [ ] Open FilterSheet -> `ล้างตัวกรอง` -> apply
- [ ] **Expected:** All Shop items return; filter button no longer shows count

If any section 2 step fails: capture URL query string (look at Network tab `GET /api/items?...`), capture the response item count, and note which filter combination misbehaved.

---

## Section 3: Profile Photo Persistence

Goal: Verify profile photo survives upload -> save -> page refresh -> sign out -> sign in.

Use Window A signed in as `qa-owner@qxwap.app`.

### 3.1 Open profile settings

- [ ] Bottom nav -> Profile tab
- [ ] Tap `Settings` (or settings tab in profile menu)
- [ ] **Expected:** File input visible with label `อัปโหลดรูปโปรไฟล์`

### 3.2 Upload an image

- [ ] Click file input -> choose any local jpg/png (use a recognizable image you can spot)
- [ ] **Expected:** No upload happens yet; the file is queued

### 3.3 Save profile

- [ ] Tap `บันทึกโปรไฟล์`
- [ ] **Expected:** Network tab shows `POST /api/upload` -> 200 then `PATCH /api/profiles/me` -> 200
- [ ] **Expected:** Avatar in profile header updates to the uploaded image
- [ ] **Expected:** Avatar in top bar also updates

### 3.4 Persistence after refresh

- [ ] Hard refresh (Cmd+Shift+R)
- [ ] **Expected:** Avatar still the uploaded image; no fallback Dicebear avatar

### 3.5 Persistence after sign out + sign in

- [ ] Sign out from Profile menu or Topbar
- [ ] **Expected:** Returned to guest view
- [ ] Sign in again as `qa-owner@qxwap.app` / `password123`
- [ ] **Expected:** Avatar immediately shows the uploaded image; both topbar and profile header

### 3.6 Cross-session visibility (Window B)

- [ ] In Window B (signed in as `qa-other`), navigate to `qa-owner` public profile
  - From Detail of any owner item -> tap owner panel name/avatar; or from Feed if the owner item appears
- [ ] **Expected:** Public profile shows the uploaded avatar (not Dicebear)

### 3.7 Inspect storage path

- [ ] DevTools Network tab -> filter to `me`
- [ ] Inspect `GET /api/profiles/me` response
- [ ] **Expected:** `profile.avatar_url` starts with `/uploads/` in dev (or full Supabase URL if SUPABASE_URL env was set)

If 3.4 or 3.5 fails (avatar reverts after refresh/re-login): block deploy. Capture the avatar_url from `GET /api/profiles/me` response before and after refresh, and check `apps/api/uploads/` (or Supabase bucket) for the actual file.

---

## Reporting Template

After running all three sections, fill in below and commit to `docs/qa-results-YYYY-MM-DD.md`.

```text
QXwap Frontend UI QA - <DATE>

Section 1 Owner Gating:           PASS / FAIL
  - 1.4 non-owner detail:         PASS / FAIL
  - 1.5 non-owner PATCH 403:      PASS / FAIL
  - 1.6 non-owner DELETE 403:     PASS / FAIL
  - 1.7 guest no Edit/Delete:     PASS / FAIL
  - 1.8 owner delete:             PASS / FAIL

Section 2 Search/Filter:          PASS / FAIL
  - 2.2 search title:             PASS / FAIL
  - 2.4 search Thai wanted_text:  PASS / FAIL
  - 2.7 search + category AND:    PASS / FAIL
  - 2.8 FilterSheet combo:        PASS / FAIL
  - 2.10 wanted tag deep link:    PASS / FAIL

Section 3 Profile Photo:          PASS / FAIL
  - 3.4 refresh persistence:      PASS / FAIL
  - 3.5 signout/signin persist:   PASS / FAIL
  - 3.6 cross-session visible:    PASS / FAIL

Blockers found: <list, with reproduction>
Screenshots: docs/qa-YYYY-MM-DD-*.png
Notes: <any quirks not blocking>
```

## After All Three Pass

1. Update `docs/manual-qa.md` -> tick the relevant checkboxes (lines 17-19 search/filter, lines 29-31 profile/owner)
2. Update `AI_START_HERE.md` -> remove items 2, 3, 4 from `Current Known Next Work`
3. Proceed to Supabase bucket setup + staging deploy
