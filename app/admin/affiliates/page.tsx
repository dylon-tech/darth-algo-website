import type { Metadata } from "next";
import AdminAffiliates from "./admin-affiliates";
export const metadata:Metadata={title:'Affiliate Administration | Darth Algo',robots:{index:false,follow:false}};
export default function Page(){return <main className="min-h-screen bg-[#0d1117] px-5 py-14 text-white"><div className="mx-auto max-w-6xl"><AdminAffiliates/></div></main>}

