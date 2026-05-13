import type { Metadata } from "next";
import { AccountNav } from "@/components/account-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "HDU Wiki | 杭电百科",
  description: "给 HDUER 准备的校园词条、经验文章和新生指南。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AccountNav />
        {children}
      </body>
    </html>
  );
}
