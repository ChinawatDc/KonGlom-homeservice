"use server";

import { db } from "@/db";
import { expenses, familySettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteExpenseAction(
  expenseId: number,
  groupId: string,
  pin?: string
): Promise<{ success: boolean; error?: string }> {
  if (!expenseId || !groupId) {
    return { success: false, error: "ข้อมูลไม่ครบถ้วน" };
  }

  try {
    // ตรวจสอบความถูกต้องของรหัส PIN หากบ้านนี้มีการตั้งรหัสไว้
    const fam = await db
      .select()
      .from(familySettings)
      .where(eq(familySettings.groupId, groupId))
      .limit(1);

    if (fam[0]?.familyPin && fam[0].familyPin !== pin) {
      return { success: false, error: "รหัส PIN ไม่ถูกต้อง ไม่สามารถลบรายการได้ครับ" };
    }

    await db
      .delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)));

    revalidatePath("/liff/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("deleteExpenseAction Error:", err);
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการลบรายการ" };
  }
}
