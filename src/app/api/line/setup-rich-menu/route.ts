import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 6-Button Rich Menu Spec for "KonGlom น้องกลม"
 * Dimensions: 2500 x 1686 (2 rows of 3 equal buttons)
 *
 * Layout:
 *  Row 1: [📊 แดชบอร์ดรายจ่าย] [💸 เคลียร์เงินกองกลาง] [💰 ตั้งงบประมาณ]
 *  Row 2: [📅 ดูนัดหมาย]         [🧊 ของในตู้เย็น]        [📋 คู่มือคำสั่ง]
 *
 * Each button: 833px wide (middle col: 834px), 843px tall
 */
const KONGLOM_RICH_MENU_SPEC = {
  size: {
    width: 2500,
    height: 1686,
  },
  selected: true,
  name: "KonGlom Master Menu v2",
  chatBarText: "🏡 เมนูน้องกลม",
  areas: [
    // === แถวที่ 1 (y: 0 → 843) ===
    {
      // ปุ่มที่ 1: 📊 แดชบอร์ดรายจ่าย
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: {
        type: "message",
        label: "แดชบอร์ดรายจ่าย",
        text: "@กลม แดชบอร์ด",
      },
    },
    {
      // ปุ่มที่ 2: 💸 เคลียร์เงินกองกลาง
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: {
        type: "message",
        label: "เคลียร์เงินกองกลาง",
        text: "@กลม เคลียร์เงิน",
      },
    },
    {
      // ปุ่มที่ 3: 💰 ตั้งงบประมาณ
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: {
        type: "message",
        label: "ตั้งงบประมาณ",
        text: "@กลม ตั้งงบ",
      },
    },
    // === แถวที่ 2 (y: 843 → 1686) ===
    {
      // ปุ่มที่ 4: 📅 ดูนัดหมาย
      bounds: { x: 0, y: 843, width: 833, height: 843 },
      action: {
        type: "message",
        label: "ดูนัดหมาย",
        text: "@กลม มีนัดอะไรบ้าง",
      },
    },
    {
      // ปุ่มที่ 5: 🧊 ของในตู้เย็น
      bounds: { x: 833, y: 843, width: 834, height: 843 },
      action: {
        type: "message",
        label: "ของในตู้เย็น",
        text: "@กลม ตู้เย็น",
      },
    },
    {
      // ปุ่มที่ 6: 📋 คู่มือคำสั่ง
      bounds: { x: 1667, y: 843, width: 833, height: 843 },
      action: {
        type: "message",
        label: "คู่มือคำสั่ง",
        text: "@กลม คู่มือ",
      },
    },
  ],
};

/**
 * GET: ตรวจสอบ Rich Menu ปัจจุบันที่มีอยู่ใน LINE Bot
 */
export async function GET() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN is missing" }, { status: 400 });
  }

  try {
    const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();

    const defaultRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const defaultData = await defaultRes.json().catch(() => null);

    return NextResponse.json({
      status: "ok",
      spec: KONGLOM_RICH_MENU_SPEC,
      existingRichMenus: listData.richmenus || [],
      defaultRichMenuId: defaultData?.richMenuId || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: สร้าง Rich Menu + upload รูปภาพ + ตั้งเป็น default อัตโนมัติครบ 3 ขั้นตอน
 *
 * Body (JSON, optional):
 *   { "imageUrl": "https://..." }   — ใช้รูปจาก URL ภายนอก
 *
 * ถ้าไม่ส่ง imageUrl จะ return richMenuId พร้อมคำแนะนำ upload เอง
 */
export async function POST(req: Request) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN is missing" }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  try {
    // ── Step 1: สร้างโครงสร้าง Rich Menu ──────────────────────────────
    const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(KONGLOM_RICH_MENU_SPEC),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      return NextResponse.json(
        { error: "Step 1 failed: could not create Rich Menu structure", details: createData },
        { status: 400 }
      );
    }

    const richMenuId = createData.richMenuId as string;

    // ── Step 2: Upload รูปภาพ (ถ้ามี imageUrl) ─────────────────────────
    let imageUploaded = false;
    let imageError: string | null = null;

    if (body.imageUrl) {
      try {
        // Download รูปจาก URL
        const imgRes = await fetch(body.imageUrl);
        if (!imgRes.ok) throw new Error(`Cannot fetch image: ${imgRes.status}`);
        const imgBuffer = await imgRes.arrayBuffer();
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";

        // Upload ไป LINE
        const uploadRes = await fetch(
          `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": contentType,
            },
            body: imgBuffer,
          }
        );

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          imageError = `Step 2 warning: image upload failed (${uploadRes.status}) — ${JSON.stringify(errData)}`;
        } else {
          imageUploaded = true;
        }
      } catch (e: any) {
        imageError = `Step 2 warning: ${e.message}`;
      }
    }

    // ── Step 3: ตั้งเป็น Default Rich Menu สำหรับทุกผู้ใช้ ──────────────
    let setDefaultOk = false;
    let setDefaultError: string | null = null;

    if (imageUploaded) {
      const setDefaultRes = await fetch(
        `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (setDefaultRes.ok) {
        setDefaultOk = true;
      } else {
        const errData = await setDefaultRes.json().catch(() => ({}));
        setDefaultError = `Step 3 warning: set default failed — ${JSON.stringify(errData)}`;
      }
    }

    // ── Response ────────────────────────────────────────────────────────
    return NextResponse.json({
      status: "ok",
      richMenuId,
      steps: {
        "1_create_structure": "✅ สร้างโครงสร้าง Rich Menu สำเร็จ",
        "2_upload_image": imageUploaded
          ? "✅ Upload รูปสำเร็จ"
          : imageError || "⚠️ ไม่ได้ส่ง imageUrl — ต้อง upload รูปเอง",
        "3_set_default": setDefaultOk
          ? "✅ ตั้งเป็น Default Rich Menu สำหรับทุกผู้ใช้สำเร็จ"
          : setDefaultError || "⏳ รอ upload รูปก่อนจึงจะตั้ง default ได้",
      },
      manualSteps: imageUploaded
        ? null
        : {
            uploadImage: {
              method: "POST",
              url: `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
              headers: {
                Authorization: `Bearer ${token.substring(0, 10)}...`,
                "Content-Type": "image/jpeg",
              },
              note: "ส่งไฟล์รูป JPG ขนาด 2500x1686px เป็น body",
            },
            setDefault: {
              method: "POST",
              url: `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
              headers: { Authorization: `Bearer ${token.substring(0, 10)}...` },
            },
          },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
