# 🏡 Rich Menu Setup — น้องกลม โฮมเซอร์วิส

คู่มือสร้าง LINE Rich Menu สำหรับ KonGlom Bot ครบ 3 ขั้นตอน

---

## 📐 ข้อมูล Rich Menu

| Property | Value |
|----------|-------|
| ขนาดรูป | **2500 × 1686 px** |
| Layout | 2 แถว × 3 คอลัมน์ |
| Chat Bar Text | 🏡 เมนูน้องกลม |
| Format รูป | JPG (ขนาดไม่เกิน 1 MB) |

---

## 🗂 Layout ปุ่มและคำสั่ง

```
┌────────────────────┬────────────────────┬────────────────────┐
│  📊                │  💸                │  💰                │
│  แดชบอร์ดรายจ่าย  │  เคลียร์เงินกองกลาง│  ตั้งงบประมาณ      │
│  → @กลม แดชบอร์ด  │  → @กลม เคลียร์เงิน│  → @กลม ตั้งงบ     │
├────────────────────┼────────────────────┼────────────────────┤
│  📅                │  🧊                │  📋                │
│  ดูนัดหมาย        │  ของในตู้เย็น      │  คู่มือคำสั่ง      │
│  → @กลม มีนัดอะไรบ้าง│  → @กลม ตู้เย็น  │  → @กลม คู่มือ     │
└────────────────────┴────────────────────┴────────────────────┘
```

### Bounds (pixel coordinates)

| ปุ่ม | x | y | width | height | text ที่ส่ง |
|------|---|---|-------|--------|------------|
| แดชบอร์ดรายจ่าย | 0 | 0 | 833 | 843 | `@กลม แดชบอร์ด` |
| เคลียร์เงินกองกลาง | 833 | 0 | 834 | 843 | `@กลม เคลียร์เงิน` |
| ตั้งงบประมาณ | 1667 | 0 | 833 | 843 | `@กลม ตั้งงบ` |
| ดูนัดหมาย | 0 | 843 | 833 | 843 | `@กลม มีนัดอะไรบ้าง` |
| ของในตู้เย็น | 833 | 843 | 834 | 843 | `@กลม ตู้เย็น` |
| คู่มือคำสั่ง | 1667 | 843 | 833 | 843 | `@กลม คู่มือ` |

---

## 🚀 วิธี Deploy (ทำครั้งเดียว)

### ขั้นตอนที่ 1 — เตรียมรูป

1. นำไฟล์รูป `konglom_rich_menu_v3.jpg` ไป host บน public URL
   - แนะนำ: [Imgur](https://imgur.com/upload) หรือ [Cloudinary](https://cloudinary.com)
   - หรือ upload ไว้ใน Google Drive แล้วเปิด public link แบบ direct download

> **ขนาดที่ต้องการ:** 2500 × 1686 px, JPG, ≤ 1 MB

---

### ขั้นตอนที่ 2 — Deploy ผ่าน API (ครบจบในครั้งเดียว)

เรียก endpoint นี้ 1 ครั้ง ระบบจะทำให้ครบ 3 ขั้นตอนอัตโนมัติ:

```bash
curl -X POST https://<YOUR_VERCEL_URL>/api/line/setup-rich-menu \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://i.imgur.com/XXXXXXX.jpg"
  }'
```

**ระบบจะทำอัตโนมัติ:**
1. ✅ สร้างโครงสร้าง Rich Menu ใน LINE OA
2. ✅ Download รูปจาก imageUrl แล้ว upload ไปยัง LINE
3. ✅ ตั้งเป็น Default Rich Menu สำหรับทุกผู้ใช้

**Response ที่ได้:**
```json
{
  "status": "ok",
  "richMenuId": "richmenu-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "steps": {
    "1_create_structure": "✅ สร้างโครงสร้าง Rich Menu สำเร็จ",
    "2_upload_image": "✅ Upload รูปสำเร็จ",
    "3_set_default": "✅ ตั้งเป็น Default Rich Menu สำหรับทุกผู้ใช้สำเร็จ"
  }
}
```

---

### ขั้นตอนที่ 3 — ตรวจสอบ

```bash
curl https://<YOUR_VERCEL_URL>/api/line/setup-rich-menu
```

จะได้รายการ Rich Menu ที่มีอยู่และ Default Rich Menu ID ปัจจุบัน

---

## 🔧 ทำเองผ่าน LINE Official Account Manager (ทางเลือก)

ถ้าอยากทำผ่าน UI ของ LINE:

1. เข้า [LINE Official Account Manager](https://manager.line.biz/)
2. เลือก OA → **Chat** → **Rich Menu**
3. กด **Create** → เลือก Template แบบ **2 rows × 3 columns**
4. ตั้งขนาด: **2500 × 1686**
5. Upload รูป `konglom_rich_menu_v3.jpg`
6. ตั้ง Action แต่ละช่องตาม [ตารางด้านบน](#bounds-pixel-coordinates)
   - Type: **Send message**
   - Text: ใส่คำสั่งตามตาราง (เช่น `@กลม แดชบอร์ด`)
7. กด **Save** → **Publish**

---

## ⚠️ หมายเหตุ

> **Vercel Hobby Plan** — รองรับ cron job ได้ **1 job** เท่านั้น  
> ถ้ามี 2 cron (reminders + weekly-digest) ต้องอัปเกรดเป็น **Pro Plan**  
> หรือใช้ [cron-job.org](https://cron-job.org) ฟรีเรียก endpoint แทน

> **Rich Menu Image** — LINE กำหนดขนาดไฟล์ไม่เกิน **1 MB**  
> ถ้ารูปใหญ่เกินให้ compress ด้วย [Squoosh](https://squoosh.app) ก่อน upload

---

*น้องกลม โฮมเซอร์วิส 🏡 — KonGlom-homeservice*
