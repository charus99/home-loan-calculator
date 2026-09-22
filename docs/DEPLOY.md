# Deploy

แอปนี้เป็น static site ล้วน — ไม่มี backend ไม่มีฐานข้อมูล ไม่มี environment variable
ที่ต้องตั้ง `npm run build` ได้ไฟล์ใน `dist/` ประมาณ 680 KB (190 KB หลัง gzip)
เอาไปวางที่ไหนก็ได้ที่เสิร์ฟไฟล์ static

ปัจจุบันใช้ **Cloudflare Workers** (static assets) ต่อกับ GitHub repo โดยตรง

> Cloudflare รวม Pages เข้ากับ Workers แล้ว โปรเจกต์ที่สร้างใหม่จะเป็น Workers
> ทั้งหมด คู่มือเก่าบนอินเทอร์เน็ตที่พูดถึง "Pages project" ยังใช้ได้โดยหลักการ
> แต่ชื่อช่องและ deploy command ต่างกัน

---

## ตั้งค่าครั้งแรก (ทำครั้งเดียว)

### 1. สมัครบัญชี Cloudflare

https://dash.cloudflare.com/sign-up — ฟรี ไม่ต้องใส่บัตรเครดิต

### 2. สร้าง Worker จาก repo

จากหน้า dashboard:

1. เมนูซ้าย → **Compute** → **Workers & Pages** → **Create**
2. **Import a repository** → อนุญาตให้ Cloudflare เข้าถึง GitHub
3. เลือก repo `charus99/home-loan-calculator`

### 3. ตั้งค่า build

ที่ **Settings → Builds → Build configuration**

| ช่อง | ค่าที่ใส่ |
|---|---|
| Build command | `npm run build:ci` |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Production branch | `main` |

**ทำไมใช้ `build:ci` ไม่ใช่ `build`:** `build` รัน `tsc -b` ด้วย ซึ่งถ้า type error
จะทำให้ deploy ล้มทั้งหมด การตรวจ type ทำใน GitHub Actions แล้ว
(ดู `.github/workflows/ci.yml`) จึงไม่ต้องทำซ้ำตอน deploy

ส่วนที่เหลือ — ชื่อ Worker, assets directory, SPA routing — อ่านจาก
`wrangler.toml` ใน repo ไม่ต้องตั้งในหน้าเว็บ

### 4. รอ deploy

จะได้ URL หน้าตาแบบ `https://home-loan-calculator.<subdomain>.workers.dev`

---

## หลังจากนั้น

Push ขึ้น `main` เมื่อไหร่ Cloudflare จะ build และ deploy ให้อัตโนมัติ
PR แต่ละอันจะได้ preview URL ของตัวเอง

---

## ต่อโดเมนของตัวเอง

ใน Worker → แท็บ **Domains** → **Add**

- ถ้าโดเมนอยู่กับ Cloudflare อยู่แล้ว: กดเลือกได้เลย
- ถ้าอยู่ที่อื่น: Cloudflare จะบอก CNAME ที่ต้องไปตั้งที่ผู้ให้บริการโดเมน

HTTPS ได้อัตโนมัติ ไม่ต้องตั้งค่าอะไร

---

## ไฟล์ที่เกี่ยวข้องใน repo

| ไฟล์ | ทำอะไร |
|---|---|
| `wrangler.toml` | บอก Worker ว่าเสิร์ฟไฟล์จาก `dist/` และจัดการ SPA routing |
| `public/_headers` | ตั้ง cache header ให้ asset cache ถาวร แต่ `index.html` ไม่ cache |
| `.github/workflows/ci.yml` | ตรวจ typecheck, lint, test, build ทุก push |

`public/_headers` สำคัญกว่าที่คิด: ถ้า `index.html` ถูก cache ผู้ใช้เดิมจะยังเห็น
เวอร์ชันเก่าแม้ deploy ใหม่แล้ว เพราะมันชี้ไปหาไฟล์ asset ชื่อเดิมที่ไม่มีอยู่แล้ว
Vite ก็อปทุกอย่างใน `public/` เข้า `dist/` ตอน build ไฟล์นี้จึงไปอยู่ที่ที่
Worker อ่านเจอโดยอัตโนมัติ

`not_found_handling = "single-page-application"` ใน `wrangler.toml` ทำให้ path
ที่ไม่ตรงกับไฟล์ไหนคืน `index.html` แทน 404 — จำเป็นถ้าภายหลังเพิ่ม routing

---

## ทดสอบก่อน deploy

```bash
npm run build:ci        # สร้าง dist/
npx wrangler deploy --dry-run   # ตรวจว่า config ถูกและไฟล์ครบ
```

`--dry-run` ไม่ส่งอะไรขึ้น Cloudflare แค่บอกว่าจะอัปโหลดอะไรบ้าง

---

## ทางเลือกอื่นถ้าอยากย้าย

ไม่มีอะไรผูกกับ Cloudflare — `dist/` เอาไปวางที่ไหนก็ได้:

- **GitHub Pages** — ฟรี ใช้ repo เดิม ต้องเพิ่ม workflow deploy
- **Vercel / Netlify** — ตั้งค่าคล้ายกัน build command เดียวกัน
- **S3 + CloudFront, Firebase Hosting, หรือ nginx บน VPS** — อัปโหลด `dist/` ขึ้นไปตรงๆ

---

## ข้อควรระวัง

repo นี้เป็น **public** และเว็บที่ deploy จะเข้าถึงได้จากทุกที่
ข้อมูลที่ผู้ใช้กรอกเก็บใน `localStorage` ของเบราว์เซอร์แต่ละคน ไม่ถูกส่งไปไหน
ไม่มี backend ให้ข้อมูลรั่ว — แต่ถ้าภายหลังเพิ่ม backend หรือ analytics
ต้องทบทวนเรื่องนี้ใหม่
