import { describe, it, expect } from "vitest";
import {
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
  buildWeeklyDigestFlexMessage,
} from "../src/lib/line";

describe("LINE Flex Message Builders", () => {
  it("should generate a valid Slip Flex Message", () => {
    const slip = {
      is_slip: true,
      amount: 450,
      bank: "KBANK",
      category: "อาหาร",
      date: "2026-09-30 12:00:00",
      sender_name: "แม่",
    };
    const driveUrl = "https://drive.google.com/file/d/test1234/view";
    const flex = buildSlipFlexMessage(slip, driveUrl, "แม่");

    expect(flex.type).toBe("bubble");
    expect(flex.header.contents[1].text).toContain("บันทึกรายจ่ายสำเร็จ");
    expect(flex.footer.contents[0].action.uri).toBe(driveUrl);
  });

  it("should generate a valid Settlement Flex Message", () => {
    const flex = buildSettlementFlexMessage("2026-09", 3000, 1000, 3);

    expect(flex.type).toBe("bubble");
    expect(flex.body.contents[0].text).toContain("3,000");
    expect(flex.body.contents[1].text).toContain("1,000");
  });

  it("should generate a valid Reminder Flex Message", () => {
    const reminder = {
      is_reminder: true,
      title: "พาคุณยายไปหาหมอ",
      target_person: "ยาย",
      due_date_time: "2026-10-15T09:00:00",
    };
    const flex = buildReminderFlexMessage(reminder);

    expect(flex.type).toBe("bubble");
    expect(flex.body.contents[0].text).toBe("พาคุณยายไปหาหมอ");
    expect(flex.body.contents[1].text).toContain("ยาย");
  });

  it("should generate a valid Medicine Flex Message", () => {
    const med = {
      is_medicine: true,
      medicine_name: "พาราเซตามอล 500mg",
      indication: "ลดไข้ บรรเทาอาการปวด",
      dosage_instructions: "ทานครั้งละ 1 เม็ด ทุก 4-6 ชั่วโมง",
      warnings: "ห้ามทานเกินวันละ 8 เม็ด",
    };
    const flex = buildMedicineFlexMessage(med);

    expect(flex.type).toBe("bubble");
    expect(flex.body.contents[0].text).toBe("พาราเซตามอล 500mg");
    expect(flex.body.contents[4].text).toContain("ทานครั้งละ 1 เม็ด");
  });

  it("should generate a valid Recipe Flex Message", () => {
    const recipeData = {
      ingredients_detected: ["ไข่ไก่", "หมูสับ"],
      recommended_recipes: [
        {
          title: "ไข่เจียวหมูสับ",
          description: "ตีไข่ใส่หมูสับทอดในน้ำมันร้อนจนฟูกรอบ",
          difficulty: "ง่าย" as const,
          time_minutes: 15,
        },
      ],
    };
    const flex = buildRecipeFlexMessage(recipeData);

    expect(flex.type).toBe("bubble");
    expect(flex.body.contents[0].contents[0].text).toContain("ไข่เจียวหมูสับ");
  });

  it("should generate a valid Document Summary Flex Message", () => {
    const doc = {
      doc_title: "ใบแจ้งค่าไฟฟ้า กฟน.",
      doc_category: "บิลและใบแจ้งหนี้" as const,
      summary: "ค่าไฟฟ้ารอบบิล 09/2026 ยอดชำระ 1,450 บาท",
      amount: 1450,
      due_date: "15 ต.ค. 2026",
      suggested_filename: "2026-09-30_ค่าไฟ_1450.pdf",
    };
    const driveUrl = "https://drive.google.com/file/d/testdoc/view";
    const flex = buildDocumentSummaryFlexMessage(doc, driveUrl, "2026-09/02_บิลและใบแจ้งหนี้");

    expect(flex.type).toBe("bubble");
    expect(flex.header.contents[1].text).toContain("จัดเก็บเอกสารและสรุปสำเร็จ");
    expect(flex.body.contents[0].text).toBe("ใบแจ้งค่าไฟฟ้า กฟน.");
    expect(flex.footer?.contents[0].action?.uri).toBe(driveUrl);
  });

  it("should generate a valid Dashboard Link Flex Message", () => {
    const url = "https://kon-glom-homeservice.vercel.app/liff/dashboard?groupId=testGroup123";
    const flex = buildDashboardLinkFlexMessage(url);

    expect(flex.type).toBe("bubble");
    expect(flex.header.contents[1].text).toContain("แดชบอร์ดรายจ่ายของบ้าน");
    expect(flex.footer.contents[0].action.uri).toBe(url);
  });

  it("should generate a valid Batch Summary Flex Message", () => {
    const files = [
      {
        fileName: "20260930_สลิปเงินเดือน_พนักงาน_68250.62บาท.pdf",
        fileType: "pdf",
        docCategory: "payslip",
        docTitle: "สลิปเงินเดือน (CHINAWAT ✨)",
        amount: "68250.62",
        isExpense: false,
      },
      {
        fileName: "20260930_สลิป_KBANK_350บาท.jpg",
        fileType: "image",
        docCategory: "expense_slip",
        docTitle: "สลิปโอนเงิน KBANK",
        amount: "350.00",
        isExpense: true,
      },
    ];

    const flex = buildBatchSummaryFlexMessage(files, "testGroup123");

    expect(flex.type).toBe("bubble");
    expect(flex.header.contents[1].text).toContain("สำรองไฟล์เข้า Google Drive สำเร็จ");
    expect((flex.body.contents[0] as any).contents[0].text).toContain("รูปภาพ 1 รูป PDF 1 ไฟล์");
    expect(flex.footer.contents[0].action.uri).toContain("1WinPhipplh6_xISDEtE6UIffrfKCUt7K");
  });

  it("should generate a valid Family Settings Flex Message", () => {
    const flex = buildFamilySettingsFlexMessage({
      familyName: "บ้านคนกลม 88",
      familyPin: "1234",
      adminName: "คุณพ่อ",
      driveFolderId: "test_drive_folder_123",
      subscriptionPlan: "pro",
    });

    expect(flex.type).toBe("bubble");
    expect(flex.header.contents[1].text).toBe("บ้านคนกลม 88");
    expect((flex.body as any).contents[0].contents[1].text).toContain("ตั้งแล้ว (4 หลัก)");
    expect((flex.body as any).contents[3].contents[1].text).toBe("PRO");
  });

  it("should generate a valid Welcome Flex Message (1-Click Onboarding)", () => {
    const flex = buildWelcomeFlexMessage("group123", "บ้านก้อนกลม");

    expect(flex.type).toBe("bubble");
    expect(flex.header.contents[1].text).toContain("น้องกลม");
    expect(flex.header.contents[2].text).toContain("บ้านก้อนกลม");
    expect(flex.footer.contents[0].action.uri).toContain("group123");
  });

  it("should generate a valid Weekly Digest Flex Message", () => {
    const flex = buildWeeklyDigestFlexMessage({
      familyName: "บ้านก้อนกลม",
      startDate: "23 ก.ย. 2569",
      endDate: "30 ก.ย. 2569",
      totalAmount: 14500,
      transactionCount: 18,
      topCategory: "อาหารและของใช้",
      topCategoryAmount: 6200,
      topSpender: "คุณแม่",
      topSpenderAmount: 8900,
      dashboardUrl: "https://kon-glom-homeservice.vercel.app/liff/dashboard?groupId=test123",
    });

    expect(flex.type).toBe("bubble");
    expect(flex.header.contents[1].text).toBe("บ้านก้อนกลม");
    expect((flex.body as any).contents[0].contents[1].text).toContain("14,500.00");
    expect(flex.footer.contents[0].action.uri).toContain("test123");
  });
});



