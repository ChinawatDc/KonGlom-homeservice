import { messagingApi } from "@line/bot-sdk";
import type { SlipData, ReminderData, MedicineData, RecipeData } from "./gemini";

const { MessagingApiClient, MessagingApiBlobClient } = messagingApi;

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

export const lineClient = new MessagingApiClient({ channelAccessToken });
export const lineBlobClient = new MessagingApiBlobClient({ channelAccessToken });

/**
 * ดึงชื่อผู้ส่งจาก LINE Group
 */
export async function getSenderDisplayName(groupId: string, userId?: string): Promise<string> {
  if (!userId || !channelAccessToken) return "สมาชิกในครอบครัว";
  try {
    const profile = await lineClient.getGroupMemberProfile(groupId, userId);
    return profile.displayName || "สมาชิกในครอบครัว";
  } catch {
    return "สมาชิกในครอบครัว";
  }
}

/**
 * Flex Message: แจ้งบันทึกสลิป (Phase 1)
 */
export function buildSlipFlexMessage(slip: SlipData, driveUrl?: string, payerName?: string) {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#06C755",
      contents: [
        {
          type: "text",
          text: "🏡 คนกลม โฮมเซอร์วิส",
          color: "#FFFFFF",
          size: "xs",
          weight: "bold",
        },
        {
          type: "text",
          text: "💰 บันทึกรายจ่ายสำเร็จ",
          color: "#FFFFFF",
          size: "lg",
          weight: "bold",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ยอดเงิน", size: "sm", color: "#8C8C8C", flex: 2 },
            {
              type: "text",
              text: `฿ ${Number(slip.amount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
              size: "xl",
              weight: "bold",
              color: "#1DB446",
              flex: 4,
              align: "end",
            },
          ],
        },
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "หมวดหมู่", size: "sm", color: "#8C8C8C", flex: 2 },
            { type: "text", text: slip.category || "ทั่วไป", size: "sm", weight: "bold", flex: 4, align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ผู้ชำระ", size: "sm", color: "#8C8C8C", flex: 2 },
            { type: "text", text: payerName || slip.sender_name || "สมาชิกในบ้าน", size: "sm", flex: 4, align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ธนาคาร", size: "sm", color: "#8C8C8C", flex: 2 },
            { type: "text", text: slip.bank || "ไม่ระบุ", size: "sm", flex: 4, align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "วันเวลา", size: "sm", color: "#8C8C8C", flex: 2 },
            { type: "text", text: slip.date || "-", size: "xs", color: "#666666", flex: 4, align: "end" },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: {
            type: "uri",
            label: "📁 เปิดดูสลิปใน Google Drive",
            uri: driveUrl || "https://drive.google.com",
          },
        },
      ],
    },
  };
}

/**
 * Flex Message: สรุปเคลียร์เงินกองกลาง (Phase 2)
 */
export function buildSettlementFlexMessage(monthYear: string, total: number, sharePerPerson: number, memberCount: number) {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#2B3A42",
      contents: [
        { type: "text", text: `📊 สรุปยอดกองกลางประจำเดือน ${monthYear}`, color: "#FFFFFF", weight: "bold", size: "md" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: `ยอดรวมทั้งสิ้น: ฿${total.toLocaleString("th-TH")}`,
          weight: "bold",
          size: "lg",
          color: "#E25D5D",
        },
        { type: "text", text: `หารเฉลี่ย (${memberCount} คน): ฿${sharePerPerson.toLocaleString("th-TH")} / คน`, size: "sm" },
        { type: "separator", margin: "md" },
        {
          type: "text",
          text: "กดเปิด Dashboard เพื่อดูรายงานแบบละเอียดและ QR โอนเงิน",
          size: "xs",
          color: "#8C8C8C",
          margin: "sm",
        },
      ],
    },
  };
}

/**
 * Flex Message: แจ้งเตือนนัดหมาย (Phase 3)
 */
export function buildReminderFlexMessage(reminder: ReminderData) {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#F39C12",
      contents: [
        { type: "text", text: "⏰ บันทึกเตือนความจำสำเร็จ", color: "#FFFFFF", weight: "bold", size: "md" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: reminder.title, weight: "bold", size: "lg", wrap: true },
        { type: "text", text: `สำหรับ: ${reminder.target_person || "ทุกคน"}`, size: "sm", margin: "sm", color: "#555" },
        { type: "text", text: `เวลานัด: ${reminder.due_date_time.replace("T", " ")}`, size: "sm", color: "#E67E22", weight: "bold" },
      ],
    },
  };
}

/**
 * Flex Message: ข้อมูลซองยา (Phase 4)
 */
export function buildMedicineFlexMessage(med: MedicineData) {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#3498DB",
      contents: [
        { type: "text", text: "💊 ข้อมูลยาและวิธีรับประทาน", color: "#FFFFFF", weight: "bold", size: "md" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: med.medicine_name, weight: "bold", size: "lg", color: "#2980B9" },
        { type: "text", text: `สรรพคุณ: ${med.indication}`, size: "sm", wrap: true },
        { type: "separator" },
        { type: "text", text: "วิธีรับประทาน:", size: "xs", color: "#7F8C8D" },
        { type: "text", text: med.dosage_instructions, size: "sm", weight: "bold", color: "#27AE60", wrap: true },
        med.warnings ? { type: "text", text: `⚠️ ข้อควรระวัง: ${med.warnings}`, size: "xs", color: "#E74C3C", wrap: true } : { type: "filler" },
      ],
    },
  };
}

/**
 * Flex Message: แนะนำเมนูตู้เย็น (Phase 5)
 */
export function buildRecipeFlexMessage(recipeData: RecipeData) {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#E67E22",
      contents: [
        { type: "text", text: "🍳 เชฟคนกลม แนะนำเมนูมื้อนี้", color: "#FFFFFF", weight: "bold", size: "md" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: recipeData.recommended_recipes.slice(0, 3).map((r, i) => ({
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: `${i + 1}. ${r.title} (${r.time_minutes} นาที)`, weight: "bold", size: "sm", color: "#D35400" },
          { type: "text", text: r.description, size: "xs", color: "#555555", wrap: true },
        ],
      })),
    },
  };
}
