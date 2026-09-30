import Link from "next/link";
import { CheckCircle2, ShieldCheck, Database, Bot, FolderCheck, Calendar, HeartPulse, Refrigerator } from "lucide-react";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ระบบพร้อมใช้งาน (System Active)
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          🏡 KonGlom-homeservice
        </h1>
        <p className="text-lg text-slate-600 mt-2">
          ผู้ช่วยอัจฉริยะประจำครอบครัวบน LINE (คนกลม โฮมเซอร์วิส)
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Phase 1: Smart Slip & Drive</h2>
              <p className="text-sm text-slate-500">สแกนสลิป + ซิงก์ Google Drive อัตโนมัติ</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            ส่งรูปสลิปเข้าห้องแชทไลน์ ระบบจะรัน Gemini 1.5 Flash อ่านยอดเงิน หมวดหมู่ พร้อมอัปโหลดสำเนาเข้า Google Drive และบันทึก Neon Postgres ทันที
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Phase 2: LIFF Dashboard</h2>
              <p className="text-sm text-slate-500">แดชบอร์ดสรุปรายจ่าย & เคลียร์เงิน</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            เปิดดูสรุปกราฟรายจ่ายประจำเดือนแยกตามคนและหมวดหมู่ พร้อมระบบคำนวณหารเงินกองกลาง
          </p>
          <Link
            href="/liff/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition"
          >
            เปิดแดชบอร์ดครอบครัว →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Phase 3: Smart Calendar</h2>
              <p className="text-sm text-slate-500">เตือนความจำด้วยเสียง & Vercel Cron</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            ส่งคลิปเสียงพูด หรือพิมพ์ข้อความใน LINE เช่น <i>"@บอท เตือนพาแม่ไปหาหมอ"</i> ระบบจะแปลงเป็นวันนัดและแจ้งเตือนเข้ากลุ่มอัตโนมัติ
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Phase 4 & 5: Health & Home</h2>
              <p className="text-sm text-slate-500">ซองยา, ข่าวสุขภาพ, ตู้เย็น & ล้างแอร์</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            ถ่ายรูปซองยาอ่านสรรพคุณ, ตรวจเช็กข่าวปลอมทางการแพทย์, สแกนของในตู้เย็นแนะนำเมนูอาหาร และบันทึกรอบล้างแอร์ประจำบ้าน
          </p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-2xl">
        <h3 className="text-lg font-bold mb-2">📌 ข้อมูลการตั้งค่า Webhook สำหรับ LINE Developers</h3>
        <p className="text-sm text-slate-300 mb-3">
          นำ URL นี้ไปกรอกในช่อง <strong>Webhook URL</strong> บน LINE Developers Console:
        </p>
        <div className="bg-slate-800 p-3 rounded-lg font-mono text-sm text-emerald-400 select-all overflow-x-auto">
          https://your-vercel-domain.vercel.app/api/webhook/line
        </div>
      </div>
    </main>
  );
}
