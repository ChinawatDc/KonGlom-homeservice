import { describe, it, expect } from "vitest";
import {
  expenses,
  settlements,
  reminders,
  medicines,
  healthLogs,
  homeMaintenance,
  pantryItems,
} from "../src/db/schema";

describe("Database Schemas", () => {
  it("should have all Phase 1-5 tables defined", () => {
    expect(expenses).toBeDefined();
    expect(settlements).toBeDefined();
    expect(reminders).toBeDefined();
    expect(medicines).toBeDefined();
    expect(healthLogs).toBeDefined();
    expect(homeMaintenance).toBeDefined();
    expect(pantryItems).toBeDefined();
  });

  it("should have correct column mappings for expenses table", () => {
    expect(expenses.amount).toBeDefined();
    expect(expenses.category).toBeDefined();
    expect(expenses.driveUrl).toBeDefined();
    expect(expenses.lineUserId).toBeDefined();
  });
});
