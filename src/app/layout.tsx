import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "FinSight",
  description: "Kelola keuangan pribadi dengan AI Insight & Open Banking Simulator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full antialiased" style={{ background: "#faf9f7", color: "#000000" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
