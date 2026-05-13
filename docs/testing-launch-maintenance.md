# QXwap Testing, Launch & Maintenance

เอกสารนี้สรุปงานทดสอบ ปล่อยใช้งานจริง และดูแล QXwap หลังเปิดใช้งาน.

## 1. Scope

ช่วง Testing / Launch / Maintenance ต้องครอบคลุม:

- QA Testing
- Usability Testing
- Bug Fixing
- Performance Testing
- Security Check
- Beta Test
- Web deploy / App Store / Play Store preparation
- Analytics
- User Feedback
- Version updates
- Maintenance after launch

## 2. QA Testing

### Functional QA

- [ ] App loads correctly.
- [ ] Feed loads products from real data.
- [ ] Shop loads products from real data.
- [ ] Search works.
- [ ] Filter works.
- [ ] Search + filter work together.
- [ ] Product card opens detail.
- [ ] Wanted tag click filters/searches matching items.
- [ ] Add product works.
- [ ] Image upload works.
- [ ] Product images display in Feed/Shop/Detail.
- [ ] Login works.
- [ ] Signup works.
- [ ] Signout works.
- [ ] Invalid login returns clear error.
- [ ] Profile edit saves.
- [ ] Profile photo persists after refresh/re-login.
- [ ] Save/bookmark works.
- [ ] Follow/unfollow works if available.
- [ ] Xwap opens offer flow.
- [ ] User with no products can send message/cash/credit offer.
- [ ] Offer appears in sent/received inbox.
- [ ] Accept/reject/cancel/confirm works.
- [ ] Notifications show new offers.
- [ ] Chat sends and receives messages.
- [ ] Wallet/credit balance persists.
- [ ] Shipment/deal progress updates.

### Role QA

- [ ] Guest can browse.
- [ ] Guest protected action opens login prompt.
- [ ] Registered user can use all normal features.
- [ ] Credit-enabled user can use credit features.
- [ ] Restricted user can view but cannot Xwap.
- [ ] Owner sees Edit/Delete only on own products.
- [ ] Non-owner does not see Edit/Delete.

### Mobile QA

Test sizes:

- 360 x 780
- 390 x 844
- 430 x 932

Checklist:

- [ ] No horizontal scroll.
- [ ] Feed scroll is smooth.
- [ ] Shop scroll is smooth.
- [ ] Bottom nav does not block primary content.
- [ ] Search/filter sheet fits screen.
- [ ] Offer sheet fits screen.
- [ ] Keyboard does not hide critical form buttons.
- [ ] Product card tap works on touch.
- [ ] Xwap button is easy to tap.

## 3. Usability Testing

### Test Users

Use at least:

- 3 new users who have never seen QXwap
- 2 users who often buy/sell second-hand items
- 1 user testing only on Android Chrome

### Tasks

Ask users to complete:

1. Browse Feed and explain what QXwap is.
2. Find a product in Shop.
3. Open product detail.
4. Save a product.
5. Send a Xwap offer.
6. Add product with wanted tags.
7. Check Inbox after offer.
8. Edit profile/photo.

### Observe

- Do users understand Xwap?
- Do users know what to do next?
- Are labels clear in Thai?
- Do users trust the swap flow?
- Do users notice login gate?
- Do users understand credits?
- Do users find owner/profile information?

### Success Criteria

- 80% complete Browse → Detail → Xwap without help.
- 80% understand that credits are not cash withdrawal.
- 80% understand owner/non-owner difference.
- No repeated confusion on primary CTA.

## 4. Bug Fixing Process

Bug report format:

```text
Title:
Environment:
Account role:
Steps to reproduce:
Expected:
Actual:
Screenshot/video:
Severity:
Regression risk:
```

Severity:

- P0: app unusable, data loss, auth/security issue
- P1: core flow broken, offer/product/login broken
- P2: important UI/logic bug with workaround
- P3: polish, copy, minor layout

Fix rules:

- Reproduce before fixing.
- Add test if bug is logic/API-related.
- Verify on 390px mobile after UI fix.
- Do not fix unrelated refactors in same patch.
- Retest affected journey after fix.

## 5. Performance Testing

### Frontend

Check:

- initial load time
- repeated render loops
- image loading
- scroll performance
- mobile input/sheet performance
- bundle size
- stale service worker/cache

Targets:

- No repeated Feed refresh loop.
- Smooth scroll on mobile.
- Lazy-load images.
- Stable keys by item ID.
- No blocking card swipe/touch handlers.

Tools:

- Chrome DevTools Performance
- Lighthouse
- WebPageTest
- Playwright/manual browser QA

### Backend

Check:

- API response time
- DB query performance
- image upload latency
- auth/session lookup
- offer submit latency
- notification query latency

Targets:

- `/api/health` under 200ms
- list items under 500ms for normal data size
- offer submit under 1s
- no slow N+1 owner/image queries

## 6. Security Check

Authentication:

- [ ] Passwords are hashed.
- [ ] Sessions are HttpOnly.
- [ ] Secure cookies in production.
- [ ] SameSite configured.
- [ ] Invalid login returns 401.
- [ ] Signout clears session.

Authorization:

- [ ] Only owner can edit/delete own item.
- [ ] Non-owner cannot call edit/delete API successfully.
- [ ] Restricted user cannot submit offer.
- [ ] User cannot read private data of others.

Uploads:

- [ ] Limit file size.
- [ ] Limit file type.
- [ ] Do not execute uploaded files.
- [ ] Store safe URL only.

API:

- [ ] Validate request body.
- [ ] Sanitize query params.
- [ ] No stack traces in production errors.
- [ ] CORS only allows configured frontend origin.
- [ ] Rate limit auth/offer/upload endpoints if possible.

Data:

- [ ] DATABASE_URL is not committed.
- [ ] SESSION_SECRET is not committed.
- [ ] Supabase service role key is not exposed to frontend.

## 7. Beta Test

Beta phases:

### Internal Alpha

- Team only
- Seed data
- Manual QA
- Fix P0/P1 bugs

### Closed Beta

- 10-30 users
- Real user accounts
- Real listings
- Monitor offers/uploads/login

### Public Beta

- Larger user pool
- Analytics enabled
- Feedback form
- Crash/error monitoring

Beta checklist:

- [ ] Test environment deployed.
- [ ] Seed/test accounts ready.
- [ ] Feedback channel ready.
- [ ] Known limitations documented.
- [ ] Rollback plan ready.
- [ ] Support contact ready.

## 8. Launch / Deployment

### Web Server

Frontend options:

- GitHub Pages
- Netlify
- Vercel

Backend options:

- Render
- Railway
- Fly.io
- Replit

Database:

- Supabase Postgres
- Neon Postgres
- Render Postgres

Launch checklist:

- [ ] Production env vars set.
- [ ] API health check passes.
- [ ] Frontend points to production API.
- [ ] No `/api/api` duplication.
- [ ] CORS works.
- [ ] Production cookie works.
- [ ] Upload path works.
- [ ] Service worker/cache does not serve old app.
- [ ] Rollback instructions ready.

### App Store / Play Store

For later native/WebView release:

- Prepare app icons.
- Prepare splash screen.
- Prepare screenshots.
- Prepare privacy policy.
- Prepare terms of service.
- Prepare support URL/email.
- Verify WebView login/cookie behavior.
- Verify upload from mobile camera/gallery.
- Verify push notification permission flow if enabled.

Do not submit store builds until web MVP is stable.

## 9. Analytics

Recommended events:

- app_open
- signup_start
- signup_success
- signin_success
- feed_view
- shop_view
- product_view
- product_save
- wanted_tag_click
- xwap_open
- offer_submit
- offer_accept
- offer_reject
- add_product_start
- add_product_publish
- image_upload_fail
- search_submit
- filter_apply
- profile_view
- wallet_view
- shipment_start
- chat_send

Metrics:

- browse → product detail conversion
- product detail → Xwap conversion
- Xwap open → offer submit conversion
- add product completion rate
- login prompt conversion
- offer acceptance rate
- upload failure rate
- API error rate

Privacy:

- Do not log passwords.
- Do not log full private messages unless explicitly allowed.
- Avoid exposing PII in analytics.

## 10. User Feedback

Feedback channels:

- in-app feedback form
- email/support inbox
- beta test form
- interview notes
- analytics event review

Feedback categories:

- UI confusion
- Xwap flow confusion
- trust/safety concern
- upload/image issue
- login issue
- offer/chat issue
- credit/payment concern
- bug report
- feature request

Process:

1. Collect feedback.
2. Tag by category/severity.
3. Link to screen/flow.
4. Prioritize weekly.
5. Patch high-impact issues first.
6. Update design docs if behavior changes.

## 11. Update Version

Versioning:

- `0.1.x` internal prototype/MVP
- `0.2.x` closed beta
- `0.3.x` public beta
- `1.0.0` production launch

Release notes should include:

- New features
- Fixed bugs
- Known issues
- Migration notes
- Rollback notes

Before release:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

## 12. Maintenance After Launch

Daily:

- Check API health.
- Check error logs.
- Check upload failures.
- Check auth failures.
- Check support inbox.

Weekly:

- Review analytics.
- Review user feedback.
- Review slow API queries.
- Patch P0/P1 bugs.
- Verify backup status.

Monthly:

- Dependency updates.
- Security review.
- Database index review.
- UX improvement review.
- Cost review.
- Admin/moderation review.

Incident response:

1. Confirm impact.
2. Stop rollout if needed.
3. Communicate known issue.
4. Fix or rollback.
5. Verify production.
6. Write postmortem for P0/P1.

## 13. Go / No-Go Checklist

Launch is allowed only when:

- [ ] App runs in production/staging.
- [ ] Database persists data.
- [ ] API works.
- [ ] Images work.
- [ ] Login/session works.
- [ ] Offer flow works.
- [ ] Mobile manual QA passes.
- [ ] Security checks pass.
- [ ] Critical bugs fixed.
- [ ] Rollback path exists.
- [ ] Support/feedback channel exists.

## 14. QA Scenario Matrix

| Scenario | Actor / Level | Expected UI | Expected API/Data |
| --- | --- | --- | --- |
| Protected Xwap | Guest L0 | login prompt, no dead button | no offer created |
| No Product Offer | Registered L1+ | offer sheet allows message/cash/credit | offer created with zero offer_items |
| Owner Boundary | Owner / Buyer | owner sees Edit/Delete, buyer sees Xwap | PATCH/DELETE rejects non-owner |
| Restricted User | Restricted L4 | restriction modal or disabled action | POST offer blocked server-side |
| Upload Failure | Seller | error visible, form preserved | no broken item row committed |
| Credit Rejected | Credit L3 | status updates clearly | credit hold released or transaction reversed |
| Shipment Proof Missing | Courier | cannot progress step | shipment remains pending proof |
| Offline Recovery | All users | retry/error state shown | no duplicate submit after reconnect |

## 15. Release Gates

### Gate 1: Design

- Final screens approved.
- Tokens/components/states approved.
- Level + role journeys covered.
- Open decisions documented.

### Gate 2: MVP Dev

- DB/API/Auth healthy.
- Feed/Shop/Detail use real data.
- Add/upload/profile works.
- Owner boundary enforced.

### Gate 3: Xwap

- Offer sheet works.
- No-product offer works.
- Inbox statuses work.
- Notifications created.

### Gate 4: Trust

- Credit ledger works.
- Chat persists.
- Shipment proof states exist.
- Restricted user blocked by API.

### Gate 5: Beta

- 390px mobile QA passes.
- Security checklist passes.
- Analytics events wired.
- Rollback plan ready.

### Gate 6: Launch

- Production env ready.
- Health checks pass.
- Support channel ready.
- Go/no-go signed off.
