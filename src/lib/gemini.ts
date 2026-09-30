import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// ลิสต์โมเดลที่รองรับตามลำดับความพร้อมใช้งาน เพื่อป้องกัน Error 503 (High Demand)
const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest",
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
  due_date_time: string; // ISO string e.g. "2026-10-15T09:00:00"
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
  doc_category: "สลิปโอนเงิน" | "บิลและใบแจ้งหนี้" | "เอกสารลดหย่อนภาษี" | "สุขภาพและการแพทย์" | "เอกสารทั่วไป";
  summary: string;
  amount?: number | null;
  due_date?: string | null;
  suggested_filename: string;
}

/**
 * Phase 1 & 6 & 7: สแกนสลิปโอนเงิน / ใบเสร็จ / เอกสาร PDF
 */
export async function parseSlipDocument(
  fileBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<SlipData> {
  const prompt = `
    คุณคือผู้เชี่ยวชาญด้าน OCR สลิปโอนเงิน ใบเสร็จ และเอกสารการเงินของประเทศไทย
    โปรดวิเคราะห์รูปภาพหรือเอกสาร PDF นี้ และส่งคืนผลลัพธ์เป็น JSON ในรูปแบบนี้เท่านั้น:
    {
      "is_slip": boolean (true ถ้าเป็นสลิปโอนเงิน บิล ใบเสร็จชำระเงิน หรือใบกำกับภาษี, false ถ้าไม่ใช่),
      "amount": number (ยอดเงินเฉพาะตัวเลขทศนิยม เช่น 350.00),
      "bank": string (ชื่อธนาคาร เช่น "KBANK", "SCB", "KTB", "BBL", "PromptPay", "GSB" หรือ "ใบเสร็จทั่วไป"),
      "category": string (หมวดหมู่: "อาหาร", "ค่าน้ำค่าไฟ", "ของใช้ในบ้าน", "สุขภาพ/ยา", "การศึกษา/ลูก", "ช้อปปิ้ง", หรือ "ทั่วไป"),
      "date": "YYYY-MM-DD HH:mm:ss" (วันเวลาที่ทำรายการ หากไม่พบให้ใช้วันนี้),
      "sender_name": string (ชื่อผู้โอน),
      "receiver_name": string (ชื่อผู้รับ),
      "note": string (บันทึกช่วยจำถ้ามี),
      "transaction_ref": string (เลขอ้างอิงธุรกรรม/รหัสสลิป เช่น 2026093012345678 หากไม่พบให้เว้นว่าง),
      "is_tax_deductible": boolean (true ถ้าเป็นค่ารักษาพยาบาล เบี้ยประกัน เงินบริจาค หรือใบเสร็จที่ลดหย่อนภาษีได้),
      "tax_category": string ("ค่ารักษาพยาบาล", "เบี้ยประกัน", "เงินบริจาค", "ช้อปดีมีคืน", หรือ null)
    }
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
 * Phase 3: ถอดความข้อความเสียง / ข้อความเตือนความจำ
 */
export async function parseVoiceOrTextReminder(
  input: { text?: string; audioBuffer?: Buffer; mimeType?: string },
  currentDateTime: string = new Date().toISOString()
): Promise<ReminderData> {
  const prompt = `
    คุณคือเลขาประจำครอบครัว งานของคุณคือแกะนัดหมายหรือสิ่งที่ต้องเตือนความจำจากข้อความ
    เวลาปัจจุบันคือ: ${currentDateTime} (เขตเวลา Asia/Bangkok, GMT+7)
    
    ส่งผลลัพธ์เป็น JSON ในรูปแบบนี้:
    {
      "is_reminder": boolean,
      "title": string (หัวข้อนัดหมายหรือสิ่งที่ต้องทำ กระชับ ชัดเจน),
      "target_person": string (คนที่เกี่ยวข้อง เช่น "ยาย", "พ่อ", "แม่", หรือ "ทุกคน"),
      "due_date_time": "YYYY-MM-DDTHH:mm:ss" (วันและเวลาที่ต้องเตือน อ้างอิงตามเวลาปัจจุบัน),
      "is_recurring": boolean (true ถ้าเป็นสิ่งที่ต้องเตือนประจำ เช่น ทุกวัน ทุกเดือน)
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
    return JSON.parse(result.response.text()) as ReminderData;
  } catch (err) {
    console.error("Failed to parse reminder:", err);
    return { is_reminder: false, title: "", due_date_time: "" };
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
