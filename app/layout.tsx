import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://darthalgo.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Darth Algo | TradingView Buy/Sell Tool",
  description:
    "Darth Algo provides invite-only TradingView indicators with buy and sell signals, trend confirmation, alerts, and structured risk levels.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "TradingView indicator",
    "futures trading indicator",
    "buy sell signals",
    "trend following indicator",
    "Darth Algo",
  ],
  category: "Trading software",
  icons: {
    icon: "/darth-algo-icon.svg",
    shortcut: "/darth-algo-icon.svg",
    apple: "/darth-algo-icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Darth Algo | TradingView Buy/Sell Tool",
    description:
      "Darth Algo is an invite-only TradingView buy/sell indicator built for precision futures trading.",
    url: siteUrl,
    siteName: "Darth Algo",
    type: "website",
    images: [
      {
        url: "/hero/darth-algo-before-after.jpg",
        width: 1254,
        height: 1254,
        alt: "Darth Algo trading indicator before and after comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Darth Algo | TradingView Buy/Sell Tool",
    description: "Invite-only TradingView signals, trend confirmation, alerts, and structured risk levels.",
    images: ["/hero/darth-algo-before-after.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
