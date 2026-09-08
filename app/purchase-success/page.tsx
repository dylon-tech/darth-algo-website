import PurchaseSurvey from "./purchase-survey";

export const metadata = {
  title: "Get Started | Darth Algo",
  description: "Get help activating Darth Algo on TradingView. Optional purchase feedback.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId = "" } = await searchParams;

  return <PurchaseSurvey sessionId={sessionId} />;
}
