import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 6-Button Rich Menu Spec for "KonGlom น้องกลม"
 * Dimensions: 2500 x 1686 (2 rows of 3 buttons)
 */
const KONGLOM_RICH_MENU_SPEC = {
  size: {
    width: 2500,
    height: 1686,
  },
  selected: true,
  name: "KonGlom Master Menu",
  chatBarText: "🏡 เมนูน้องกลม",
  areas: [
    // แถวที่ 1 (y: 0, h: 843)
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: {
        type: "message",
        label: "แดชบอร์ดรายจ่าย",
        text: "@กลม แดชบอร์ด",
      },
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: {
        type: "message",
        label: "เคลียร์เงินกองกลาง",
        text: "@กลม เคลียร์เงิน",
      },
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: {
        type: "message",
        label: "ข้อมูลบ้านและไดรฟ์",
        text: "@กลม ข้อมูลบ้าน",
      },
    },
    // แถวที่ 2 (y: 843, h: 843)
    {
      bounds: { x: 0, y: 843, width: 833, height: 843 },
      action: {
        type: "message",
        label: "เตือนความจำ",
        text: "@กลม เตือน",
      },
    },
    {
      bounds: { x: 833, y: 843, width: 834, height: 843 },
      action: {
        type: "message",
        label: "กินไรดี",
        text: "@กลม กินไรดี",
      },
    },
    {
      bounds: { x: 1667, y: 843, width: 833, height: 843 },
      action: {
        type: "message",
        label: "คู่มือคำสั่ง",
        text: "@กลม",
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
      recommendedTemplate: KONGLOM_RICH_MENU_SPEC,
      existingRichMenus: listData.richmenus || [],
      defaultRichMenuId: defaultData?.richMenuId || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: สร้าง Rich Menu ในระบบ LINE Official Account อัตโนมัติ
 */
export async function POST(req: Request) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN is missing" }, { status: 400 });
  }

  try {
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
      return NextResponse.json({ error: "Failed to create rich menu", details: createData }, { status: 400 });
    }

    const richMenuId = createData.richMenuId;

    return NextResponse.json({
      status: "ok",
      message: "Rich Menu structure created successfully.",
      richMenuId,
      nextStep: {
        uploadImageEndpoint: `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
        setDefaultEndpoint: `POST https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
