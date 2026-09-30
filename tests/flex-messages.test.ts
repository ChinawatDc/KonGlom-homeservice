import { describe, it, expect } from "vitest";
import {
  buildSlipFlexMessage,
  buildSettlementFlexMessage,
  buildReminderFlexMessage,
  buildMedicineFlexMessage,
  buildRecipeFlexMessage,
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
});
