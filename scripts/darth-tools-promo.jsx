export default async ({ project }) => {
 const p=await project({dir:"/home/user/darth-promo",size:"1080x1920",fps:24,background:"#0C1019"});
 const overview=await p.add("/home/user/overview.png"), risk=await p.add("/home/user/risk.png");
 const scenes=[
  {title:"READ THE\nSETUP.",label:"01 / CHART CONTEXT",body:"See the trend.\nFind your setup.",file:overview},
  {title:"MAP THE\nRISK.",label:"02 / TRADE PLANNING",body:"Entry. Stop. Targets.\nYour decision, made clearer.",file:risk},
  {title:"FIND YOUR\nSTYLE.",label:"03 / EXPLORE DARTH ALGO",body:"Swing · Scalper · Pro\nTools. Community. Official pages.",file:overview}
 ];
 for(let i=0;i<3;i++){
  const s=scenes[i];
  p.compose(<frame width={1080} height={1920} layout="none" background="#0C1019">
   <rect x={0} y={0} width={1080} height={14} fill="#F34655"/>
   <text x={74} y={110} width={932} height={55} fontFamily="Montserrat" fontSize={35} fontWeight={800} color="#FFFFFF">DARTH ALGO</text>
   <text x={74} y={216} width={932} height={42} fontFamily="Montserrat" fontSize={23} letterSpacing={3} color="#F34655">{s.label}</text>
   <frame x={74} y={305} width={932} height={300} layout="none" motion={{enter:{from:{y:30,opacity:0},duration:0.5},exit:{to:{opacity:0},duration:0.3,anchor:"end"}}}>
    <text width={932} height={300} fontFamily="Montserrat" fontSize={112} fontWeight={800} lineHeight={1.05} color="#FFFFFF">{s.title}</text>
   </frame>
   <frame x={44} y={675} width={992} height={650} background="#151C29" radius={24} clip={true} layout="none">
    <media file={s.file} x={20} y={25} width={952} height={590} fit="contain" animate={[{property:"scale",from:1,to:1.045,duration:6,easing:"linear"}]}/>
   </frame>
   <text x={74} y={1356} width={932} height={42} fontFamily="Montserrat" fontSize={20} color="#98A5BB">RECORDED PRODUCT EXAMPLE · NOT LIVE DATA</text>
   <text x={74} y={1460} width={932} height={140} fontFamily="Montserrat" fontSize={40} lineHeight={1.35} color="#CDD5E3">{s.body}</text>
   <rect x={74} y={1640} width={932} height={108} radius={20} fill="#F34655"/>
   <text x={100} y={1667} width={880} height={60} fontFamily="Montserrat" fontSize={42} fontWeight={800} align="center" color="#FFFFFF">darthalgo.com/links</text>
   <text x={74} y={1800} width={932} height={50} fontFamily="Montserrat" fontSize={23} color="#98A5BB">Educational content. Trading involves risk.</text>
  </frame>,{at:i*6,dur:6,name:s.label});
 }
 await p.frame(8,"/home/user/promo-preview.png");
 await p.render("/home/user/promo.mp4",{depth:8,bitrate:6000000,concurrency:2});
};
