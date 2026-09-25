/* ==========================================================================
   Global Ports and Transportation Hubs Database
   ========================================================================== */

const PORTS_DATA = [
  { id: 'CNSHA', name: 'Port of Shanghai', country: 'China', type: 'ocean', lat: 31.2304, lng: 121.4737 },
  { id: 'NLRTM', name: 'Port of Rotterdam', country: 'Netherlands', type: 'ocean', lat: 51.9244, lng: 4.4777 },
  { id: 'SGSIN', name: 'Port of Singapore', country: 'Singapore', type: 'ocean', lat: 1.3521, lng: 103.8198 },
  { id: 'USLAX', name: 'Port of Los Angeles', country: 'United States', type: 'ocean', lat: 33.7423, lng: -118.2673 },
  { id: 'USNYC', name: 'Port of New York & NJ', country: 'United States', type: 'ocean', lat: 40.7128, lng: -74.0060 },
  { id: 'DEHAM', name: 'Port of Hamburg', country: 'Germany', type: 'ocean', lat: 53.5511, lng: 9.9937 },
  { id: 'AEDXB', name: 'Port of Jebel Ali (Dubai)', country: 'UAE', type: 'ocean', lat: 24.9857, lng: 55.0273 },
  { id: 'INBOM', name: 'Nhava Sheva (Mumbai)', country: 'India', type: 'ocean', lat: 18.9500, lng: 72.9500 },
  { id: 'GBFXT', name: 'Port of Felixstowe', country: 'United Kingdom', type: 'ocean', lat: 51.9617, lng: 1.3513 },
  { id: 'JPTYO', name: 'Port of Tokyo', country: 'Japan', type: 'ocean', lat: 35.6762, lng: 139.6503 },
  { id: 'KRBUS', name: 'Port of Busan', country: 'South Korea', type: 'ocean', lat: 35.1796, lng: 129.0756 },
  { id: 'ZACPT', name: 'Port of Cape Town', country: 'South Africa', type: 'ocean', lat: -33.9249, lng: 18.4241 },
  { id: 'AUBNE', name: 'Port of Brisbane', country: 'Australia', type: 'ocean', lat: -27.4698, lng: 153.0251 },
  { id: 'BRPNG', name: 'Port of Paranagua', country: 'Brazil', type: 'ocean', lat: -25.5205, lng: -48.5094 },
  
  // Air Freight Hubs
  { id: 'PVG', name: 'Shanghai Pudong Airport (PVG)', country: 'China', type: 'air', lat: 31.1443, lng: 121.8083 },
  { id: 'FRA', name: 'Frankfurt Airport (FRA)', country: 'Germany', type: 'air', lat: 50.0379, lng: 8.5622 },
  { id: 'JFK', name: 'New York JFK Airport (JFK)', country: 'United States', type: 'air', lat: 40.6413, lng: -73.7781 },
  { id: 'DXB', name: 'Dubai International (DXB)', country: 'UAE', type: 'air', lat: 25.2532, lng: 55.3657 },
  { id: 'LHR', name: 'London Heathrow (LHR)', country: 'United Kingdom', type: 'air', lat: 51.4700, lng: -0.4543 },
  { id: 'DEL', name: 'Indira Gandhi Int (DEL)', country: 'India', type: 'air', lat: 28.5562, lng: 77.1000 }
];

// Helper distance calculator using Haversine formula
function calculateDistanceKM(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}
