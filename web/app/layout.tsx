import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arena Shorts · a small cinema",
  description: "Original animated shorts, streaming — no downloads required.",
};

export const viewport: Viewport = {
  themeColor: "#0d0f14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
