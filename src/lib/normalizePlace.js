export function normalizePlace(raw){
  const regular=raw.openingHours?.regular||{};
  return {
    ...raw,
    category:raw.category||raw.type||"other",
    isCoordinatePrecise:raw.isCoordinatePrecise===true,
    pricing:{isFree:raw.isFree===true,minPrice:raw.priceMin??null,maxPrice:raw.priceMax??null},
    amenities:{
      parking:raw.parking||"unknown",
      stroller:raw.stroller===true,
      diaperStation:raw.diaperStation===true,
      nursingRoom:raw.nursingRoom===true,
      foodNearby:raw.foodNearby===true
    },
    schedule:{
      closedDays:raw.openingHours?.closedDays||[],
      regularHours:regular,
      requiresBooking:raw.requiresBooking===true
    },
    trustLayer:{
      officialUrl:raw.officialUrl||"",
      lastVerifiedAt:raw.lastVerifiedAt||"",
      dataSource:raw.dataSource||"community",
      status:raw.verificationStatus||"candidate"
    },
    verificationStatus:raw.verificationStatus||"candidate",
    publishStatus:raw.publishStatus||"unpublished"
  };
}
