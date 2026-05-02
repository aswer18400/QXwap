# QXwap Deploy Guide - Render.com

## Quick Deploy (3 นาที)

### วิธีที่ 1: Render Blueprint (แนะนำ)

1. Push repo นี้ขึ้น GitHub
2. ไปที่ https://dashboard.render.com/blueprints
3. คลิก **"New Blueprint Instance"**
4. เลือก GitHub repo ของคุณ
5. Render จะอ่าน `render.yaml` และสร้าง services ทั้งหมดอัตโนมัติ:
   - PostgreSQL database
   - Backend Web Service (Docker)
   - Static Site (Frontend)

### วิธีที่ 2: Manual Deploy

#### Step 1: PostgreSQL Database
1. ไปที่ https://dashboard.render.com/new/database
2. เลือก **PostgreSQL**
3. ตั้งชื่อ: `qxwap-db`
4. Region: `Singapore` (หรือใกล้คุณที่สุด)
5. Plan: `Free` หรือ `Starter`
6. คลิก **Create Database**
7. คัดลอก **Internal Database URL** ไว้

#### Step 2: Backend Web Service
1. ไปที่ https://dashboard.render.com/new/web
2. เลือก **Build and deploy from a Git repository**
3. เลือก repo ของคุณ
4. ตั้งค่าดังนี้:

| Field | Value |
|-------|-------|
| Name | `qxwap-backend` |
| Region | Singapore |
| Branch | `main` |
| Runtime | `Docker` |
| Dockerfile Path | `./Dockerfile` |

5. ในส่วน **Environment Variables** เพิ่ม:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | (Internal Database URL จาก Step 1) |
| `SESSION_SECRET` | (สร้าง random string ยาว 32+ ตัว) |
| `FRONTEND_ORIGIN` | (URL ของ frontend ที่ deploy ไว้) |
| `VITE_API_BASE` | `https://your-backend.onrender.com/api` (ถ้า build frontend บน Render/CI) |
| `R2_ACCOUNT_ID` | (optional, ถ้าใช้ Cloudflare R2) |
| `R2_ACCESS_KEY_ID` | (optional, ถ้าใช้ Cloudflare R2) |
| `R2_SECRET_ACCESS_KEY` | (optional secret, ห้าม commit) |
| `R2_BUCKET_NAME` | (optional, ถ้าใช้ Cloudflare R2) |
| `R2_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` (optional override) |
| `R2_PUBLIC_URL` | `https://pub-...r2.dev` หรือ custom domain (optional) |
| `VAPID_SUBJECT` | `mailto:you@example.com` หรือ `https://your-domain.com` (optional, ถ้าเปิด Web Push) |
| `VAPID_PUBLIC_KEY` | (optional, ถ้าเปิด Web Push) |
| `VAPID_PRIVATE_KEY` | (optional secret, ห้าม commit) |

6. คลิก **Create Web Service**

#### Step 3: รัน Database Migration

```bash
# Install Render CLI (optional)
npm install -g @render/cli

# หรือใช้ Render Dashboard > Shell
# รันคำสั่งนี้ใน container:
npx drizzle-kit migrate
# หรือถ้าใช้ push:
npx drizzle-kit push
```

#### Step 4: Seed Data (optional)
```bash
# ใน Render Shell:
npx tsx db/seed.ts
```

#### Step 5: Frontend
ถ้า deploy frontend แยก (เช่น GitHub Pages):

1. Build frontend:
```bash
npm run build
```

2. Inject API base:
```bash
# แทนที่ https://qxwap-backend.onrender.com/api ด้วย URL จริงของคุณ
./scripts/inject-api-base.sh https://qxwap-backend.onrender.com/api
```

3. Deploy `dist/public/` ไปยัง static hosting (GitHub Pages, Vercel, Netlify, หรือ Render Static Site)

## Docker Compose (ทดสอบ locally แบบ production)

```bash
# Start PostgreSQL + app
docker-compose up -d

# รัน migration
docker-compose exec app npx drizzle-kit push

# Seed data
docker-compose exec app npx tsx db/seed.ts

# ดู logs
docker-compose logs -f app

# Stop
docker-compose down
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | ✅ | Random secret 32+ chars |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `3000` |
| `FRONTEND_ORIGIN` | ✅ | Frontend URL สำหรับ CORS |
| `VITE_API_BASE` | Recommended | URL ของ backend `/api` สำหรับ frontend build แยกโดเมน |
| `R2_ACCOUNT_ID` | Optional | Cloudflare account ID สำหรับ R2 |
| `R2_ACCESS_KEY_ID` | Optional | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | Optional secret | R2 secret access key |
| `R2_BUCKET_NAME` | Optional | ชื่อ bucket บน R2 |
| `R2_ENDPOINT` | Optional | custom endpoint; ถ้าไม่ใส่จะ derive จาก account ID |
| `R2_PUBLIC_URL` | Optional | public base URL สำหรับไฟล์บน R2 |
| `VAPID_SUBJECT` | Optional | `mailto:` หรือ `https://` subject สำหรับ Web Push |
| `VAPID_PUBLIC_KEY` | Optional | public key สำหรับ Web Push |
| `VAPID_PRIVATE_KEY` | Optional secret | private key สำหรับ Web Push |

## ตรวจสอบหลัง Deploy

1. **Health Check**: `GET https://your-backend.onrender.com/api/health`
2. **Auth**: `POST https://your-backend.onrender.com/api/auth/signup`
3. **Upload**: `POST https://your-backend.onrender.com/api/upload`
4. **tRPC**: `POST https://your-backend.onrender.com/api/trpc/item.list`

## Troubleshooting

### ปัญหา: Database connection refused
- ตรวจสอบว่า `DATABASE_URL` เป็น Internal URL (ไม่ใช่ External)
- ตรวจสอบว่า PostgreSQL service อยู่ใน region เดียวกับ Web Service

### ปัญหา: Upload ไม่ได้
- ตรวจสอบว่ามี Disk mount ที่ `/app/uploads`
- ตรวจสอบว่า `FRONTEND_ORIGIN` ตั้งค่าถูกต้อง (CORS)

### ปัญหา: Frontend เรียก API ไม่เจอ
- ตรวจสอบว่า `window.API_BASE` ถูก inject ด้วย URL จริง
- หรือกำหนด `VITE_API_BASE=https://your-backend.onrender.com/api` ตอน build frontend
- ดู Network tab ใน DevTools ตรวจสอบ request URL

### ปัญหา: Session ไม่คงอยู่
- ตรวจสอบว่า `SESSION_SECRET` ตั้งค่าแล้ว
- ตรวจสอบว่า cookie `sid` ถูกส่งมาด้วย (credentials: include)
