import type { Metadata } from "next";
import GrowthDashboard from "./growth-dashboard";

export const metadata: Metadata = { title: "Community Growth | Darth Algo", robots: { index: false, follow: false } };

export default function Page() {
  return <main className="min-h-screen bg-[#0d1117] px-5 py-14 text-white"><div className="mx-auto max-w-7xl"><GrowthDashboard /></div></main>;
}
