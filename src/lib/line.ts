import { messagingApi } from "@line/bot-sdk";
import type { SlipData, ReminderData, MedicineData, RecipeData, DocumentSummary } from "./gemini";

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

/**
 * Flex Message: สรุปและจัดเก็บเอกสาร PDF / เอกสารทั่วไป
 */
export function buildDocumentSummaryFlexMessage(
  doc: DocumentSummary,
  driveUrl?: string,
  folderPath?: string
) {
  const contents: any[] = [
    { type: "text", text: doc.doc_title, weight: "bold", size: "lg", color: "#1E293B", wrap: true },
    {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "หมวดหมู่", size: "xs", color: "#64748B", flex: 2 },
        { type: "text", text: doc.doc_category, size: "xs", weight: "bold", color: "#0EA5E9", flex: 4, align: "end" },
      ],
    },
  ];

  if (doc.amount) {
    contents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "ยอดเงิน", size: "xs", color: "#64748B", flex: 2 },
        {
          type: "text",
          text: `฿ ${Number(doc.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
          size: "sm",
          weight: "bold",
          color: "#E11D48",
          flex: 4,
          align: "end",
        },
      ],
    });
  }

  if (doc.due_date) {
    contents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "กำหนดชำระ", size: "xs", color: "#64748B", flex: 2 },
        { type: "text", text: doc.due_date, size: "xs", weight: "bold", color: "#D97706", flex: 4, align: "end" },
      ],
    });
  }

  contents.push(
    { type: "separator", margin: "md" },
    { type: "text", text: "📝 สรุปสาระสำคัญ:", size: "xs", color: "#64748B", margin: "md" },
    { type: "text", text: doc.summary, size: "sm", color: "#334155", wrap: true },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        { type: "text", text: "📁 ไดรฟ์", size: "xxs", color: "#94A3B8", flex: 2 },
        { type: "text", text: folderPath || "Google Drive", size: "xxs", color: "#64748B", flex: 5, align: "end" },
      ],
    }
  );

  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0EA5E9",
      contents: [
        { type: "text", text: "🏡 คนกลม โฮมเซอร์วิส", color: "#FFFFFF", size: "xs", weight: "bold" },
        { type: "text", text: "📄 จัดเก็บเอกสารและสรุปสำเร็จ", color: "#FFFFFF", size: "md", weight: "bold", margin: "xs" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents,
    },
    footer: driveUrl
      ? {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "link",
              height: "sm",
              action: {
                type: "uri",
                label: "เปิดดูเอกสารบน Google Drive ↗",
                uri: driveUrl,
              },
            },
          ],
        }
      : undefined,
  };
}

/**
 * Flex Message: ส่งลิงก์เข้าสู่แดชบอร์ดส่วนตัวของบ้านอย่างปลอดภัย
 */
export function buildDashboardLinkFlexMessage(
  dashboardUrl: string,
  familyName: string = "ครอบครัวคนกลม",
  isPinProtected: boolean = false
) {
  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1E293B",
      contents: [
        { type: "text", text: `🏡 ${familyName}`, color: "#10B981", size: "xs", weight: "bold" },
        { type: "text", text: "📊 แดชบอร์ดรายจ่ายของบ้าน", color: "#FFFFFF", size: "md", weight: "bold", margin: "xs" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: isPinProtected
            ? "🔒 แดชบอร์ดนี้มีการป้องกันด้วยรหัส PIN ประจำบ้าน เพื่อความปลอดภัยสูงสุดของข้อมูลครอบครัว"
            : "🔒 ลิงก์นี้ผูกกับกลุ่มครอบครัวของคุณโดยเฉพาะ เพื่อความปลอดภัยและความเป็นส่วนตัวของบ้าน",
          size: "xs",
          color: "#64748B",
          wrap: true,
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
          color: "#10B981",
          height: "sm",
          action: {
            type: "uri",
            label: "เปิดดูแดชบอร์ดครอบครัว ↗",
            uri: dashboardUrl,
          },
        },
      ],
    },
  };
}

export interface FamilySettingsInfo {
  familyName: string;
  familyPin?: string | null;
  adminLineUserId?: string | null;
  adminName?: string | null;
  driveFolderId?: string | null;
  subscriptionPlan?: string | null;
  monthlyBudget?: string | null;
}

/**
 * สร้าง Flex Message การตั้งค่าและข้อมูลบ้าน (Multi-Family SaaS)
 */
export function buildFamilySettingsFlexMessage(info: FamilySettingsInfo) {
  const isPinSet = Boolean(info.familyPin);
  const pinDisplay = isPinSet ? `ตั้งแล้ว (${info.familyPin?.length} หลัก)` : "ยังไม่ได้ตั้งรหัส";
  const driveDisplay = info.driveFolderId
    ? `ไดรฟ์เฉพาะบ้าน (${info.driveFolderId.slice(0, 10)}...)`
    : "โฟลเดอร์ส่วนกลาง";

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F172A",
      contents: [
        { type: "text", text: "⚙️ ข้อมูลและการตั้งค่าบ้าน", color: "#10B981", size: "xs", weight: "bold" },
        { type: "text", text: info.familyName, color: "#FFFFFF", size: "lg", weight: "bold", margin: "xs" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "🔒 รหัส PIN ป้องกัน:", size: "xs", color: "#94A3B8", flex: 5 },
            {
              type: "text",
              text: pinDisplay,
              size: "xs",
              color: isPinSet ? "#10B981" : "#F59E0B",
              weight: "bold",
              flex: 5,
              align: "end",
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "👑 หัวหน้าบ้าน (Admin):", size: "xs", color: "#94A3B8", flex: 5 },
            {
              type: "text",
              text: info.adminName || (info.adminLineUserId ? `${info.adminLineUserId.slice(0, 8)}...` : "ยังไม่ระบุ"),
              size: "xs",
              color: "#F8FAFC",
              flex: 5,
              align: "end",
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "📁 Google Drive:", size: "xs", color: "#94A3B8", flex: 5 },
            { type: "text", text: driveDisplay, size: "xs", color: "#38BDF8", flex: 5, align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "⭐ แผนบริการ:", size: "xs", color: "#94A3B8", flex: 5 },
            {
              type: "text",
              text: (info.subscriptionPlan || "free").toUpperCase(),
              size: "xs",
              color: "#A855F7",
              weight: "bold",
              flex: 5,
              align: "end",
            },
          ],
        },
        {
          type: "separator",
          margin: "md",
        },
        {
          type: "text",
          text: "💡 คำสั่งตั้งค่าสำหรับบ้าน:\n• @บอท ตั้งชื่อบ้าน [ชื่อ]\n• @บอท ตั้งรหัส [PIN 4-6 หลัก]\n• @บอท ตั้งไดรฟ์ [Folder ID หรือ URL]",
          size: "xxs",
          color: "#64748B",
          wrap: true,
          margin: "sm",
        },
      ],
    },
  };
}

export interface BatchFileItem {
  fileName: string;
  fileType: string;
  docCategory?: string | null;
  docTitle?: string | null;
  amount?: string | number | null;
  driveUrl?: string | null;
  isExpense?: boolean | null;
}

/**
 * Flex Message: สรุปการสำรองไฟล์เป็นชุด (Batch Ingestion) หลังคูลดาวน์
 */
export function buildBatchSummaryFlexMessage(
  files: BatchFileItem[],
  groupId: string,
  folderUrl: string = "https://drive.google.com/drive/u/0/folders/1WinPhipplh6_xISDEtE6UIffrfKCUt7K"
) {
  const imageCount = files.filter((f) => f.fileType === "image").length;
  const pdfCount = files.filter((f) => f.fileType === "pdf").length;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kon-glom-homeservice.vercel.app";
  const dashboardUrl = `${appUrl}/liff/dashboard?groupId=${encodeURIComponent(groupId)}`;

  const fileRows: any[] = files.slice(0, 6).map((f) => {
    let icon = "📄";
    let label = f.docTitle || f.fileName;
    let badgeColor = "#64748B";
    let badgeText = "เอกสาร";

    if (f.docCategory === "payslip") {
      icon = "💵";
      badgeText = "สลิปเงินเดือน";
      badgeColor = "#0284C7"; // Sky blue
    } else if (f.docCategory === "expense_slip") {
      icon = "🧾";
      badgeText = "สลิปโอนเงิน";
      badgeColor = "#10B981"; // Emerald green
    } else if (f.docCategory === "bill") {
      icon = "📑";
      badgeText = "บิลรอชำระ";
      badgeColor = "#F59E0B"; // Amber
    } else if (f.docCategory === "medical") {
      icon = "💊";
      badgeText = "ยา/สุขภาพ";
      badgeColor = "#E11D48"; // Rose
    } else if (f.fileType === "image") {
      icon = "📸";
      badgeText = "รูปภาพ";
      badgeColor = "#8B5CF6";
    }

    return {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        { type: "text", text: icon, size: "sm", flex: 0 },
        {
          type: "box",
          layout: "vertical",
          flex: 4,
          contents: [
            { type: "text", text: label, size: "xs", weight: "bold", color: "#1E293B", wrap: true },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: badgeText, size: "xxs", color: badgeColor, weight: "bold" },
                f.amount
                  ? {
                      type: "text",
                      text: ` • ฿${Number(f.amount).toLocaleString("th-TH")}`,
                      size: "xxs",
                      color: "#475569",
                      align: "start",
                    }
                  : { type: "filler" },
              ],
            },
          ],
        },
      ],
    };
  });

  if (files.length > 6) {
    fileRows.push({
      type: "text",
      text: `... และอีก ${files.length - 6} ไฟล์ใน Google Drive`,
      size: "xxs",
      color: "#94A3B8",
      align: "center",
      margin: "xs",
    });
  }

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F172A",
      contents: [
        { type: "text", text: "🏡 คนกลม โฮมเซอร์วิส", color: "#10B981", size: "xs", weight: "bold" },
        {
          type: "text",
          text: `📁 สำรองไฟล์เข้า Google Drive สำเร็จ (${files.length} ไฟล์)`,
          color: "#FFFFFF",
          size: "sm",
          weight: "bold",
          margin: "xs",
          wrap: true,
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
          backgroundColor: "#F8FAFC",
          cornerRadius: "md",
          paddingAll: "sm",
          contents: [
            {
              type: "text",
              text: `นำเข้าคลังแล้ว: ${imageCount > 0 ? `รูปภาพ ${imageCount} รูป ` : ""}${pdfCount > 0 ? `PDF ${pdfCount} ไฟล์` : ""}`,
              size: "xs",
              color: "#334155",
              weight: "bold",
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: fileRows,
        },
        { type: "separator" },
        {
          type: "text",
          text: "💡 สลิปเงินเดือน/เอกสารส่วนตัว ถูกจัดเก็บปลอดภัยใน Google Drive โดยไม่ถูกนำไปคิดเป็นรายจ่ายกองกลางครับ",
          size: "xxs",
          color: "#64748B",
          wrap: true,
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0F172A",
          height: "sm",
          action: {
            type: "uri",
            label: "📂 เปิดโฟลเดอร์ Google Drive ↗",
            uri: folderUrl,
          },
        },
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: "📊 ดูแดชบอร์ดครอบครัว ↗",
            uri: dashboardUrl,
          },
        },
      ],
    },
  };
}

