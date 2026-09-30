import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Receipt,
  PieChart,
  CalendarClock,
  HeartHandshake,
  Refrigerator,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  Bot,
  Lock,
  Users2,
  FolderLock,
  HelpCircle,
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Background Hero Image with Ambient Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/background.png"
          alt="KonGlom Home Background"
          fill
          priority
          className="object-cover object-center opacity-25 filter blur-[2px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/90 to-slate-950" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Navigation Bar */}
        <header className="max-w-6xl w-full mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40">
              <Image
                src="/icon.png"
                alt="คนกลม Logo"
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                คนกลม <span className="text-emerald-400 font-medium text-sm">HomeService</span>
              </span>
              <span className="text-xs text-slate-400 block -mt-0.5">ผู้ช่วยอัจฉริยะประจำครอบครัว</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ระบบออนไลน์ (Online)
            </div>
            <Link
              href="/liff/dashboard?demo=true"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all duration-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              ดูตัวอย่างแดชบอร์ด
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-5xl w-full mx-auto px-4 pt-6 pb-16 flex-1 flex flex-col justify-center">
          <div className="text-center max-w-3xl mx-auto mb-14">
            {/* Mascot Icon Centerpiece */}
            <div className="relative w-28 h-28 mx-auto mb-6 drop-shadow-2xl">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-xl animate-pulse"></div>
              <div className="relative w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-emerald-400/40 shadow-2xl bg-white/5 backdrop-blur-md">
                <Image
                  src="/icon.png"
                  alt="คนกลม Mascot Icon"
                  fill
                  sizes="112px"
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-emerald-400 text-xs font-semibold mb-4 backdrop-blur-sm shadow-inner">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              SaaS Ready • แยกข้อมูลกลุ่มครอบครัวแบบ 100% Multi-Tenant Isolation
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              คนกลม <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">HomeService</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              LINE Official Account ผู้ช่วยส่วนตัวประจำครอบครัว จัดการสลิป บิล PDF เคลียร์เงินกองกลาง เตือนความจำ และดูแลสุขภาพ ปลอดภัยด้วยระบบกั้นข้อมูลส่วนตัวรายบ้าน
            </p>

            {/* Quick Actions (Secured - No direct public leak!) */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/liff/dashboard?demo=true"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                ชมหน้าตาแดชบอร์ดจำลอง (Interactive Demo)
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>

              <a
                href="#how-to-use"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-medium text-sm backdrop-blur-sm transition-all duration-200"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" />
                วิธีเปิดดูแดชบอร์ดจริงของบ้านคุณ
              </a>
            </div>
          </div>

          {/* SaaS & Privacy Architecture Box */}
          <div className="mb-14 p-6 sm:p-8 rounded-3xl bg-slate-800/40 border border-emerald-500/30 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  ความเป็นส่วนตัวและความปลอดภัยระดับสูงสุด
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  สถาปัตยกรรมข้อมูลส่วนบุคคล (Multi-Tenant Architecture)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  เมื่อคุณแอดบอทเข้ากลุ่มครอบครัว ระบบจะแยกข้อมูลของบ้านคุณออกจากบ้านอื่นอย่างสิ้นเชิง ไม่มีใครสามารถเข้าถึงสลิป รายจ่าย หรือยอดเงินของครอบครัวคุณจากภายนอกได้
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto shrink-0">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                  <Users2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-white">แยกตามกลุ่ม 100%</p>
                    <p className="text-slate-400 text-[11px]">ไม่ปะปนกับบ้านอื่น</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                  <FolderLock className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-white">Google Drive ส่วนตัว</p>
                    <p className="text-slate-400 text-[11px]">แยกโฟลเดอร์ตามเดือน</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-14">
            {/* Card 1: Slip OCR & Drive */}
            <div className="p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-white text-base mb-1 flex items-center gap-1.5">
                สแกนสลิป & บิล PDF
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">Auto</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                ส่งรูปสลิปหรือไฟล์ PDF เข้ากลุ่ม บอทอ่านยอดเงิน เช็กสลิปซ้ำ (Duplicate Guard) และสำรองเข้า Google Drive แยกโฟลเดอร์ทันที
              </p>
            </div>

            {/* Card 2: Settlement Dashboard */}
            <div className="p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <PieChart className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-white text-base mb-1 flex items-center gap-1.5">
                เคลียร์เงิน & แดชบอร์ด
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-normal">Private</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                พิมพ์ &quot;@บอท เคลียร์เงิน&quot; เพื่อสรุปยอด หรือพิมพ์ &quot;@บอท แดชบอร์ด&quot; เพื่อรับลิงก์เปิดดูกราฟส่วนตัวเฉพาะสมาชิกในบ้าน
              </p>
            </div>

            {/* Card 3: Voice / Text Reminders */}
            <div className="p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <CalendarClock className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-white text-base mb-1">
                เตือนความจำด้วยเสียง
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                ส่งคลิปเสียงพูด หรือพิมพ์นัดหมาย เช่น &quot;@บอท เตือนพาแม่ไปหาหมอ&quot; ระบบจะตั้งเตือนและแจ้งเตือนเข้ากลุ่มอัตโนมัติ
              </p>
            </div>

            {/* Card 4: Medicine & Health Claims */}
            <div className="p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-white text-base mb-1">
                สแกนซองยา & ตรวจสุขภาพ
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                ถ่ายรูปซองยาเพื่ออ่านวิธีรับประทาน และพิมพ์เช็กข่าวสารสุขภาพที่น่าสงสัย เพื่อให้ AI ตรวจสอบข้อเท็จจริง
              </p>
            </div>

            {/* Card 5: Smart Fridge & Food Ideas */}
            <div className="p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Refrigerator className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-white text-base mb-1">
                สแกนตู้เย็น & แนะนำเมนู
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                ถ่ายรูปของสดในตู้เย็น หรือพิมพ์ &quot;@บอท กินไรดี&quot; ระบบจะช่วยแนะนำเมนูอาหารจากวัตถุดิบที่มีในบ้าน
              </p>
            </div>

            {/* Card 6: Tax & Fraud Guard */}
            <div className="p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-white text-base mb-1 flex items-center gap-1.5">
                หมวดลดหย่อนภาษี
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-normal">Auto</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                คัดแยกค่ารักษาพยาบาล เบี้ยประกัน และบริจาคสำหรับใช้ลดหย่อนภาษีสิ้นปีอัตโนมัติ รวบรวมหลักฐานครบถ้วน
              </p>
            </div>
          </div>

          {/* Quick Guide / How to use */}
          <div id="how-to-use" className="rounded-3xl bg-slate-800/40 border border-slate-700/60 p-6 sm:p-8 backdrop-blur-md scroll-mt-8">
            <h3 className="font-bold text-white text-base sm:text-lg mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              วิธีเรียกใช้งานบอทในห้องแชท LINE อย่างปลอดภัย
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs shrink-0">@บอท แดชบอร์ด</span>
                <span>รับลิงก์ส่วนตัวเข้าสู่แดชบอร์ดรายจ่ายของครอบครัวคุณ</span>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs shrink-0">@บอท เคลียร์เงิน</span>
                <span>สรุปยอดรายจ่ายของทุกคน และวิธีโอนเงินชดเชย</span>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs shrink-0">ส่งรูปสลิป / PDF</span>
                <span>อ่านยอดและสำรองเข้า Google Drive ในโฟลเดอร์ของบ้าน</span>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs shrink-0">@บอท</span>
                <span>ดูเมนูคำสั่งและคู่มือการใช้งานทั้งหมดที่บอทรองรับ</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm py-6 text-center text-xs text-slate-400">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-medium text-slate-300">คนกลม HomeService (KonGlom)</span>
              <span>— ระบบผู้ช่วยประจำบ้าน</span>
            </div>
            <p>© 2026 KonGlom-homeservice • Next.js 15 & Neon Serverless DB</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
