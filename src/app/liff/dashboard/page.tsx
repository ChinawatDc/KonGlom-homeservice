import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { DollarSign, PieChart, Users, Receipt, ExternalLink, ArrowRightLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // ดึงรายการใช้จ่ายล่าสุด
  let recentExpenses: any[] = [];
  try {
    recentExpenses = await db.select().from(expenses).orderBy(desc(expenses.transactionDate)).limit(50);
  } catch (err) {
    console.error("Error querying expenses:", err);
  }

  // คำนวณสรุปยอด
  const totalAmount = recentExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0);

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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            KonGlom LIFF App
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">📊 รายจ่ายกองกลางครอบครัว</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">อัปเดตล่าสุด</p>
          <p className="text-xs font-medium text-slate-600">
            {new Date().toLocaleDateString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs">ยอดรวมทั้งหมด</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            ฿{totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400">{recentExpenses.length} รายการ</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs">หารเฉลี่ย / คน</span>
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
              <div key={name} className="flex justify-between items-center text-xs bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="font-medium text-slate-200">{name} (จ่ายไป ฿{paid.toLocaleString("th-TH")})</span>
                {diff > 0 ? (
                  <span className="text-emerald-400 font-semibold">+ ได้รับคืน ฿{diff.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                ) : diff < 0 ? (
                  <span className="text-rose-400 font-semibold">- ต้องจ่ายเพิ่ม ฿{Math.abs(diff).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                ) : (
                  <span className="text-slate-400 font-semibold">พอดีเป๊ะ</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
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
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
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
                    {item.category} • {item.bankName || "ธนาคาร"} • {new Date(item.transactionDate || item.createdAt).toLocaleDateString("th-TH")}
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
  );
}
