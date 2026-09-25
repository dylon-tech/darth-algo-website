"""Reproducible CC0 atlas extraction + original HQ details. No network or AI.
Usage: python scripts/build-hq-assets.py /path/to/extracted-kenney-packs
Original pixel work in this script is dedicated to CC0 by this project.
"""
from PIL import Image,ImageDraw
from pathlib import Path
import sys,json,hashlib
src=Path(sys.argv[1]);out=Path('public/hq-world');out.mkdir(exist_ok=True)
files={'city':'roguelike-modern-city/Tilemap/tilemap.png','indoors':'roguelike-indoors/Tilesheets/roguelikeIndoor_transparent.png','characters':'roguelike-characters/Spritesheet/roguelikeChar_transparent.png'}
ims={k:Image.open(src/v).convert('RGBA') for k,v in files.items()}
selected={'city':[11,12,45,46,152,153,189,190,226,227,300,301,320,321,339,340,374,375,403,440,477,514,526,527,568,569,703,704,740,741,888,895,899], 'indoors':[0,1,2,27,28,29,16,17,216,217,218,219,270,271,272,293,295,324,325,330,351,352,357,360,394,395,396,459,460]}
tiles=[];manifest={}
for k,ids in selected.items():
 im=ims[k];cols=(im.width+1)//17
 for n in ids:
  tile=im.crop(((n%cols)*17,(n//cols)*17,(n%cols)*17+16,(n//cols)*17+16))
  # Cool graphite palette for structural/furniture tiles; preserve plants.
  if k=='city' and n not in [403,440,477,514] or k=='indoors' and n not in [16,17]:
   px=tile.load()
   for y in range(16):
    for x in range(16):
     r,g,b,a=px[x,y];l=(r+g+b)//3;px[x,y]=(int(l*.45),int(l*.50),int(l*.59),a)
  manifest[k+str(n)]=len(tiles);tiles.append(tile)
def custom(name,draw):
 im=Image.new('RGBA',(16,16));draw(ImageDraw.Draw(im));manifest[name]=len(tiles);tiles.append(im)
custom('floor',lambda d:(d.rectangle((0,0,15,15),fill='#202733'),d.line((0,15,15,15),fill='#151b24'),d.point((1,1),fill='#30394a')))
custom('wall',lambda d:(d.rectangle((0,0,15,15),fill='#0c111a'),d.rectangle((0,0,15,4),fill='#465064'),d.line((0,5,15,5),fill='#68738b'),d.rectangle((0,9,15,13),fill='#242c3a'),d.line((0,14,15,14),fill='#a5354f')))
custom('desk',lambda d:(d.rectangle((1,5,14,13),fill='#0a0d14'),d.rectangle((0,2,15,10),fill='#515767'),d.rectangle((1,3,14,8),fill='#303746'),d.rectangle((3,1,12,6),fill='#0a111c'),d.line((4,3,10,3),fill='#51c5ca'),d.line((4,4,8,4),fill='#aa4f71'),d.rectangle((5,8,11,9),fill='#adb1b9')))
custom('server',lambda d:(d.rectangle((2,1,13,15),fill='#070c13'),d.rectangle((3,0,12,13),fill='#404b5d'),*[d.rectangle((4,y,11,y+2),fill='#182532') for y in [2,6,10]],*[d.point((5,y),fill='#71c0bb') for y in [3,7,11]],d.line((9,13,12,13),fill='#dc5867')))
custom('screen',lambda d:(d.rectangle((0,0,15,12),fill='#50586d'),d.rectangle((1,1,14,10),fill='#111b27'),d.line((3,8,6,5,8,6,12,3),fill='#d05773',width=1),d.line((3,3,7,3),fill='#5e8798'),d.rectangle((7,13,8,14),fill='#4b5264'),d.line((4,15,11,15),fill='#7c8190')))
custom('light',lambda d:(d.rectangle((0,5,15,10),fill='#3b2235'),d.line((1,7,14,7),fill='#ff5e7b'),d.line((2,8,13,8),fill='#9d354c')))
custom('console',lambda d:(d.rectangle((0,2,15,13),fill='#151b25'),d.rectangle((1,1,14,10),fill='#555d71'),d.rectangle((2,2,13,8),fill='#1c2a39'),d.line((3,4,8,4),fill='#64b8c3'),d.line((3,6,11,6),fill='#a36681'),d.rectangle((3,11,7,12),fill='#e8687c')))
custom('camera',lambda d:(d.rectangle((4,0,12,6),fill='#68768c'),d.rectangle((2,2,5,5),fill='#b94d65'),d.rectangle((7,6,8,12),fill='#344258'),d.line((7,11,3,15),fill='#6a778b'),d.line((8,11,12,15),fill='#6a778b')))
custom('vault',lambda d:(d.rectangle((1,0,14,15),fill='#758198'),d.rectangle((2,1,13,14),fill='#293744'),d.rectangle((4,3,11,12),outline='#576d83'),d.ellipse((6,6,10,10),outline='#d2b884'),d.point((13,2),fill='#c64c61')))
custom('door',lambda d:(d.rectangle((0,0,15,15),fill='#17212e'),d.line((1,0,1,15),fill='#9c465f'),d.line((14,0,14,15),fill='#9c465f'),d.line((4,8,11,8),fill='#778497')))
atlas=Image.new('RGBA',(16*16,((len(tiles)+15)//16)*16))
for n,t in enumerate(tiles):atlas.paste(t,((n%16)*16,(n//16)*16))
atlas.save(out/'tiles.png');(out/'tiles.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Nine existing agent identities. Body silhouette from Kenney tile 0; original
# suits, hair, side/back frames and alternate legs. 12 frames per agent.
colors=['#a779d8','#77a8cd','#dd5f80','#6ec5ba','#d5ae74','#87a2dc','#be8aba','#df9174','#b8beca']
chars=Image.new('RGBA',(16*12,16*9));base=ims['characters'].crop((0,0,16,16))
for a,color in enumerate(colors):
 for direction in range(4):
  for step in range(3):
   im=base.copy();d=ImageDraw.Draw(im)
   d.rectangle((4,7,11,13),fill='#252b3d');d.rectangle((5,8,10,10),fill=color)
   d.rectangle((4,1,11,3),fill=['#3b2d35','#484357','#352b31'][a%3]);d.rectangle((5,0,10,1),fill='#484253')
   if direction==1:d.rectangle((4,2,7,6),fill='#484253')
   if direction==2:d.rectangle((8,2,11,6),fill='#484253')
   if direction==3:d.rectangle((4,1,11,6),fill='#484253')
   d.rectangle((3,13,12,15),fill=(0,0,0,0));d.rectangle((5,13,7,14+(step==1)),fill='#8792a7');d.rectangle((9,13,11,14+(step==2)),fill='#8792a7')
   chars.paste(im,((direction*3+step)*16,a*16))
chars.save(out/'agents.png')
# Map is ordinary editable Tiled JSON. Eight connected cutaway rooms.
rooms=[('research',2,2,'Research Lab'),('content',14,2,'Content Studio'),('publishing',26,2,'Publishing Tower'),('indicators',38,2,'Indicator Workshop'),('support',2,17,'Support & Sales'),('ceo',14,17,'CEO Command'),('finance',26,17,'Finance Vault'),('operations',38,17,'Engineering Lab')]
w,h=50,30;ground=[manifest['city888']+1]*(w*h);floor=[0]*(w*h);walls=[0]*(w*h);furniture=[];objects=[]
def put(layer,x,y,name):layer[y*w+x]=manifest[name]+1
def item(x,y,name):furniture.append({'id':len(furniture)+1,'name':name,'gid':manifest[name]+1,'x':x*16,'y':(y+1)*16,'width':16,'height':16,'rotation':0,'visible':True})
for x in range(1,49):
 for y in [13,14,15]:put(ground,x,y,'city704')
for x in [12,24,36]:
 for y in range(1,29):put(ground,x,y,'city703')
for k,x,y,title in rooms:
 for j in range(y,y+10):
  for i in range(x,x+10):put(floor,i,j,'floor')
 for i in range(x,x+10):put(walls,i,y,'wall');put(walls,i,y+9,'wall')
 for j in range(y,y+10):put(walls,x,j,'wall');put(walls,x+9,j,'wall')
 dy=y+9 if y<15 else y;put(walls,x+5,dy,'door')
 for py in range(min(dy,14),max(dy,14)+1):put(ground,x+5,py,'city704')
 for dx in [2,6]:
  item(x+dx,y+3,'desk');item(x+dx,y+4,'indoors216')
 item(x+1,y+1,'indoors16');item(x+8,y+7,'indoors17')
 item(x+2,y+1,'screen');item(x+3,y+1,'screen')
 for dx in [6,7]:item(x+dx,y+1,'server' if k in ['research','operations','publishing'] else 'indoors357')
 for dx in [2,3,4]:item(x+dx,y+7,'console' if k in ['research','indicators','operations'] else 'indoors271')
 item(x+7,y+6,{'content':'camera','finance':'vault','publishing':'server'}.get(k,'console'))
 item(x+4,y,'light');item(x+6,y,'light')
 objects.append({'id':len(objects)+1000,'name':k,'type':'department','x':x*16,'y':y*16,'width':160,'height':160,'properties':[{'name':'title','type':'string','value':title},{'name':'doorX','type':'int','value':(x+5)*16+8},{'name':'doorY','type':'int','value':dy*16+8}]})
for x in [1,11,23,35,48]:
 for y in [1,10,18,27]:item(x,y,'city403');item(x,y+1,'city440');item(x,y+2,'city477')
for x in [5,17,29,41]:item(x,15,'city568');item(x+1,15,'city569');item(x+3,13,'city527')
layers=[]
for n,data in [('Ground',ground),('Floors',floor),('Walls',walls)]:layers.append({'id':len(layers)+1,'name':n,'type':'tilelayer','data':data,'width':w,'height':h,'x':0,'y':0,'opacity':1,'visible':True})
layers += [{'id':4,'name':'Furniture','type':'objectgroup','objects':furniture,'opacity':1,'visible':True},{'id':5,'name':'Departments','type':'objectgroup','objects':objects,'opacity':1,'visible':True}]
world={'type':'map','version':'1.10','tiledversion':'1.12.2','orientation':'orthogonal','renderorder':'right-down','width':w,'height':h,'tilewidth':16,'tileheight':16,'infinite':False,'layers':layers,'nextlayerid':6,'nextobjectid':1100,'tilesets':[{'firstgid':1,'name':'Darth HQ','tilewidth':16,'tileheight':16,'tilecount':len(tiles),'columns':16,'image':'tiles.png','imagewidth':atlas.width,'imageheight':atlas.height,'margin':0,'spacing':0}]}
(out/'campus.tmj').write_text(json.dumps(world,separators=(',',':'))+'\n')
(out/'campus.tmj.json').write_text(json.dumps(world,separators=(',',':'))+'\n')
for slug in ['roguelike-modern-city','roguelike-indoors','roguelike-characters']:(out/'licenses'/f'{slug}.txt').write_text((src/slug/'License.txt').read_text())
print('Built',len(tiles),'tiles, 108 agent frames, eight rooms; editable map at',out/'campus.tmj')
