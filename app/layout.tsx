import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "動画編集 案件一覧",
  description: "動画編集の案件を1画面で一覧管理する（架空の見本）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
