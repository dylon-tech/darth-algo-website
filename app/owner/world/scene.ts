import * as Phaser from 'phaser';
import campus from '../../../public/hq-world/campus.tmj.json';
import atlas from '../../../public/hq-world/tiles.json';
import type {WorldAgent,RoomId} from './model';
// Presentation only: the scene cannot fetch, queue or execute business work.
type Department={name:string;x:number;y:number;width:number;height:number;properties:Array<{name:string;value:string|number}>};
const roomObjects=campus.layers.find(l=>l.name==='Departments')!.objects as Department[];
const W=800,H=480,T=16;
const characterOrder=['ceo','growth','content','support','affiliates','analytics','research','indicator_builder','operations'];
const statusColors:Record<string,number>={'Online':0x79d4b5,'Offline':0x8793ab,'Needs approval':0xf0ca83,'Blocked':0xeaae71,'Error':0xe97580,'Stale / Unverified':0xb3a1ce,'Paused':0xafafba,'Not configured':0xb5aaca};
export type SceneBridge={agents:WorldAgent[];reduced:boolean;room:(id:RoomId)=>void;agent:(id:string)=>void;ready:()=>void;failed:()=>void};
export function bootWorld(parent:HTMLElement,bridge:SceneBridge){
 class Campus extends Phaser.Scene{
  people=new Map<string,{sprite:Phaser.GameObjects.Sprite;dot:Phaser.GameObjects.Arc;label:Phaser.GameObjects.Text;agent:WorldAgent;route:Array<{x:number;y:number}>;nextMove:number}>();
  selected= new Phaser.Geom.Rectangle();
  selection?:Phaser.GameObjects.Graphics;dragged=false;pinch=0;last={x:0,y:0};down={x:0,y:0};minZoom=.45;reduced=bridge.reduced;
  preload(){this.load.image('hq-tiles','/hq-world/tiles.png');this.load.spritesheet('hq-people','/hq-world/agents.png',{frameWidth:16,frameHeight:16});this.load.tilemapTiledJSON('hq-map','/hq-world/campus.tmj');this.load.on('loaderror',()=>bridge.failed());}
  create(){
   const map=this.make.tilemap({key:'hq-map'}),set=map.addTilesetImage('Darth HQ','hq-tiles',16,16,0,0)!;
   map.createLayer('Ground',set)!.setDepth(-4);map.createLayer('Floors',set)!.setDepth(-3);map.createLayer('Walls',set)!.setDepth(-2);
   this.textures.addSpriteSheet('hq-objects',this.textures.get('hq-tiles').getSourceImage() as HTMLImageElement,{frameWidth:16,frameHeight:16});
   for(const obj of map.getObjectLayer('Furniture')!.objects){this.add.image(obj.x!+8,obj.y!-8,'hq-objects',(obj.gid||1)-1).setDepth(obj.y!);}
   for(const r of roomObjects){
    this.add.rectangle(r.x+81,r.y+11,124,11,0x10141d,.95).setDepth(900);
    const name=r.properties.find(p=>p.name==='title')?.value||r.name;
    this.add.text(r.x+81,r.y+11,String(name).toUpperCase(),{fontFamily:'system-ui, sans-serif',fontSize:'6px',fontStyle:'bold',color:'#e1e6f1',letterSpacing:1}).setOrigin(.5).setDepth(901);
   }
   this.add.text(W/2,239,'D A R T H   A L G O   /   H E A D Q U A R T E R S',{fontFamily:'system-ui, sans-serif',fontSize:'7px',fontStyle:'bold',color:'#d9b3bf'}).setOrigin(.5).setDepth(901);
   this.selection=this.add.graphics().setDepth(899);
   this.cameras.main.setBackgroundColor('#10161f').setBounds(-24,-24,W+48,H+48);
   this.home();this.sync(bridge.agents);
   this.input.addPointer(1);
   this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.down={x:p.x,y:p.y};this.last={...this.down};this.dragged=false;});
   this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
    if(!p.isDown)return;const c=this.cameras.main,p1=this.input.pointer1,p2=this.input.pointer2;
    if(p1.isDown&&p2.isDown){const d=Phaser.Math.Distance.Between(p1.x,p1.y,p2.x,p2.y);if(this.pinch)this.zoom(c.zoom*d/this.pinch);this.pinch=d;this.dragged=true;return;}
    if(this.pinch){this.pinch=0;this.last={x:p.x,y:p.y};return;}
    if(Phaser.Math.Distance.Between(p.x,p.y,this.down.x,this.down.y)>6)this.dragged=true;
    if(this.dragged){c.scrollX-=(p.x-this.last.x)/c.zoom;c.scrollY-=(p.y-this.last.y)/c.zoom;this.last={x:p.x,y:p.y};}
   });
   this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{
    if(this.dragged||this.pinch){this.pinch=0;return;}const point=this.cameras.main.getWorldPoint(p.x,p.y);
    const person=[...this.people.values()].find(o=>Phaser.Math.Distance.Between(point.x,point.y,o.sprite.x,o.sprite.y)<11);
    if(person){bridge.agent(person.agent.id);return;}
    const r=roomObjects.find(o=>point.x>=o.x&&point.x<o.x+o.width&&point.y>=o.y&&point.y<o.y+o.height);
    if(r){this.focusRoom(r.name);bridge.room(r.name as RoomId);}
   });
   this.input.on('wheel',(_p:unknown,_g:unknown,_x:number,y:number)=>this.zoom(this.cameras.main.zoom*(y>0?.9:1.1)));
   this.scale.on('resize',this.resize,this);
   this.game.events.on('hq-agents',this.sync,this);this.game.events.on('hq-camera',this.control,this);this.game.events.on('hq-reduced',this.setReduced,this);
   this.events.once('shutdown',()=>{this.game.events.off('hq-agents',this.sync,this);this.game.events.off('hq-camera',this.control,this);this.game.events.off('hq-reduced',this.setReduced,this);this.scale.off('resize',this.resize,this);});
   this.game.canvas.setAttribute('aria-hidden','true');bridge.ready();
  }
  setReduced(value:boolean){this.reduced=value;for(const p of this.people.values()){p.route=[];p.sprite.anims.stop();}}
  resize(){this.minZoom=Math.max(.25,Math.min(this.scale.width/(W+32),this.scale.height/(H+32)));this.zoom(this.cameras.main.zoom);}
  zoom(n:number){this.cameras.main.setZoom(Phaser.Math.Clamp(n,this.minZoom,4));}
  home(){this.resize();this.zoom(this.minZoom);this.cameras.main.centerOn(W/2,H/2);this.selection?.clear();}
  focusRoom(id:string){const r=roomObjects.find(r=>r.name===id);if(!r)return;const c=this.cameras.main,z=Math.min(this.scale.width/205,this.scale.height/205,3.5);this.tweens.killTweensOf(c);this.tweens.add({targets:c,zoom:z,scrollX:r.x+80-c.width/2,scrollY:r.y+80-c.height/2,duration:this.reduced?0:350,ease:'Sine.easeOut'});this.selection?.clear().lineStyle(1,0xfa6a8a,.85).strokeRect(r.x-2,r.y-2,r.width+4,r.height+4);}
  control(action:string){const c=this.cameras.main;if(action==='home')this.home();else if(action==='in')this.zoom(c.zoom*1.2);else if(action==='out')this.zoom(c.zoom/1.2);else if(action==='left')c.scrollX-=40/c.zoom;else if(action==='right')c.scrollX+=40/c.zoom;else if(action==='up')c.scrollY-=40/c.zoom;else if(action==='down')c.scrollY+=40/c.zoom;else this.focusRoom(action);}
  sync(agents:WorldAgent[]){
   for(const [id,o] of this.people)if(!agents.some(a=>a.id===id)){o.sprite.destroy();o.dot.destroy();o.label.destroy();this.people.delete(id);}
   for(const a of agents){const r=roomObjects.find(r=>r.name===a.room);if(!r)continue;const n=characterOrder.indexOf(a.id);if(n<0)continue;
    let o=this.people.get(a.id);
    if(!o){const siblings=agents.filter(p=>p.room===a.room).findIndex(p=>p.id===a.id),x=r.x+40+siblings*32,y=r.y+88;
     o={sprite:this.add.sprite(x,y,'hq-people',n*12).setDepth(y),dot:this.add.circle(x,y-14,2,0x8994aa).setDepth(902),label:this.add.text(x,y-23,a.name,{fontFamily:'system-ui, sans-serif',fontSize:'5px',color:'#f3f0f3',backgroundColor:'#141a26',padding:{x:2,y:1}}).setOrigin(.5).setDepth(903),agent:a,route:[],nextMove:1000+n*750};this.people.set(a.id,o);
     for(let d=0;d<4;d++){const key=`walk-${n}-${d}`;if(!this.anims.exists(key))this.anims.create({key,frames:[n*12+d*3,n*12+d*3+1,n*12+d*3,n*12+d*3+2].map(frame=>({key:'hq-people',frame})),frameRate:7,repeat:-1});}
    }
    if(o.agent.status!==a.status||o.agent.jobId!==a.jobId){o.route=[];o.nextMove=0;}
    o.agent=a;o.dot.setFillStyle(statusColors[a.status]||0x8793ab);o.label.setText(a.name);
   }
  }
  path(from:{x:number;y:number},to:{x:number;y:number}){
   const walls=campus.layers.find(l=>l.name==='Walls')!.data!,sx=Math.floor(from.x/T),sy=Math.floor(from.y/T),tx=Math.floor(to.x/T),ty=Math.floor(to.y/T),start=sy*50+sx,target=ty*50+tx;
   const queue=[start],parents=new Map<number,number>([[start,-1]]);let i=0;
   while(i<queue.length&&queue.length<1501){const at=queue[i++];if(at===target)break;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=at%50+dx,y=Math.floor(at/50)+dy,next=y*50+x;if(x<1||x>=49||y<1||y>=29||parents.has(next))continue;if(walls[next]&&walls[next]!==atlas.door+1)continue;parents.set(next,at);queue.push(next);}}
   if(!parents.has(target))return [];const path=[];for(let at=target;at!==start;at=parents.get(at)!){path.unshift({x:at%50*T+8,y:Math.floor(at/50)*T+8});}return path;
  }
  update(time:number,delta:number){
   for(const o of this.people.values()){
    const r=roomObjects.find(r=>r.name===o.agent.room)!;
    if(!this.reduced&&time>o.nextMove&&!o.route.length){
     const x=o.agent.active?r.x+40:r.x+(2+(Math.floor(time/5000)+characterOrder.indexOf(o.agent.id))%6)*16+8;
     const y=o.agent.active?r.y+72:r.y+88;o.route=this.path(o.sprite,{x,y});o.nextMove=time+6500;
    }
    const target=o.route[0];
    if(target&&!this.reduced){const dx=target.x-o.sprite.x,dy=target.y-o.sprite.y,d=Math.hypot(dx,dy),speed=Math.min(delta,50)*.022;if(d<=speed){o.sprite.setPosition(target.x,target.y);o.route.shift();}else{o.sprite.x+=dx/d*speed;o.sprite.y+=dy/d*speed;const direction=Math.abs(dx)>Math.abs(dy)?dx>0?1:2:dy<0?3:0;o.sprite.play(`walk-${characterOrder.indexOf(o.agent.id)}-${direction}`,true);}}
    else{o.sprite.anims.stop();o.sprite.setFrame(characterOrder.indexOf(o.agent.id)*12);}
    o.sprite.setDepth(o.sprite.y);o.dot.setPosition(o.sprite.x,o.sprite.y-12);o.label.setPosition(o.sprite.x,o.sprite.y-21);
   }
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent,backgroundColor:'#10161f',pixelArt:true,roundPixels:true,antialias:false,transparent:false,scale:{mode:Phaser.Scale.RESIZE,width:parent.clientWidth,height:parent.clientHeight},fps:{target:30,forceSetTimeOut:true},render:{powerPreference:'low-power'},audio:{noAudio:true},scene:Campus,banner:false});
 return game;
}
