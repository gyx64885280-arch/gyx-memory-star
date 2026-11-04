// Time is measured in minutes, edge lengths in metres and capacity in visits per period.
export const streets = ['回龙观','望京','广安门内'];
export const categories = ['医疗','养老','买菜','教育','体育','商超','停车','微服务'];
const names = ['社区卫生站','养老助餐点','便民菜市','社区小学','体育公园','社区超市','公共停车场','便民维修点'];
export function makeNetwork(area=0) {
  const nodes=[], edges=[];
  const xx=[62,166,269,372,483,582], yy=[54,127,203,282,357];
  for(let id=0;id<30;id++) {
    const c=id%6, r=Math.floor(id/6);
    nodes.push({id,x:xx[c]+Math.sin(r*1.6+c*.5)*13,y:yy[r]+Math.cos(c*.9+r)*10});
    const link=(to,salt)=>edges.push({a:id,b:to,m:165+((id*13+salt*19+area*31)%92),signal:(id+salt)%5===0});
    if(c<5 && ![8,14,21].includes(id)) link(id+1,1);
    if(r<4 && ![4,7,15,19].includes(id)) link(id+6,2);
  }
  const places = [[4,10,14,12,22,9,28,8],[10,16,9,14,21,23,3,8],[5,8,15,18,21,10,28,4]][area];
  return {nodes,edges,bus:[6,8,11,23],homes:[{id:13,name:'西区 · 1 号楼',pop:780,inside:[4.2,2.3,1.4][area]},{id:2,name:'北区 · 3 号楼',pop:540,inside:2.6},{id:16,name:'东区 · 6 号楼',pop:690,inside:1.4},{id:26,name:'南区 · 8 号楼',pop:410,inside:3.3}],
    facilities:places.map((id,i)=>({id,cat:categories[i],name:names[i],cap:[190,100,350,240,300,390,85,75][i]})),
    add:{id:[7,7,19][area],cat:['医疗','养老','停车'][area],name:['拟增卫生分站','拟增助餐点','拟开放夜间车场'][area],cap:[100,90,120][area]}};
}
export function paths(net,home,mode='walk',senior=false,improved=false,wait=4) {
  const n=net.nodes.length, size=n*2, adj=Array.from({length:size},()=>[]);
  function connect(a,b,cost){adj[a].push([b,cost]);adj[b].push([a,cost]);}
  const speed=mode==='bike'?4:senior?.7:1.2;
  for(const e of net.edges) connect(e.a,e.b,e.m/speed/60+(e.signal?(improved?.35:.75):0));
  if(mode==='bus') {
    for(let k=0;k<net.bus.length;k++) {
      const id=net.bus[k];adj[id].push([id+n,wait]);adj[id+n].push([id,0]);
      if(k>0) connect(net.bus[k-1]+n,id+n,2.1);
    }
  }
  const time=Array(size).fill(Infinity),prev=Array(size).fill(-1),done=new Set();
  time[home.id]=home.inside*(senior?1.2/.7:1);
  for(let step=0;step<size;step++){
    let at=-1;
    for(let i=0;i<size;i++) if(!done.has(i)&&Number.isFinite(time[i])&&(at===-1||time[i]<time[at])) at=i;
    if(at===-1) break;
    done.add(at);
    for(const [id,cost] of adj[at]) if(time[at]+cost<time[id]){time[id]=time[at]+cost;prev[id]=at;}
  }
  return {time:time.slice(0,n),route(to){const result=[];for(let v=to;v!==-1;v=prev[v]) if(result[0]!==v%n)result.unshift(v%n);return result;}};
}
export function assess(net,cat,scenario,limit=15,senior=false){
  const fs=net.facilities.filter(f=>f.cat===cat);
  if(scenario&&net.add.cat===cat)fs.push(net.add);
  const routes=net.homes.map(h=>paths(net,h,'walk',senior,scenario));
  const ratios=fs.map(f=>{let demand=net.homes.reduce((n,h,i)=>n+(routes[i].time[f.id]<=limit?h.pop:0),0);return demand?f.cap/demand:0});
  const scores=net.homes.map((h,i)=>{let t=Math.min(...fs.map(f=>routes[i].time[f.id]));return {...h,t,score:fs.reduce((n,f,j)=>n+(routes[i].time[f.id]<=limit?ratios[j]:0),0)}});
  const pop=scores.reduce((n,h)=>n+h.pop,0),covered=scores.reduce((n,h)=>n+(h.t<=limit?h.pop:0),0);
  const mean=scores.reduce((n,h)=>n+h.pop*h.score,0)/pop;
  const pair=scores.reduce((n,h)=>n+scores.reduce((v,j)=>v+h.pop*j.pop*Math.abs(h.score-j.score),0),0);
  return {pop,covered,rate:100*covered/pop,mean,gini:mean?pair/(2*pop*pop*mean):null,scores};
}
export function rankSites(net,trade,mode){
  const ids=[7,16,25], supply=({生鲜菜店:[160,380,75],便利店:[460,720,510],便民餐饮:[85,190,110],社区维修:[35,62,46]})[trade];
  const frequency=({生鲜菜店:.32,便利店:.24,便民餐饮:.18,社区维修:.07})[trade];
  const routes=net.homes.map(h=>paths(net,h,mode));
  return ids.map((id,i)=>{const pop=net.homes.reduce((n,h,j)=>n+(routes[j].time[id]<=15?h.pop:0),0), demand=Math.round(pop*frequency);
    return {id,name:['西街坊底商','东区临街铺','南区邻里中心'][i],pop,demand,supply:supply[i],ratio:demand?supply[i]/demand:null,gap:demand-supply[i]};}).sort((a,b)=>b.gap-a.gap);
}
export function runAnalysis(p={}){
  const area=Number(p.area||0),mode=p.mode||'walk',role=p.role||'resident';
  if(!Number.isInteger(area)||area<0||area>2||!['walk','bike','bus'].includes(mode)||!['resident','merchant','govern'].includes(role))throw Error('分析参数无效');
  const net=makeNetwork(area),home=net.homes[Number(p.home??0)],senior=p.senior===true, wait=Number(p.wait??4);
  if(!home||!Number.isFinite(wait)||wait<0||wait>15)throw Error('楼栋或候车时间无效');
  const route=paths(net,home,mode,senior,false,wait);
  const facilities=net.facilities.map(f=>({...f,t:route.time[f.id],route:route.route(f.id)})).sort((a,b)=>a.t-b.t);
  const cat=p.cat||net.add.cat,trade=p.trade||'生鲜菜店';
  if(!categories.includes(cat)||!['生鲜菜店','便利店','便民餐饮','社区维修'].includes(trade))throw Error('设施或业态无效');
  return {net,home,facilities,times:route.time,base:assess(net,cat,false,15,senior),plan:assess(net,cat,true,15,senior),ranking:rankSites(net,trade,mode)};
}
