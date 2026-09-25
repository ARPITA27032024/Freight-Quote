/* ==========================================================================
   Freight Quote Calculation Engine
   ========================================================================== */

// Default Carrier Rate Configurations
let carrierRates = {
  oceanFclMult: 1.00,
  oceanLclPerCbm: 115.00,
  airFreightPerKg: 4.80,
  roadFreightPerKm: 1.65,
  bafPct: 12.0,
  thcFlat: 220.00,
  customsFlat: 180.00
};

// Container base rates
const CONTAINER_BASE_RATES = {
  '20ft': 1850,
  '40ft': 2950,
  '40hc': 3250,
  '45hc': 3800
};

// Active promo codes table
const PROMO_CODES = {
  'FREIGHT10': { type: 'pct', value: 0.10, desc: '10% Off Base Ocean Freight' },
  'AIRSPEED15': { type: 'pct', value: 0.15, desc: '15% Off Surcharges' },
  'GLOBAL2026': { type: 'flat', value: 180, desc: '$180 Customs Fee Credit' }
};

let activePromo = null;

function calculateQuote(options) {
  const {
    origin,
    destination,
    mode, // 'ocean_fcl', 'ocean_lcl', 'air_standard', 'road'
    containerType, // '20ft', '40ft', '40hc', '45hc'
    containerQty = 1,
    weightKg = 1000,
    volumeCbm = 4,
    commodityMultiplier = 1.0,
    declaredValue = 25000,
    services = {}, // { customs: true, insurance: true, thc: true, baf: true, doorPickup: false, greenOffset: false }
    currency = { code: 'USD', symbol: '$', rate: 1 }
  } = options;

  // 1. Calculate Distance
  const distKm = calculateDistanceKM(origin.lat, origin.lng, destination.lat, destination.lng);
  const distNM = Math.round(distKm * 0.539957);

  // 2. Calculate Base Freight
  let baseFreightUSD = 0;
  let chargeDetails = "";

  if (mode === 'ocean_fcl') {
    const unitPrice = (CONTAINER_BASE_RATES[containerType] || 2000) * carrierRates.oceanFclMult;
    baseFreightUSD = unitPrice * containerQty * commodityMultiplier;
    chargeDetails = `${containerQty}x ${containerType.toUpperCase()} Container(s)`;
  } else if (mode === 'ocean_lcl') {
    const minCbm = Math.max(volumeCbm, 1);
    baseFreightUSD = minCbm * carrierRates.oceanLclPerCbm * commodityMultiplier;
    chargeDetails = `${minCbm} CBM @ $${carrierRates.oceanLclPerCbm}/CBM`;
  } else if (mode === 'air_standard') {
    // Dimensional weight ratio for Air Freight = 1 CBM : 167 KG
    const dimWeight = volumeCbm * 167;
    const chargeableWeight = Math.max(weightKg, dimWeight);
    baseFreightUSD = chargeableWeight * carrierRates.airFreightPerKg * commodityMultiplier;
    chargeDetails = `${chargeableWeight} KG Chargeable Wt @ $${carrierRates.airFreightPerKg}/KG`;
  } else {
    // Road Freight
    baseFreightUSD = Math.max(distKm * carrierRates.roadFreightPerKm * (weightKg / 1000), 450);
    chargeDetails = `${distKm} KM Overland Drayage`;
  }

  // Distance adjustments for ocean long haul
  if (mode.startsWith('ocean') && distNM > 3000) {
    baseFreightUSD += (distNM - 3000) * 0.15 * (containerQty || 1);
  }

  // 3. Calculate Line Item Charges
  const lineItems = [];
  lineItems.push({
    key: 'base_freight',
    name: `Base Freight (${chargeDetails})`,
    usd: Math.round(baseFreightUSD)
  });

  let totalSurchargesUSD = 0;

  // Customs Clearance
  if (services.customs) {
    const customsCost = carrierRates.customsFlat;
    lineItems.push({ key: 'customs', name: 'Export & Import Customs Filing', usd: customsCost });
    totalSurchargesUSD += customsCost;
  }

  // Marine Insurance (0.35% of declared cargo value)
  if (services.insurance && declaredValue > 0) {
    const insCost = Math.max(Math.round(declaredValue * 0.0035), 75);
    lineItems.push({ key: 'insurance', name: `All-Risk Cargo Insurance (Val: $${declaredValue.toLocaleString()})`, usd: insCost });
    totalSurchargesUSD += insCost;
  }

  // Terminal Handling Charges (THC)
  if (services.thc) {
    const thcCost = carrierRates.thcFlat * (mode === 'ocean_fcl' ? containerQty : 1);
    lineItems.push({ key: 'thc', name: 'Port & Terminal Handling Charges (THC)', usd: thcCost });
    totalSurchargesUSD += thcCost;
  }

  // Bunker Fuel Surcharge (BAF)
  if (services.baf) {
    const bafCost = Math.round(baseFreightUSD * (carrierRates.bafPct / 100));
    lineItems.push({ key: 'baf', name: `Bunker Fuel Adjustment Factor (${carrierRates.bafPct}%)`, usd: bafCost });
    totalSurchargesUSD += bafCost;
  }

  // Door Pickup / Delivery
  if (services.doorPickup) {
    const doorCost = 350 * (mode === 'ocean_fcl' ? containerQty : 1);
    lineItems.push({ key: 'door', name: 'First-Mile & Last-Mile Drayage', usd: doorCost });
    totalSurchargesUSD += doorCost;
  }

  // Green Carbon Offset
  if (services.greenOffset) {
    const greenCost = 45;
    lineItems.push({ key: 'green', name: 'Green Shipping Carbon Offset', usd: greenCost });
    totalSurchargesUSD += greenCost;
  }

  // 4. Subtotal & Promo Discount
  const subtotalUSD = lineItems.reduce((sum, item) => sum + item.usd, 0);
  let discountUSD = 0;

  if (activePromo) {
    const p = PROMO_CODES[activePromo];
    if (p) {
      if (p.type === 'pct') {
        discountUSD = Math.round(baseFreightUSD * p.value);
      } else if (p.type === 'flat') {
        discountUSD = p.value;
      }
    }
  }

  const finalTotalUSD = Math.max(subtotalUSD - discountUSD, 50);

  // 5. Transit Time Estimates
  let transitMin = 2;
  let transitMax = 4;
  if (mode.startsWith('ocean')) {
    transitMin = Math.round(distNM / 350) + 4;
    transitMax = transitMin + 5;
  } else if (mode === 'air_standard') {
    transitMin = 2;
    transitMax = 5;
  } else {
    transitMin = Math.round(distKm / 600) + 1;
    transitMax = transitMin + 2;
  }

  // 6. CO2 Emission Estimation (tonnes CO2e)
  // Ocean: ~12g CO2/tonne-km, Air: ~500g CO2/tonne-km, Truck: ~80g CO2/tonne-km
  const weightTons = Math.max(weightKg / 1000, 1.5);
  let co2GramsPerTkm = 12;
  if (mode === 'air_standard') co2GramsPerTkm = 500;
  if (mode === 'road') co2GramsPerTkm = 80;

  const co2Tonnes = ((distKm * weightTons * co2GramsPerTkm) / 1000000).toFixed(2);

  // 7. Format currency values
  const rate = currency.rate || 1;
  const sym = currency.symbol || '$';

  const lineItemsConverted = lineItems.map(item => ({
    ...item,
    formatted: `${sym}${(item.usd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }));

  return {
    quoteId: 'QT-2026-' + Math.floor(1000 + Math.random() * 9000),
    issueDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    expiryDate: new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    origin,
    destination,
    mode,
    containerType,
    containerQty,
    weightKg,
    volumeCbm,
    declaredValue,
    distKm,
    distNM,
    transitDaysStr: `${transitMin} - ${transitMax} Days`,
    co2Tonnes,
    lineItems: lineItemsConverted,
    subtotalUSD,
    discountUSD,
    finalTotalUSD,
    subtotalFormatted: `${sym}${(subtotalUSD * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    discountFormatted: `${sym}${(discountUSD * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    finalTotalFormatted: `${sym}${(finalTotalUSD * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };
}
