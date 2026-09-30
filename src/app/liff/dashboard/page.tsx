import Link from "next/link";
import { db } from "@/db";
import { expenses, familySettings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  DollarSign,
  PieChart,
  Users,
  Receipt,
  ExternalLink,
  ArrowRightLeft,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  PiggyBank,
  Download,
} from "lucide-react";
import { DeleteExpenseButton } from "./DeleteExpenseButton";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{
    groupId?: string;
    demo?: string;
    pin?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { groupId, demo, pin } = await searchParams;
  const isDemo = demo === "true";

  // =========================================================================
  // 1. ดึงข้อมูลการตั้งค่าบ้าน (Multi-Tenant Family Settings)
  // =========================================================================
  let familyInfo: any = null;
  if (groupId) {
    try {
      const res = await db
        .select()
        .from(familySettings)
        .where(eq(familySettings.groupId, groupId))
        .limit(1);
      familyInfo = res[0] || null;
    } catch (err) {
      console.error("Error querying familySettings:", err);
    }
  }

  // =========================================================================
  // 2. Security Gate: กรณีเปิดผ่าน URL ตรงโดยไม่มี groupId และไม่ใช่โหมด Demo
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
              2. พิมพ์ข้อความหาบอท: <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-mono font-bold">@กลม แดชบอร์ด</code>
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
  // 3. PIN Lock Screen: ตรวจสอบความถูกต้องของรหัส PIN (Pillar 1)
  // =========================================================================
  const hasPinConfigured = Boolean(familyInfo?.familyPin);
  const isPinValid = hasPinConfigured && pin === familyInfo.familyPin;

  if (groupId && !isDemo && hasPinConfigured && !isPinValid) {
    const isIncorrectAttempt = Boolean(pin);
    const familyDisplayName = familyInfo?.familyName || "ครอบครัวคนกลม";

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-lg">
            <KeyRound className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Protected Family Vault
          </span>

          <h1 className="text-xl sm:text-2xl font-bold text-white mt-3 mb-1">
            {familyDisplayName}
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            ป้อนรหัส PIN ประจำบ้านเพื่อเข้าถึงข้อมูลรายจ่าย
          </p>

          {isIncorrectAttempt && (
            <div className="flex items-center gap-2 p-3 mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>รหัส PIN ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง</span>
            </div>
          )}

          <form method="GET" action="/liff/dashboard" className="space-y-4 mb-6">
            <input type="hidden" name="groupId" value={groupId} />
            <div>
              <input
                type="password"
                name="pin"
                maxLength={20}
                required
                autoFocus
                placeholder="••••"
                className="w-full text-center tracking-[0.4em] text-2xl font-mono py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200"
            >
              ปลดล็อกเข้าสู่แดชบอร์ด
            </button>
          </form>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left mb-6 text-xs text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              ยังไม่มีรหัสหรือลืมรหัส PIN?
            </p>
            <p>
              สมาชิกสามารถดูหรือตั้งรหัสใหม่ได้โดยพิมพ์ในกลุ่มแชท LINE:
            </p>
            <code className="block mt-1.5 bg-slate-800 p-2 rounded-lg text-emerald-300 font-mono text-center">
              @กลม ตั้งรหัส [PIN ใหม่]
            </code>
          </div>

          <div className="space-y-2">
            <Link
              href="/liff/dashboard?demo=true"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              ดูหน้าตาตัวอย่าง (Interactive Demo)
            </Link>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 font-medium text-xs transition"
            >
              <ArrowLeft className="w-3 h-3" />
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. ดึงข้อมูลจริง (แยกตาม groupId) หรือโหลดข้อมูลจำลอง (Demo Mode)
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

  // งบประมาณรายเดือน (ถ้ามีการตั้งไว้)
  const monthlyBudget = familyInfo?.monthlyBudget ? parseFloat(familyInfo.monthlyBudget) : 0;
  const budgetPercentage = monthlyBudget > 0 ? Math.min(100, (totalAmount / monthlyBudget) * 100) : 0;

  const familyDisplayName = familyInfo?.familyName || (isDemo ? "ครอบครัวตัวอย่าง (Demo)" : "ครอบครัวคนกลม");

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
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {familyDisplayName}
              </span>

              {hasPinConfigured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  PIN Protected
                </span>
              )}

              {!hasPinConfigured && !isDemo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium">
                  💡 แนะนำ: พิมพ์ @กลม ตั้งรหัส ใน LINE เพื่อล็อค
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
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

        {/* Monthly Budget Progress (ถ้ามีการตั้งงบไว้) */}
        {monthlyBudget > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-amber-500" />
                งบประมาณรายเดือน
              </span>
              <span className="text-slate-500">
                ฿{totalAmount.toLocaleString("th-TH")} / ฿{monthlyBudget.toLocaleString("th-TH")} ({budgetPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetPercentage > 90 ? "bg-rose-500" : budgetPercentage > 75 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
          </div>
        )}

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              <h2 className="font-bold text-sm text-slate-900">ประวัติสลิปและรายการย้อนหลัง</h2>
            </div>
            {recentExpenses.length > 0 && groupId && (
              <a
                href={`/api/expenses/export?groupId=${encodeURIComponent(groupId)}${pin ? `&pin=${encodeURIComponent(pin)}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/70 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก Excel</span>
              </a>
            )}
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
                    {!isDemo && groupId && (
                      <DeleteExpenseButton
                        expenseId={item.id}
                        groupId={groupId}
                        pin={pin}
                        expenseTitle={`${item.category} ฿${parseFloat(item.amount).toLocaleString("th-TH")}`}
                      />
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
