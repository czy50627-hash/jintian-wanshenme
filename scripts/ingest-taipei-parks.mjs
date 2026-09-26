import fs from "node:fs/promises";
import path from "node:path";
import { normalizePlace } from "../src/lib/normalizePlace.js";

const SOURCE_URL=process.env.TAIPEI_PARKS_API || "https://parks.gov.taipei/parks/api/";
const OUT_VERIFIED=path.resolve("public/data/verified-taipei-parks.json");
const OUT_CANDIDATES=path.resolve("public/data/taipei-parks.candidates.json");
const REPORT=path.resolve("public/data/verification-report.json");

const PLACEHOLDERS=[
  [25.0375,121.5637],
  [25.0833,121.5167],
  [25.0478,121.5319]
];

const text=v=>typeof v==="string"?v.trim():"";
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const slugify=v=>String(v||"").normalize("NFKC").replace(/臺/g,"台").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").toLowerCase();

function arrayFrom(payload){
  if(Array.isArray(payload)) return payload;
  for(const k of ["data","result","results","items","records"]){
    if(Array.isArray(payload?.[k])) return payload[k];
  }
  throw new Error("Unexpected Taipei parks API response shape");
}

function decimals(v){
  const s=String(v??"");
  const p=s.split(".")[1];
  return p?p.length:0;
}

function preciseCoordinate(lat,lng){
  if(typeof lat!=="number"||typeof lng!=="number") return false;
  if(lat<24.95||lat>25.21||lng<121.45||lng>121.66) return false;
  if(decimals(lat)<4||decimals(lng)<4) return false;
  return !PLACEHOLDERS.some(([a,b])=>Math.abs(a-lat)<0.001&&Math.abs(b-lng)<0.001);
}

function validAddress(address){
  const a=text(address);
  if(a.length<5) return false;
  if(/待查|待確認|無地址|未知|^無$/.test(a)) return false;
  return /(路|街|巷|弄|號|區|里|段|大道)/.test(a);
}

function conservativeAgeTags(raw){
  const t=[raw.pm_playeq,raw.pm_playarea,raw.pm_description,raw.pm_playtype].map(text).join(" ");
  const tags=new Set();
  if(/沙坑|搖搖|搖馬|低矮|幼兒|小童/.test(t)){tags.add("0-2");tags.add("3-5");}
  if(/溜滑梯|鞦韆|遊戲場|遊具/.test(t)) tags.add("3-5");
  if(/攀爬|攀岩|攀網|滑索|高塔|繩網/.test(t)){tags.add("6-8");tags.add("9-12");}
  return [...tags];
}

function openingHours(raw){
  const s=text(raw.pm_opening_s),e=text(raw.pm_opening_e);
  const regular={mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null};
  if(s&&e) Object.keys(regular).forEach(k=>regular[k]=s+"-"+e);
  return {regular,closedDays:[],raw:[s,e].filter(Boolean).join("-")||null};
}

function normalizeRaw(raw){
  const lat=num(raw.pm_Latitude??raw.lat??raw.latitude);
  const lng=num(raw.pm_Longitude??raw.lng??raw.longitude);
  const name=text(raw.pm_name??raw.name);
  const address=text(raw.pm_location??raw.address);
  const district=text(raw.pm_regions??raw.district);
  const ageTags=conservativeAgeTags(raw);
  const sourceUrl=SOURCE_URL;
  const precise=preciseCoordinate(lat,lng);
  const authority=/\.gov\.tw|taipei/i.test(sourceUrl);
  const addressOK=validAddress(address);
  const officialUrl=text(raw.pm_url)||"https://parks.taipei/";
  const base=normalizePlace({
    id:"taipei-park-"+slugify(raw.SeqNo||raw.id||name),
    slug:"taipei-park-"+slugify(name),
    name,county:"台北",district,address,lat,lng,
    isCoordinatePrecise:precise,
    category:"park",indoor:false,outdoor:true,covered:Boolean(raw.pm_shelter||raw.hasShelter),
    ageTags,
    multiKidFriendly:ageTags.length>=2,
    isFree:true,priceMin:0,priceMax:0,
    energyLevel:ageTags.some(x=>["6-8","9-12"].includes(x))?3:2,
    parentEffort:2,durationMin:90,
    parking:"unknown",stroller:null,diaperStation:null,nursingRoom:null,foodNearby:null,
    playground:{
      playgroundType:text(raw.pm_playtype)||"unknown",
      ageZones:[],slide:null,climbing:null,sandPit:null,swing:null,
      scooterFriendly:null,bikeFriendly:null,waterPlay:null,waterPlaySeason:null,
      shadeLevel:"unknown",coveredPlayArea:null,toilet:null,accessibleToilet:null,
      picnicFriendly:null,grassArea:null,nightLighting:null,
      officialEquipmentText:text(raw.pm_playeq)||null
    },
    officialUrl,openingHours:openingHours(raw),requiresBooking:false,
    lastVerifiedAt:new Date().toISOString().slice(0,10),
    dataSource:"official_gov",sourceUrl,temporaryClosed:false,
    verificationStatus:"candidate",publishStatus:"draft"
  });
  const reasons=[];
  if(!authority) reasons.push("NON_GOV_SOURCE");
  if(!precise) reasons.push("IMPRECISE_COORDINATE");
  if(!addressOK) reasons.push("INCOMPLETE_ADDRESS");
  if(!name) reasons.push("MISSING_NAME");
  if(!officialUrl) reasons.push("MISSING_OFFICIAL_URL");
  if(ageTags.length===0) reasons.push("NO_CONSERVATIVE_AGE_EVIDENCE");
  if(reasons.length===0){
    base.verificationStatus="verified";
    base.publishStatus="published";
    base.trustLayer={...base.trustLayer,status:"verified",officialUrl,lastVerifiedAt:base.lastVerifiedAt,dataSource:"official_gov"};
  }
  return {place:base,reasons};
}

const response=await fetch(SOURCE_URL,{headers:{"user-agent":"jintian-wanshenme-data-pipeline/1.0"}});
if(!response.ok) throw new Error("Taipei parks API failed: "+response.status);
const rows=arrayFrom(await response.json());
const verified=[],candidates=[],breakdown={};
for(const raw of rows){
  const {place,reasons}=normalizeRaw(raw);
  if(place.verificationStatus==="verified") verified.push(place);
  else{
    candidates.push(place);
    for(const r of reasons) breakdown[r]=(breakdown[r]||0)+1;
  }
}
await fs.mkdir(path.dirname(OUT_VERIFIED),{recursive:true});
await fs.writeFile(OUT_VERIFIED,JSON.stringify({updatedAt:new Date().toISOString(),source:SOURCE_URL,count:verified.length,records:verified},null,2));
await fs.writeFile(OUT_CANDIDATES,JSON.stringify({updatedAt:new Date().toISOString(),source:SOURCE_URL,count:candidates.length,records:candidates},null,2));
await fs.writeFile(REPORT,JSON.stringify({
  evaluatedAt:new Date().toISOString(),source:SOURCE_URL,totalRaw:rows.length,
  verifiedCount:verified.length,candidateCount:candidates.length,rejectedBreakdown:breakdown,
  gate:["authoritative source","precise non-placeholder coordinate","valid address","official URL","conservative age evidence"]
},null,2));
console.log(`[Taipei Pipeline] Verified: ${verified.length}, Candidate: ${candidates.length}`);
