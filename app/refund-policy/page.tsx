import type { Metadata } from "next";
import LegalPage from "../components/legal-page";

export const metadata: Metadata = { title: "Refund And Cancellation Policy | Darth Algo", description: "Darth Algo subscription cancellation, trial, and digital-product refund information.", alternates: { canonical: "/refund-policy" } };

const sections = [
  { title: "Swing Free Trial", paragraphs: ["The Swing Tool includes a 2-day trial only when the checkout page explicitly shows the trial before payment confirmation. Unless canceled before the trial ends, the subscription continues at the monthly price displayed at checkout.", "Starting a trial does not guarantee trading results and does not extend because the indicator was unused during the trial period."] },
  { title: "Monthly Subscriptions", paragraphs: ["Monthly subscriptions can be canceled to stop future renewals. Cancellation takes effect for the next billing period and access may continue through the paid period shown by Stripe.", "Cancel before the renewal date shown in your billing details when you do not want the next recurring charge."] },
  { title: "Digital Access And Lifetime Purchases", paragraphs: ["Darth Algo indicators, invite-only access, licenses, and source-code files are digital products. Once access or source files have been delivered, refund requests are reviewed individually because delivered digital access cannot always be returned.", "Nothing in this policy limits any non-waivable consumer rights that apply in your jurisdiction."] },
  { title: "Billing Problems", paragraphs: ["Contact support promptly when a duplicate charge, incorrect plan, access problem, or unauthorized payment appears. Include the purchase email, plan, and Stripe receipt identifier, but never send full card details.", "Approved refunds are returned through Stripe to the original payment method. Processing time depends on Stripe and the customer’s bank."] },
  { title: "How To Request Help", paragraphs: ["Use the support contact associated with your Stripe receipt or the Darth Algo support page. Requests should explain the billing or access issue clearly so the purchase can be verified.", "Charge disputes filed without first contacting support can delay investigation and may temporarily suspend product access while the payment is reviewed."] },
];

export default function RefundPolicyPage() {
  return <LegalPage eyebrow="Billing Policy" title="Refunds And Cancellations" summary="Clear information about the Swing trial, monthly cancellations, digital access, and billing support." effectiveDate="July 29, 2026" sections={sections} />;
}
