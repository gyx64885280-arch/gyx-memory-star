import {categories} from './engine.mjs';
export const systems = ['GCJ-02','BD-09','WGS84'];
const textValue=v=>typeof v==='string'?v.trim():'';
const numeric=v=>(typeof v==='number'||(typeof v==='string'&&v.trim()!==''))?Number(v):NaN;
const between=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
function geo(lng,lat){return between(lng,-180,180)&&between(lat,-85,85)}
function group(tag,name){
 const rules=[['养老',/养老|助老|助餐/],['医疗',/医疗|诊所|卫生|药店|医院/],['买菜',/菜场|菜市|农贸|生鲜/],['商超',/商超|超市|便利|商场/],['教育',/教育|学校|小学|幼儿园/],['体育',/体育|运动|公园|健身/],['停车',/停车|车场/],['微服务',/修理|修鞋|修补|维修|配钥匙/]];
 return categories.includes(tag)?tag:rules.find(([,re])=>re.test(tag+' '+name))?.[0]||'其他';
}
function readCSV(raw){
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(c==='"'){if(quoted&&raw[i+1]==='"'){value+='"';i++}else quoted=!quoted}
  else if(!quoted&&c===','){row.push(value);value=''}
  else if(!quoted&&(c==='\r'||c==='\n')){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=''}
  else value+=c;
 }
 if(quoted)throw Error('CSV 引号未闭合。');
 row.push(value);if(row.some(x=>x.trim()))rows.push(row);
 const header=rows.shift()?.map(x=>x.trim())||[];
 if(!['name','lng','lat'].every(k=>header.includes(k)))throw Error('CSV 需要 name、lng、lat 三列，可另加 category、district、capacity。');
 return rows.map(cells=>Object.fromEntries(header.map((key,i)=>[key,cells[i]||''])));
}
export function parsePlaces(raw,crs){
 if(!systems.includes(crs))throw Error('请选择文件实际使用的坐标系。');
 const src=raw.replace(/^\uFEFF/,'').trim();
 let items,format;
 if(src.startsWith('{')||src.startsWith('[')){
  const doc=JSON.parse(src);
  if(Array.isArray(doc.pois)){format='高德 POI JSON';items=doc.pois.map(p=>{const coords=textValue(p?.location).split(',');return {name:p?.name,lng:coords[0],lat:coords[1],category:p?.type,district:p?.adname,capacity:p?.capacity}})}
  else if(Array.isArray(doc.results)){format='百度地点 JSON';items=doc.results.map(p=>({name:p?.name,lng:p?.location?.lng,lat:p?.location?.lat,category:p?.detail_info?.classified_poi_tag||p?.detail_info?.tag,district:p?.area,capacity:p?.capacity}))}
  else if(doc.type==='FeatureCollection'&&Array.isArray(doc.features)){format='GeoJSON 点图层';items=doc.features.map(f=>({...f?.properties,lng:f?.geometry?.type==='Point'?f.geometry.coordinates?.[0]:null,lat:f?.geometry?.coordinates?.[1]}))}
  else throw Error('请选择包含 pois、results 或 Point FeatureCollection 的 JSON。');
 }else{format='CSV 点位表';items=readCSV(src)}
 if(items.length>2000)throw Error('每次最多导入 2,000 条记录。请先按街道分批导出。');
 const places=[],keys=new Set();let duplicates=0,invalid=0;
 for(const item of items){
  const name=textValue(item.name).slice(0,100),lng=numeric(item.lng),lat=numeric(item.lat),cap=numeric(item.capacity);
  if(!name||!geo(lng,lat)){invalid++;continue}
  const key=name+'|'+lng.toFixed(6)+'|'+lat.toFixed(6);if(keys.has(key)){duplicates++;continue}keys.add(key);
  places.push({name,lng,lat,cat:group(textValue(item.category),name),district:textValue(item.district).slice(0,60)||'未注明',cap:between(cap,.001,1e7)?cap:null});
 }
 if(!places.length)throw Error('没有可用点位，请检查名称与经纬度。');
 return {places,crs,format,invalid,duplicates};
}
export function project(points){
 const xs=points.map(p=>p.lng),ys=points.map(p=>p.lat);
 const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2,k=Math.cos(cy*Math.PI/180);
 const scale=Math.min(546/Math.max(.0001,(Math.max(...xs)-Math.min(...xs))*k),314/Math.max(.0001,Math.max(...ys)-Math.min(...ys)));
 return points.map(p=>({...p,x:320+(p.lng-cx)*k*scale,y:200-(p.lat-cy)*scale}));
}
const mDist=(a,b)=>111195*Math.hypot((a.lng-b.lng)*Math.cos((a.lat+b.lat)*Math.PI/360),a.lat-b.lat);
export function joinNetwork(dataset,graph,defaultCap){
 if(graph.crs!==dataset.crs)throw Error('路网与 POI 的坐标系不同，请统一后再导入。');
 if(!textValue(graph.region)||!Array.isArray(graph.nodes)||graph.nodes.length<2||graph.nodes.length>300)throw Error('需要片区名称和 2–300 个路网节点。');
 const nodes=graph.nodes.map((p,i)=>{if(p?.id!==i||!geo(p.lng,p.lat))throw Error('路网节点须从 0 顺序编号并包含经纬度。');return {id:i,lng:p.lng,lat:p.lat}});
 const ref=id=>Number.isInteger(id)&&id>=0&&id<nodes.length;
 if(!Array.isArray(graph.edges)||!graph.edges.length||graph.edges.length>1500||!graph.edges.every(e=>e&&ref(e.a)&&ref(e.b)&&e.a!==e.b&&between(e.m,1,50000)&&typeof e.signal==='boolean'))throw Error('请核对路段的节点编号、米数与信号灯字段。');
 if(!Array.isArray(graph.homes)||!graph.homes.length||graph.homes.length>120||!graph.homes.every(h=>h&&ref(h.id)&&textValue(h.name)&&Number.isInteger(h.pop)&&between(h.pop,1,1e7)&&between(h.inside,0,60)))throw Error('需要有效的住宅楼栋、人口和出入口时间。');
 const a=graph.add;if(!a||!ref(a.id)||!categories.includes(a.cat)||!textValue(a.name)||!between(a.cap,1,1e7))throw Error('缺少有效的规划新增设施 add。');
 const bus=graph.bus??[];if(!Array.isArray(bus)||bus.length>nodes.length||new Set(bus).size!==bus.length||!bus.every(ref))throw Error('公交站点编号无效。');
 if(!between(defaultCap,1,1e7))throw Error('请输入 1 至 1000 万之间的容量假设值。');
 let unmatched=0,unknown=0,assumed=0;const facilities=[];
 for(const p of dataset.places){if(!categories.includes(p.cat)){unknown++;continue}
  let distance=Infinity,nearest;for(const node of nodes){const d=mDist(node,p);if(d<distance){distance=d;nearest=node.id}}
  if(distance>80){unmatched++;continue}
  if(p.cap===null)assumed++;
  facilities.push({name:p.name,id:nearest,cat:p.cat,cap:p.cap??defaultCap});
 }
 if(!facilities.length)throw Error('没有可用于评估的设施。请核对分类、坐标系，并检查 80 米内是否有路网节点。');
 if(facilities.length>500)throw Error('匹配设施超过 500 个，请缩小片区。');
 return {region:graph.region.slice(0,80),nodes:project(nodes),edges:graph.edges,homes:graph.homes,facilities,add:a,bus,unmatched,unknown,assumed,defaultCap};
}
export function sample(){
 const nodes=Array.from({length:16},(_,i)=>({id:i,lng:+(120.10+i%4*.00235).toFixed(6),lat:+(30.25-Math.floor(i/4)*.00185).toFixed(6)}));
 const edges=[];for(const n of nodes){for(const dest of [n.id%4<3?n.id+1:-1,n.id+4])if(dest>=0&&dest<16)edges.push({a:n.id,b:dest,m:Math.round(mDist(n,nodes[dest])*1.12),signal:n.id%4===1})}
 const spots=[[0,'青禾小学','教育'],[3,'东街卫生站','医疗'],[7,'街心超市','商超'],[12,'南街生鲜菜市','买菜'],[14,'邻里助餐点','养老'],[15,'滨水体育公园','体育'],[5,'便民车场','停车']];
 return {pois:{pois:spots.map(([id,name,type],i)=>({name,type,adname:'青禾街道（合成）',location:nodes[id].lng+','+nodes[id].lat,capacity:80+20*i}))},graph:{region:'青禾街道（合成样区）',crs:'GCJ-02',nodes,edges,homes:[{id:8,name:'西苑一号楼',pop:720,inside:3.5},{id:6,name:'东苑一号楼',pop:460,inside:2}],add:{id:8,name:'拟增卫生分站',cat:'医疗',cap:120},bus:[]}};
}
