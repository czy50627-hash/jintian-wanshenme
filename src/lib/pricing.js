const DEFAULT_ESTIMATES={
  theme_park:[500,1200],
  indoor_play:[300,700],
  aquarium:[250,650],
  zoo:[60,200],
  museum:[50,200],
  art:[0,200],
  farm:[100,400],
  factory:[0,300],
  culture:[100,400],
  heritage:[0,150],
  nature:[0,150],
  water:[50,250],
  transport:[50,350],
  waterfront:[0,150],
  beach:[0,150],
  garden:[50,250],
  experience:[100,500],
  library:[0,0],
  park:[0,0],
  visitor_center:[0,0]
};

export function derivePricing(raw){
  if(raw.isFree===true || raw.pricing?.isFree===true){
    return {isFree:true,minPrice:0,maxPrice:0,kind:"free",label:"免費"};
  }
  const exactMin=Number.isFinite(raw.priceMin)?raw.priceMin:Number.isFinite(raw.pricing?.minPrice)?raw.pricing.minPrice:null;
  const exactMax=Number.isFinite(raw.priceMax)?raw.priceMax:Number.isFinite(raw.pricing?.maxPrice)?raw.pricing.maxPrice:null;
  if(exactMin!==null || exactMax!==null){
    const min=exactMin??exactMax;
    const max=exactMax??exactMin;
    return {isFree:false,minPrice:min,maxPrice:max,kind:"verified_or_source",label:min===max?`票價約 NT$ ${min}`:`票價約 NT$ ${min}–${max}`};
  }
  const [min,max]=DEFAULT_ESTIMATES[raw.category||raw.type]||[100,400];
  if(min===0&&max===0) return {isFree:true,minPrice:0,maxPrice:0,kind:"free",label:"免費"};
  return {
    isFree:false,minPrice:min,maxPrice:max,kind:"editorial_estimate",
    label:`預估票價 NT$ ${min}–${max}／人`,
    disclaimer:"依場館、年齡與票種不同，實際票價以官方公告為準"
  };
}

export function priceLabel(place){
  return place.pricing?.label || derivePricing(place).label;
}
