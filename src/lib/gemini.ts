import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// ลิสต์โมเดลที่รองรับตามลำดับความพร้อมใช้งานและ latency ต่ำที่สุด เพื่อป้องกัน Error 503 (High Demand)
const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
];

/**
 * เรียกใช้ Gemini พร้อมระบบสลับโมเดลอัตโนมัติ (Automatic Model Fallback)
 * หากโมเดลตัวใดติด 503 หรือติดโควต้า จะสลับไปใช้ตัวถัดไปทันที
 */
async function generateWithFallback(
  contents: any,
  generationConfig: any = {}
) {
  let lastError: any;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig,
      });
      return await model.generateContent(contents);
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${modelName} returned error: ${err.message}. Retrying with next candidate...`);
      lastError = err;
    }
  }
  throw lastError;
}

export interface SlipData {
  is_slip: boolean;
  doc_type?: "expense_slip" | "payslip" | "bill" | "tax_doc" | "other";
  is_expense?: boolean;
  title?: string;
  amount?: number;
  bank?: string;
  category?: string;
  date?: string;
  sender_name?: string;
  receiver_name?: string;
  note?: string;
  transaction_ref?: string;
  is_tax_deductible?: boolean;
  tax_category?: string;
}

export interface ReminderData {
  is_reminder: boolean;
  title: string;
  target_person?: string;
  appointment_date_time?: string; // วันเวลานัดหมายจริง เช่น "2026-10-03T14:00:00"
  has_specific_time?: boolean;    // true ถ้าระบุเวลาชัดเจน, false ถ้าบอกแค่วัน
  due_date_time: string;          // ISO string เวลาที่ระบบต้องส่งแจ้งเตือนเข้ากลุ่มจริง (trigger time)
  notification_rule?: string;     // คำอธิบาย เช่น "แจ้งเตือนตอน 06:00 น. วันนัดหมาย" หรือ "แจ้งเตือนล่วงหน้า 1 ชั่วโมง (เวลา 13:00 น.)"
  display_appointment?: string;   // ข้อความวันที่นัดหมายสำหรับแสดงผล
  is_recurring?: boolean;
}

export interface MedicineData {
  is_medicine: boolean;
  medicine_name: string;
  indication: string;
  dosage_instructions: string;
  warnings?: string;
}

export interface RecipeData {
  ingredients_detected: string[];
  recommended_recipes: Array<{
    title: string;
    description: string;
    difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
    time_minutes: number;
  }>;
}

export interface DocumentSummary {
  doc_title: string;
  doc_category: "สลิปโอนเงิน" | "สลิปเงินเดือน" | "บิลและใบแจ้งหนี้" | "เอกสารลดหย่อนภาษี" | "สุขภาพและการแพทย์" | "เอกสารทั่วไป";
  summary: string;
  amount?: number | null;
  due_date?: string | null;
  suggested_filename: string;
}

/**
 * Phase 1 & 6 & 7: สแกนสลิปโอนเงิน / ใบเสร็จ / สลิปเงินเดือน / เอกสาร PDF
 */
export async function parseSlipDocument(
  fileBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<SlipData> {
  const prompt = `
    คุณคือผู้เชี่ยวชาญด้าน OCR ตรวจสอบเอกสารการเงิน สลิปโอนเงิน ใบเสร็จ และสลิปเงินเดือนของประเทศไทย
    โปรดวิเคราะห์รูปภาพหรือเอกสาร PDF นี้ และส่งคืนผลลัพธ์เป็น JSON ในรูปแบบนี้เท่านั้น:
    {
      "is_slip": boolean (true ถ้าเป็นเอกสารการเงิน สลิปโอนเงิน บิล หรือสลิปเงินเดือน, false ถ้าไม่ใช่),
      "doc_type": "expense_slip" | "payslip" | "bill" | "tax_doc" | "other",
      "is_expense": boolean (true เฉพาะเมื่อเป็นรายการจ่ายเงิน/โอนออก, false ถ้าเป็นสลิปเงินเดือน รายรับ หรือบิลรอชำระ),
      "title": string (เช่น "สลิปโอนเงิน KBANK", "สลิปเงินเดือน ก.ย. 69", "ใบแจ้งค่าไฟฟ้า"),
      "amount": number (ยอดเงินเฉพาะตัวเลข เช่น 350.00 หรือยอดสุทธิเงินเดือน เช่น 68250.62),
      "bank": string (ชื่อธนาคาร หรือชื่อบริษัทนายจ้างที่จ่ายเงิน),
      "category": string ("เงินเดือน/รายรับ", "อาหาร", "ค่าน้ำค่าไฟ", "ของใช้ในบ้าน", "สุขภาพ/ยา", "การศึกษา/ลูก", "ช้อปปิ้ง", หรือ "ทั่วไป"),
      "date": "YYYY-MM-DD HH:mm:ss" (วันเวลาที่ทำรายการ หากไม่พบให้ใช้วันนี้),
      "sender_name": string (ชื่อผู้โอน หรือบริษัทนายจ้าง),
      "receiver_name": string (ชื่อผู้รับ หรือพนักงาน),
      "note": string (บันทึกช่วยจำถ้ามี),
      "transaction_ref": string (เลขอ้างอิงธุรกรรม/รหัสสลิป หากไม่พบให้เว้นว่าง),
      "is_tax_deductible": boolean (true ถ้าเป็นค่ารักษาพยาบาล เบี้ยประกัน เงินบริจาค หรือใบเสร็จที่ลดหย่อนภาษีได้),
      "tax_category": string ("ค่ารักษาพยาบาล", "เบี้ยประกัน", "เงินบริจาค", "ช้อปดีมีคืน", หรือ null)
    }

    ⚠️ กฎเหล็กในการจำแนกประเภท:
    - หากเป็น "สลิปเงินเดือน", "ใบแจ้งเงินเดือน", "Pay Slip", "Salary Slip", "หนังสือรับรองการหักภาษี ณ ที่จ่าย", หรือเอกสารรายได้:
      -> doc_type ต้องเป็น "payslip"
      -> is_expense ต้องเป็น false (เด็ดขาด! เพราะเป็นเงินเดือน/รายรับ ห้ามจัดเป็นรายจ่าย)
      -> category ต้องเป็น "เงินเดือน/รายรับ"
    - หากเป็น "สลิปโอนเงินสำเร็จ", "ใบเสร็จรับเงินชำระค่าสินค้า/บริการ", "ใบเสร็จ 7-Eleven", "สลิปพร้อมเพย์โอนออก":
      -> doc_type ต้องเป็น "expense_slip"
      -> is_expense ต้องเป็น true
  `;

  try {
    const result = await generateWithFallback(
      [
        prompt,
        {
          inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType: mimeType || "image/jpeg",
          },
        },
      ],
      { responseMimeType: "application/json" }
    );

    return JSON.parse(result.response.text()) as SlipData;
  } catch (err) {
    console.error("Failed to parse Gemini slip document response:", err);
    return { is_slip: false };
  }
}

// Backward compatibility alias
export const parseSlipImage = parseSlipDocument;

/**
 * Phase 3: ถอดความข้อความเสียง / ข้อความเตือนความจำ & วิเคราะห์นัดหมาย
 */
export async function parseVoiceOrTextReminder(
  input: { text?: string; audioBuffer?: Buffer; mimeType?: string },
  currentDateTime?: string
): Promise<ReminderData> {
  const now = new Date();
  const bangkokDateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(now);
  const bangkokTimeStr = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  const bangkokDay = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "long" }).format(now);

  const prompt = `
    คุณคือเลขาและผู้ช่วยประจำครอบครัวอัจฉริยะ (KonGlom น้องกลม)
    หน้าที่ของคุณคือ วิเคราะห์นัดหมาย กิจกรรม หรือสิ่งที่ต้องเตือนความจำ จากข้อความหรือเสียงพูด

    🕒 ข้อมูลเวลาปัจจุบันของประเทศไทย (Asia/Bangkok, GMT+7):
    - วันนี้คือ: ${bangkokDay}
    - วันที่ปัจจุบัน: ${bangkokDateStr}
    - เวลาปัจจุบัน: ${bangkokTimeStr}

    📌 กฎสำคัญที่สุดในการคำนวณวันและเวลาแจ้งเตือน (กรุณาปฏิบัติตามอย่างเคร่งครัด):
    1. การคำนวณหาวันที่นัดหมายจริง (Appointment Date):
       - ให้คำนวณหาวันที่ ค.ศ. (YYYY-MM-DD) ให้สัมพันธ์กับวันปัจจุบัน (${bangkokDay} ที่ ${bangkokDateStr})
       - ตัวอย่าง: หากวันนี้คือวันพุธ คำว่า "วันเสาร์" จะหมายถึงวันเสาร์ที่กำลังจะถึงในสัปดาห์นี้
       - คำว่า "พรุ่งนี้", "มะรืนนี้", "วันจันทร์หน้า", "วันที่ 15" ให้แปลงเป็นวันที่จริงเสมอ
    
    2. กฎการแจ้งเตือน (Notification Rules):
       - "กรณีที่ 1: ไม่บอกเวลาเจาะจง" (เช่น "วันเสาร์มีนัดไปเซ็นสัญญาคอนโด", "พรุ่งนี้มีนัดหาหมอ"):
         * has_specific_time = false
         * appointment_date_time = วันที่นัดหมาย เช่น "${bangkokDateStr}T09:00:00"
         * due_date_time (เวลาส่งแจ้งเตือนเข้ากลุ่ม) = ต้องเป็นเวลา "06:00:00" (6 โมงเช้า) ของวันนั้นเสมอ! (เช่น "YYYY-MM-DDT06:00:00")
         * notification_rule = "แจ้งเตือนตอน 06:00 น. ในวันนัดหมาย"
       - "กรณีที่ 2: บอกเวลาเจาะจง" (เช่น "วันเสาร์ 14:00 น. มีนัดไปเซ็นสัญญาคอนโด", "พรุ่งนี้ 10 โมงเช้า", "ทุ่มนึง"):
         * has_specific_time = true
         * appointment_date_time = วันและเวลาที่นัดหมายจริง เช่น "YYYY-MM-DDTHH:mm:ss"
         * due_date_time (เวลาส่งแจ้งเตือนเข้ากลุ่ม) = ต้องตั้งล่วงหน้าก่อนเวลานัดหมาย 1 ชั่วโมงเสมอ! (เช่น ถ้านัด 14:00 น. ให้แจ้งเตือนตอน 13:00 น.)
         * notification_rule = "แจ้งเตือนล่วงหน้า 1 ชั่วโมงก่อนเวลานัดหมาย"

    ส่งผลลัพธ์เป็น JSON ในรูปแบบนี้เท่านั้น:
    {
      "is_reminder": boolean,
      "title": string (หัวข้อนัดหมาย กระชับ ชัดเจน เช่น "ไปเซ็นสัญญาคอนโด", "พบแพทย์", "ช่างล้างแอร์"),
      "target_person": string (คนที่เกี่ยวข้อง เช่น "ทุกคน", "พ่อ", "แม่", "ลูก"),
      "appointment_date_time": "YYYY-MM-DDTHH:mm:ss",
      "has_specific_time": boolean,
      "due_date_time": "YYYY-MM-DDTHH:mm:ss",
      "notification_rule": string,
      "display_appointment": string (เช่น "วันเสาร์ที่ 3 ต.ค. 2569" หรือ "วันเสาร์ที่ 3 ต.ค. 2569 เวลา 14:00 น."),
      "is_recurring": boolean
    }
  `;

  const contents: any[] = [prompt];
  if (input.audioBuffer && input.mimeType) {
    contents.push({
      inlineData: {
        data: input.audioBuffer.toString("base64"),
        mimeType: input.mimeType,
      },
    });
  } else if (input.text) {
    contents.push(input.text);
  }

  try {
    const result = await generateWithFallback(contents, { responseMimeType: "application/json" });
    const parsed = JSON.parse(result.response.text()) as ReminderData;

    if (parsed.is_reminder && parsed.title) {
      // บังคับใช้กฎเวลา 06:00 น. หรือ ก่อน 1 ชม. ด้วย Code ให้ถูกต้องแน่นอน 100% ตามเวลาไทย (+07:00)
      let rawAppTime = (parsed.appointment_date_time || parsed.due_date_time || "").trim();
      if (rawAppTime && !rawAppTime.includes("+") && !rawAppTime.endsWith("Z")) {
        rawAppTime = `${rawAppTime}+07:00`;
      }
      const appDate = new Date(rawAppTime);

      if (!isNaN(appDate.getTime())) {
        const datePart = rawAppTime.slice(0, 10); // YYYY-MM-DD
        if (!parsed.has_specific_time) {
          // ไม่ระบุเวลา -> แจ้งตอน 6 โมงเช้า (06:00:00) ของวันนั้นตามเวลาไทย
          const notifyDate = new Date(`${datePart}T06:00:00+07:00`);
          parsed.due_date_time = notifyDate.toISOString();
          parsed.notification_rule = "แจ้งเตือนตอน 06:00 น. ในวันนัดหมาย";
        } else {
          // ระบุเวลา -> แจ้งล่วงหน้า 1 ชั่วโมง
          const notifyDate = new Date(appDate.getTime() - 60 * 60 * 1000);
          parsed.due_date_time = notifyDate.toISOString();
          const notifyTimeStr = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
          }).format(notifyDate);
          parsed.notification_rule = `แจ้งเตือนล่วงหน้า 1 ชั่วโมง (เวลา ${notifyTimeStr} น.)`;
        }
      }
    }

    return parsed;
  } catch (err) {
    console.error("Failed to parse reminder:", err);
    return {
      is_reminder: false,
      title: "",
      due_date_time: "",
      has_specific_time: false,
    };
  }
}

/**
 * Phase 4: สแกนซองยาหรือกล่องยา
 */
export async function parseMedicineLabel(imageBuffer: Buffer): Promise<MedicineData> {
  const prompt = `
    คุณคือเภสัชกรประจำครอบครัว โปรดวิเคราะห์รูปซองยาหรือกล่องยา
    และสรุปข้อมูลให้ผู้สูงอายุเข้าใจง่าย ตัวหนังสือชัดเจน เป็น JSON:
    {
      "is_medicine": boolean,
      "medicine_name": string (ชื่อยา ทั้งไทยและสากลถ้ามี),
      "indication": string (สรรพคุณแบบสั้น เข้าใจง่าย เช่น แก้ปวดหัว ลดไข้ ลดความดัน),
      "dosage_instructions": string (วิธีรับประทานชัดเจน เช่น ครั้งละ 1 เม็ด หลังอาหารเช้า),
      "warnings": string (ข้อควรระวัง เช่น ทานแล้วง่วง ห้ามดื่มสุรา)
    }
  `;

  try {
    const result = await generateWithFallback(
      [
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: "image/jpeg",
          },
        },
      ],
      { responseMimeType: "application/json" }
    );

    return JSON.parse(result.response.text()) as MedicineData;
  } catch {
    return { is_medicine: false, medicine_name: "", indication: "", dosage_instructions: "" };
  }
}

/**
 * Phase 4: เช็กข่าวสุขภาพปลอม
 */
export async function checkHealthClaim(claimText: string): Promise<string> {
  const prompt = `
    คุณคือคุณหมอและผู้เชี่ยวชาญทางการแพทย์ประจำกลุ่มครอบครัว
    มีคนในครอบครัวแชร์ข้อความนี้เข้ามา:
    "${claimText}"

    โปรดวิเคราะห์ข้อเท็จจริงทางการแพทย์:
    1. ฟันธงสั้นๆ ชัดเจนตั้งแต่บรรทัดแรก: "ข่าวปลอม (ไม่จริง)", "จริงบางส่วน (มีข้อควรระวัง)", หรือ "ข้อเท็จจริงถูกต้อง"
    2. อธิบายเหตุผลทางการแพทย์ด้วยภาษาที่สุภาพ เป็นกันเอง และผู้ใหญ่เข้าใจง่าย
    3. คำแนะนำที่ถูกต้องสำหรับผู้สูงอายุ
    (ตอบกระชับ ไม่ยาวเกินไป ไม่เกิน 4 ย่อหน้า)
  `;

  try {
    const result = await generateWithFallback(prompt);
    return result.response.text();
  } catch (err: any) {
    return `⚠️ ไม่สามารถตรวจสอบข้อความได้ในขณะนี้: ${err.message}`;
  }
}

/**
 * Phase 5: แนะนำเมนูอาหารจากของในตู้เย็น
 */
export async function suggestFridgeRecipes(imageBuffer?: Buffer, textList?: string): Promise<RecipeData> {
  const prompt = `
    คุณคือเชฟอาหารไทยประจำบ้าน
    วิเคราะห์วัตถุดิบและแนะนำ 3 เมนูอาหารไทยง่ายๆ ที่คนในบ้านทำทานได้ทันที
    ส่งออกเป็น JSON:
    {
      "ingredients_detected": ["วัตถุดิบ 1", "วัตถุดิบ 2"],
      "recommended_recipes": [
        {
          "title": "ชื่อเมนู",
          "description": "วิธีทำแบบสรุป 2 ประโยค",
          "difficulty": "ง่าย",
          "time_minutes": 20
        }
      ]
    }
  `;

  const contents: any[] = [prompt];
  if (imageBuffer) {
    contents.push({
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    });
  } else if (textList) {
    contents.push(`วัตถุดิบที่มี: ${textList}`);
  }

  try {
    const result = await generateWithFallback(contents, { responseMimeType: "application/json" });
    return JSON.parse(result.response.text()) as RecipeData;
  } catch {
    return { ingredients_detected: [], recommended_recipes: [] };
  }
}

/**
 * สรุปและจำแนกหมวดหมู่เอกสาร PDF / รูปภาพเอกสารทั่วไป
 */
export async function summarizeDocument(
  fileBuffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<DocumentSummary> {
  const prompt = `
    คุณคือผู้ช่วยประจำครอบครัวที่เชี่ยวชาญด้านการจัดการเอกสาร บิล และไฟล์ PDF
    โปรดวิเคราะห์ไฟล์เอกสารนี้ และสรุปผลออกมาเป็น JSON ตามโครงสร้างนี้เท่านั้น:
    {
      "doc_title": string (ชื่อหรือหัวข้อเอกสารที่ชัดเจน เช่น "ใบแจ้งค่าไฟฟ้า กฟน.", "กรมธรรม์ประกันสุขภาพ AIA", "ใบเสร็จค่ารักษาพยาบาล", "สัญญาเช่า"),
      "doc_category": "สลิปโอนเงิน" | "บิลและใบแจ้งหนี้" | "เอกสารลดหย่อนภาษี" | "สุขภาพและการแพทย์" | "เอกสารทั่วไป",
      "summary": string (สรุปเนื้อหาสำคัญของเอกสาร 2-3 บรรทัด สื่อสารให้คนในครอบครัวเข้าใจง่าย),
      "amount": number or null (ยอดเงินรวมหรือยอดที่ต้องชำระ ถ้าไม่มีให้ใส่ null),
      "due_date": string or null (วันครบกำหนดชำระหรือวันที่มีผล เช่น "15 ต.ค. 2026" ถ้าไม่มีให้ใส่ null),
      "suggested_filename": string (ชื่อไฟล์ภาษาไทยที่อ่านง่ายและมีวันที่ เช่น "2026-09-30_บิลค่าไฟ_1450.pdf")
    }
  `;

  try {
    const result = await generateWithFallback(
      [
        prompt,
        {
          inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType: mimeType || "application/pdf",
          },
        },
      ],
      { responseMimeType: "application/json" }
    );

    return JSON.parse(result.response.text()) as DocumentSummary;
  } catch (err) {
    console.error("Failed to parse document summary:", err);
    return {
      doc_title: "เอกสารทั่วไป",
      doc_category: "เอกสารทั่วไป",
      summary: "ได้รับไฟล์เอกสารและสำรองเข้า Google Drive เรียบร้อยแล้ว",
      amount: null,
      due_date: null,
      suggested_filename: `doc_${Date.now()}.pdf`,
    };
  }
}
