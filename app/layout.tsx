import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DevFlow — API & Automation", description: "A developer-focused API and automation workspace." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
