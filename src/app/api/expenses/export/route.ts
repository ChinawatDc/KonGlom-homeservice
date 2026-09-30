import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, familySettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const pin = searchParams.get("pin");

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    // ตรวจสอบความถูกต้องของรหัส PIN หากบ้านนี้มีการตั้งรหัสไว้
    const fam = await db
      .select()
      .from(familySettings)
      .where(eq(familySettings.groupId, groupId))
      .limit(1);

    const family = fam[0];
    if (family?.familyPin && family.familyPin !== pin) {
      return NextResponse.json({ error: "Unauthorized: PIN ไม่ถูกต้อง" }, { status: 401 });
    }

    const familyName = family?.familyName || "บ้านก้อนกลม";

    // ดึงรายการรายจ่ายทั้งหมดของครอบครัวนี้
    const items = await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))
      .orderBy(desc(expenses.transactionDate));

    // สร้างข้อมูล CSV พร้อม UTF-8 BOM (\uFEFF) เพื่อให้เปิดใน Microsoft Excel และ Numbers ภาษาไทยไม่เพี้ยน
    const headers = [
      "ลำดับ",
      "วันที่ทำรายการ",
      "หมวดหมู่",
      "ผู้ชำระเงิน",
      "ยอดเงิน (บาท)",
      "ธนาคาร/ช่องทาง",
      "เลขอ้างอิงธุรกรรม",
      "สิทธิลดหย่อนภาษี",
      "หมวดหมู่ภาษี",
      "ลิงก์ไฟล์ Google Drive",
    ];

    const rows = items.map((item, index) => {
      const dateStr = item.transactionDate
        ? new Date(item.transactionDate).toISOString().replace("T", " ").slice(0, 19)
        : "";
      return [
        index + 1,
        `"${dateStr}"`,
        `"${item.category || "ทั่วไป"}"`,
        `"${item.userName || "สมาชิก"}"`,
        parseFloat(item.amount).toFixed(2),
        `"${item.bankName || ""}"`,
        `"${item.transactionRef || ""}"`,
        item.isTaxDeductible ? "ใช่" : "ไม่ใช่",
        `"${item.taxCategory || ""}"`,
        `"${item.driveUrl || ""}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const safeFamilyName = encodeURIComponent(familyName.replace(/\s+/g, "_"));
    const filename = `expenses_${safeFamilyName}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Export Expenses CSV Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
