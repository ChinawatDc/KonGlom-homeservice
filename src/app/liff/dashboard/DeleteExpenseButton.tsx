"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteExpenseAction } from "./actions";

interface DeleteExpenseButtonProps {
  expenseId: number;
  groupId: string;
  pin?: string;
  expenseTitle?: string;
}

export function DeleteExpenseButton({
  expenseId,
  groupId,
  pin,
  expenseTitle,
}: DeleteExpenseButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `คุณต้องการลบรายการ "${expenseTitle || "รายการนี้"}" ออกจากบันทึกรายจ่ายครอบครัวใช่หรือไม่?`
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await deleteExpenseAction(expenseId, groupId, pin);
    setLoading(false);

    if (!res.success) {
      alert(res.error || "เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
      title="ลบรายการนี้"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
