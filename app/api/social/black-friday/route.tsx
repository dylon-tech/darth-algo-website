import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const screenshot = "https://www.darthalgo.com/indicators/scalper-overview.png";

function PriceTile({ label, original, sale, detail }: { label: string; original: string; sale: string; detail: string }) {
  return (
    <div style={{ display: "flex", flex: 1, flexDirection: "column", backgroundColor: "#151b26", border: "1px solid #3d4351", borderRadius: 18, padding: "16px 20px", minWidth: 0 }}>
      <div style={{ display: "flex", color: "#d3d8e0", fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 5 }}>
        <span style={{ color: "#f84b68", fontSize: 38, fontWeight: 900 }}>{sale}</span>
        <span style={{ color: "#97a0b0", textDecoration: "line-through", fontSize: 21 }}>{original}</span>
      </div>
      <div style={{ display: "flex", color: "#abb3c0", fontSize: 17, marginTop: 4 }}>{detail}</div>
    </div>
  );
}

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#090b10", backgroundImage: "linear-gradient(145deg, #14121a 0%, #090b10 44%, #16121a 100%)", color: "#fff", padding: "42px 52px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 37, letterSpacing: 1.8, fontWeight: 900 }}>
          DARTH <span style={{ color: "#ef3652", marginLeft: 12 }}>ALGO</span>
        </div>
        <div style={{ display: "flex", backgroundColor: "#5d1524", border: "1px solid #ed3656", color: "#ffe4e9", borderRadius: 30, fontSize: 17, padding: "10px 18px", letterSpacing: 2 }}>TRADINGVIEW TOOLS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
        <div style={{ display: "flex", fontSize: 91, lineHeight: 0.93, fontWeight: 900, letterSpacing: -3 }}>BLACK <span style={{ color: "#f33b5b", marginLeft: 22 }}>FRIDAY</span></div>
        <div style={{ display: "flex", fontSize: 27, color: "#c4c9d1", marginTop: 14 }}>Actual indicators. Clear pricing. No guesswork.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 28, borderRadius: 19, overflow: "hidden", backgroundColor: "#101823", border: "1px solid #394250", height: 322, position: "relative" }}>
        <img src={screenshot} alt="Real recorded Darth Algo Scalper interface on TradingView" width={975} height={423} style={{ objectFit: "cover", objectPosition: "center", width: "100%", height: "100%" }} />
        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, right: 0, padding: "15px 20px", backgroundColor: "#060a0ddf", fontSize: 18, fontWeight: 700 }}>REAL SCALPER CHART · Signals · Trend cloud · Entry / Stop / Targets</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 24, backgroundColor: "#2b0c18", border: "2px solid #ef3d5c", borderRadius: 21, padding: "21px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>LIFETIME ACCESS</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <span style={{ color: "#fff", fontSize: 81, lineHeight: 1.05, fontWeight: 900 }}>$89</span>
              <span style={{ color: "#b5aab1", fontSize: 30, textDecoration: "line-through" }}>$134.99</span>
            </div>
            <span style={{ color: "#f8c5ce", fontSize: 19, marginTop: 8 }}>Scalper + Swing + Pro access · One-time payment</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#f2395a", color: "#fff", padding: "18px 18px", borderRadius: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>YOU SAVE</span>
            <span style={{ fontSize: 36, fontWeight: 900 }}>$45.99</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 11, fontSize: 19, color: "#fff", fontWeight: 800 }}>LIFETIME CODE: BLACKFRIDAY89</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
        <span style={{ fontSize: 26, fontWeight: 900 }}>MONTHLY TOOLS</span>
        <span style={{ fontSize: 21, color: "#ff6b84", fontWeight: 800 }}>25% OFF FIRST PAYMENT</span>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <PriceTile label="SWING" original="$14.99" sale="$11.24" detail="Then $14.99/mo" />
        <PriceTile label="SCALPER" original="$18.99" sale="$14.24" detail="Then $18.99/mo" />
        <PriceTile label="PRO" original="$29.00" sale="$21.75" detail="Then $29/mo" />
      </div>
      <div style={{ display: "flex", marginTop: 17, justifyContent: "center", fontSize: 21, fontWeight: 900 }}>MONTHLY CODE: <span style={{ color: "#ff6b84", marginLeft: 8 }}>BLACKFRIDAY25</span></div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f03753", borderRadius: 16, padding: "16px 22px", fontSize: 30, fontWeight: 900 }}>GET ACCESS — LINK IN BIO</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 11, fontSize: 15, color: "#b6bac6" }}>Ends Dec 9, 2026 at 11:59 PM ET · Codes apply at checkout · Terms apply</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 3, fontSize: 14, color: "#8c93a3" }}>Recorded product screenshot · Charts by TradingView · Trading involves risk</div>
      </div>
    </div>,
    { width: 1080, height: 1350 }
  );
}
