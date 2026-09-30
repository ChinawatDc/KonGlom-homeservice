# 🏡 KonGlom-homeservice (คนกลม โฮมเซอร์วิส)

> **"ผู้ช่วยอัจฉริยะประจำครอบครัว เชื่อมต่อทุกคนด้วย LINE, AI และ Cloud อัตโนมัติ"**

`KonGlom-homeservice` คือระบบบอทผู้ช่วยประจำกลุ่มครอบครัวบน **LINE OA** ทำงานบน Serverless Stack ประสิทธิภาพสูง รองรับการจัดการการเงินกองกลาง, สแกนเอกสารและสลิปเข้า Google Drive, เตือนความจำ และดูแลสุขภาพคนในบ้าน

---

## 🛠 Tech Stack

| ส่วนประกอบ | เทคโนโลยีที่เลือกใช้ | รายละเอียด |
| :--- | :--- | :--- |
| **Frontend / Webhook** | Next.js 15+ (App Router) | รองรับ Server Actions, API Route, และ LIFF |
| **Hosting** | Vercel | Serverless Functions & Vercel Cron |
| **Database** | Neon Postgres | Serverless Postgres + Drizzle ORM |
| **AI Engine** | Google Gemini (1.5 Flash & 1.5 Pro) | Multimodal AI: Vision, Text, Audio |
| **Cloud Storage** | Google Drive API | จัดเก็บสลิปและเอกสารสำคัญแยกโฟลเดอร์อัตโนมัติ |
| **Messaging** | LINE Messaging API + LIFF | LINE Bot Webhook, Flex Messages และ Web App ใน LINE |

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
KonGlom-homeservice/
├── docs/
│   ├── PROJECT_PLAN.md       # แผนการพัฒนาปัจจุบัน (Phase 1: MVP รายจ่าย & Google Drive)
│   └── ROADMAP.md            # แผนพัฒนาเวอร์ชันอนาคต (Phase 2 - Phase 5)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/line/ # LINE Webhook Endpoint
│   │   │   └── cron/         # Vercel Cron สำหรับแจ้งเตือน
│   │   └── liff/             # หน้า Dashboard ครอบครัวบน LINE
│   ├── db/                   # Neon Postgres Connection & Drizzle Schema
│   ├── lib/
│   │   ├── gemini.ts         # Google Gemini Client & Prompts
│   │   ├── google-drive.ts   # Google Drive Service Account Uploader
│   │   └── line.ts           # LINE Client & Flex Message Builders
│   └── types/                # TypeScript Interfaces
├── .env.example              # ตัวอย่าง Environment Variables
└── README.md
```

---

## 📑 เอกสารแผนการพัฒนา

- 🚀 **[แผนงานปัจจุบัน (Phase 1: MVP)](./docs/PROJECT_PLAN.md)**: สแกนสลิป, OCR ยอดเงิน, ซิงก์ Google Drive, บันทึก Neon DB
- 🗺 **[แผนงานเวอร์ชันอนาคต (Roadmap)](./docs/ROADMAP.md)**: LIFF Dashboard, ปฏิทินเตือนความจำ, ตรวจยาผู้สูงอายุ, แนะนำเมนูอาหาร
