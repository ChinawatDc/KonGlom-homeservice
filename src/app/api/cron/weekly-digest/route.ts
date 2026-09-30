import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, familySettings } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { lineClient, buildWeeklyDigestFlexMessage } from "@/lib/line";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron Job: สรุปภาพรวมรายจ่ายประจำสัปดาห์ (Weekly Digest)
 * รันทุกวันอาทิตย์ เวลา 09:00 น. (0 2 * * 0 UTC)
 */
export async function GET(req: Request) {
  // ตรวจสอบ Authorization header กับ CRON_SECRET ของ Vercel
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kon-glom-homeservice.vercel.app";

  try {
    const families = await db.select().from(familySettings);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thaiMonthNames = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const formatThaiDate = (d: Date) =>
      `${d.getDate()} ${thaiMonthNames[d.getMonth()]} ${d.getFullYear() + 543}`;

    const startDateStr = formatThaiDate(sevenDaysAgo);
    const endDateStr = formatThaiDate(now);

    let sentCount = 0;
    let skippedCount = 0;

    for (const family of families) {
      if (!family.groupId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) continue;

      // ดึงรายจ่าย 7 วันล่าสุดของครอบครัวนี้
      const recentExpenses = await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.groupId, family.groupId),
            gte(expenses.transactionDate, sevenDaysAgo)
          )
        );

      if (recentExpenses.length === 0) {
        skippedCount++;
        continue;
      }

      let totalAmount = 0;
      const categoryMap = new Map<string, number>();
      const userMap = new Map<string, number>();

      for (const exp of recentExpenses) {
        const amt = parseFloat(exp.amount) || 0;
        totalAmount += amt;

        const cat = exp.category || "ทั่วไป";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + amt);

        const usr = exp.userName || "สมาชิกในบ้าน";
        userMap.set(usr, (userMap.get(usr) || 0) + amt);
      }

      // หาหมวดที่จ่ายเยอะที่สุด
      let topCategory = "";
      let topCategoryAmount = 0;
      for (const [cat, amt] of categoryMap.entries()) {
        if (amt > topCategoryAmount) {
          topCategory = cat;
          topCategoryAmount = amt;
        }
      }

      // หาผู้ใช้ที่จ่ายเยอะที่สุด
      let topSpender = "";
      let topSpenderAmount = 0;
      for (const [usr, amt] of userMap.entries()) {
        if (amt > topSpenderAmount) {
          topSpender = usr;
          topSpenderAmount = amt;
        }
      }

      const dashboardUrl = `${appUrl}/liff/dashboard?groupId=${encodeURIComponent(family.groupId)}`;
      const flexContents = buildWeeklyDigestFlexMessage({
        familyName: family.familyName || "บ้านก้อนกลม",
        startDate: startDateStr,
        endDate: endDateStr,
        totalAmount,
        transactionCount: recentExpenses.length,
        topCategory: topCategory || undefined,
        topCategoryAmount: topCategoryAmount || undefined,
        topSpender: topSpender || undefined,
        topSpenderAmount: topSpenderAmount || undefined,
        dashboardUrl,
      });

      try {
        await lineClient.pushMessage({
          to: family.groupId,
          messages: [
            {
              type: "flex",
              altText: `📈 สรุปรายจ่ายประจำสัปดาห์: ${family.familyName} รวม ฿${totalAmount.toLocaleString("th-TH")}`,
              contents: flexContents as any,
            },
          ],
        });
        sentCount++;
      } catch (pushErr) {
        console.error(`Failed to push weekly digest for group ${family.groupId}:`, pushErr);
      }
    }

    return NextResponse.json({
      status: "ok",
      processedFamilies: families.length,
      sent: sentCount,
      skippedNoExpenses: skippedCount,
    });
  } catch (err: any) {
    console.error("Weekly digest cron error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}
