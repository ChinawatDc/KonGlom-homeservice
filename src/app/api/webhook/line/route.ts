import { NextResponse, after } from "next/server";
import { db } from "@/db";
import {
  expenses,
  reminders,
  medicines,
  settlements,
  homeMaintenance,
  uploadedFilesQueue,
  familySettings,
  pantryItems,
} from "@/db/schema";
import { eq, and, sql, gte, asc, ilike } from "drizzle-orm";
import {
  lineClient,
  lineBlobClient,
  getSenderDisplayName,
  buildSlipFlexMessage,
  buildSettlementFlexMessage,
  buildReminderFlexMessage,
  buildMedicineFlexMessage,
  buildRecipeFlexMessage,
  buildDocumentSummaryFlexMessage,
  buildDashboardLinkFlexMessage,
  buildBatchSummaryFlexMessage,
  buildFamilySettingsFlexMessage,
  buildWelcomeFlexMessage,
  buildUpcomingRemindersFlexMessage,
  getKonGlomQuickReply,
} from "@/lib/line";
import {
  parseSlipDocument,
  parseSlipImage,
  parseVoiceOrTextReminder,
  parseMedicineLabel,
  checkHealthClaim,
  suggestFridgeRecipes,
  summarizeDocument,
  chatWithKonglom,
} from "@/lib/gemini";
import { uploadFileToDrive, uploadImageToDrive } from "@/lib/google-drive";

export const maxDuration = 60; // รองรับประมวลผล Multimodal AI

function extractDriveFolderId(input: string): string {
  const match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim();
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    name: "KonGlom-homeservice LINE Webhook",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events: any[] = body.events || [];

    for (const event of events) {
      const replyToken = event.replyToken;
      const groupId = event.source?.groupId || event.source?.roomId || event.source?.userId || "unknown_group";
      const userId = event.source?.userId;

      // =========================================================================
      // จัดการเมื่อบอทถูกเชิญเข้ากลุ่ม (Join) หรือมีคนแอดเพื่อน (Follow) (1-Click Onboarding)
      // =========================================================================
      if (event.type === "join" || event.type === "follow") {
        if (replyToken) {
          const existingFamily = await db
            .select()
            .from(familySettings)
            .where(eq(familySettings.groupId, groupId))
            .limit(1);

          let familyName = "บ้านก้อนกลม";
          if (existingFamily.length === 0) {
            await db
              .insert(familySettings)
              .values({
                groupId,
                familyName: "บ้านก้อนกลม",
              })
              .onConflictDoNothing();
          } else {
            familyName = existingFamily[0].familyName || "บ้านก้อนกลม";
          }

          const welcomeFlex = buildWelcomeFlexMessage(groupId, familyName);
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: `🎉 ยินดีต้อนรับสู่ KonGlom น้องกลม ประจำ${familyName}`,
                contents: welcomeFlex as any,
              },
            ],
          });
        }
        continue;
      }

      if (event.type !== "message") continue;

      const message = event.message;

      // =========================================================================
      // =========================================================================
      // 1. จัดการรูปภาพ & เอกสารไฟล์ (PDF, PNG, JPG, บิล, สลิป, ซองยา, เอกสารภาษี)
      // =========================================================================
      if (message.type === "image" || message.type === "file") {
        try {
          const isPdf = message.type === "file" && (message.fileName?.toLowerCase().endsWith(".pdf") || true);
          const mimeType = isPdf ? "application/pdf" : "image/jpeg";
          const originalName = message.type === "file" ? (message.fileName || "document.pdf") : "image.jpg";

          // ดึงไฟล์/ภาพจาก LINE
          const stream = await lineBlobClient.getMessageContent(message.id);
          const chunks: any[] = [];
          for await (const chunk of stream as any) chunks.push(Buffer.from(chunk));
          const fileBuffer = Buffer.concat(chunks);

          const now = new Date();
          const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
          const senderName = await getSenderDisplayName(groupId, userId);

          // วิเคราะห์เบื้องต้นด้วย OCR
          const slipData = await parseSlipDocument(fileBuffer, mimeType);

          let docCategory = "general";
          let docTitle = originalName;
          let subFolder = "05_เอกสารทั่วไป";
          let cleanFileName = `${datePrefix}_${originalName}`;
          let amountStr: string | null = null;
          let isExpense = false;

          // 1. ถ้าเป็นสลิปเงินเดือน (Payslip) -> ปลอดภัย 100% ไม่นำไปหักเป็นรายจ่าย!
          if (slipData.is_slip && slipData.doc_type === "payslip") {
            docCategory = "payslip";
            docTitle = `สลิปเงินเดือน ${slipData.receiver_name ? `(${slipData.receiver_name})` : ""}`.trim();
            subFolder = "03_สลิปเงินเดือนและรายรับ";
            cleanFileName = `${datePrefix}_สลิปเงินเดือน_${slipData.receiver_name || "พนักงาน"}_${slipData.amount || 0}บาท.${isPdf ? "pdf" : "jpg"}`;
            amountStr = slipData.amount ? slipData.amount.toString() : null;
            isExpense = false;
          }
          // 2. ถ้าเป็นสลิปโอนเงิน / ใบเสร็จจ่ายเงินจริง (Expense Slip)
          else if (slipData.is_slip && slipData.is_expense && slipData.amount) {
            docCategory = "expense_slip";
            docTitle = `สลิปโอนเงิน ${slipData.bank || "ธนาคาร"}`;
            subFolder = slipData.is_tax_deductible ? "03_เอกสารลดหย่อนภาษี" : "01_สลิปโอนเงิน";
            const fileExt = isPdf ? "pdf" : "jpg";
            cleanFileName = `${datePrefix}_สลิป_${slipData.bank || "ธนาคาร"}_${slipData.amount}บาท.${fileExt}`;
            amountStr = slipData.amount.toString();
            isExpense = true;
          }
          // 3. ถ้าเป็นไฟล์เอกสาร PDF ทั่วไป
          else if (message.type === "file") {
            const docSummary = await summarizeDocument(fileBuffer, mimeType);
            docTitle = docSummary.doc_title;
            if (docSummary.doc_category === "เอกสารลดหย่อนภาษี") {
              docCategory = "tax_doc";
              subFolder = "03_เอกสารลดหย่อนภาษี";
            } else if (docSummary.doc_category === "บิลและใบแจ้งหนี้") {
              docCategory = "bill";
              subFolder = "02_บิลและใบแจ้งหนี้";
            } else if (docSummary.doc_category === "สุขภาพและการแพทย์") {
              docCategory = "medical";
              subFolder = "04_สุขภาพและยา";
            } else if (docSummary.doc_category === "สลิปเงินเดือน") {
              docCategory = "payslip";
              subFolder = "03_สลิปเงินเดือนและรายรับ";
            } else {
              docCategory = "document";
              subFolder = "05_เอกสารทั่วไป";
            }
            cleanFileName = `${datePrefix}_${docSummary.suggested_filename || originalName}`;
            amountStr = docSummary.amount ? docSummary.amount.toString() : null;
            isExpense = false;

            // Feature C: ตรวจจับวันครบกำหนดชำระบิล (Due Date) และตั้งเตือนความจำล่วงหน้าอัตโนมัติ
            if (docSummary.due_date) {
              try {
                const parsedDueDate = new Date(docSummary.due_date);
                let reminderTime: Date;
                if (!isNaN(parsedDueDate.getTime())) {
                  const targetTime = new Date(parsedDueDate);
                  targetTime.setDate(targetTime.getDate() - 2);
                  targetTime.setHours(9, 0, 0, 0);
                  reminderTime = targetTime.getTime() > Date.now() ? targetTime : parsedDueDate;
                } else {
                  reminderTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                }

                await db.insert(reminders).values({
                  groupId,
                  lineUserId: userId || "system",
                  title: `ชำระบิล: ${docSummary.doc_title}${docSummary.amount ? ` (฿${Number(docSummary.amount).toLocaleString("th-TH")})` : ""}`,
                  targetPerson: "ทุกคนในบ้าน",
                  dueDateTime: reminderTime,
                  originalInput: `สร้างเตือนอัตโนมัติจากไฟล์บิล ${originalName} (ครบกำหนด: ${docSummary.due_date})`,
                });
              } catch (reminderErr) {
                console.error("Auto bill reminder creation failed:", reminderErr);
              }
            }
          }
          // 4. ถ้าเป็นรูปภาพ (PNG / JPG)
          else if (message.type === "image") {
            const medicineData = await parseMedicineLabel(fileBuffer);
            if (medicineData.is_medicine && medicineData.medicine_name) {
              docCategory = "medical";
              docTitle = `ยา ${medicineData.medicine_name}`;
              subFolder = "04_สุขภาพและยา";
              cleanFileName = `${datePrefix}_ยา_${medicineData.medicine_name}.jpg`;
            } else {
              docCategory = "general";
              docTitle = "รูปภาพ";
              subFolder = "05_รูปภาพทั่วไป";
              cleanFileName = `${datePrefix}_photo_${Date.now()}.jpg`;
            }
          }

          // ตรวจสอบข้อมูลและการตั้งค่าโฟลเดอร์ Google Drive ของบ้านนี้ (Multi-Tenant Isolation)
          const familySettingsList = await db
            .select()
            .from(familySettings)
            .where(eq(familySettings.groupId, groupId))
            .limit(1);

          const currentFamily = familySettingsList[0];
          const familyName = currentFamily?.familyName || "บ้านก้อนกลม";
          const tenantDriveFolderId = currentFamily?.driveFolderId || undefined;

          // อัปโหลดเข้า Google Drive ทันที โดยแยกโฟลเดอร์ตามบ้าน (เช่น บ้านก้อนกลม)
          const driveUpload = await uploadFileToDrive(
            fileBuffer,
            cleanFileName,
            mimeType,
            subFolder,
            tenantDriveFolderId,
            familyName
          );

          // ถ้าสร้างโฟลเดอร์ของบ้านใน Google Drive ได้ และยังไม่มีบันทึก driveFolderId ให้บันทึกไว้ทันที
          if (driveUpload?.familyFolderId && !currentFamily?.driveFolderId) {
            await db
              .insert(familySettings)
              .values({
                groupId,
                familyName,
                driveFolderId: driveUpload.familyFolderId,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: familySettings.groupId,
                set: {
                  driveFolderId: driveUpload.familyFolderId,
                  updatedAt: new Date(),
                },
              });
          }

          // ถ้าเป็นสลิปโอนเงินจริง ตรวจสอบสลิปซ้ำและบันทึกรายจ่าย
          if (isExpense && amountStr) {
            let isDuplicate = false;
            if (slipData.transaction_ref) {
              const existing = await db
                .select()
                .from(expenses)
                .where(
                  and(
                    eq(expenses.groupId, groupId),
                    eq(expenses.transactionRef, slipData.transaction_ref)
                  )
                )
                .limit(1);
              if (existing.length > 0) isDuplicate = true;
            }

            if (!isDuplicate) {
              await db.insert(expenses).values({
                groupId,
                lineUserId: userId || "unknown",
                userName: senderName,
                amount: amountStr,
                category: slipData.category || "ทั่วไป",
                bankName: slipData.bank || "PromptPay",
                transactionRef: slipData.transaction_ref,
                isTaxDeductible: slipData.is_tax_deductible || false,
                taxCategory: slipData.tax_category,
                transactionDate: slipData.date ? new Date(slipData.date) : new Date(),
                driveFileId: driveUpload?.fileId,
                driveUrl: driveUpload?.webViewLink,
                rawGeminiData: slipData,
              });
            }
          }

          // บันทึกลง queue สำหรับสรุปรวม (Batch Ingestion)
          await db.insert(uploadedFilesQueue).values({
            groupId,
            lineUserId: userId || "unknown",
            userName: senderName,
            fileName: cleanFileName,
            fileType: isPdf ? "pdf" : "image",
            docCategory,
            docTitle,
            amount: amountStr,
            isExpense,
            driveFileId: driveUpload?.fileId,
            driveUrl: driveUpload?.webViewLink,
            folderPath: driveUpload?.folderPath,
            status: "pending",
          });

          // เริ่มต้นการทำงานเบื้องหลัง: รอ Cooldown 45 วินาที แล้วสรุปการนำเข้าแบบรวมชุด
          after(async () => {
            try {
              // รอคูลดาวน์ 45 วินาที
              await new Promise((r) => setTimeout(r, 45000));

              // ตรวจสอบว่าในระหว่าง 45 วินาทีที่ผ่านมา มีไฟล์ใหม่ของกลุ่มนี้ถูกอัปโหลดเข้ามาอีกหรือไม่
              const latest = await db
                .select({
                  maxCreated: sql<string>`MAX(created_at)`,
                })
                .from(uploadedFilesQueue)
                .where(eq(uploadedFilesQueue.groupId, groupId));

              if (latest[0]?.maxCreated) {
                const latestTime = new Date(latest[0].maxCreated).getTime();
                const diff = Date.now() - latestTime;
                // ถ้ามีไฟล์ใหม่เข้ามาหลังจากนี้ ให้ปล่อยให้อินสแตนซ์ของไฟล์ใหม่เป็นตัวสรุป
                if (diff < 40000) {
                  return;
                }
              }

              // ดึงรายการไฟล์ที่ยังค้างอยู่ในคิวของกลุ่มนี้
              const pending = await db
                .select()
                .from(uploadedFilesQueue)
                .where(
                  and(
                    eq(uploadedFilesQueue.groupId, groupId),
                    eq(uploadedFilesQueue.status, "pending")
                  )
                )
                .orderBy(sql`created_at ASC`);

              if (pending.length === 0) return;

              // อัปเดตสถานะเป็น summarized
              await db
                .update(uploadedFilesQueue)
                .set({ status: "summarized" })
                .where(
                  and(
                    eq(uploadedFilesQueue.groupId, groupId),
                    eq(uploadedFilesQueue.status, "pending")
                  )
                );

              // ดึงการตั้งค่าโฟลเดอร์ Google Drive ของครอบครัวนี้
              const familyList = await db
                .select()
                .from(familySettings)
                .where(eq(familySettings.groupId, groupId))
                .limit(1);
              const customFolderUrl = familyList[0]?.driveFolderId
                ? `https://drive.google.com/drive/folders/${familyList[0].driveFolderId}`
                : undefined;

              // สร้าง Flex Message สรุปรวมไฟล์ทั้งหมด
              const flex = buildBatchSummaryFlexMessage(pending, groupId, customFolderUrl);

              // ส่งสรุปเข้ากลุ่ม LINE ผ่าน pushMessage!
              await lineClient.pushMessage({
                to: groupId,
                messages: [
                  {
                    type: "flex",
                    altText: `📁 สำรองไฟล์เข้า Google Drive สำเร็จ (${pending.length} ไฟล์)`,
                    contents: flex as any,
                  },
                ],
              });
            } catch (debounceErr) {
              console.error("Error in debounce summary after():", debounceErr);
            }
          });

          continue;
        } catch (err: any) {
          console.error("Error processing media event:", err);
        }
      }

      // =========================================================================
      // 2. จัดการข้อความเสียง (Phase 3: ถอดเสียงเตือนความจำ)
      // =========================================================================
      if (message.type === "audio") {
        try {
          const stream = await lineBlobClient.getMessageContent(message.id);
          const chunks: any[] = [];
          for await (const chunk of stream as any) chunks.push(Buffer.from(chunk));
          const audioBuffer = Buffer.concat(chunks);

          const reminder = await parseVoiceOrTextReminder({
            audioBuffer,
            mimeType: "audio/m4a",
          });

          if (reminder.is_reminder && reminder.title) {
            await db.insert(reminders).values({
              groupId,
              lineUserId: userId,
              title: reminder.title,
              targetPerson: reminder.target_person,
              dueDateTime: new Date(reminder.due_date_time),
              isRecurring: reminder.is_recurring,
              originalInput: "[คลิปเสียงจากผู้ใช้]",
            });

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "flex",
                  altText: `เตือนความจำ: ${reminder.title}`,
                  contents: buildReminderFlexMessage(reminder) as any,
                },
              ],
            });
            continue;
          }
        } catch (err) {
          console.error("Error processing audio event:", err);
        }
      }

      // =========================================================================
      // 3. จัดการข้อความตัวอักษร (คำสั่งบอท)
      // =========================================================================
      if (message.type === "text") {
        const text = message.text.trim();
        const senderName = await getSenderDisplayName(userId, groupId);

        // 3.1 คำสั่งเคลียร์เงินกองกลาง (Phase 2 & Budget Guard)
        if (text.includes("เคลียร์เงิน") || text.includes("สรุปยอด")) {
          const now = new Date();
          const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

          // ดึงยอดรวมเดือนปัจจุบัน
          const result = await db
            .select({
              total: sql<string>`COALESCE(SUM(amount), 0)`,
              count: sql<string>`COUNT(DISTINCT line_user_id)`,
            })
            .from(expenses)
            .where(eq(expenses.groupId, groupId));

          const total = parseFloat(result[0]?.total || "0");
          const memberCount = Math.max(1, parseInt(result[0]?.count || "1"));
          const sharePerPerson = total / memberCount;

          // ดึงข้อมูลการตั้งค่าและงบประมาณของบ้านนี้
          const familyRes = await db
            .select()
            .from(familySettings)
            .where(eq(familySettings.groupId, groupId))
            .limit(1);
          const monthlyBudget = familyRes[0]?.monthlyBudget ? parseFloat(familyRes[0].monthlyBudget) : 0;
          const budgetInfo = monthlyBudget > 0 ? { monthlyBudget, totalSpent: total } : undefined;

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: `สรุปยอดเงินเดือน ${monthYear}`,
                contents: buildSettlementFlexMessage(monthYear, total, sharePerPerson, memberCount, budgetInfo) as any,
                quickReply: getKonGlomQuickReply(),
              },
            ],
          });
          continue;
        }

        // 3.2 คำสั่งดูรายการนัดหมายที่กำลังจะมาถึง
        if (
          text.includes("มีนัดอะไร") ||
          text.includes("ดูนัด") ||
          text.includes("รายการนัด") ||
          text.includes("นัดหมายทั้งหมด") ||
          text === "@กลม นัด" ||
          text === "@บอท นัด"
        ) {
          const now = new Date();
          const upcomingList = await db
            .select()
            .from(reminders)
            .where(
              and(
                eq(reminders.groupId, groupId),
                eq(reminders.status, "pending"),
                gte(reminders.dueDateTime, new Date(now.getTime() - 24 * 60 * 60 * 1000))
              )
            )
            .orderBy(asc(reminders.dueDateTime))
            .limit(10);

          if (upcomingList.length === 0) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: "📅 ไม่มีนัดหมายที่ค้างอยู่ครับ!\n\n💡 สามารถบอกนัดหมายได้เลย เช่น \"@กลม วันเสาร์มีนัดไปเซ็นสัญญาคอนโด\" หรือ \"@กลม พรุ่งนี้ 10 โมงมีนัดหาหมอ\"",
                  quickReply: getKonGlomQuickReply(),
                },
              ],
            });
            continue;
          }

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: `📅 รายการนัดหมาย (${upcomingList.length} รายการ)`,
                contents: buildUpcomingRemindersFlexMessage(upcomingList) as any,
                quickReply: getKonGlomQuickReply(),
              },
            ],
          });
          continue;
        }

        // 3.3 คำสั่งยกเลิกนัดหมาย
        if (
          text.startsWith("@กลม ยกเลิกนัด") ||
          text.startsWith("@กลม ลบนัด") ||
          text.startsWith("@บอท ยกเลิกนัด") ||
          text.startsWith("ยกเลิกนัด")
        ) {
          const targetKeyword = text.replace(/^(@(กลม|บอท)\s*)?(ยกเลิกนัด|ลบนัด)\s*/i, "").trim();
          if (!targetKeyword) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: "กรุณาระบุชื่อนัดหมายที่ต้องการยกเลิก เช่น:\n@กลม ยกเลิกนัด เซ็นสัญญาคอนโด",
                  quickReply: getKonGlomQuickReply(),
                },
              ],
            });
            continue;
          }

          const matchingReminders = await db
            .select()
            .from(reminders)
            .where(
              and(
                eq(reminders.groupId, groupId),
                eq(reminders.status, "pending"),
                ilike(reminders.title, `%${targetKeyword}%`)
              )
            )
            .limit(5);

          if (matchingReminders.length === 0) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: `ไม่พบนัดหมายที่ตรงกับ "${targetKeyword}" หรือนัดหมายนั้นอาจแจ้งเตือน/ยกเลิกไปแล้วครับ`,
                  quickReply: getKonGlomQuickReply(),
                },
              ],
            });
            continue;
          }

          for (const item of matchingReminders) {
            await db
              .update(reminders)
              .set({ status: "cancelled" })
              .where(eq(reminders.id, item.id));
          }

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: `🗑 ยกเลิกนัดหมาย "${matchingReminders[0].title}" เรียบร้อยแล้วครับ! (จะไม่ส่งแจ้งเตือนเข้ากลุ่ม)`,
                quickReply: getKonGlomQuickReply(),
              },
            ],
          });
          continue;
        }

        // 3.4 คำสั่งตั้งงบประมาณประจำบ้าน (Budget Guard)
        if (
          text.startsWith("@กลม ตั้งงบ") ||
          text.startsWith("@กลม งบประมาณ") ||
          text.startsWith("@บอท ตั้งงบ") ||
          text.startsWith("ตั้งงบ")
        ) {
          const rawBudget = text.replace(/^(@(กลม|บอท)\s*)?(ตั้งงบ|งบประมาณ)\s*/i, "").replace(/,/g, "").trim();
          const budgetNum = parseFloat(rawBudget);

          if (isNaN(budgetNum) || budgetNum <= 0) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: "💰 กรุณาระบุจำนวนเงินงบประมาณ เช่น:\n@กลม ตั้งงบ 20000\n(เพื่อให้น้องกลมช่วยเฝ้าระวังไม่ให้ใช้จ่ายเกินงบ)",
                  quickReply: getKonGlomQuickReply(),
                },
              ],
            });
            continue;
          }

          await db
            .insert(familySettings)
            .values({
              groupId,
              monthlyBudget: budgetNum.toString(),
              adminLineUserId: userId || "admin",
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: familySettings.groupId,
              set: {
                monthlyBudget: budgetNum.toString(),
                updatedAt: new Date(),
              },
            });

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: `💰 ตั้งงบประมาณประจำบ้านเดือนนี้เป็น ฿${budgetNum.toLocaleString("th-TH")} เรียบร้อยแล้วครับ!\n\n💡 น้องกลมจะช่วยจับตาดูค่าใช้จ่าย หากรายจ่ายแตะ 80% หรือเต็มงบ จะแจ้งเตือนครอบครัวทันทีครับ ✨`,
                quickReply: getKonGlomQuickReply(),
              },
            ],
          });
          continue;
        }



        // 3.3 คำสั่งเช็กข่าวสุขภาพปลอม (Phase 4)
        if (
          text.startsWith("@กลม เช็กข่าว") ||
          text.startsWith("@กลม เช็คข่าว") ||
          text.startsWith("@บอท เช็กข่าว") ||
          text.startsWith("@บอท เช็คข่าว") ||
          text.startsWith("เช็กข่าว") ||
          text.startsWith("เช็คข่าว")
        ) {
          const claim = text.replace(/^(@(กลม|บอท)\s*)?(เช็กข่าว|เช็คข่าว)\s*/, "");
          const factCheck = await checkHealthClaim(claim);

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: `🩺 ผลการตรวจเช็กข้อเท็จจริงทางการแพทย์:\n\n${factCheck}`,
              },
            ],
          });
          continue;
        }

        // 3.4 คำสั่งตู้เย็นและคลังอาหารประจำบ้าน (Feature G: Smart Pantry Expiry Guard)
        if (
          text.startsWith("@กลม แช่") ||
          text.startsWith("@กลม ซื้อของ") ||
          text.startsWith("@บอท แช่") ||
          text.startsWith("แช่ ")
        ) {
          const itemText = text.replace(/^(@(กลม|บอท)\s*)?(แช่|ซื้อของ)\s*/i, "").trim();
          if (itemText) {
            await db.insert(pantryItems).values({
              groupId,
              itemName: itemText,
              category: "ตู้เย็น",
              expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // หมดอายุเริ่มต้นใน 7 วัน
            });

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: `🧊 บันทึก "${itemText}" เข้าตู้เย็นเรียบร้อยครับ!\n\n💡 พิมพ์ "@กลม ตู้เย็น" เพื่อดูของทั้งหมด\n💡 พิมพ์ "@กลม กินไรดี" เพื่อให้ผมคิดเมนูจากของในตู้เย็นได้เลย`,
                  quickReply: getKonGlomQuickReply(),
                },
              ],
            });
            continue;
          }
        }

        // คำสั่งเคลียร์ของออกจากตู้เย็น (Pantry Item Removal)
        if (
          text.includes("กินหมดแล้ว") ||
          text.includes("ใช้หมดแล้ว") ||
          text.startsWith("@กลม ลบตู้เย็น") ||
          text.startsWith("@บอท ลบตู้เย็น")
        ) {
          const itemKeyword = text
            .replace(/^(@(กลม|บอท)\s*)?(กินหมดแล้ว|ใช้หมดแล้ว|ลบตู้เย็น)\s*/i, "")
            .replace(/กินหมดแล้ว|ใช้หมดแล้ว/g, "")
            .trim();

          if (itemKeyword) {
            await db
              .delete(pantryItems)
              .where(
                and(
                  eq(pantryItems.groupId, groupId),
                  ilike(pantryItems.itemName, `%${itemKeyword}%`)
                )
              );

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: `🍽 อัปเดตตู้เย็น: นำ "${itemKeyword}" ออกจากรายการเรียบร้อยแล้วครับ!`,
                  quickReply: getKonGlomQuickReply(),
                },
              ],
            });
            continue;
          }
        }

        if (text.includes("ตู้เย็น") || text.includes("ของในตู้")) {
          const items = await db
            .select()
            .from(pantryItems)
            .where(eq(pantryItems.groupId, groupId))
            .limit(20);

          let replyText = "🧊 ของในตู้เย็นและคลังอาหารประจำบ้าน:\n";
          if (items.length === 0) {
            replyText += "ยังไม่มีรายการของในตู้เย็น\n\n💡 พิมพ์ \"@กลม แช่ [ชื่อวัตถุดิบ]\" เช่น \"@กลม แช่ หมูสับ, ไข่ไก่\" เพื่อเริ่มบันทึกได้เลยครับ";
          } else {
            items.forEach((item, idx) => {
              replyText += `\n${idx + 1}. ${item.itemName}`;
              if (item.expiryDate) {
                const diffDays = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                replyText += ` (${diffDays > 0 ? `เหลืออีก ${diffDays} วัน` : "⚠️ ใกล้/หมดอายุ"})`;
              }
            });
            replyText += "\n\n💡 พิมพ์ \"@กลม กินไรดี\" เพื่อสร้างเมนูอาหารจากของเหล่านี้";
          }

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: replyText,
                quickReply: getKonGlomQuickReply(),
              },
            ],
          });
          continue;
        }

        if (text.includes("กินไรดี") || text.includes("เมนูวันนี้")) {
          const items = await db
            .select()
            .from(pantryItems)
            .where(eq(pantryItems.groupId, groupId))
            .limit(10);

          const fridgeList = items.map((i) => i.itemName).join(", ");
          const promptInput = fridgeList ? `ของในตู้เย็นที่มี: ${fridgeList}. ${text}` : text;
          const recipes = await suggestFridgeRecipes(undefined, promptInput);
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: "แนะนำเมนูอาหาร",
                contents: buildRecipeFlexMessage(recipes) as any,
                quickReply: getKonGlomQuickReply(),
              },
            ],
          });
          continue;
        }

        // 3.5 คำสั่งงานบ้าน / รอบล้างแอร์ (Phase 5)
        if (text.includes("ล้างแอร์") || text.includes("รอบซ่อม")) {
          const tasks = await db
            .select()
            .from(homeMaintenance)
            .where(eq(homeMaintenance.groupId, groupId))
            .limit(5);

          let replyText = "🛠 ตารางการดูแลรักษาบ้าน:\n";
          if (tasks.length === 0) {
            replyText += "- ยังไม่มีรายการซ่อมบำรุงที่บันทึกไว้ในระบบ";
          } else {
            tasks.forEach((t) => {
              replyText += `\n• ${t.taskName} (กำหนด: ${t.nextDueDate.toLocaleDateString("th-TH")})`;
              if (t.technicianContact) replyText += `\n  ช่างประจำ: ${t.technicianContact}`;
            });
          }

          await lineClient.replyMessage({
            replyToken,
            messages: [{ type: "text", text: replyText }],
          });
          continue;
        }

        // 3.6 คำสั่งตั้งรหัส PIN บ้าน (Multi-Family Security Pillar 1)
        if (
          text.startsWith("@กลม ตั้งรหัส") ||
          text.startsWith("@กลม ตั้งพิน") ||
          text.startsWith("@บอท ตั้งรหัส") ||
          text.startsWith("@บอท ตั้งพิน") ||
          text.startsWith("ตั้งรหัส")
        ) {
          const pin = text.replace(/^(@(กลม|บอท)\s*)?(ตั้งรหัส|ตั้งพิน)\s*/i, "").trim();
          if (!pin || pin.length < 4 || pin.length > 20) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: "🔒 กรุณาระบุรหัส PIN 4-6 หลัก เช่น:\n@กลม ตั้งรหัส 1234\n\n(รหัสนี้จะใช้สำหรับปลดล็อกเข้าดูแดชบอร์ดรายจ่ายของครอบครัวบนเว็บเบราว์เซอร์ครับ)",
                },
              ],
            });
            continue;
          }

          await db
            .insert(familySettings)
            .values({
              groupId,
              familyPin: pin,
              adminLineUserId: userId || "admin",
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: familySettings.groupId,
              set: {
                familyPin: pin,
                adminLineUserId: userId || sql`family_settings.admin_line_user_id`,
                updatedAt: new Date(),
              },
            });

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: `🔒 ตั้งรหัส PIN ประจำบ้านเรียบร้อยแล้ว!\n\n• รหัส PIN: ${pin}\n• ผู้ดูแล (Admin): ${senderName}\n\nสมาชิกในครอบครัวสามารถใช้รหัส PIN นี้ในการปลดล็อกเข้าสู่แดชบอร์ดบนเบราว์เซอร์ได้ทันทีครับ ✨`,
              },
            ],
          });
          continue;
        }

        // 3.7 คำสั่งตั้งชื่อบ้าน (Multi-Family Customization)
        if (
          text.startsWith("@กลม ตั้งชื่อบ้าน") ||
          text.startsWith("@บอท ตั้งชื่อบ้าน") ||
          text.startsWith("ตั้งชื่อบ้าน")
        ) {
          const name = text.replace(/^(@(กลม|บอท)\s*)?ตั้งชื่อบ้าน\s*/i, "").trim();
          if (!name) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: "🏡 กรุณาระบุชื่อบ้าน เช่น:\n@กลม ตั้งชื่อบ้าน บ้านสุขสันต์",
                },
              ],
            });
            continue;
          }

          await db
            .insert(familySettings)
            .values({
              groupId,
              familyName: name,
              adminLineUserId: userId || "admin",
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: familySettings.groupId,
              set: {
                familyName: name,
                updatedAt: new Date(),
              },
            });

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: `🏡 ตั้งชื่อบ้านเป็น "${name}" เรียบร้อยแล้วครับ!`,
              },
            ],
          });
          continue;
        }

        // 3.8 คำสั่งผูก Google Drive โฟลเดอร์เฉพาะบ้าน (Multi-Tenant Drive Isolation)
        if (
          text.startsWith("@กลม ตั้งไดรฟ์") ||
          text.startsWith("@กลม ผูกไดรฟ์") ||
          text.startsWith("@บอท ตั้งไดรฟ์") ||
          text.startsWith("@บอท ผูกไดรฟ์") ||
          text.startsWith("ตั้งไดรฟ์")
        ) {
          const rawInput = text.replace(/^(@(กลม|บอท)\s*)?(ตั้งไดรฟ์|ผูกไดรฟ์)\s*/i, "").trim();
          const folderId = extractDriveFolderId(rawInput);

          if (!folderId) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "text",
                  text: "📁 กรุณาระบุ Google Drive Folder ID หรือลิงก์ เช่น:\n@กลม ตั้งไดรฟ์ 1WinPhipplh6_xISDEtE6UIffrfKCUt7K\nหรือวางลิงก์ https://drive.google.com/drive/folders/...",
                },
              ],
            });
            continue;
          }

          await db
            .insert(familySettings)
            .values({
              groupId,
              driveFolderId: folderId,
              adminLineUserId: userId || "admin",
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: familySettings.groupId,
              set: {
                driveFolderId: folderId,
                updatedAt: new Date(),
              },
            });

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: `📁 ผูก Google Drive สำหรับบ้านนี้สำเร็จ!\n\n• โฟลเดอร์ ID: ${folderId}\n• ลิงก์: https://drive.google.com/drive/folders/${folderId}\n\nไฟล์เอกสารและสลิปหลังจากนี้จะถูกแยกเก็บเข้าไดรฟ์นี้โดยเฉพาะครับ ✨`,
              },
            ],
          });
          continue;
        }

        // 3.9 คำสั่งดูข้อมูลบ้าน / การตั้งค่า (Family Settings Info)
        if (
          text.includes("ข้อมูลบ้าน") ||
          text.includes("สถานะบ้าน") ||
          text.includes("ตั้งค่าบ้าน") ||
          text === "@กลม บ้าน" ||
          text === "@บอท บ้าน"
        ) {
          const familyList = await db
            .select()
            .from(familySettings)
            .where(eq(familySettings.groupId, groupId))
            .limit(1);

          const fam = familyList[0];
          const flex = buildFamilySettingsFlexMessage({
            familyName: fam?.familyName || "บ้านก้อนกลม",
            familyPin: fam?.familyPin || null,
            adminLineUserId: fam?.adminLineUserId || null,
            adminName: fam?.adminLineUserId === userId ? senderName : null,
            driveFolderId: fam?.driveFolderId || null,
            subscriptionPlan: fam?.subscriptionPlan || "free",
            monthlyBudget: fam?.monthlyBudget || null,
          });

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: `ข้อมูลบ้าน: ${fam?.familyName || "บ้านก้อนกลม"}`,
                contents: flex as any,
              },
            ],
          });
          continue;
        }

        // 3.10 คำสั่งเปิดแดชบอร์ดส่วนตัวของบ้าน (Secure Private Dashboard Link)
        if (
          text.includes("แดชบอร์ด") ||
          text.includes("dashboard") ||
          text.includes("ดูกราฟ") ||
          text.includes("ดูรายงาน")
        ) {
          const familyList = await db
            .select()
            .from(familySettings)
            .where(eq(familySettings.groupId, groupId))
            .limit(1);
          const fam = familyList[0];
          const familyName = fam?.familyName || "บ้านก้อนกลม";
          const hasPin = Boolean(fam?.familyPin);

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kon-glom-homeservice.vercel.app";
          const pinParam = hasPin && fam?.familyPin ? `&pin=${encodeURIComponent(fam.familyPin)}` : "";
          const dashboardUrl = `${appUrl}/liff/dashboard?groupId=${encodeURIComponent(groupId)}${pinParam}`;

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: `แดชบอร์ดรายจ่าย: ${familyName}`,
                contents: buildDashboardLinkFlexMessage(dashboardUrl, familyName, hasPin) as any,
              },
            ],
          });
          continue;
        }

        // 3.11 คำสั่งช่วยเหลือ / เมนูคำสั่ง (เมื่อถามหาคู่มือหรือพิมพ์ @กลม เดี่ยวๆ)
        const isExplicitHelp =
          text === "@กลม" ||
          text === "@บอท" ||
          text === "กลม" ||
          text === "บอท" ||
          text === "@กลม เมนู" ||
          text === "@กลม คู่มือ" ||
          text === "@กลม วิธีใช้" ||
          text === "@บอท เมนู" ||
          text === "@บอท คู่มือ" ||
          text === "@บอท วิธีใช้" ||
          text === "เมนู" ||
          text === "คู่มือ" ||
          text === "วิธีใช้" ||
          text.includes("ช่วยอะไรได้บ้าง");

        if (isExplicitHelp) {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: "🏡 [น้องกลม โฮมเซอร์วิส] วิธีใช้งานคำสั่ง:\n\n1. 💸 ส่งรูปสลิป / PDF ➔ สำรองไฟล์เข้า Google Drive + สรุปรวมอัจฉริยะ\n2. 📊 พิมพ์ \"@กลม เคลียร์เงิน\" ➔ ดูสรุปยอดเงินและส่วนต่างที่ต้องโอน\n3. 📈 พิมพ์ \"@กลม แดชบอร์ด\" ➔ ดูแดชบอร์ดและกราฟสรุปรายจ่าย\n4. 💰 พิมพ์ \"@กลม ตั้งงบ [จำนวนเงิน]\" ➔ ตั้งงบประมาณบ้านประจำเดือน\n5. 🔒 พิมพ์ \"@กลม ตั้งรหัส [PIN]\" ➔ ตั้งรหัส PIN ล็อกแดชบอร์ดประจำบ้าน\n6. 🏡 พิมพ์ \"@กลม ตั้งชื่อบ้าน [ชื่อ]\" ➔ เปลี่ยนชื่อบ้าน\n7. 📁 พิมพ์ \"@กลม ตั้งไดรฟ์ [ID]\" ➔ ผูก Google Drive แยกเฉพาะบ้าน\n8. ⚙️ พิมพ์ \"@กลม ข้อมูลบ้าน\" ➔ ดูการตั้งค่าและสถานะบ้าน\n9. ⏰ บอกนัดหมายได้เลย เช่น \"@กลม เย็นนี้ไปไหว้พระ 4 โมงครึ่ง\"\n10. 📅 พิมพ์ \"@กลม มีนัดอะไรบ้าง\" ➔ ดูรายการนัดหมายที่กำลังจะมาถึง\n11. 🗑 พิมพ์ \"@กลม ยกเลิกนัด [ชื่อนัด]\" ➔ ยกเลิกนัดหมายที่ระบุ\n12. 🍳 พิมพ์ \"@กลม กินไรดี\" ➔ แนะนำเมนูอาหาร\n13. 💊 ส่งรูปซองยา ➔ อ่านสรรพคุณและวิธีทาน\n14. 🩺 พิมพ์ \"@กลม เช็กข่าว [ข้อความ]\" ➔ ตรวจข่าวสุขภาพปลอม\n15. 🛠 พิมพ์ \"@กลม ล้างแอร์\" ➔ ดูรอบการดูแลรักษาบ้าน",
              },
            ],
          });
          continue;
        }

        // 3.12 นัดหมายอัจฉริยะ & ผู้ช่วยสนทนาประจำบ้าน (Appointments & AI Assistant)
        const isAddressingBot =
          text.startsWith("@กลม") ||
          text.startsWith("@บอท") ||
          text.startsWith("เตือน") ||
          text.includes("มีนัด") ||
          text.includes("นัดหมาย") ||
          text.includes("อย่าลืม");

        if (isAddressingBot) {
          const reminder = await parseVoiceOrTextReminder({ text });
          if (reminder.is_reminder && reminder.title) {
            await db.insert(reminders).values({
              groupId,
              lineUserId: userId,
              title: reminder.title,
              targetPerson: reminder.target_person,
              dueDateTime: new Date(reminder.due_date_time),
              isRecurring: reminder.is_recurring,
              originalInput: `${text}${reminder.display_appointment ? ` (นัดหมาย: ${reminder.display_appointment})` : ""}`,
            });

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "flex",
                  altText: `📅 บันทึกนัดหมาย: ${reminder.title}`,
                  contents: buildReminderFlexMessage(reminder) as any,
                },
              ],
            });
            continue;
          }

          // กรณีไม่ได้เป็นนัดหมาย แต่ผู้ใช้เอ่ยเรียก @กลม ให้ตอบกลับแบบ AI Assistant ประจำบ้าน
          if (text.startsWith("@กลม") || text.startsWith("@บอท")) {
            const cleanText = text.replace(/^@(กลม|บอท)\s*/i, "").trim();
            const botReply = await chatWithKonglom(cleanText || text);
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: "text", text: botReply }],
            });
            continue;
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Webhook Handler Error:", err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
