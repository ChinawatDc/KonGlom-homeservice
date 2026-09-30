import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KonGlom HomeService (คนกลม โฮมเซอร์วิส) - ผู้ช่วยอัจฉริยะประจำบ้าน",
  description: "ผู้ช่วยอัจฉริยะประจำครอบครัวบน LINE สแกนสลิป บิล PDF เคลียร์รายจ่าย เตือนความจำ และดูแลสุขภาพ",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <script src="https://static.line-scdn.net/liff/edge/2/sdk.js" async></script>
      </head>
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
