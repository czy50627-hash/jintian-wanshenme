import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {MapPin,Share2,RotateCcw,ChevronDown,ShieldCheck} from "lucide-react";
import {evaluateRecommendations,evaluateCandidatePreview} from "./engine/recommend.js";
import {generateEvidenceReason} from "./engine/reasonGenerator.js";
import {normalizePlace} from "./lib/normalizePlace.js";
import "./styles.css";

const AGES=["0-2","3-5","6-8","9-12"];
const COUNTIES=["台北","新北","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","基隆","澎湖","金門","連江"];
const CENTERS={"台北":[25.0478,121.5319],"新北":[25.012,121.4657],"桃園":[24.9937,121.301],"新竹":[24.8138,120.9675],"苗栗":[24.5602,120.8214],"台中":[24.1477,120.6736],"彰化":[24.0756,120.544],"南投":[23.9609,120.9719],"雲林":[23.7092,120.4313],"嘉義":[23.4801,120.4491],"台南":[22.9999,120.227],"高雄":[22.6273,120.3014],"屏東":[22.6761,120.4942],"宜蘭":[24.7021,121.7378],"花蓮":[23.9911,121.6112],"台東":[22.7554,121.15],"基隆":[25.1276,121.7392],"澎湖":[23.5655,119.5863],"金門":[24.4368,118.3171],"連江":[26.1605,119.9517]};

function App(){
 const [places,setPlaces]=useState([]);
 const [candidatePlaces,setCandidatePlaces]=useState([]);
 const [ages,setAges]=useState(["3-5"]);
 const [county,setCounty]=useState("台北");
 const [prefs,setPrefs]=useState(["auto"]);
 const [weather,setWeather]=useState(null);
 const [result,setResult]=useState(null);
 const [excluded,setExcluded]=useState([]);
 const [open,setOpen]=useState(false);
 const [when,setWhen]=useState("now");
 const [notice,setNotice]=useState("");
 const [userCoords,setUserCoords]=useState(null);
 const [maxDrive,setMaxDrive]=useState(30);

 useEffect(()=>{
   Promise.all([fetch("/data/places.production.json").then(r=>r.json()),fetch("/data/places.json").then(r=>r.json())]).then(([prod,cand])=>{setPlaces((prod.records||[]).map(normalizePlace));setCandidatePlaces((cand.records||[]).map(normalizePlace))});
   try{
     const saved=JSON.parse(localStorage.getItem("jtw-family")||"null");
     if(saved?.ages?.length)setAges(saved.ages);
     if(saved?.county)setCounty(saved.county);
     if(saved?.prefs?.length)setPrefs(saved.prefs);
     if(saved?.maxDrive)setMaxDrive(saved.maxDrive);
   }catch{}
   if(navigator.geolocation) navigator.geolocation.getCurrentPosition(
     p=>setUserCoords({lat:p.coords.latitude,lng:p.coords.longitude}),
     ()=>setUserCoords(null),
     {enableHighAccuracy:false,timeout:5000,maximumAge:600000}
   );
 },[]);

 useEffect(()=>{localStorage.setItem("jtw-family",JSON.stringify({ages,county,prefs,maxDrive}))},[ages,county,prefs,maxDrive]);

 useEffect(()=>{
   const c=CENTERS[county]; if(!c)return;
   const u="https://api.open-meteo.com/v1/forecast?latitude="+c[0]+"&longitude="+c[1]+"&current=temperature_2m&hourly=precipitation_probability&forecast_days=3&timezone=Asia%2FTaipei";
   fetch(u).then(r=>r.json()).then(d=>{
     const now=new Date();
     const i=Math.max(0,d.hourly.time.findIndex(t=>new Date(t)>=now));
     const offset=when==="tomorrow"?24:0;
     const arr=d.hourly.precipitation_probability.slice(i+offset,i+offset+6).filter(Number.isFinite);
     setWeather({temp:d.current?.temperature_2m,pop:arr.length?Math.max(...arr):null});
   }).catch(()=>setWeather(null));
 },[county,when]);

 const currentPrefs=useMemo(()=>({
   selectedCounty:county,userCoords,ages,when,maxDriveMinutes:maxDrive,playStyles:prefs,
   excludedPlaceIds:excluded,currentRainProb:weather?.pop??0
 }),[county,userCoords,ages,when,maxDrive,prefs,excluded,weather]);

 const production=useMemo(()=>evaluateRecommendations(places,currentPrefs),[places,currentPrefs]);
 const preview=useMemo(()=>evaluateCandidatePreview(candidatePlaces,currentPrefs),[candidatePlaces,currentPrefs]);

 function decide(){setExcluded([]);setResult(production.hero?production:{...preview,preview:true,fallbackNote:"目前此條件尚無通過正式驗證的 Production 資料。以下僅為候選資料預覽，不提供精確導航、營業判定或設施保證。"})}
 function toggleAge(a){setAges(v=>v.includes(a)?(v.length===1?v:v.filter(x=>x!==a)):[...v,a])}
 function togglePref(p){if(p==="auto"){setPrefs(["auto"]);return}setPrefs(v=>{const next=v.filter(x=>x!=="auto");return next.includes(p)?(next.length===1?["auto"]:next.filter(x=>x!==p)):[...next,p]})}
 function reroll(){
   if(!result?.hero)return;
   const ids=[result.hero,...(result.alternatives||[])].map(p=>p.id);
   const nextExcluded=[...new Set([...excluded,...ids])];
   setExcluded(nextExcluded);
   const nextPrefs={...currentPrefs,excludedPlaceIds:nextExcluded};
   const prod=evaluateRecommendations(places,nextPrefs);
   const cand=evaluateCandidatePreview(candidatePlaces,nextPrefs);
   setResult(prod.hero?prod:{...cand,preview:true,fallbackNote:"正式驗證資料不足，以下為下一組候選資料預覽。"});
 }
 function share(p){
   const url=location.origin+"/r/"+p.id+"?ages="+ages.join(",")+"&county="+encodeURIComponent(county)+"&when="+when;
   if(navigator.share)navigator.share({title:p.name,text:"今天帶小孩去【"+p.name+"】好不好？",url}).catch(()=>{});
   else navigator.clipboard?.writeText(url).then(()=>setNotice("推薦連結已複製"));
 }
 function map(p){
   if(result?.preview || !p.isCoordinatePrecise){setNotice("此候選點位尚未完成精確座標驗證，暫不提供座標導航");return}
   window.open("https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lng,"_blank");
 }
 function typeLabel(p){return p.category==="park"?"特色公園":p.indoor&&!p.outdoor?"室內":"親子景點"}
 function reason(p){return result?.preview?"候選資料符合目前的基本年齡與玩法條件；正式營業、座標與設施仍待官方驗證。":generateEvidenceReason(p,currentPrefs)}

 return <main className="app">
   <header className="top"><div className="brand">今天玩什麼</div><div className="weather">{county}<br/>{weather?Math.round(weather.temp)+"°C・降雨 "+weather.pop+"%":"天氣讀取中"}</div></header>
   <section className="hero"><h1>不知道去哪？<br/>今天玩什麼<br/>幫你決定！</h1><p>選孩子年齡和少量條件，直接幫你縮小選擇。</p><div className="scene"><div className="hill"/><div className="family"/></div></section>
   {!result&&<section className="card">
     <h2>孩子幾歲？</h2><p className="muted">可複選，適合多寶家庭</p>
     <div className="agegrid">{AGES.map(a=><button key={a} className={"age "+(ages.includes(a)?"on":"")} onClick={()=>toggleAge(a)}>{a}歲</button>)}</div>
     <button className="primary" onClick={decide}>幫我決定今天玩什麼</button>
     <button className="fine" onClick={()=>setOpen(v=>!v)}>微調條件 <ChevronDown size={16}/></button>
     {open&&<div className="drawer">
       <b>出發時間</b><div className="pills when">{[["now","現在"],["afternoon","今天下午"],["tomorrow","明天"],["weekend","這週末"]].map(([v,l])=><button key={v} className={"pill "+(when===v?"on":"")} onClick={()=>setWhen(v)}>{l}</button>)}</div>
       <b>所在縣市</b><select value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select>
       <b>可接受車程</b><select value={maxDrive} onChange={e=>setMaxDrive(Number(e.target.value))}>{[15,30,45,60].map(v=><option key={v} value={v}>{v} 分鐘</option>)}</select>
       <b>玩法（複選時需同時符合）</b><div className="pills">{["auto","indoor","outdoor","free"].map(p=><button key={p} className={"pill "+(prefs.includes(p)?"on":"")} onClick={()=>togglePref(p)}>{({auto:"自動最適",indoor:"室內",outdoor:"戶外",free:"免費"})[p]}</button>)}</div>
     </div>}
   </section>}
   {result&&<section className="results">
     {!result.hero?<div className="empty"><h3>目前沒有符合條件的結果</h3><p>{result.fallbackNote}</p><button onClick={()=>setResult(null)}>返回調整</button></div>:<>
       <div className="summary">{ages.join("＋")}歲・{county}・{({now:"現在",afternoon:"今天下午",tomorrow:"明天",weekend:"這週末"})[when]}・{prefs.includes("auto")?"自動最適":prefs.join("＋")}</div>
       {result.preview&&<div className="candidateNotice"><ShieldCheck size={18}/><div><b>候選資料預覽</b><br/>{result.fallbackNote}</div></div>}
       <h3>{result.preview?"目前最符合的候選":"今天就去這裡"}</h3>
       <article className="resultCard"><div className="illustration"><span>{typeLabel(result.hero)}</span></div><div className="body"><h2>{result.hero.name}</h2><p className="muted">{result.hero.county}・{typeLabel(result.hero)}{result.hero._driveMinutes!=null?"・預估 "+result.hero._driveMinutes+" 分鐘":""}</p><div className="why"><b>為什麼推薦：</b> {reason(result.hero)}</div><div className="actions"><button onClick={()=>map(result.hero)}><MapPin size={18}/>{result.preview?"座標待驗證":"直接導航"}</button><button onClick={()=>share(result.hero)}><Share2 size={18}/>傳給另一半</button></div><button className="reroll" onClick={reroll}><RotateCcw size={18}/>不要這個，再幫我決定一次</button><p className="trust">{result.preview?"此資料尚未進入 Production Recommendation Pool。":"資料已通過 Production 驗證。"} {result.hero.trustLayer?.lastVerifiedAt?"最後驗證："+result.hero.trustLayer.lastVerifiedAt:""}</p></div></article>
       <h3>備選</h3>{(result.alternatives||[]).map(p=><article className="alt" key={p.id}><div><b>{p.name}</b><p>{typeLabel(p)}・{p.isFree?"免費":"付費/票價待驗證"}</p></div><div className="altActions"><button onClick={()=>map(p)}>導航</button><button onClick={()=>share(p)}>分享</button></div></article>)}
       {(result.alternatives||[]).length<2&&<div className="alt"><div><b>沒有更多安全備選</b><p>系統不會跨縣市或放寬硬條件湊數。</p></div></div>}
       <button className="secondary" onClick={()=>setResult(null)}>修改條件</button>
     </>}
   </section>}
   {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
 </main>
}
createRoot(document.getElementById("root")).render(<App/>);
