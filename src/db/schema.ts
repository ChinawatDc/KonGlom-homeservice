import { pgTable, serial, varchar, numeric, timestamp, jsonb, text, boolean, integer } from "drizzle-orm/pg-core";

// =========================================================================
// Phase 1 & 2: Expenses & Settlements (รายจ่ายกองกลาง & การเคลียร์เงิน)
// =========================================================================
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  lineUserId: varchar("line_user_id", { length: 100 }).notNull(),
  userName: varchar("user_name", { length: 150 }).default("สมาชิกในครอบครัว"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'อาหาร', 'ค่าน้ำค่าไฟ', 'ของใช้ในบ้าน', 'สุขภาพ', 'ทั่วไป'
  bankName: varchar("bank_name", { length: 50 }),          // 'KBANK', 'SCB', 'KTB', 'PROMPTPAY', etc.
  transactionDate: timestamp("transaction_date").defaultNow(),
  driveFileId: varchar("drive_file_id", { length: 150 }),
  driveUrl: text("drive_url"),                             // Direct link to Google Drive
  rawGeminiData: jsonb("raw_gemini_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  monthYear: varchar("month_year", { length: 20 }).notNull(), // e.g. "2026-09"
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  memberCount: integer("member_count").notNull(),
  sharePerPerson: numeric("share_per_person", { precision: 12, scale: 2 }).notNull(),
  summaryJson: jsonb("summary_json").notNull(),              // Details of who owes whom
  isSettled: boolean("is_settled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =========================================================================
// Phase 3: Reminders & Family Events (เตือนความจำ & ปฏิทิน)
// =========================================================================
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  lineUserId: varchar("line_user_id", { length: 100 }),
  title: text("title").notNull(),                            // เช่น "พาคุณยายไปพบแพทย์ รพ.จุฬา"
  targetPerson: varchar("target_person", { length: 100 }),   // เช่น "คุณยาย", "พ่อ"
  dueDateTime: timestamp("due_date_time").notNull(),         // วันและเวลาที่นัดหมาย
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'notified', 'cancelled'
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: varchar("recurrence_rule", { length: 50 }),// 'daily', 'weekly', 'monthly'
  originalInput: text("original_input"),                     // ข้อความต้นฉบับหรือถอดจากเสียง
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =========================================================================
// Phase 4: Elder Care, Medicines & Health Logs (สุขภาพผู้สูงวัย & ซองยา)
// =========================================================================
export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  medicineName: varchar("medicine_name", { length: 200 }).notNull(),
  targetPerson: varchar("target_person", { length: 100 }),   // เช่น "พ่อ", "แม่"
  indication: text("indication"),                            // สรรพคุณ
  dosageInstructions: text("dosage_instructions").notNull(), // เช่น "ทานครั้งละ 1 เม็ด หลังอาหารเช้า"
  warnings: text("warnings"),                                // ข้อควรระวัง
  imageUrl: text("image_url"),                               // รูปถ่ายซองยา (ใน Google Drive)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const healthLogs = pgTable("health_logs", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  lineUserId: varchar("line_user_id", { length: 100 }),
  patientName: varchar("patient_name", { length: 100 }).notNull(),
  logType: varchar("log_type", { length: 50 }).notNull(),    // 'blood_pressure', 'blood_sugar', 'weight'
  systolic: integer("systolic"),                             // ค่าบน (ความดัน)
  diastolic: integer("diastolic"),                           // ค่าล่าง (ความดัน)
  heartRate: integer("heart_rate"),                          // ชีพจร
  bloodSugar: numeric("blood_sugar", { precision: 5, scale: 2 }), // ระดับน้ำตาลในเลือด
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =========================================================================
// Phase 5: Home Maintenance & Pantry/Fridge Tracker (งานบ้าน & ตู้เย็น)
// =========================================================================
export const homeMaintenance = pgTable("home_maintenance", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  taskName: varchar("task_name", { length: 150 }).notNull(), // เช่น "ล้างแอร์ห้องนอนใหญ่", "เปลี่ยนไส้กรองน้ำ"
  intervalMonths: integer("interval_months").default(6),     // ทุกกี่เดือน
  lastServiceDate: timestamp("last_service_date"),
  nextDueDate: timestamp("next_due_date").notNull(),
  technicianContact: varchar("technician_contact", { length: 100 }), // เบอร์ช่างประจำ
  status: varchar("status", { length: 20 }).default("pending"),      // 'pending', 'completed'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pantryItems = pgTable("pantry_items", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 150 }).notNull(), // วัตถุดิบ เช่น "ไข่ไก่", "หมูสับ", "ผักกาดขาว"
  category: varchar("category", { length: 50 }),             // 'ตู้เย็น', 'ของแห้ง', 'เครื่องปรุง'
  quantity: varchar("quantity", { length: 50 }),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
