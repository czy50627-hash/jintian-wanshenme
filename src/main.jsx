import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {
  MapPin,Share2,RotateCcw,Menu,Car,Bus,Clock3,Star,
  ShieldCheck,Heart,ArrowLeft,ExternalLink,CalendarDays,Umbrella,
  TreePine,House,WalletCards,Navigation,Utensils,ParkingCircle,
  Baby,Accessibility,SunMedium
} from "lucide-react";
import {evaluateRecommendations,haversineKm} from "./engine/recommend.js";
import {generateEvidenceReason} from "./engine/reasonGenerator.js";
import {normalizePlace} from "./lib/normalizePlace.js";
import {priceLabel} from "./lib/pricing.js";
import {fetchCountyParks,fetchNearbyParks} from "./services/parkDiscovery.js";
import "./styles.css";

const AGES=[
  {id:"0-2",label:"0–2歲",sub:"幼兒"},
  {id:"3-5",label:"3–5歲",sub:"學齡前"},
  {id:"6-8",label:"6–8歲",sub:"國小低年級"},
  {id:"9-12",label:"9–12歲",sub:"國小高年級"}
];
const COUNTIES=["台北","新北","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","基隆","澎湖","金門","連江"];
function localDay(date=new Date()){return new Date(date.getFullYear(),date.getMonth(),date.getDate())}
function getWeekRange(date=new Date()){
  const d=localDay(date); const day=d.getDay(); const diff=day===0?-6:1-day;
  const start=new Date(d); start.setDate(d.getDate()+diff);
  const end=new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
  return {start,end};
}
function dateAtStart(s){if(!s)return null;const d=new Date(s+"T00:00:00+08:00");return Number.isNaN(d.getTime())?null:d}
function dateAtEnd(s){if(!s)return null;const d=new Date(s+"T23:59:59+08:00");return Number.isNaN(d.getTime())?null:d}
function overlapsRange(e,start,end){
  const s=dateAtStart(e.startDate)||new Date(0);
  const x=dateAtEnd(e.endDate||e.startDate)||s;
  return s<=end && x>=start;
}
function isCurrentWeekEvent(e){
  const {start,end}=getWeekRange(); return overlapsRange(e,start,end);
}
function isUpcomingLimited(e){
  const today=localDay(); const end=dateAtEnd(e.endDate||e.startDate); if(!end||end<today)return false;
  const max=new Date(today); max.setDate(today.getDate()+90);
  const start=dateAtStart(e.startDate)||today;
  return start<=max;
}

const CENTERS={"台北":[25.0478,121.5319],"新北":[25.012,121.4657],"桃園":[24.9937,121.301],"新竹":[24.8138,120.9675],"苗栗":[24.5602,120.8214],"台中":[24.1477,120.6736],"彰化":[24.0756,120.544],"南投":[23.9609,120.9719],"雲林":[23.7092,120.4313],"嘉義":[23.4801,120.4491],"台南":[22.9999,120.227],"高雄":[22.6273,120.3014],"屏東":[22.6761,120.4942],"宜蘭":[24.7021,121.7378],"花蓮":[23.9911,121.6112],"台東":[22.7554,121.15],"基隆":[25.1276,121.7392],"澎湖":[23.5655,119.5863],"金門":[24.4368,118.3171],"連江":[26.1605,119.9517]};

function PlaceVisual({place,compact=false}){
  const type=place?.category||"park";
  const label=type==="park"||type==="playground"?"公園／遊戲場":type==="museum"?"博物館":type==="zoo"?"動物園":type==="theme_park"?"親子樂園":"親子去處";
  return <div className={compact?"placeVisual compact":"placeVisual"} aria-label={label}>
    <div className="visualSky"></div>
    <div className="visualGround"></div>
    <div className="visualBadge">{label}</div>
    <div className="visualName">{place?.name||""}</div>
  </div>;
}

function App(){
 const [places,setPlaces]=useState([]);

 const [ages,setAges]=useState(["3-5"]);
 const [county,setCounty]=useState("台北");
 const [prefs,setPrefs]=useState(["auto"]);
 const [weather,setWeather]=useState(null);
 const [result,setResult]=useState(null);
 const [selectedPlace,setSelectedPlace]=useState(null);
 const [excluded,setExcluded]=useState([]);
 const [when,setWhen]=useState("now");
 const [notice,setNotice]=useState("");
 const [sharedPlace,setSharedPlace]=useState(null);
 const [userCoords,setUserCoords]=useState(null);
 const [maxDrive,setMaxDrive]=useState(30);
 const [transport,setTransport]=useState("drive");
 const [countyParks,setCountyParks]=useState([]);
 const [parksLoading,setParksLoading]=useState(false);
 const [nearbyMappedParks,setNearbyMappedParks]=useState([]);
 const [events,setEvents]=useState([]);
 const [officialFeedLoading,setOfficialFeedLoading]=useState(false);

 useEffect(()=>{
   Promise.all([
     fetch("/data/places.production.json").then(r=>r.json()),
     fetch("/data/events.production.json").then(r=>r.json()).catch(()=>({records:[]}))
   ]).then(([prod,eventData])=>{
     const pp=(prod.records||[]).map(normalizePlace);
     setPlaces(pp); setEvents(eventData.records||[]);
     const m=location.pathname.match(/^\/r\/([^/]+)/);
     if(m){
       const id=decodeURIComponent(m[1]); const q=new URLSearchParams(location.search); const found=pp.find(p=>p.id===id);
       if(found){
         const qa=(q.get("ages")||"").split(",").filter(Boolean); if(qa.length)setAges(qa);
         if(q.get("county"))setCounty(q.get("county")); if(q.get("when"))setWhen(q.get("when")); setSharedPlace(found);
       }
     }
   });
   try{const saved=JSON.parse(localStorage.getItem("jtw-family")||"null");if(saved?.ages?.length)setAges(saved.ages);if(saved?.county)setCounty(saved.county);if(saved?.prefs?.length)setPrefs(saved.prefs);if(saved?.maxDrive)setMaxDrive(saved.maxDrive);if(saved?.transport)setTransport(saved.transport)}catch{}
   requestLocation();
 },[]);

 useEffect(()=>{localStorage.setItem("jtw-family",JSON.stringify({ages,county,prefs,maxDrive,transport}))},[ages,county,prefs,maxDrive,transport]);
 useEffect(()=>{
   let live=true; setOfficialFeedLoading(true);
   Promise.all([
     fetch("/api/attractions?county="+encodeURIComponent(county)).then(r=>r.ok?r.json():({records:[]})).catch(()=>({records:[]})),
     fetch("/api/events?county="+encodeURIComponent(county)).then(r=>r.ok?r.json():({records:[]})).catch(()=>({records:[]}))
   ]).then(([a,e])=>{
     if(!live)return;
     setPlaces(prev=>{
       const m=new Map(prev.map(p=>[p.id,p]));
       for(const row of (a.records||[]))m.set(row.id,normalizePlace(row));
       return [...m.values()];
     });
     setEvents(prev=>{
       const m=new Map(prev.map(x=>[x.id,x]));
       for(const row of (e.records||[]))m.set(row.id,row);
       return [...m.values()];
     });
   }).finally(()=>{if(live)setOfficialFeedLoading(false)});
   return ()=>{live=false};
 },[county]);
 useEffect(()=>{
   let live=true; setParksLoading(true);
   fetchCountyParks(county).then(rows=>{if(live)setCountyParks(rows)}).catch(()=>{if(live)setCountyParks([])}).finally(()=>{if(live)setParksLoading(false)});
   return ()=>{live=false};
 },[county]);
 useEffect(()=>{
   if(!userCoords){setNearbyMappedParks([]);return}
   let live=true;
   fetchNearbyParks(userCoords.lat,userCoords.lng,12000).then(rows=>{if(live)setNearbyMappedParks(rows)}).catch(()=>{if(live)setNearbyMappedParks([])});
   return ()=>{live=false};
 },[userCoords]);
 useEffect(()=>{
   const c=CENTERS[county];if(!c)return;
   const u="https://api.open-meteo.com/v1/forecast?latitude="+c[0]+"&longitude="+c[1]+"&current=temperature_2m&hourly=precipitation_probability&forecast_days=3&timezone=Asia%2FTaipei";
   fetch(u).then(r=>r.json()).then(d=>{const now=new Date();const i=Math.max(0,d.hourly.time.findIndex(t=>new Date(t)>=now));const offset=when==="tomorrow"?24:0;const arr=d.hourly.precipitation_probability.slice(i+offset,i+offset+6).filter(Number.isFinite);setWeather({temp:d.current?.temperature_2m,pop:arr.length?Math.max(...arr):null})}).catch(()=>setWeather(null));
 },[county,when]);

 const currentPrefs=useMemo(()=>({selectedCounty:county,userCoords,ages,when,maxDriveMinutes:maxDrive,playStyles:prefs,excludedPlaceIds:excluded,currentRainProb:weather?.pop??0,transport}),[county,userCoords,ages,when,maxDrive,prefs,excluded,weather,transport]);
 const production=useMemo(()=>evaluateRecommendations(places,currentPrefs),[places,currentPrefs]);
 const matchingEvents=useMemo(()=>{
   const wantsWeekend=prefs.includes("weekend_event");
   const wantsLimited=prefs.includes("limited_event");
   return events.filter(e=>{
     if(e.county!==county) return false;
     if(wantsWeekend && !wantsLimited) return isCurrentWeekEvent(e);
     if(wantsLimited && !wantsWeekend) return isUpcomingLimited(e);
     if(wantsWeekend && wantsLimited) return isCurrentWeekEvent(e) || isUpcomingLimited(e);
     return isCurrentWeekEvent(e) || isUpcomingLimited(e);
   }).sort((a,b)=>(a.startDate||"").localeCompare(b.startDate||"")).slice(0,12);
 },[events,county,prefs]);
 const nearbyParks=useMemo(()=>{
   if(!userCoords) return [];
   const merged=[...places.filter(p=>p.category==="park"||p.category==="playground"),...nearbyMappedParks];
   const seen=new Set();
   return merged.filter(p=>p?.lat!=null&&p?.lng!=null&&!seen.has(p.id)&&seen.add(p.id))
     .map(p=>({...p,_distanceKm:haversineKm(userCoords,{lat:p.lat,lng:p.lng})}))
     .filter(p=>p._distanceKm<=12)
     .sort((a,b)=>a._distanceKm-b._distanceKm)
     .slice(0,12);
 },[places,userCoords,nearbyMappedParks]);

 function requestLocation(){if(!navigator.geolocation){setNotice("此裝置不支援定位");return}navigator.geolocation.getCurrentPosition(p=>{setUserCoords({lat:p.coords.latitude,lng:p.coords.longitude});setNotice("已取得位置，可估算距離")},()=>{setUserCoords(null);setNotice("未取得定位，仍可用縣市推薦")},{enableHighAccuracy:false,timeout:5000,maximumAge:600000})} function decide(){setExcluded([]);setResult({...production,events:matchingEvents})}
 function toggleAge(a){setAges(v=>v.includes(a)?(v.length===1?v:v.filter(x=>x!==a)):[...v,a])}
 function togglePref(p){if(p==="auto"){setPrefs(["auto"]);return}setPrefs(v=>{const next=v.filter(x=>x!=="auto");return next.includes(p)?(next.length===1?["auto"]:next.filter(x=>x!==p)):[...next,p]})}
 function reroll(){if(!result?.hero)return;const ids=[result.hero,...(result.alternatives||[])].map(p=>p.id);const nextExcluded=[...new Set([...excluded,...ids])];setExcluded(nextExcluded);setResult(evaluateRecommendations(places,{...currentPrefs,excludedPlaceIds:nextExcluded}))}
 function share(p){const url=location.origin+"/r/"+p.id+"?ages="+ages.join(",")+"&county="+encodeURIComponent(county)+"&when="+when;if(navigator.share)navigator.share({title:p.name,text:"今天帶小孩去【"+p.name+"】好不好？",url}).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>setNotice("推薦連結已複製"))}
 function map(p){if(!p.isCoordinatePrecise){setNotice("此點位座標尚未完成驗證");return}const mode=transport==="transit"?"transit":"driving";window.open("https://www.google.com/maps/dir/?api=1&travelmode="+mode+"&destination="+p.lat+","+p.lng,"_blank")}
 function typeLabel(p){return p.category==="park"?"公園・戶外":p.indoor&&!p.outdoor?"室內":"親子景點"}
 function reason(p){return generateEvidenceReason(p,currentPrefs)}
 function ageText(p){return (p.ageTags||[]).join("、")+"歲"}
 function showDetail(p){setSelectedPlace(p);window.scrollTo({top:0,behavior:"smooth"})}

 const detailPlace=sharedPlace||selectedPlace;
 if(detailPlace){
   return <main className="phoneShell detailPage">
     <div className="detailHero"><PlaceVisual place={detailPlace}/><button className="roundIcon backBtn" onClick={()=>{if(sharedPlace){history.pushState({},"","/");setSharedPlace(null)}else setSelectedPlace(null)}}><ArrowLeft size={22}/></button><div className="detailTools"><button className="roundIcon"><Heart size={19}/></button><button className="roundIcon" onClick={()=>share(detailPlace)}><Share2 size={19}/></button></div></div>
     <section className="detailSheet">
       <h1>{detailPlace.name}</h1><p className="subLine">{detailPlace.county}・{typeLabel(detailPlace)}</p>
       <div className="tagRow">{detailPlace.isFree&&<span className="softTag amber">免費</span>}<span className="softTag blue">{detailPlace.indoor?"室內":"戶外"}</span><span className="softTag coral">{priceLabel(detailPlace)}</span></div>
       <p className="description">{detailPlace.address}</p>
       <div className="metricGrid"><div>{transport==="transit"?<Bus/>:<Car/>}<b>{transport==="transit"?"大眾運輸":"車程"}</b><span>{transport==="transit"?(detailPlace.transit?.nearest?.[0]?.name||"站點資訊待補"):(detailPlace._driveMinutes?detailPlace._driveMinutes+" 分鐘":"依導航為準")}</span></div><div><Clock3/><b>建議停留</b><span>{detailPlace.durationMin?Math.round(detailPlace.durationMin/60)+" 小時":"未提供"}</span></div><div><WalletCards/><b>費用</b><span>{priceLabel(detailPlace)}</span></div></div>
       <section className="detailBlock"><h2>適齡判讀 <small>（編輯分類）</small></h2><div className="ageDetailGrid">{AGES.map(a=><div key={a.id} className={(detailPlace.ageTags||[]).includes(a.id)?"ageMini on":"ageMini"}><Baby size={21}/><b>{a.label}</b></div>)}</div></section>
       <section className="detailBlock"><h2>設施與服務</h2><div className="facilityGrid"><div><ParkingCircle/><span>{detailPlace.amenities?.parking==="easy"?"好停車":"停車依現場"}</span></div><div><Baby/><span>{detailPlace.amenities?.stroller?"推車友善":"推車資訊待確認"}</span></div><div><Accessibility/><span>{detailPlace.amenities?.diaperStation?"有尿布台":"尿布台待確認"}</span></div><div><Utensils/><span>{detailPlace.amenities?.foodNearby?"附近有餐飲":"餐飲待確認"}</span></div></div></section>
       <section className="detailBlock"><h2>為什麼推薦給你？</h2><div className="reasonCard">{reason(detailPlace).split("・").map((r,i)=><div key={i}><span className="checkDot">✓</span>{r}</div>)}</div></section>
       <div className="trustStrip"><ShieldCheck size={18}/><span>{detailPlace.sourceLabel||"官方資料"}</span>{detailPlace.trustLayer?.lastVerifiedAt&&<span>驗證 {detailPlace.trustLayer.lastVerifiedAt}</span>}{detailPlace.trustLayer?.officialUrl&&<a href={detailPlace.trustLayer.officialUrl} target="_blank" rel="noreferrer">官方來源 <ExternalLink size={13}/></a>}</div>
       <div className="stickyActions"><button className="navPrimary" onClick={()=>map(detailPlace)}><Navigation size={19}/>導航去這裡</button><button className="shareSecondary" onClick={()=>share(detailPlace)}><Share2 size={18}/>傳給另一半</button></div>
     </section>
     {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
   </main>
 }

 return <main className={result?"phoneShell resultMode":"phoneShell"}>
   <header className="appHeader"><div className="logoText">今天玩什麼<span>✦</span></div><button className="menuBtn"><Menu size={25}/></button></header>

   {!result ? <>
     <section className="introHero photoHero"><img className="heroFamilyImg" src="/assets/hero-family-v3.webp" alt="" aria-hidden="true"/><div className="heroShade"></div><div className="heroCopy"><h1>不知道去哪？<br/><strong>今天玩什麼</strong><br/>幫你決定！</h1><div className="heroUnderline"></div><p>輸入幾個條件，馬上推薦最適合你們的親子行程。</p></div></section>
     <section className="decisionPanel">
       <h2>孩子幾歲？ <span>（可複選）</span></h2>
       <div className="ageChoiceGrid">{AGES.map(a=><button key={a.id} className={ages.includes(a.id)?"choiceCard selected":"choiceCard"} onClick={()=>toggleAge(a.id)}><div className="kidBadge"><Baby size={22}/></div><div><b>{a.label}</b><small>{a.sub}</small></div></button>)}</div>
       <h2>想怎麼玩？ <span>（可複選）</span></h2>
       <div className="playGrid">
         {[["outdoor","戶外放電",TreePine],["indoor","室內玩樂",House],["free","免費景點",WalletCards],["auto","自動最適",Umbrella]].map(([id,label,Icon])=><button key={id} className={prefs.includes(id)?"playCard selected":"playCard"} onClick={()=>togglePref(id)}><Icon size={24}/><b>{label}</b></button>)}
         <button className={prefs.includes("weekend_event")?"playCard selected eventPick":"playCard eventPick"} onClick={()=>togglePref("weekend_event")}><CalendarDays size={24}/><b>本週活動</b><small>{events.filter(e=>e.county===county&&isCurrentWeekEvent(e)).length} 筆</small></button><button className={prefs.includes("limited_event")?"playCard selected eventPick":"playCard eventPick"} onClick={()=>togglePref("limited_event")}><Star size={24}/><b>期間限定</b><small>{events.filter(e=>e.county===county&&isUpcomingLimited(e)).length} 筆</small></button>
       </div>
       <h2>何時出發？</h2>
       <div className="whenGrid">{[["now","現在",SunMedium],["afternoon","今天下午",Clock3],["tomorrow","明天",CalendarDays],["weekend","這週末",CalendarDays]].map(([id,label,Icon])=><button key={id} className={when===id?"miniChoice selected":"miniChoice"} onClick={()=>setWhen(id)}><Icon size={21}/><span>{label}</span></button>)}</div>
       <h2>出發地點</h2>
       <div className="locationRow"><button className="locationPrimary" onClick={requestLocation}><MapPin size={20}/>{userCoords?"重新取得位置":"使用我的位置"}<small>{userCoords?"已取得大概位置":"未授權時仍可用縣市推薦"}</small></button><select value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
       <h2>交通方式</h2>
       <div className="transportRow"><button className={transport==="drive"?"transportChoice selected":"transportChoice"} onClick={()=>setTransport("drive")}><Car size={22}/>開車</button><button className={transport==="transit"?"transportChoice selected":"transportChoice"} onClick={()=>setTransport("transit")}><Bus size={22}/>大眾運輸</button></div>
       {transport==="drive"?<><h2>最多願意開多久？ <span>（單程）</span></h2><div className="driveRow">{[15,30,45,60].map(v=><button key={v} className={maxDrive===v?"driveChip selected":"driveChip"} onClick={()=>setMaxDrive(v)}>{v}分</button>)}</div></>:<div className="transitHint"><Bus size={18}/><span>依官方鄰近公車／捷運／台鐵站點排序；不捏造即時搭乘分鐘數。</span></div>}
       <button className="decideBtn" onClick={decide}><span className="spark">✦</span>幫我決定今天玩什麼 <span>→</span></button>
     </section>
   </> : <section className="resultScreen">
     <div className="weatherBanner"><MapPin size={19}/><div><b>{county}・{weather?"目前天氣":"天氣讀取中"}</b><span>{weather?("降雨機率 "+weather.pop+"%・"+Math.round(weather.temp)+"°C"):"依選擇縣市自動判斷"}</span></div><SunMedium className="sunIcon"/></div>
     {!result.hero && !(result.events||[]).length ? <div className="empty prettyEmpty"><div className="emptyArt"><Umbrella size={38}/></div><h3>這個條件目前沒有通過驗證的選擇</h3><p>{result.fallbackNote}</p><div className="emptyActions">{prefs.includes("indoor")&&<button onClick={()=>{setPrefs(["outdoor"]);setResult(null)}}>改看戶外</button>}{prefs.includes("free")&&<button onClick={()=>{setPrefs(v=>v.filter(x=>x!=="free"));setResult(null)}}>接受門票</button>}<button onClick={()=>setResult(null)}>重新調整</button></div></div> : <>
       <div className="resultIntro"><div className="avatarMom"><Baby size={25}/></div><div><b>根據你選的條件</b><span>今天最適合的行程是…</span></div><Heart size={21}/></div>
       {result.hero&&<article className="heroResultCard">
         <div className="heroImageWrap"><PlaceVisual place={result.hero}/><span className="crownBadge">首選推薦</span></div>
         <div className="heroResultBody">
           <h1 onClick={()=>showDetail(result.hero)}>{result.hero.name}</h1><p>{result.hero.county}・{typeLabel(result.hero)}</p>
           <div className="quickLine">{transport==="transit"?<Bus size={18}/>:<Car size={18}/>}<span>{transport==="transit"?(result.hero._nearestTransit?("鄰近 "+result.hero._nearestTransit.name+(Number.isFinite(result.hero._nearestTransit.distanceM)?"・約 "+result.hero._nearestTransit.distanceM+"m":"")):"大眾運輸資訊待補"):(result.hero._driveMinutes!=null?("預估車程 "+result.hero._driveMinutes+" 分鐘"):"開啟定位可估算車程")}</span><button onClick={()=>showDetail(result.hero)}><MapPin size={17}/>查看資訊</button></div>
           <div className="miniStats"><div><span>適合年齡</span><b>{ageText(result.hero)}</b></div><div><span>費用</span><b>{priceLabel(result.hero)}</b></div><div><span>建議停留</span><b>{result.hero.durationMin?Math.round(result.hero.durationMin/60)+"小時":"未提供"}</b></div></div>
           <div className="amenityLine">{result.hero.amenities?.parking==="easy"&&<span><ParkingCircle/>好停車</span>}{result.hero.amenities?.stroller&&<span><Baby/>推車友善</span>}{result.hero.amenities?.foodNearby&&<span><Utensils/>附近有美食</span>}{result.hero.amenities?.parking!=="easy"&&!result.hero.amenities?.stroller&&!result.hero.amenities?.foodNearby&&<span>設施資訊待驗證</span>}</div>
           <div className="whyBox"><h3>為什麼推薦給你？</h3>{reason(result.hero).split("・").slice(0,4).map((r,i)=><p key={i}><span>✓</span>{r}</p>)}</div>
           <div className="mainActions"><button className="navPrimary" onClick={()=>map(result.hero)} disabled={!result.hero.isCoordinatePrecise}><Navigation size={19}/>導航去這裡</button><button className="shareSecondary" onClick={()=>share(result.hero)}><Share2 size={18}/>傳給另一半</button></div>
         </div>
       </article>}
       <div className="altsHeader"><h2>另外兩個備選方案</h2><button onClick={reroll}><RotateCcw size={16}/>換一批推薦</button></div>
       <div className="altStack">{(result.alternatives||[]).map(p=><article className="altResultCard" key={p.id}><button className="altThumb" onClick={()=>showDetail(p)}><PlaceVisual place={p} compact/></button><div className="altContent"><h3 onClick={()=>showDetail(p)}>{p.name}</h3><p>{p.county}・{typeLabel(p)}</p><div className="altMeta"><span>{transport==="transit"?<Bus/>:<Car/>}{transport==="transit"?(p._nearestTransit?.name||"站點待補"):(p._driveMinutes!=null?("約 "+p._driveMinutes+" 分"):"定位後估算")}</span><span>{priceLabel(p)}</span></div><div className="altTags"><span>{p.indoor?"室內":"戶外"}</span>{p.isFree&&<span>免費</span>}</div></div><div className="altButtons"><button onClick={()=>map(p)}><Navigation size={16}/>導航</button><button onClick={()=>share(p)}><Share2 size={15}/>分享</button></div></article>)}{(result.alternatives||[]).length<2&&<div className="emptyAlt">沒有更多安全備選，系統不會跨縣市硬補。</div>}</div>
       {(result.events||[]).length>0&&<section className="eventSection"><div className="sectionTitleRow"><div><span className="sectionKicker">這週可以去</span><h2>本週活動・期間限定</h2></div><CalendarDays size={22}/></div><div className="eventList">{result.events.map(e=><a key={e.id} className="eventCard" href={e.sourceUrl} target="_blank" rel="noreferrer"><div className={"eventRibbon "+e.type}>{isCurrentWeekEvent(e)?"本週活動":"期間限定"}</div><div className="eventCardBody"><b>{e.title}</b><p>{e.venue}</p><div className="eventMeta"><span>{e.startDate===e.endDate?e.startDate:e.startDate+" ～ "+e.endDate}</span><span>{e.isFree===true?"免費":"費用依官方公告"}</span></div><small>{e.description}</small></div><ExternalLink size={16}/></a>)}</div></section>}
       <section className="parkDirectory"><div className="nearbyHead"><div><h2>{county}公園／共融遊戲場</h2><p>{parksLoading||officialFeedLoading?"資料載入中…":`公園地圖 ${countyParks.length} 筆・官方親子景點 ${places.filter(p=>p.county===county).length} 筆`}</p></div><TreePine size={20}/></div>{parksLoading?<div className="parkLoading">正在讀取公園資料…</div>:<div className="parkDirectoryGrid">{countyParks.slice(0,12).map(p=><button key={p.id} className="parkChip" onClick={()=>{setCounty(p.county||county);setNotice(`${p.name} 為地圖資料，設施請以現場為準`)}}><b>{p.name}</b><span>{p.inclusive?"共融遊戲場":p.category==="playground"?"兒童遊戲場":"公園"}</span></button>)}</div>}</section>{userCoords&&nearbyParks.length>0&&<section className="nearbyParks"><div className="nearbyHead"><div><h2>附近公園</h2><p>依你目前定位，以直線距離排序</p></div><MapPin size={20}/></div><div className="nearbyParkList">{nearbyParks.map(p=><button key={p.id} className="nearbyParkCard" onClick={()=>showDetail(p)}><div><b>{p.name}</b><span>{p.district||p.county}・{p._distanceKm.toFixed(1)} km</span></div><Navigation size={17} onClick={e=>{e.stopPropagation();map(p)}}/></button>)}</div></section>}{!userCoords&&<div className="nearbyPrompt"><MapPin size={17}/>開啟定位後會顯示附近公園</div>}<button className="modifyBtn" onClick={()=>setResult(null)}>修改條件</button>
     </>}
   </section>}
   {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
 </main>
}

createRoot(document.getElementById("root")).render(<App/>);
