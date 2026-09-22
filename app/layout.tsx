import type { Metadata } from "next";
import "./globals.css";
import "./components/immersive.css";
import CampaignAttribution from "./components/campaign-attribution";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.darthalgo.com";
const canonicalSite = siteUrl.replace(/\/$/, "");
const brandLogo = `${canonicalSite}/darth-algo-link-logo.svg`;
const brandIcon = `${canonicalSite}/darth-algo-icon.svg`;

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSite),
  applicationName: "Darth Algo",
  title: {
    default: "Darth Algo | TradingView Indicators for Futures Traders",
    template: "%s | Darth Algo",
  },
  description:
    "Official Darth Algo TradingView indicators for futures traders. Explore Scalper, Swing and Pro tools with buy/sell signals, trend context, alerts and structured risk levels.",
  alternates: { canonical: "/" },
  keywords: [
    "Darth Algo",
    "DarthAlgo",
    "Darth Algo TradingView",
    "Darth Algo indicator",
    "Darth Algo indicators",
    "TradingView indicator",
    "futures trading indicator",
    "buy sell signals",
    "scalping indicator",
    "swing trading indicator",
  ],
  category: "Trading software",
  icons: {
    icon: [
      { url: "/darth-algo-icon.svg", type: "image/svg+xml" },
      { url: "/darth-algo-link-logo.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/darth-algo-icon.svg",
    apple: "/darth-algo-link-logo.svg",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Darth Algo | TradingView Indicators for Futures Traders",
    description:
      "Official Darth Algo trading tools for TradingView: Scalper, Swing and Pro indicators with signals, trend context, alerts and structured risk levels.",
    url: canonicalSite,
    siteName: "Darth Algo",
    type: "website",
    images: [{ url: "/darth-algo-link-logo.svg", width: 1200, height: 1200, alt: "Darth Algo official logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Darth Algo | TradingView Indicators for Futures Traders",
    description: "Official Darth Algo TradingView indicators for futures traders.",
    images: ["/darth-algo-link-logo.svg"],
  },
  other: {
    "brand": "Darth Algo",
    "dark-algo-disambiguation": "Darth Algo is a TradingView indicator brand and is not the similarly named Dark Algo EA / MT4 / MT5 forex robot.",
  },
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${canonicalSite}/#organization`,
  name: "Darth Algo",
  alternateName: ["DarthAlgo", "darth.algo", "Darth Algo TradingView"],
  url: canonicalSite,
  logo: {
    "@type": "ImageObject",
    url: brandLogo,
    contentUrl: brandLogo,
    width: 1200,
    height: 1200,
  },
  image: brandLogo,
  description: "Darth Algo provides TradingView indicators for futures traders, including Scalper, Swing and Pro tools.",
  email: "darthalgo67@gmail.com",
  sameAs: [
    "https://www.instagram.com/darth.algo/",
  ],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${canonicalSite}/#website`,
  url: canonicalSite,
  name: "Darth Algo",
  alternateName: ["DarthAlgo", "darth.algo"],
  publisher: { "@id": `${canonicalSite}/#organization` },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={brandIcon} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={brandLogo} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      </head>
      <body>
        <CampaignAttribution />
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
