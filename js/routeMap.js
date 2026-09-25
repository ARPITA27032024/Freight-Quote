/* ==========================================================================
   Leaflet Shipping Route Map Visualizer
   ========================================================================== */

let mapInstance = null;
let originMarker = null;
let destMarker = null;
let routePolyline = null;

function initRouteMap() {
  const mapElement = document.getElementById('routeMap');
  if (!mapElement) return;

  // Initialize map centered at global view
  mapInstance = L.map('routeMap', {
    zoomControl: true,
    attributionControl: false
  }).setView([20, 0], 2);

  // CartoDB Positron Clean Map Tiles (matches white clean theme)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd'
  }).addTo(mapInstance);
}

function updateRouteMap(origin, dest) {
  if (!mapInstance) {
    initRouteMap();
  }

  if (!origin || !dest) return;

  // Clear previous layers
  if (originMarker) mapInstance.removeLayer(originMarker);
  if (destMarker) mapInstance.removeLayer(destMarker);
  if (routePolyline) mapInstance.removeLayer(routePolyline);

  // Custom Icon Badges
  const originIcon = L.divIcon({
    className: 'custom-map-pin origin-pin',
    html: `<div style="background:#ff9800; color:#fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px; box-shadow:0 0 10px rgba(255,152,0,0.8);">A</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const destIcon = L.divIcon({
    className: 'custom-map-pin dest-pin',
    html: `<div style="background:#10233f; color:#fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px; box-shadow:0 0 10px rgba(16,35,63,0.8);">B</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(mapInstance);
  originMarker.bindPopup(`<b>Origin:</b> ${origin.name} (${origin.country})`);

  destMarker = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(mapInstance);
  destMarker.bindPopup(`<b>Destination:</b> ${dest.name} (${dest.country})`);

  // Generate curved route polyline
  const latlngs = [
    [origin.lat, origin.lng],
    [(origin.lat + dest.lat) / 2 + 5, (origin.lng + dest.lng) / 2], // Curve offset
    [dest.lat, dest.lng]
  ];

  routePolyline = L.polyline(latlngs, {
    color: '#ff9800',
    weight: 3,
    dashArray: '6, 8',
    lineCap: 'round'
  }).addTo(mapInstance);

  // Fit bounds to fit route nicely
  const bounds = L.latLngBounds([
    [origin.lat, origin.lng],
    [dest.lat, dest.lng]
  ]);
  mapInstance.fitBounds(bounds, { padding: [40, 40] });
}
