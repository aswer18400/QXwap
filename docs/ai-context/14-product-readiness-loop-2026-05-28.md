# Product Readiness Loop

## Goal

สร้าง loop ที่รันซ้ำทุก 30 นาทีจนถึงเที่ยงวันถัดไป เพื่อประเมินว่า QXwap พร้อมปล่อยจริงหรือยัง โดยไม่ดูแค่ build ผ่าน แต่ดู end-to-end flow, browser compatibility, responsive layout, accessibility, error recovery, analytics readiness และคะแนน product readiness ในรอบเดียว

## Commands

```bash
pnpm product:readiness:once
pnpm product:readiness
pnpm product:readiness:install
pnpm product:readiness:status
pnpm product:readiness:uninstall
```

## What Runs Each Round

1. Self-heal local API/frontend ถ้า local targets ยังไม่ขึ้น
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. `pnpm smoke:api`
6. `pnpm smoke:full`
7. Browser-based readiness audit ผ่าน `scripts/qxwap-product-readiness-browser.mjs`
8. Route shell fetch checks
9. Analytics readiness scan
10. Score calculation + markdown/json report generation

## Persona Lanes

1. First-time user
2. Power user
3. Mobile user
4. Accessibility user
5. Edge-case user

ทุก lane มี hypothesis-driven bug seeds และ loop จะรวมกับผล dynamic checks ทุกครั้ง

## Output

Loop เขียนผลไว้ใน:

- `/tmp/qxwap-product-readiness/latest.json`
- `/tmp/qxwap-product-readiness/latest.md`
- `/tmp/qxwap-product-readiness/runs/*.json`
- `/tmp/qxwap-product-readiness/runs/*.md`
- `/tmp/qxwap-product-readiness/screenshots/*`

## Readiness Criteria

ระบบจะถือว่า ready ก็ต่อเมื่อ:

- ไม่มี `blocker`
- ไม่มี `critical`
- `overall score > 90`

ถ้ายังไม่ถึงเกณฑ์ loop จะ report ต่อและไม่ยกสถานะเป็น ready

## Launchd Schedule

ใช้:

```bash
pnpm product:readiness:install
```

ตัว installer จะสร้าง `LaunchAgent` ให้รันทุก 1800 วินาที และหยุดตาม `PRODUCT_READINESS_STOP_AT` ซึ่ง default คือเที่ยงวันถัดไปตามเวลา `Asia/Bangkok`

## Current Limitations

- “5 UX agents” ใน loop นี้เป็น persona lanes ที่ encode ไว้ใน source of truth ไม่ใช่ persistent model agents ที่ wake up เองได้
- browser compatibility ใช้ Playwright browsers/channels ที่มีในเครื่อง ถ้า browser target ใดไม่มี จะถูก report เป็น finding ทันที
- loop นี้ยังไม่ auto-fix source code เองแบบไม่มีเงื่อนไข; มันเน้น test, report, prioritize, regression, scoring และ self-heal local environment ก่อน
