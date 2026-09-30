import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KonGlom-homeservice (คนกลม โฮมเซอร์วิส)",
  description: "ผู้ช่วยอัจฉริยะประจำครอบครัวบน LINE",
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
