export function generateEvidenceReason(place,prefs){
  const reasons=[];
  const matched=(place.ageTags||[]).filter(a=>prefs.ages.includes(a));
  if(matched.length){
    reasons.push(prefs.ages.length>1 && place.multiKidFriendly
      ? `兼顧 ${matched.join("、")} 歲不同年齡需求`
      : `符合 ${matched.join("、")} 歲年齡需求`);
  }
  if(prefs.currentRainProb>=50 && place.indoor) reasons.push(`目前降雨機率約 ${prefs.currentRainProb}%，室內較安心`);
  else if(prefs.currentRainProb<30 && place.outdoor) reasons.push("目前降雨機率低，適合戶外放電");
  if(place._driveMinutes!=null) reasons.push(`依目前位置估算約 ${place._driveMinutes} 分鐘`);
  if(place.isFree) reasons.push("免費");
  if(place.amenities?.parking==="easy") reasons.push("停車相對方便");
  if(place.amenities?.stroller) reasons.push("推車友善");
  return reasons.slice(0,3).join("・") || "符合目前篩選條件。";
}
