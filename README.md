# Dorm Billing System

เว็บแอปสำหรับจัดการผู้พัก บันทึกมิเตอร์น้ำและไฟ คำนวณค่าใช้จ่ายรายเดือน และสร้างบิลค่าเช่าเป็นไฟล์ PNG

## ฟังก์ชันหลัก

- จัดการข้อมูลผู้พัก ห้อง อาคาร ค่าเช่า และอัตราค่าน้ำไฟ
- รองรับค่าน้ำและค่าไฟแบบคิดตามหน่วยหรือเหมาจ่าย
- บันทึกเลขมิเตอร์แยกรายเดือนและตรวจสอบเลขย้อนหลัง
- คำนวณค่าน้ำและค่าไฟอัตโนมัติ
- สร้างบิลรายห้องและดาวน์โหลดเป็น PNG
- รองรับหน้าจอคอมพิวเตอร์และโทรศัพท์

## การรันบนเครื่อง

```bash
npm install
npm run dev
```

## การจัดเก็บข้อมูล

ถ้าไม่ได้ตั้งค่า Supabase เว็บจะเก็บข้อมูลด้วย `localStorage` ของเบราว์เซอร์ ข้อมูลจึงอยู่เฉพาะอุปกรณ์และเบราว์เซอร์ที่กรอกข้อมูล

ถ้าตั้งค่า Supabase แล้ว เว็บจะบันทึกข้อมูลไว้ที่ตาราง `dorm_app_state` และซิงก์ข้ามเครื่องผ่านฐานข้อมูลกลาง

## เชื่อม Supabase

1. สร้าง Supabase project
2. เปิด SQL Editor แล้วรันไฟล์ `supabase-schema.sql`
3. สร้างไฟล์ `.env.local` จาก `.env.example`
4. ใส่ค่า Supabase ของโปรเจกต์คุณ

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

5. รันเว็บใหม่

```bash
npm run dev
```

สำหรับ GitHub Pages ให้เพิ่ม Repository Secrets สองตัวนี้:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

แล้ว run workflow deploy ใหม่ หรือ push commit ใหม่ขึ้น `main`
