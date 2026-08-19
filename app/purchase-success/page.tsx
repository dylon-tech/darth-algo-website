import PurchaseSurvey from "./purchase-survey";

export const metadata = {
  title: "Purchase Complete | Darth Algo",
  description: "Complete your Darth Algo post-purchase survey.",
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
