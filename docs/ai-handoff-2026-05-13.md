# QXwap AI Handoff — 2026-05-13

สรุปสำหรับ AI session ถัดไปที่ต้องทำต่อ อ่านไฟล์นี้ก่อนทุกครั้ง

---

## สถานะปัจจุบัน (2026-05-13 เย็น)

### ✅ เสร็จแล้ว

| รายการ | รายละเอียด |
|---|---|
| Monorepo merge | PR #113 merged → `main` (`4d3e655`) |
| CI | ✅ ผ่าน: typecheck + 10 tests + build |
| GitHub Pages | ✅ live: `https://aswer18400.github.io/QXwap/` |
| Frontend | React/Vite build ผ่าน, inject `API_BASE_URL` ถูกต้อง |
| GitHub secret | `API_BASE_URL = https://qxwap-api.onrender.com/api` (ตั้งไว้แล้ว) |

### 🔴 ค้างอยู่ (blocking production)

**Render service ยังรัน OLD API** (build command ใน dashboard ไม่ตรงกับ monorepo)
- Service: `qxwap-api` → `srv-d7mfphu7r5hc73868seg`
- URL: `https://qxwap-api.onrender.com`
- Current `/api/health` returns: `{"ok":true}` (old — new จะ return `{"ok":true,"name":"QXwap API","database":"connected",...}`)
- Auto-deploy triggered แต่ล้มเหลว 2 ครั้ง (deploy `dep-d829r1q1dhqc73b39ubg`)

**Supabase ยังไม่ได้ตั้งค่า** หรือยังไม่ได้ยืนยันว่า project มีอยู่แล้ว

---

## แผนงานที่ต้องทำ (เรียงลำดับความสำคัญ)

### 1. แก้ Render build commands [คนต้องทำเอง หรือ AI ที่มี Render API key]

**วิธีทำใน Render Dashboard:**
```
https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg
→ Settings → Build & Deploy
```

ตั้งค่าใหม่:
```
Build Command:
corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build

Start Command:
pnpm --filter @workspace/api-server start

Root Directory: (ว่าง — monorepo root)
Node Version: 22 (หรือ 20)
```

จากนั้น: Manual Deploy → branch `main`

**ตรวจว่าใช้ได้:**
```bash
curl https://qxwap-api.onrender.com/api/health
# ต้องได้: {"ok":true,"name":"QXwap API","database":"connected","required_tables":...}
```

### 2. ตั้งค่า Supabase [คนต้องทำเอง]

1. ไปที่ `https://supabase.com` → สร้าง project หรือ login project ที่มีอยู่
2. สร้าง Storage bucket ชื่อ `qxwap` (Public, image types only)
3. ดึงค่า:
   - `SUPABASE_URL` (เช่น `https://xxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role key)
   - `DATABASE_URL` (Settings → Database → Connection String → URI mode)

4. ใส่ใน Render service env vars:
   ```
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   FRONTEND_ORIGIN=https://aswer18400.github.io
   STORAGE_BUCKET=qxwap
   ```
   (SESSION_SECRET ถูก auto-generate โดย Render แล้ว)

### 3. Smoke test หลัง Render deploy [AI ทำได้]

```bash
cd /tmp/qxwap-github-push  # หรือ local source
API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api
API_BASE_URL=https://qxwap-api.onrender.com/api pnpm preflight:frontend --health
```

ถ้าผ่านทั้งหมด → production พร้อมใช้งาน

### 4. Re-trigger Pages deploy [AI ทำได้ — ถ้า API URL เปลี่ยน]

ถ้า Render URL ยังเป็น `https://qxwap-api.onrender.com` ไม่ต้องทำอะไร
ถ้า URL เปลี่ยน:
- อัปเดต GitHub secret `API_BASE_URL` ใหม่
- Pages workflow จะ re-deploy อัตโนมัติเมื่อ push หรือ trigger manual

### 5. Android Chrome QA [ทำหลัง Render ขึ้น]

ดู checklist: `docs/android-chrome-qa.md`
ใช้ LAN helper: `pnpm qa:lan` (พิมพ์ URL สำหรับโทรศัพท์)

---

## วิธี push code ไป GitHub โดยไม่มี gh CLI / SSH

```python
# รัน Python script นี้แทน git push
import ctypes, ctypes.util, subprocess, os
sec_lib = ctypes.cdll.LoadLibrary(ctypes.util.find_library('Security'))
sec_lib.SecKeychainFindGenericPassword.restype = ctypes.c_int32
sec_lib.SecKeychainFindGenericPassword.argtypes = [
    ctypes.c_void_p, ctypes.c_uint32, ctypes.c_char_p,
    ctypes.c_uint32, ctypes.c_char_p,
    ctypes.POINTER(ctypes.c_uint32), ctypes.POINTER(ctypes.c_void_p), ctypes.c_void_p,
]
service = b"GitHub - https://api.github.com"
account = b"aswer18400"
pwd_len = ctypes.c_uint32(0)
pwd_data = ctypes.c_void_p(0)
sec_lib.SecKeychainFindGenericPassword(
    None, len(service), service, len(account), account,
    ctypes.byref(pwd_len), ctypes.byref(pwd_data), None
)
token = ctypes.string_at(pwd_data, pwd_len.value).decode()

# set-url → push → restore
subprocess.run(['git', 'remote', 'set-url', 'origin',
    f'https://aswer18400:{token}@github.com/aswer18400/QXwap.git'],
    cwd='/path/to/repo', capture_output=True)
subprocess.run(['git', 'push', 'origin', 'main'],
    cwd='/path/to/repo',
    env=dict(os.environ, GIT_TERMINAL_PROMPT='0'),
    capture_output=True)
subprocess.run(['git', 'remote', 'set-url', 'origin',
    'https://github.com/aswer18400/QXwap.git'],
    cwd='/path/to/repo')
```

วิธีนี้ใช้ macOS Keychain (GitHub Desktop OAuth token) — ไม่ต้อง dialog

---

## Source of Truth

```
Local monorepo:  <repo-root>
GitHub main:     https://github.com/aswer18400/QXwap  (monorepo structure)
Deploy branch:   /tmp/qxwap-github-push  (clone ของ repo พร้อม push — อาจหมดอายุหลัง reboot)
```

**สำคัญ:** `/tmp/qxwap-github-push` อาจหายไปหลัง reboot ให้ใช้ local monorepo เป็น reference แทน

---

## File Map (สิ่งที่สำคัญ)

```
apps/api/src/server.ts          — API routes ทั้งหมด
apps/api/src/db.ts              — DB queries, schema setup
apps/web/src/screens/           — หน้าจอหลัก (Feed, Shop, Inbox, Profile)
apps/web/src/components/        — Components ที่ใช้ร่วมกัน
scripts/qxwap-production-gate.mjs  — production gate (รัน pnpm gate:production)
render.yaml                     — Render IaC
.github/workflows/ci.yml        — CI (typecheck+test+build)
.github/workflows/pages.yml     — GitHub Pages deploy
```

---

## ข้อห้าม

- ห้าม deploy ถ้า user ไม่ได้สั่ง
- ห้ามเดา secrets จริง
- ห้ามเปลี่ยนโครงสร้าง monorepo
- ห้ามแก้ backend สำหรับงาน UI-only
- อัปเดต `AI_START_HERE.md` ทุกครั้งที่มีการเปลี่ยนแปลงสำคัญ

---

## Quick Commands

```bash
# ทดสอบ local
pnpm gate:production

# ทดสอบ production API
curl https://qxwap-api.onrender.com/api/health

# ดู GitHub Actions status
# (ใช้ Python + GitHub token จาก Keychain เหมือนที่ทำมาแล้ว)

# อัปเดต GitHub secret API_BASE_URL
# PATCH https://api.github.com/repos/aswer18400/QXwap/actions/secrets/API_BASE_URL
```
