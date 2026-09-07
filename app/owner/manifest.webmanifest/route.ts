export function GET(){
  return Response.json({id:"/owner",name:"Darth Algo Command Center",short_name:"Darth Command",description:"Private owner workspace",start_url:"/owner",scope:"/owner",display:"standalone",background_color:"#080d15",theme_color:"#080d15",icons:[{src:"/owner/app-icon?size=192",sizes:"192x192",type:"image/png",purpose:"any"},{src:"/owner/app-icon?size=512",sizes:"512x512",type:"image/png",purpose:"any"}]},{headers:{"Content-Type":"application/manifest+json","Cache-Control":"public, max-age=3600"}});
}
