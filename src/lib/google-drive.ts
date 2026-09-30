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
 * ค้นหาหรือสร้างโฟลเดอร์ตามปี/เดือน เช่น "2026/09"
 */
async function getOrCreateYearMonthFolder(drive: any, parentId: string, folderName: string): Promise<string> {
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
}

/**
 * อัปโหลดรูปภาพ Buffer ไปยัง Google Drive
 */
export async function uploadImageToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<DriveUploadResult | null> {
  const drive = getDriveClient();
  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive || !parentFolderId) {
    return {
      fileId: "mock_file_id",
      webViewLink: "https://drive.google.com",
    };
  }

  try {
    // แยกโฟลเดอร์ตาม YYYY-MM
    const now = new Date();
    const folderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const targetFolderId = await getOrCreateYearMonthFolder(drive, parentFolderId, folderName);

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
    let webViewLink = file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // กำหนด Permission ให้เปิดดูผ่านลิงก์ได้
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
    };
  } catch (error) {
    console.error("Google Drive Upload Error:", error);
    return null;
  }
}
