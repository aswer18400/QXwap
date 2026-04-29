# QXwap - คู่มือ Deploy ฉบับสมบูรณ์

## สิ่งที่จะได้หลัง Deploy
- **Backend API**: `https://qxwap-backend.onrender.com/api`
- **Frontend**: `https://aswer18400.github.io` (GitHub Pages)
- **Database**: PostgreSQL บน Render (ฟรี)

---

## ขั้นตอนที่ 1: Push โค้ดขึ้น GitHub

```bash
# ถ้ายังไม่มี git repo
cd /path/to/your/qxwap-project
git init
git add .
git commit -m "QXwap production ready"

# สร้าง repo บน GitHub แล้ว push
git remote add origin https://github.com/YOUR_USERNAME/qxwap.git
git branch -M main
git push -u origin main
```

> **สำคัญ**: ต้องมีไฟล์เหล่านี้ใน repo:
> - `Dockerfile`
> - `render.yaml`
> - `package.json`
> - `vite.config.ts`
> - `drizzle.config.ts`
> - `src/` (frontend)
> - `api/` (backend)
> - `db/` (database schema)
> - `scripts/start-prod.sh`

---

## ขั้นตอนที่ 2: Deploy บน Render.com

### วิธี A: Blueprint (แนะนำ - ง่ายที่สุด)

1. ไปที่ https://dashboard.render.com/blueprints
2. คลิก **"New Blueprint Instance"**
3. เลือก GitHub repo `qxwap`
4. Render จะอ่าน `render.yaml` และสร้าง:
   - **PostgreSQL database** (ฟรี)
   - **Backend Web Service** (Docker)
   - รอ ~5 นาทีให้ build เสร็จ

### วิธี B: Manual (ถ้า Blueprint ไม่ work)

#### 2.1 สร้าง PostgreSQL Database
1. https://dashboard.render.com/new/database
2. Name: `qxwap-db`
3. Region: `Singapore`
4. Plan: `Free`
5. คลิก **Create Database**
6. รอสักครู่ แล้วคัดลอก **Internal Database URL** (ดูใน tab "Info")
   - จะได้ประมาณ: `postgresql://qxwap:password@dpg-xxx.singapore-postgres.render.com:5432/qxwap`

#### 2.2 สร้าง Backend Web Service
1. https://dashboard.render.com/new/web
2. **Build and deploy from a Git repository**
3. เลือก repo `qxwap`
4. ตั้งค่า:

| Field | Value |
|-------|-------|
| Name | `qxwap-backend` |
| Region | `Singapore` |
| Branch | `main` |
| Runtime | `Docker` |
| Dockerfile Path | `./Dockerfile` |

5. คลิก **Advanced** แล้วใส่ Environment Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | (Internal Database URL จากขั้นตอน 2.1) |
| `SESSION_SECRET` | `qxwap-super-secret-key-change-me-32chars` |
| `FRONTEND_ORIGIN` | `https://aswer18400.github.io` |

6. คลิก **Create Web Service**
7. รอ ~5-10 นาทีให้ build และ deploy เสร็จ
8. เมื่อเสร็จจะได้ URL ประมาณ: `https://qxwap-backend.onrender.com`

---

## ขั้นตอนที่ 3: รัน Migration + Seed Data

### วิธีที่ 1: Render Shell (แนะนำ)
1. ไปที่ https://dashboard.render.com
2. คลิกที่ `qxwap-backend` service
3. คลิก tab **"Shell"**
4. รันคำสั่ง:

```bash
npx drizzle-kit push
```

5. ถามว่า **"You are about to execute current statements:"** ให้พิมพ์ `y` แล้ว Enter

6. Seed ข้อมูลเริ่มต้น:

```bash
npx tsx db/seed.ts
```

### วิธีที่ 2: Auto-migration (ถ้า start-prod.sh ทำงาน)
- ถ้า Dockerfile ใช้ `scripts/start-prod.sh` อยู่แล้ว migration จะรันอัตโนมัติตอน start
- แต่ seed ต้องรันด้วยมือครั้งแรก

---

## ขั้นตอนที่ 4: อัปเดต Frontend ให้ชี้ไปยัง Backend

หลัง Backend deploy เสร็จ จะได้ URL เช่น `https://qxwap-backend.onrender.com`

### วิธีที่ 1: Rebuild Frontend (แนะนำ)

```bash
# ใน repo ของคุณ
npm run build

# Inject backend URL
sed -i 's|__API_BASE__|https://qxwap-backend.onrender.com/api|g' dist/public/index.html

# Verify
grep "window.API_BASE" dist/public/index.html
# ควรเห็น: window.API_BASE = "https://qxwap-backend.onrender.com/api";
```

จากนั้น deploy `dist/public/` ไปยัง static hosting เดิม

### วิธีที่ 2: แก้ index.html ตรง ๆ ใน repo

แก้ไฟล์ `index.html` บรรทัด:
```html
<script>window.API_BASE = "https://qxwap-backend.onrender.com/api";</script>
```

แล้ว push + rebuild

---

## ขั้นตอนที่ 5: ทดสอบ

แทนที่ `https://qxwap-backend.onrender.com` ด้วย URL จริงของคุณ

### 5.1 Health Check
```bash
curl https://qxwap-backend.onrender.com/api/health
# ควรได้: {"ok":true}
```

### 5.2 Signup
```bash
curl -X POST https://qxwap-backend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
# ควรได้: {"user":{"id":"...","email":"test@example.com"}}
```

### 5.3 Login
```bash
curl -X POST https://qxwap-backend.onrender.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  -c cookies.txt
```

### 5.4 Upload Image
```bash
curl -X POST https://qxwap-backend.onrender.com/api/upload \
  -b cookies.txt \
  -F "images=@/path/to/image.jpg"
# ควรได้: {"urls":["/uploads/xxx.jpg"]}
```

### 5.5 Create Item
```bash
curl -X POST https://qxwap-backend.onrender.com/api/trpc/item.create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"json":{"title":"Test Item","description":"Test","category":"Electronics","condition":"New","dealType":"swap","openToOffers":true,"wantedTags":["test"],"images":[]}}'
```

### 5.6 Feed
```bash
curl 'https://qxwap-backend.onrender.com/api/trpc/item.list?input=%7B%22json%22%3A%7B%22status%22%3A%22active%22%2C%22limit%22%3A10%7D%7D'
```

### 5.7 ทดสอบบน Frontend
1. เปิด https://aswer18400.github.io
2. คลิก **เข้าสู่ระบบ**
3. ใช้ demo account: `demo@qxwap.com` / `demo1234`
4. หรือสมัครใหม่
5. ทดสอบ:
   - [ ] Feed โหลดสินค้า
   - [ ] โพสต์สินค้า + อัปโหลดรูป
   - [ ] Xwap ข้อเสนอ
   - [ ] Bookmark
   - [ ] Profile + แก้ไข
   - [ ] Wallet
   - [ ] Inbox

---

## Troubleshooting

### "Application Error" บน Render
- ดู Logs ใน Render Dashboard > Service > Logs
- ตรวจสอบว่า `DATABASE_URL` ถูกต้อง
- ตรวจสอบว่า migration รันแล้ว

### Database connection failed
- ใช้ **Internal Database URL** (ไม่ใช่ External)
- ตรวจสอบว่า Database กับ Web Service อยู่ใน region เดียวกัน

### Upload ไม่ได้
- ตรวจสอบว่า Disk mount ที่ `/app/uploads` ถูกต้อง
- ตรวจสอบ `FRONTEND_ORIGIN` ตรงกับ frontend URL

### Frontend เรียก API ไม่เจอ
- เปิด DevTools > Network ดู request URL
- ตรวจสอบ `window.API_BASE` ใน console: `window.API_BASE`
- ควรได้ `https://qxwap-backend.onrender.com/api`

### CORS Error
- ตรวจสอบ `FRONTEND_ORIGIN` ตรงกับ URL ที่เปิด frontend
- อย่าลืม `https://` นำหน้า

---

## Files ที่เกี่ยวข้องกับ Deployment

| File | ใช้ทำอะไร |
|------|-----------|
| `Dockerfile` | Build container |
| `render.yaml` | Render Blueprint (auto deploy) |
| `docker-compose.yml` | Local testing |
| `scripts/start-prod.sh` | Auto-migration on startup |
| `scripts/inject-api-base.sh` | Inject API URL to frontend |
| `DEPLOY.md` | คู่มือนี้ |
