import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Darth Algo | TradingView Buy/Sell Tool",
  description:
    "Darth Algo is an invite-only TradingView buy/sell indicator built for precision futures trading.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
