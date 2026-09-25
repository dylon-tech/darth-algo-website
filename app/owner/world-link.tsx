'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function WorldLink(){
 const [preferred,setPreferred]=useState(false);
 useEffect(()=>{try{setPreferred(localStorage.getItem('darth-owner-view-v1')==='world');}catch{}},[]);
 return <Link href='/owner/world' style={{display:'inline-flex',alignItems:'center',gap:8,minHeight:44,padding:'8px 14px',margin:'4px 0 14px',border:'1px solid #49404c',borderRadius:12,background:'#1e1b25',color:'#f3c3d0',fontSize:12,textDecoration:'none'}}>{preferred?'Return to HQ World':'Enter HQ World'} <span aria-hidden='true'>↗</span></Link>;
}
