//This file controls the main page structure that wraps the whole website.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVAI Grants",
  description: "Browse grants and track NGO applications."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/grants" className="brand">NOVAI Grants</a>
          <span>Find grants your NGO can actually win</span>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
