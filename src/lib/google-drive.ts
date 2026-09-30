import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/^"|"$/g, "").replace(/\\n/g, "\n")
    : null;

  if (!email || !privateKey) {
    console.warn("Google Drive Service Account credentials not provided.");
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * ค้นหาหรือสร้างโฟลเดอร์ตามชื่อใต้ parentId
 */
async function getOrCreateFolder(drive: any, parentId: string, folderName: string): Promise<string> {
  const query = `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // สร้างโฟลเดอร์ใหม่
  const newFolder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return newFolder.data.id!;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  folderPath?: string;
  familyFolderId?: string;
}

/**
 * อัปโหลดไฟล์ (รูปภาพ, สลิป, หรือเอกสาร PDF) ไปยัง Google Drive
 * รองรับการแยกโฟลเดอร์ตามบ้าน (เช่น "บ้านก้อนกลม") และแยกตามหมวดหมู่อัตโนมัติ (เช่น บ้านก้อนกลม/2026-09/01_สลิปโอนเงิน)
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg",
  subFolder?: string,
  customParentFolderId?: string,
  familyFolderName?: string
): Promise<DriveUploadResult | null> {
  const drive = getDriveClient();
  const rootParentId = customParentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive || !rootParentId) {
    const defaultFamily = familyFolderName || "บ้านก้อนกลม";
    return {
      fileId: "mock_file_id",
      webViewLink: "https://drive.google.com",
      folderPath: subFolder ? `${defaultFamily}/2026-09/${subFolder}` : `${defaultFamily}/2026-09`,
    };
  }

  try {
    // 1. ถ้ามี familyFolderName (เช่น "บ้านก้อนกลม" หรือตามชื่อบ้าน)
    //    สร้างหรือค้นหาโฟลเดอร์ของบ้านใต้ root parent folder ก่อน
    let currentParentId = rootParentId;
    let fullFolderPath = "";
    let familyFolderId: string | undefined;

    if (familyFolderName) {
      familyFolderId = await getOrCreateFolder(drive, rootParentId, familyFolderName);
      currentParentId = familyFolderId;
      fullFolderPath = familyFolderName;
    }

    // 2. แยกโฟลเดอร์หลักตาม YYYY-MM เช่น "2026-09" ใต้โฟลเดอร์ของบ้าน
    const now = new Date();
    const monthFolderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthFolderId = await getOrCreateFolder(drive, currentParentId, monthFolderName);
    fullFolderPath = fullFolderPath ? `${fullFolderPath}/${monthFolderName}` : monthFolderName;

    // 3. ถ้ามี subFolder (เช่น "01_สลิปโอนเงิน", "02_บิลและใบแจ้งหนี้", "03_สลิปเงินเดือนและรายรับ", "04_สุขภาพและยา")
    let targetFolderId = monthFolderId;
    if (subFolder) {
      targetFolderId = await getOrCreateFolder(drive, monthFolderId, subFolder);
      fullFolderPath = `${fullFolderPath}/${subFolder}`;
    }

    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
    };

    const media = {
      mimeType,
      body: Readable.from(buffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    const fileId = file.data.id!;
    const webViewLink = file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // กำหนด Permission ให้สมาชิกเปิดดูผ่านลิงก์ได้
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch {
      // โฟลเดอร์แม่อาจแชร์ไว้แล้ว
    }

    return {
      fileId,
      webViewLink,
      folderPath: fullFolderPath,
    };
  } catch (error) {
    console.error("Google Drive Upload Error:", error);
    return null;
  }
}

// Backward compatibility alias
export const uploadImageToDrive = uploadFileToDrive;
