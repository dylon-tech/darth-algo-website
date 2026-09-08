import type { Metadata } from "next";
import CommandCenter from "./command-center";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Darth Algo · Owner Command",robots:{index:false,follow:false},alternates:{canonical:null}};
export default function OwnerPage(){return <CommandCenter/>;}
