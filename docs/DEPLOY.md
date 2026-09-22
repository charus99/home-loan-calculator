# Deploy

แอปนี้เป็น static site ล้วน — ไม่มี backend ไม่มีฐานข้อมูล ไม่มี environment variable
ที่ต้องตั้ง `npm run build` ได้ไฟล์ใน `dist/` ประมาณ 680 KB (190 KB หลัง gzip)
เอาไปวางที่ไหนก็ได้ที่เสิร์ฟไฟล์ static

ปัจจุบันใช้ **Cloudflare Pages** ต่อกับ GitHub repo โดยตรง

---

## ตั้งค่าครั้งแรก (ทำครั้งเดียว)

### 1. สมัครบัญชี Cloudflare

https://dash.cloudflare.com/sign-up — ฟรี ไม่ต้องใส่บัตรเครดิต

### 2. สร้าง Pages project

จากหน้า dashboard:

1. เมนูซ้าย → **Workers & Pages** → **Create** → แท็บ **Pages**
2. **Connect to Git** → อนุญาตให้ Cloudflare เข้าถึง GitHub
3. เลือก repo `charus99/home-loan-calculator`

### 3. ตั้งค่า build

| ช่อง | ค่าที่ใส่ |
|---|---|
| Framework preset | `Vite` |
| Build command | `npm run build:ci` |
| Build output directory | `dist` |
| Root directory | (เว้นว่าง) |
| Node version | `24` |

**ทำไมใช้ `build:ci` ไม่ใช่ `build`:** `build` รัน `tsc -b` ด้วย ซึ่งถ้า type error
จะทำให้ deploy ล้มทั้งหมด การตรวจ type ทำใน GitHub Actions แล้ว
(ดู `.github/workflows/ci.yml`) จึงไม่ต้องทำซ้ำตอน deploy

### 4. กด Save and Deploy

รอประมาณ 1-2 นาที จะได้ URL หน้าตาแบบ
`https://home-loan-calculator.pages.dev`

---

## หลังจากนั้น

Push ขึ้น `main` เมื่อไหร่ Cloudflare จะ build และ deploy ให้อัตโนมัติ
PR แต่ละอันจะได้ preview URL ของตัวเอง

---

## ต่อโดเมนของตัวเอง

ใน Pages project → **Custom domains** → **Set up a domain**

- ถ้าโดเมนอยู่กับ Cloudflare อยู่แล้ว: กดเลือกได้เลย
- ถ้าอยู่ที่อื่น: Cloudflare จะบอก CNAME ที่ต้องไปตั้งที่ผู้ให้บริการโดเมน

HTTPS ได้อัตโนมัติ ไม่ต้องตั้งค่าอะไร

---

## ไฟล์ที่เกี่ยวข้องใน repo

| ไฟล์ | ทำอะไร |
|---|---|
| `public/_headers` | ตั้ง cache header ให้ asset cache ถาวร แต่ `index.html` ไม่ cache |
| `.github/workflows/ci.yml` | ตรวจ typecheck, lint, test, build ทุก push |

`public/_headers` สำคัญกว่าที่คิด: ถ้า `index.html` ถูก cache ผู้ใช้เดิมจะยังเห็น
เวอร์ชันเก่าแม้ deploy ใหม่แล้ว เพราะมันชี้ไปหาไฟล์ asset ชื่อเดิมที่ไม่มีอยู่แล้ว

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
