import { NextResponse } from "next/server";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { lineClient } from "@/lib/line";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron Job: รันทุก 10 นาที หรือ 1 ชั่วโมง ตรวจจับนัดหมายที่ถึงกำหนด
 */
export async function GET(req: Request) {
  // ตรวจสอบ Authorization header กับ CRON_SECRET ของ Vercel
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // ดึงรายการที่ค้างแจ้งเตือนและถึงเวลาแล้ว
    const pendingReminders = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.status, "pending"), lte(reminders.dueDateTime, now)))
      .limit(20);

    let sentCount = 0;

    for (const item of pendingReminders) {
      if (item.groupId && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        try {
          await lineClient.pushMessage({
            to: item.groupId,
            messages: [
              {
                type: "text",
                text: `⏰ [แจ้งเตือนครอบครัว]\nถึงเวลานัดหมายแล้วครับ:\n\n📌 "${item.title}"\n👤 ผู้เกี่ยวข้อง: ${item.targetPerson || "ทุกคน"}\n🕒 วันเวลา: ${item.dueDateTime.toLocaleString("th-TH")}`,
              },
            ],
          });

          // อัปเดตสถานะเป็น notified
          await db
            .update(reminders)
            .set({ status: "notified" })
            .where(eq(reminders.id, item.id));

          sentCount++;
        } catch (pushErr) {
          console.error(`Failed to push reminder ID ${item.id}:`, pushErr);
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      processed: pendingReminders.length,
      sent: sentCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
