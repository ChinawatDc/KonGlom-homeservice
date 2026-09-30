import Link from "next/link";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  DollarSign,
  PieChart,
  Users,
  Receipt,
  ExternalLink,
  ArrowRightLeft,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  Lock,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{
    groupId?: string;
    demo?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { groupId, demo } = await searchParams;
  const isDemo = demo === "true";

  // =========================================================================
  // 1. กรณีคนนอกเข้าผ่าน URL ตรง โดยไม่มี groupId และไม่ได้อยู่ในโหมด Demo
  //    -> แสดงหน้าล็อกความปลอดภัย (Security Gate) เพื่อรักษาความเป็นส่วนตัว
  // =========================================================================
  if (!groupId && !isDemo) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Private Family Vault
          </span>

          <h1 className="text-xl sm:text-2xl font-bold text-white mt-3 mb-2">
            พื้นที่ส่วนตัวเฉพาะครอบครัว
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-normal">
            เพื่อความปลอดภัยและความเป็นส่วนตัวสูงสุด ข้อมูลรายจ่าย สลิปโอนเงิน และการคำนวณเงินกองกลางจะเปิดดูได้เฉพาะสมาชิกครอบครัวที่กดเข้าผ่านห้องแชท LINE ของบ้านเท่านั้นครับ
          </p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
              <MessageSquare className="w-4 h-4" />
              วิธีเปิดดูแดชบอร์ดจริงของบ้านคุณ:
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              1. เปิดแอป LINE เข้ากลุ่มแชทครอบครัวของคุณ
            </p>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              2. พิมพ์ข้อความหาบอท: <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-mono font-bold">@บอท แดชบอร์ด</code>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              3. บอทจะส่งลิงก์ส่วนตัวที่ผูกกับบ้านของคุณให้ทันที
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/liff/dashboard?demo=true"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200"
            >
              <Sparkles className="w-4 h-4" />
              ชมหน้าตาแดชบอร์ดตัวอย่าง (Interactive Demo)
            </Link>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ดึงข้อมูลจริง (แยกตาม groupId) หรือโหลดข้อมูลจำลอง (Demo Mode)
  // =========================================================================
  let recentExpenses: any[] = [];

  if (isDemo) {
    // ข้อมูลจำลองสำหรับโหมด Demo
    recentExpenses = [
      {
        id: 1,
        userName: "คุณพ่อ",
        category: "ค่าน้ำค่าไฟ",
        amount: "1450.50",
        bankName: "KBANK",
        transactionDate: new Date(Date.now() - 3600000 * 2),
        driveUrl: null,
      },
      {
        id: 2,
        userName: "คุณแม่",
        category: "อาหาร",
        amount: "890.00",
        bankName: "SCB",
        transactionDate: new Date(Date.now() - 3600000 * 24),
        driveUrl: null,
      },
      {
        id: 3,
        userName: "ลูกสาว",
        category: "ของใช้ในบ้าน",
        amount: "520.00",
        bankName: "PromptPay",
        transactionDate: new Date(Date.now() - 3600000 * 48),
        driveUrl: null,
      },
      {
        id: 4,
        userName: "คุณแม่",
        category: "สุขภาพ/ยา",
        amount: "350.00",
        bankName: "KTB",
        transactionDate: new Date(Date.now() - 3600000 * 72),
        driveUrl: null,
      },
    ];
  } else if (groupId) {
    // ดึงเฉพาะของกลุ่มครอบครัวนี้เท่านั้น (Strict Multi-Tenant Isolation)
    try {
      recentExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.groupId, groupId))
        .orderBy(desc(expenses.transactionDate))
        .limit(50);
    } catch (err) {
      console.error("Error querying expenses for group:", err);
    }
  }

  // คำนวณสรุปยอด
  const totalAmount = recentExpenses.reduce(
    (acc, curr) => acc + parseFloat(curr.amount || "0"),
    0
  );

  // สรุปแยกตามหมวดหมู่
  const categorySummary: Record<string, number> = {};
  recentExpenses.forEach((item) => {
    const cat = item.category || "ทั่วไป";
    categorySummary[cat] = (categorySummary[cat] || 0) + parseFloat(item.amount || "0");
  });

  // สรุปยอดตามสมาชิกที่จ่าย
  const memberSummary: Record<string, number> = {};
  recentExpenses.forEach((item) => {
    const name = item.userName || "สมาชิกในครอบครัว";
    memberSummary[name] = (memberSummary[name] || 0) + parseFloat(item.amount || "0");
  });

  const memberNames = Object.keys(memberSummary);
  const memberCount = Math.max(1, memberNames.length);
  const averagePerMember = totalAmount / memberCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Banner สำหรับโหมด Demo */}
      {isDemo && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 text-xs text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>โหมดตัวอย่าง (Demo Preview) • ข้อมูลที่แสดงเป็นเพียงข้อมูลจำลองสำหรับทดสอบ</span>
          <Link href="/" className="underline ml-2 font-bold text-amber-100 hover:text-white">
            กลับหน้าแรก
          </Link>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {isDemo ? "Demo Family Vault" : "Private Family Vault"}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
              📊 รายจ่ายกองกลางครอบครัว
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">อัปเดตล่าสุด</p>
            <p className="text-xs font-medium text-slate-600">
              {new Date().toLocaleDateString("th-TH", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium">ยอดรวมทั้งหมด</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              ฿{totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400">{recentExpenses.length} รายการ</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium">หารเฉลี่ย / คน</span>
            </div>
            <p className="text-xl font-extrabold text-blue-600">
              ฿{averagePerMember.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400">คำนวณจาก {memberCount} สมาชิก</span>
          </div>
        </div>

        {/* Settle Up Calculation */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl mb-6 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm">การเคลียร์เงินกองกลาง (Settle-Up)</h2>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            เฉลี่ยคนละ <strong>฿{averagePerMember.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</strong>
          </p>

          <div className="space-y-2">
            {memberNames.map((name) => {
              const paid = memberSummary[name] || 0;
              const diff = paid - averagePerMember;
              return (
                <div
                  key={name}
                  className="flex justify-between items-center text-xs bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80"
                >
                  <span className="font-medium text-slate-200">
                    {name} (จ่ายไป ฿{paid.toLocaleString("th-TH", { minimumFractionDigits: 2 })})
                  </span>
                  {diff > 0 ? (
                    <span className="text-emerald-400 font-semibold">
                      + ได้รับคืน ฿{diff.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  ) : diff < 0 ? (
                    <span className="text-rose-400 font-semibold">
                      - ต้องจ่ายเพิ่ม ฿{Math.abs(diff).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">พอดีเป๊ะ</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-sm text-slate-900">แยกตามหมวดหมู่</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(categorySummary).map(([cat, amount]) => {
              const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : "0";
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{cat}</span>
                    <span className="text-slate-500 font-semibold">
                      ฿{amount.toLocaleString("th-TH")} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-sm text-slate-900">ประวัติสลิปและรายการย้อนหลัง</h2>
          </div>

          {recentExpenses.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">
              ยังไม่มีรายการสลิป ส่งรูปสลิปเข้าห้องแชท LINE เพื่อเริ่มบันทึก
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentExpenses.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{item.userName || "สมาชิก"}</p>
                    <p className="text-slate-400 text-[11px]">
                      {item.category} • {item.bankName || "ธนาคาร"} •{" "}
                      {new Date(item.transactionDate || item.createdAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      ฿{parseFloat(item.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                    {item.driveUrl && (
                      <a
                        href={item.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="ดูใน Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
