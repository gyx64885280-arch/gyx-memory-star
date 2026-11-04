const escape=s=>String(s).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
export function atlas(result,{dark=false,route=[],picked=null,markers=[],mode='reach',values=[],delays=[]}={}){
  const n=result.net.nodes;
  const bg=dark?'#0d3448':'#eaf1ec',building=dark?'#204e61':'#cbdad7',road=dark?'#406879':'#ffffff';
  const line=(a,b,color,width,extra='')=>`<path d="M${n[a].x} ${n[a].y} L${n[b].x} ${n[b].y}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
  let blocks='';
  for(let k=0;k<230;k++){const x=(k*83)%630,y=(k*61)%402;blocks+=`<rect x="${x}" y="${y}" width="${8+(k*13)%23}" height="${4+(k%6)}" rx="1" fill="${building}" transform="rotate(${k%3===0?12:-4} ${x} ${y})"/>`;}
  const e=result.net.edges;
  // The outline is a visual envelope of reachable nodes, not a land-coverage estimate.
  const points=n.filter(p=>result.times[p.id]<=15).sort((a,b)=>a.x-b.x||a.y-b.y);
  function halfHull(list){
    const h=[];
    for(const p of list){
      while(h.length>=2){const a=h[h.length-2],b=h[h.length-1];if((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)>0)break;h.pop()}
      h.push(p);
    }
    return h.slice(0,-1);
  }
  const hull=halfHull(points).concat(halfHull([...points].reverse()));
  const envelope=mode==='reach'&&points.length>2?'<polygon points="'+hull.map(p=>p.x+','+p.y).join(' ')+'" fill="#42bcb3" fill-opacity=".15" stroke="#5fc5bd" stroke-width="1.6" stroke-dasharray="5 4"/>':'';
  const network=envelope+e.map(l=>line(l.a,l.b,road,6.5)).join('');
  const reach=e.map(l=>{const a=result.times[l.a],b=result.times[l.b];return Math.max(a,b)<=15?line(l.a,l.b,(a+b)/2<=5?'#24d2ac':(a+b)/2<=10?'#42bfa9':'#57a9bd',dark?4.5:4):''}).join('');
  const congestion=delays.map(e=>line(e.a,e.b,'#ce5141',8,'opacity=".8"')).join('');
  const routes=route.slice(1).map((id,i)=>line(route[i],id,dark?'#ffe093':'#e79722',5,'stroke-dasharray="7 3"')).join('');
  const h=n[result.home.id];
  const home=`<circle cx="${h.x}" cy="${h.y}" r="19" fill="#43e7b8" opacity=".24"/><circle cx="${h.x}" cy="${h.y}" r="8" fill="#0a785f" stroke="#fff" stroke-width="3"/><text x="${h.x}" y="${h.y+24}" text-anchor="middle" fill="${dark?'#d7fbec':'#124334'}" font-size="12" font-weight="700">起点楼栋</text>`;
  const pins=markers.map((m,i)=>{const p=n[m.id],active=picked===m.id;
    const c=m.color||['#367ba8','#a77e45','#397f69','#866e9b'][i%4],label=escape(m.label);
    const offset=p.x>510?-66:p.x<110?36:0, dx=p.x+offset,dy=p.y-17;
    return `<g><title>${label}</title><circle cx="${p.x}" cy="${p.y}" r="${active?8:5}" fill="${c}" stroke="white" stroke-width="2"/><rect x="${dx-label.length*6-5}" y="${dy-11}" width="${label.length*12+10}" height="18" rx="3" fill="${dark?'#112f42':'#fff'}" opacity=".94"/><text text-anchor="middle" x="${dx}" y="${dy+2}" font-size="11" fill="${dark?'#e1f5f2':'#173947'}">${label}</text></g>`}).join('');
  const heat=values.map(({id,c,r})=>`<circle cx="${n[id].x}" cy="${n[id].y}" r="${r||30}" fill="${c}" fill-opacity=".28" stroke="${c}" stroke-dasharray="4 3"/>`).join('');
  return `<svg viewBox="0 0 640 410" role="img" aria-label="示例街区路网分析图，显示住宅、设施和选定路线"><defs><pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="${dark?'#315468':'#bdcfca'}" stroke-width=".7"/></pattern></defs><rect width="640" height="410" fill="${bg}"/><rect width="640" height="410" fill="url(#mapGrid)"/>${blocks}<path d="M-10 402 Q120 340 215 377T405 360T655 327" fill="none" stroke="${dark?'#1c647a':'#a8d4dd'}" stroke-width="21"/>${network}${mode==='reach'?reach:''}${heat}${congestion}${routes}${pins}${mode==='reach'?home:''}<text x="614" y="29" text-anchor="middle" font-size="11" fill="${dark?'#b4dee1':'#41626d'}">▲ N</text></svg>`;
}
