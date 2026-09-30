import AdmZip from "adm-zip";

const URL="https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Event-json.zip";
let cache={ts:0,records:[]};
const TTL=1000*60*60*3;

function arrays(v,out=[]){if(Array.isArray(v))out.push(v);else if(v&&typeof v==="object")for(const x of Object.values(v))arrays(x,out);return out}
function text(v){if(v==null)return"";if(typeof v==="string"||typeof v==="number")return String(v);if(Array.isArray(v))return v.map(text).join(" ");if(typeof v==="object")return Object.values(v).map(text).join(" ");return""}
const alias={"台北":"臺北市","新北":"新北市","桃園":"桃園市","新竹":"新竹","苗栗":"苗栗縣","台中":"臺中市","彰化":"彰化縣","南投":"南投縣","雲林":"雲林縣","嘉義":"嘉義","台南":"臺南市","高雄":"高雄市","屏東":"屏東縣","宜蘭":"宜蘭縣","花蓮":"花蓮縣","台東":"臺東縣","基隆":"基隆市","澎湖":"澎湖縣","金門":"金門縣","連江":"連江縣"};
function cityName(r){
  const sources=[text(r.PostalAddress||r.Address||r.Add||""),text(r.LocatedCities||"")];
  for(const s of sources){
    const m=s.match(/(臺北市|台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|臺中市|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|臺南市|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|基隆市|澎湖縣|金門縣|連江縣)/);
    if(m)return m[1];
  }
  return "";
}
function match(city,county){const a=alias[county]||county;if(county==="新竹")return /新竹[市縣]/.test(city);if(county==="嘉義")return /嘉義[市縣]/.test(city);return city===a||city.replace(/^台/,"臺")===a}
function appCounty(city){
  const pairs=[["臺北市","台北"],["台北市","台北"],["新北市","新北"],["桃園市","桃園"],["新竹市","新竹"],["新竹縣","新竹"],["苗栗縣","苗栗"],["臺中市","台中"],["台中市","台中"],["彰化縣","彰化"],["南投縣","南投"],["雲林縣","雲林"],["嘉義市","嘉義"],["嘉義縣","嘉義"],["臺南市","台南"],["台南市","台南"],["高雄市","高雄"],["屏東縣","屏東"],["宜蘭縣","宜蘭"],["花蓮縣","花蓮"],["臺東縣","台東"],["台東縣","台東"],["基隆市","基隆"],["澎湖縣","澎湖"],["金門縣","金門"],["連江縣","連江"]];
  return pairs.find(([a])=>a===city)?.[1]||city;
}
function normalize(r){
  const title=text(r.EventName||r.Name).trim(); if(!title)return null;
  const start=text(r.StartDateTime||r.StartDate||"").slice(0,10);
  const end=text(r.EndDateTime||r.EndDate||"").slice(0,10);
  const city=cityName(r);
  const full=[title,text(r.Description),text(r.EventClasses)].join(" ");
  const family=/(親子|兒童|家庭|市集|嘉年華|展覽|特展|DIY|手作|故事|遊戲|表演|音樂|花季|燈會|祭典|節慶|文化|科學|博物館|動物|生態|公園)/.test(full);
  if(!family)return null;
  return {
    id:"tourism-event-"+text(r.EventID||r.Id||title).replace(/\s+/g,"-"),
    title,county:appCounty(city),venue:text(r.PostalAddress||r.Venue||r.Location).trim()||null,
    startDate:start,endDate:end||start,
    type:/限定|期間|特展|季|展/.test(full)?"limited":"weekend",
    indoor:/室內|館|博物館|美術館/.test(full),
    outdoor:/公園|戶外|廣場|市集|花季/.test(full),
    isFree:r.IsAccessibleForFree===true?true:r.IsAccessibleForFree===false?false:null,
    ageTags:["0-2","3-5","6-8","9-12"],
    description:text(r.Description).trim().slice(0,180),
    sourceLabel:"交通部觀光署觀光資訊資料庫",
    sourceUrl:text(r.WebsiteURL).trim()||"https://data.gov.tw/dataset/7778",
    verifiedAt:new Date().toISOString().slice(0,10),
    imageUrl:null
  };
}
async function load(){
  if(cache.records.length&&Date.now()-cache.ts<TTL)return cache.records;
  const r=await fetch(URL); if(!r.ok)throw new Error("source "+r.status);
  const zip=new AdmZip(Buffer.from(await r.arrayBuffer()));
  const e=zip.getEntries().find(x=>!x.isDirectory&&/\.json$/i.test(x.entryName)); if(!e)throw new Error("json missing");
  const obj=JSON.parse(e.getData().toString("utf8").replace(/^\uFEFF/,""));
  const arr=arrays(obj).filter(a=>a.length&&typeof a[0]==="object").sort((a,b)=>b.length-a.length)[0]||[];
  cache={ts:Date.now(),records:arr};return arr;
}
export default async function handler(req,res){
  try{
    const county=String(req.query.county||""); const now=new Date();
    const raw=await load();
    const rows=raw.map(normalize).filter(Boolean).filter(e=>(!county||match(e.county,county))&&(!e.endDate||new Date(e.endDate+"T23:59:59+08:00")>=now)).slice(0,120);
    res.setHeader("Cache-Control","s-maxage=10800, stale-while-revalidate=43200");
    res.status(200).json({count:rows.length,records:rows});
  }catch(e){res.status(502).json({error:String(e.message||e),count:0,records:[]})}
}
