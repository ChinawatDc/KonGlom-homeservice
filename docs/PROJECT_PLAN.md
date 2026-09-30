# 📋 PROJECT PLAN: KonGlom-homeservice (Phase 1: MVP)

> **เป้าหมายหลัก:** พัฒนาระบบ **"ผู้ช่วยสแกนสลิป & บันทึกรายจ่ายกองกลาง พร้อมสำรองไฟล์เข้า Google Drive อัตโนมัติ"** สำหรับกลุ่ม LINE ครอบครัว

---

## 🎯 1. วัตถุประสงค์ (Objectives)

1. เมื่อสมาชิกในกลุ่มส่งสลิปโอนเงิน หรือใบเสร็จ ระบบต้องตรวจจับและอ่านข้อมูลได้อัตโนมัติ 100%
2. ใช้ **Google Gemini 1.5 Flash** สกัดยอดเงิน, ธนาคาร, วันที่-เวลา, และจัดหมวดหมู่ค่าใช้จ่าย
3. อัปโหลดรูปภาพสลิปไปจัดเก็บใน **Google Drive (โฟลเดอร์ครอบครัว)** อย่างเป็นระเบียบ
4. บันทึกข้อมูลธุรกรรมลง **Neon Postgres** เพื่อใช้คำนวณและทำรายงาน
5. ตอบกลับการ์ด **LINE Flex Message** สรุปยอดเงินพร้อมปุ่มคลิกเปิดดูรูปสลิปใน Google Drive ทันที

---

## 🏗 2. สถาปัตยกรรมการทำงาน (Architecture Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Member as สมาชิกในครอบครัว
    participant LINE as LINE Platform
    participant Webhook as Next.js Webhook (/api/webhook/line)
    participant Gemini as Google Gemini 1.5 Flash
    participant Drive as Google Drive (Service Account)
    participant DB as Neon Postgres (Drizzle ORM)

    Member->>LINE: ส่งรูปภาพสลิปเข้ากลุ่ม
    LINE->>Webhook: Webhook Event: message (type: image)
    Webhook->>LINE: ดาวน์โหลด Binary รูปภาพผ่าน Message ID
    
    par ขนานกันเพื่อความเร็ว (Promise.all)
        Webhook->>Gemini: OCR วิเคราะห์ยอดเงิน, ธนาคาร, หมวดหมู่ (JSON)
        Webhook->>Drive: อัปโหลดรูปภาพเข้าโฟลเดอร์ "สลิปครอบครัว/YYYY-MM"
    end

    Gemini-->>Webhook: ข้อมูลสลิป (Amount, Category, Bank, Date)
    Drive-->>Webhook: File ID & Web View Link
    
    Webhook->>DB: บันทึก Transaction ลงตาราง expenses
    Webhook->>LINE: ส่ง Flex Message ยืนยันการบันทึก
    LINE-->>Member: แสดงผล Flex Card สรุปยอด + ปุ่มเปิดดูใน Drive
```

---

## 🗄 3. โครงสร้างฐานข้อมูล (Neon Postgres / Drizzle Schema)

ตารางหลัก: `expenses`

```typescript
// src/db/schema.ts
import { pgTable, serial, varchar, numeric, timestamp, jsonb, text } from "drizzle-orm/pg-core";

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  lineUserId: varchar("line_user_id", { length: 100 }).notNull(),
  userName: varchar("user_name", { length: 150 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'อาหาร', 'ค่าน้ำค่าไฟ', 'ของใช้ในบ้าน', 'สุขภาพ', 'ทั่วไป'
  bankName: varchar("bank_name", { length: 50 }),          // 'KBANK', 'SCB', 'KTB', 'PROMPTPAY', etc.
  transactionDate: timestamp("transaction_date"),
  driveFileId: varchar("drive_file_id", { length: 150 }),
  driveUrl: text("drive_url"),                             // Direct link to Google Drive file
  rawGeminiData: jsonb("raw_gemini_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 🤖 4. ข้อกำหนด AI (Gemini 1.5 Flash Prompt)

- **Model:** `gemini-1.5-flash` (ความเร็วสูง 1-2 วินาที, รองรับปริมาณ Token ฟรีสูง)
- **Output:** Structured JSON เท่านั้น (`responseMimeType: "application/json"`)

```json
{
  "is_slip": true,
  "amount": 450.00,
  "bank": "KBANK",
  "category": "อาหาร",
  "date": "2026-09-30 12:30:00",
  "sender_name": "สมชาย",
  "receiver_name": "ร้านค้าป้าพร",
  "note": "ค่ากับข้าวมื้อเที่ยง"
}
```

> [!TIP]
> หากภาพที่ส่งเข้ามาไม่ใช่สลิปการเงินหรือใบเสร็จ Gemini จะคืนค่า `is_slip: false` เพื่อให้ระบบข้ามการทำงาน ไม่รบกวนการคุยในกลุ่ม

---

## 📁 5. โครงสร้างการจัดเก็บใน Google Drive

- ใช้งานผ่าน **Google Cloud Service Account**
- โฟลเดอร์หลัก: `KonGlom-Vault/`
- จัดโฟลเดอร์ย่อยตามปีและเดือนอัตโนมัติ: `KonGlom-Vault/2026/09/`
- รูปแบบชื่อไฟล์: `[2026-09-30]_[อาหาร]_[450.00]_[KBANK]_[timestamp].jpg`
- สิทธิ์การเข้าถึง: ตั้งค่าโฟลเดอร์หลักให้ `Anyone with link can view` เพื่อให้สมาชิกในครอบครัวคลิกดูรูปได้ทันทีจาก LINE

---

## 📱 6. รูปแบบการตอบกลับ (LINE Flex Message)

```text
┌──────────────────────────────────────────────┐
│  🏡 คนกลม โฮมเซอร์วิส                       │
│  💰 บันทึกรายจ่ายสำเร็จ                     │
├──────────────────────────────────────────────┤
│  ยอดเงิน:      ฿ 450.00                      │
│  หมวดหมู่:     🍲 อาหาร                      │
│  ผู้ชำระ:      แม่                           │
│  ธนาคาร:      กสิกรไทย (KBANK)               │
│  วันเวลา:      30 ก.ย. 2026 12:30            │
├──────────────────────────────────────────────┤
│       [ 📁 เปิดดูรูปสลิปใน Google Drive ]    │
└──────────────────────────────────────────────┘
```

---

## ⚙️ 7. ตัวแปรสภาพแวดล้อม (Environment Variables)

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=xxxxxx
LINE_CHANNEL_SECRET=xxxxxx

# Google Gemini API
GEMINI_API_KEY=AIzaxxxxx

# Google Drive (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=kon-glom-bot@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=1A2B3C4D5E...

# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/konglom?sslmode=require
```

---

## 🚀 8. แผนการลงมือพัฒนาทีละขั้นตอน (Action Plan)

1. [ ] **Setup Project:** Init Next.js 15, ติดตั้ง Dependencies (`@line/bot-sdk`, `@google/generative-ai`, `googleapis`, `drizzle-orm`, `@neondatabase/serverless`)
2. [ ] **Neon DB:** ตั้งค่า Drizzle Schema และ Migrate ตาราง `expenses`
3. [ ] **Google Cloud:** สร้าง Service Account และผูกกับ Google Drive Folder
4. [ ] **Services Integration:**
   - [ ] เขียนโมดูล Gemini OCR (`lib/gemini.ts`)
   - [ ] เขียนโมดูล Google Drive Uploader (`lib/google-drive.ts`)
   - [ ] เขียน Flex Message Builder (`lib/line.ts`)
5. [ ] **Webhook Endpoint:** รวมกระบวนการทั้งหมดใน `app/api/webhook/line/route.ts`
6. [ ] **Deploy & Test:** Deploy ขึ้น Vercel และทดสอบส่งสลิปใน LINE Group จริง
