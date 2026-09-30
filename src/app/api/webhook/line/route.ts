import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, reminders, medicines, settlements, homeMaintenance } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  lineClient,
  lineBlobClient,
  getSenderDisplayName,
  buildSlipFlexMessage,
  buildSettlementFlexMessage,
  buildReminderFlexMessage,
  buildMedicineFlexMessage,
  buildRecipeFlexMessage,
} from "@/lib/line";
import {
  parseSlipImage,
  parseVoiceOrTextReminder,
  parseMedicineLabel,
  checkHealthClaim,
  suggestFridgeRecipes,
} from "@/lib/gemini";
import { uploadImageToDrive } from "@/lib/google-drive";

export const maxDuration = 60; // รองรับประมวลผล Multimodal AI

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
      // จัดการเมื่อบอทถูกเชิญเข้ากลุ่ม (Join) หรือมีคนแอดเพื่อน (Follow)
      // =========================================================================
      if (event.type === "join" || event.type === "follow") {
        if (replyToken) {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: "🏡 สวัสดีครับทุกคน! ผม 'คนกลม' ผู้ช่วยประจำบ้าน ยินดีที่ได้มารับใช้ทุกคนครับ\n\n📌 สิ่งที่ผมช่วยดูแลในกลุ่มนี้:\n1. 💸 สแกนสลิปเงิน: ส่งรูปสลิปเข้ามา ผมจะอ่านยอดเงิน จดบันทึก และสำรองไฟล์เข้า Google Drive ให้อัตโนมัติ\n2. 📊 เคลียร์เงินกองกลาง: พิมพ์ \"@บอท เคลียร์เงิน\" เพื่อดูสรุปยอดและวิธีหาร\n3. ⏰ เตือนความจำ: ส่งคลิปเสียงพูด หรือพิมพ์ \"@บอท เตือน [เรื่อง] [วันเวลา]\"\n4. 🍳 เมนูอาหาร: พิมพ์ \"@บอท กินไรดี\" หรือส่งรูปของในตู้เย็น\n5. 💊 เช็กยา/ข่าวสุขภาพ: ส่งรูปซองยา หรือพิมพ์ \"@บอท เช็กข่าว [ข้อความ]\"\n\nลองส่งสลิปหรือพิมพ์ \"@บอท\" ดูได้เลยครับ!",
              },
            ],
          });
        }
        continue;
      }

      if (event.type !== "message") continue;

      const message = event.message;

      // =========================================================================
      // 1. จัดการรูปภาพ (Phase 1: สลิปเงิน / Phase 4: ซองยา / Phase 5: ตู้เย็น)
      // =========================================================================
      if (message.type === "image") {
        try {
          // ดึงภาพจาก LINE
          const stream = await lineBlobClient.getMessageContent(message.id);
          const chunks: any[] = [];
          for await (const chunk of stream as any) chunks.push(Buffer.from(chunk));
          const imageBuffer = Buffer.concat(chunks);

          // ทำงานคู่ขนาน: OCR สลิป + อัปโหลด Google Drive
          const [slipData, driveUpload] = await Promise.all([
            parseSlipImage(imageBuffer),
            uploadImageToDrive(imageBuffer, `konglom_${Date.now()}.jpg`),
          ]);

          // ถ้าเป็นสลิปโอนเงิน / ใบเสร็จ (Phase 1)
          if (slipData.is_slip && slipData.amount) {
            const senderName = await getSenderDisplayName(groupId, userId);

            // บันทึก DB
            await db.insert(expenses).values({
              groupId,
              lineUserId: userId || "unknown",
              userName: senderName,
              amount: slipData.amount.toString(),
              category: slipData.category || "ทั่วไป",
              bankName: slipData.bank || "PromptPay",
              transactionDate: slipData.date ? new Date(slipData.date) : new Date(),
              driveFileId: driveUpload?.fileId,
              driveUrl: driveUpload?.webViewLink,
              rawGeminiData: slipData,
            });

            // ส่ง Flex Message ตอบกลับ
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "flex",
                  altText: `บันทึกรายจ่าย ฿${slipData.amount}`,
                  contents: buildSlipFlexMessage(slipData, driveUpload?.webViewLink, senderName) as any,
                },
              ],
            });
            continue;
          }

          // ถ้าไม่ใช่สลิป ลองตรวจว่าเป็นซองยาหรือไม่ (Phase 4)
          const medicineData = await parseMedicineLabel(imageBuffer);
          if (medicineData.is_medicine && medicineData.medicine_name) {
            await db.insert(medicines).values({
              groupId,
              medicineName: medicineData.medicine_name,
              indication: medicineData.indication,
              dosageInstructions: medicineData.dosage_instructions,
              warnings: medicineData.warnings,
              imageUrl: driveUpload?.webViewLink,
            });

            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "flex",
                  altText: `ข้อมูลยา: ${medicineData.medicine_name}`,
                  contents: buildMedicineFlexMessage(medicineData) as any,
                },
              ],
            });
            continue;
          }

          // ถ้าไม่ใช่ซองยา ลองดูว่าเป็นรูปของในตู้เย็นหรือไม่ (Phase 5)
          const recipes = await suggestFridgeRecipes(imageBuffer);
          if (recipes.recommended_recipes.length > 0) {
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: "flex",
                  altText: "แนะนำเมนูอาหารมื้อนี้",
                  contents: buildRecipeFlexMessage(recipes) as any,
                },
              ],
            });
            continue;
          }
        } catch (err) {
          console.error("Error processing image event:", err);
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

        // 3.1 คำสั่งเคลียร์เงินกองกลาง (Phase 2)
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

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: `สรุปยอดเงินเดือน ${monthYear}`,
                contents: buildSettlementFlexMessage(monthYear, total, sharePerPerson, memberCount) as any,
              },
            ],
          });
          continue;
        }

        // 3.2 คำสั่งสั่งเตือนความจำด้วยข้อความ (Phase 3)
        if (text.startsWith("@บอท เตือน") || text.startsWith("เตือน")) {
          const reminder = await parseVoiceOrTextReminder({ text });
          if (reminder.is_reminder && reminder.title) {
            await db.insert(reminders).values({
              groupId,
              lineUserId: userId,
              title: reminder.title,
              targetPerson: reminder.target_person,
              dueDateTime: new Date(reminder.due_date_time),
              isRecurring: reminder.is_recurring,
              originalInput: text,
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
        }

        // 3.3 คำสั่งเช็กข่าวสุขภาพปลอม (Phase 4)
        if (text.startsWith("@บอท เช็กข่าว") || text.startsWith("เช็กข่าว") || text.startsWith("เช็คข่าว")) {
          const claim = text.replace(/^(@บอท\s*)?(เช็กข่าว|เช็คข่าว)\s*/, "");
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

        // 3.4 คำสั่งเมนูตู้เย็น (Phase 5)
        if (text.includes("กินไรดี") || text.includes("เมนูวันนี้")) {
          const recipes = await suggestFridgeRecipes(undefined, text);
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: "แนะนำเมนูอาหาร",
                contents: buildRecipeFlexMessage(recipes) as any,
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

        // 3.6 คำสั่งช่วยเหลือ / แนะนำตัว (เมื่อพิมพ์ @บอท, ช่วยอะไรได้บ้าง, เมนู, คู่มือ)
        if (
          text === "@บอท" ||
          text === "บอท" ||
          text === "เมนู" ||
          text === "คู่มือ" ||
          text.includes("ช่วยอะไรได้บ้าง") ||
          text.includes("วิธีใช้") ||
          text.startsWith("@บอท")
        ) {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: "text",
                text: "🏡 [คนกลม โฮมเซอร์วิส] วิธีใช้งานคำสั่ง:\n\n1. 💸 ส่งรูปสลิป ➔ บันทึกรายจ่าย + เก็บเข้า Google Drive ทันที\n2. 📊 พิมพ์ \"@บอท เคลียร์เงิน\" ➔ ดูสรุปยอดเงินและส่วนต่างที่ต้องโอน\n3. ⏰ พิมพ์ \"@บอท เตือน [เรื่อง] [วันเวลา]\" หรือส่งคลิปเสียง ➔ บันทึกนัดหมาย\n4. 🍳 พิมพ์ \"@บอท กินไรดี\" หรือส่งรูปของในตู้เย็น ➔ แนะนำเมนูอาหาร\n5. 💊 ส่งรูปซองยา ➔ อ่านสรรพคุณและวิธีทาน\n6. 🩺 พิมพ์ \"@บอท เช็กข่าว [ข้อความ]\" ➔ ตรวจข้อเท็จจริงทางการแพทย์\n7. 🛠 พิมพ์ \"@บอท ล้างแอร์\" ➔ ดูรอบการดูแลรักษาบ้าน",
              },
            ],
          });
          continue;
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Webhook Handler Error:", err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
