/* ==========================================================================
   Freight Quote Generation System - Main Application Logic
   ========================================================================== */

let currentQuote = null;
let costChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // 2. Populate Port Dropdowns
  populatePortDropdowns();

  // 3. Initialize Route Map & Chart
  initRouteMap();
  initCostChart();

  // 4. Bind Event Listeners
  bindEvents();

  // 5. Initial Quote Calculation
  recalculateQuote();

  // 6. Render Saved Quotes Table
  renderSavedQuotes();
});

function populatePortDropdowns() {
  const originSelect = document.getElementById('originSelect');
  const destSelect = document.getElementById('destSelect');
  const quickOrigin = document.getElementById('quickOrigin');
  const quickDest = document.getElementById('quickDest');

  if (!originSelect || !destSelect) return;

  const oceanPorts = PORTS_DATA.filter(p => p.type === 'ocean');
  const airPorts = PORTS_DATA.filter(p => p.type === 'air');

  let htmlOcean = '<optgroup label="Sea Ports">';
  oceanPorts.forEach(p => {
    htmlOcean += `<option value="${p.id}">${p.name} (${p.country})</option>`;
  });
  htmlOcean += '</optgroup>';

  let htmlAir = '<optgroup label="Air Cargo Hubs">';
  airPorts.forEach(p => {
    htmlAir += `<option value="${p.id}">${p.name} (${p.country})</option>`;
  });
  htmlAir += '</optgroup>';

  const fullHtml = htmlOcean + htmlAir;

  originSelect.innerHTML = fullHtml;
  destSelect.innerHTML = fullHtml;
  quickOrigin.innerHTML = fullHtml;
  quickDest.innerHTML = fullHtml;

  // Set default origin to Shanghai (CNSHA) and dest to Rotterdam (NLRTM)
  originSelect.value = 'CNSHA';
  destSelect.value = 'NLRTM';
  quickOrigin.value = 'CNSHA';
  quickDest.value = 'NLRTM';
}

function bindEvents() {
  // Mode tab switching
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');

      const selectedMode = target.getAttribute('data-mode');
      toggleModeInputs(selectedMode);
      recalculateQuote();
    });
  });

  // Swap ports button
  document.getElementById('swapPortsBtn').addEventListener('click', () => {
    const oSelect = document.getElementById('originSelect');
    const dSelect = document.getElementById('destSelect');
    const temp = oSelect.value;
    oSelect.value = dSelect.value;
    dSelect.value = temp;
    recalculateQuote();
  });

  // Form input changes trigger auto recalculate
  const autoRecalcInputs = [
    'originSelect', 'destSelect', 'containerQty', 'cargoWeight',
    'cargoVolume', 'commoditySelect', 'declaredValue', 'srvCustoms',
    'srvInsurance', 'srvTHC', 'srvBaf', 'srvDoorPickup', 'srvGreenOffset', 'currencySelect'
  ];

  autoRecalcInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', recalculateQuote);
      el.addEventListener('input', recalculateQuote);
    }
  });

  // Container radio selection
  document.querySelectorAll('input[name="containerType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.container-card').forEach(c => c.classList.remove('active'));
      e.target.closest('.container-card').classList.add('active');
      recalculateQuote();
    });
  });

  // Promo code button
  document.getElementById('applyPromoBtn').addEventListener('click', () => {
    const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    const msg = document.getElementById('promoMsg');
    if (PROMO_CODES[code]) {
      activePromo = code;
      msg.className = "text-xs font-semibold mt-1 text-emerald-600";
      msg.innerText = `Promo Code Applied: ${PROMO_CODES[code].desc}`;
    } else if (code === "") {
      activePromo = null;
      msg.innerText = "";
    } else {
      activePromo = null;
      msg.className = "text-xs font-semibold mt-1 text-rose-600";
      msg.innerText = "Invalid promo code.";
    }
    recalculateQuote();
  });

  // Quick Estimate button in hero
  document.getElementById('quickEstimateBtn').addEventListener('click', () => {
    const oId = document.getElementById('quickOrigin').value;
    const dId = document.getElementById('quickDest').value;
    const mode = document.getElementById('quickMode').value;

    const oPort = PORTS_DATA.find(p => p.id === oId);
    const dPort = PORTS_DATA.find(p => p.id === dId);

    const est = calculateQuote({
      origin: oPort,
      destination: dPort,
      mode: mode,
      containerType: '20ft',
      containerQty: 1,
      weightKg: 1000,
      volumeCbm: 3,
      services: { baf: true, thc: true }
    });

    document.getElementById('quickPrice').innerText = est.finalTotalFormatted;
    document.getElementById('quickResult').classList.remove('hidden');
  });

  // Save quote button
  document.getElementById('saveQuoteBtn').addEventListener('click', () => {
    if (!currentQuote) return;
    saveQuoteToStorage({
      ...currentQuote,
      modeLabel: getModeLabel(currentQuote.mode),
      status: 'active'
    });
    alert(`Quote ${currentQuote.quoteId} successfully saved to dashboard!`);
    renderSavedQuotes();
  });

  // Export PDF button
  document.getElementById('exportPdfBtn').addEventListener('click', () => {
    if (!currentQuote) return;
    exportQuoteToPDF(currentQuote);
  });

  // Save carrier rate settings
  document.getElementById('saveRatesBtn').addEventListener('click', () => {
    carrierRates.oceanFclMult = parseFloat(document.getElementById('rateOceanFclMult').value) || 1.0;
    carrierRates.oceanLclPerCbm = parseFloat(document.getElementById('rateOceanLclCbm').value) || 115.0;
    carrierRates.airFreightPerKg = parseFloat(document.getElementById('rateAirKg').value) || 4.80;
    carrierRates.bafPct = parseFloat(document.getElementById('rateBafPct').value) || 12.0;
    carrierRates.thcFlat = parseFloat(document.getElementById('rateThcFlat').value) || 220.0;
    carrierRates.customsFlat = parseFloat(document.getElementById('rateCustomsFlat').value) || 180.0;

    alert("Carrier Rate Card settings updated successfully!");
    recalculateQuote();
  });

  // Search & filter saved quotes
  document.getElementById('quoteSearchInput').addEventListener('input', renderSavedQuotes);
  document.getElementById('quoteFilterMode').addEventListener('change', renderSavedQuotes);

  // Service card action buttons
  document.querySelectorAll('.select-service-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.target.getAttribute('data-target-mode');
      const tab = document.querySelector(`.mode-tab[data-mode="${mode}"]`);
      if (tab) tab.click();
      window.location.hash = "#quote-calculator";
    });
  });
}

function toggleModeInputs(mode) {
  const fclBox = document.getElementById('fclContainerOptions');
  const weightVolBox = document.getElementById('weightVolOptions');

  if (mode === 'ocean_fcl') {
    fclBox.classList.remove('hidden');
    weightVolBox.classList.add('hidden');
  } else {
    fclBox.classList.add('hidden');
    weightVolBox.classList.remove('hidden');
  }
}

function recalculateQuote() {
  const oId = document.getElementById('originSelect').value;
  const dId = document.getElementById('destSelect').value;
  
  const oPort = PORTS_DATA.find(p => p.id === oId) || PORTS_DATA[0];
  const dPort = PORTS_DATA.find(p => p.id === dId) || PORTS_DATA[1];

  const activeTab = document.querySelector('.mode-tab.active');
  const mode = activeTab ? activeTab.getAttribute('data-mode') : 'ocean_fcl';

  const containerRadio = document.querySelector('input[name="containerType"]:checked');
  const containerType = containerRadio ? containerRadio.value : '20ft';
  const containerQty = parseInt(document.getElementById('containerQty').value) || 1;

  const weightKg = parseFloat(document.getElementById('cargoWeight').value) || 1000;
  const volumeCbm = parseFloat(document.getElementById('cargoVolume').value) || 4;

  const commoditySelect = document.getElementById('commoditySelect');
  const commodityMultiplier = parseFloat(commoditySelect.options[commoditySelect.selectedIndex].getAttribute('data-multiplier')) || 1.0;
  const declaredValue = parseFloat(document.getElementById('declaredValue').value) || 0;

  const currencySelect = document.getElementById('currencySelect');
  const selectedCurrOpt = currencySelect.options[currencySelect.selectedIndex];
  const currency = {
    code: currencySelect.value,
    symbol: selectedCurrOpt.getAttribute('data-symbol'),
    rate: parseFloat(selectedCurrOpt.getAttribute('data-rate')) || 1
  };

  const services = {
    customs: document.getElementById('srvCustoms').checked,
    insurance: document.getElementById('srvInsurance').checked,
    thc: document.getElementById('srvTHC').checked,
    baf: document.getElementById('srvBaf').checked,
    doorPickup: document.getElementById('srvDoorPickup').checked,
    greenOffset: document.getElementById('srvGreenOffset').checked
  };

  currentQuote = calculateQuote({
    origin: oPort,
    destination: dPort,
    mode,
    containerType,
    containerQty,
    weightKg,
    volumeCbm,
    commodityMultiplier,
    declaredValue,
    services,
    currency
  });

  // Update UI components with computed values
  updateSummaryUI(currentQuote);
  updateRouteMap(currentQuote.origin, currentQuote.destination);
  updateCostChart(currentQuote.lineItems);
}

function updateSummaryUI(quote) {
  document.getElementById('quoteIdBadge').innerText = quote.quoteId;
  document.getElementById('estTransitDays').innerText = quote.transitDaysStr;
  document.getElementById('estDistance').innerText = `${quote.distNM.toLocaleString()} NM`;
  document.getElementById('estCo2').innerText = `${quote.co2Tonnes} Tonnes`;

  const tbody = document.getElementById('breakdownTbody');
  tbody.innerHTML = quote.lineItems.map(item => `
    <tr>
      <td>${item.name}</td>
      <td class="text-right font-semibold">${item.formatted}</td>
    </tr>
  `).join('');

  document.getElementById('subtotalVal').innerText = quote.subtotalFormatted;
  document.getElementById('discountVal').innerText = `-${quote.discountFormatted}`;
  document.getElementById('totalQuoteVal').innerText = quote.finalTotalFormatted;
}

function initCostChart() {
  const ctx = document.getElementById('costChart');
  if (!ctx) return;

  costChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Base Freight', 'Surcharges & Services'],
      datasets: [{
        data: [70, 30],
        backgroundColor: ['#10233f', '#ff9800'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      cutout: '70%'
    }
  });
}

function updateCostChart(lineItems) {
  if (!costChartInstance) return;

  const baseItem = lineItems.find(i => i.key === 'base_freight');
  const baseUsd = baseItem ? baseItem.usd : 0;
  const surchargesUsd = lineItems.filter(i => i.key !== 'base_freight').reduce((sum, i) => sum + i.usd, 0);

  costChartInstance.data.labels = ['Base Freight', 'Surcharges & Fees'];
  costChartInstance.data.datasets[0].data = [baseUsd, surchargesUsd];
  costChartInstance.update();
}

function renderSavedQuotes() {
  const tbody = document.getElementById('savedQuotesTbody');
  if (!tbody) return;

  let quotes = getSavedQuotes();
  const search = (document.getElementById('quoteSearchInput').value || '').toLowerCase();
  const modeFilter = document.getElementById('quoteFilterMode').value;

  if (search) {
    quotes = quotes.filter(q => 
      q.quoteId.toLowerCase().includes(search) ||
      q.origin.name.toLowerCase().includes(search) ||
      q.destination.name.toLowerCase().includes(search)
    );
  }

  if (modeFilter !== 'all') {
    quotes = quotes.filter(q => q.mode === modeFilter);
  }

  if (quotes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-slate-400">No saved quotes found.</td></tr>`;
    return;
  }

  tbody.innerHTML = quotes.map(q => `
    <tr>
      <td class="font-bold text-amber-600">${q.quoteId}</td>
      <td>${q.issueDate}</td>
      <td><strong>${q.origin.name}</strong> &rarr; <strong>${q.destination.name}</strong></td>
      <td>${q.modeLabel || q.mode}</td>
      <td class="font-bold">${q.finalTotalFormatted}</td>
      <td><span class="status-badge ${q.status}">${q.status.toUpperCase()}</span></td>
      <td>
        <button class="action-icon-btn" onclick="exportQuoteToPDF(getSavedQuotes().find(item => item.quoteId==='${q.quoteId}'))" title="Download PDF"><i data-lucide="download"></i></button>
        <button class="action-icon-btn" onclick="removeQuote('${q.quoteId}')" title="Delete Quote"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

function removeQuote(quoteId) {
  if (confirm(`Are you sure you want to delete quote ${quoteId}?`)) {
    deleteQuoteFromStorage(quoteId);
    renderSavedQuotes();
  }
}

function getModeLabel(mode) {
  switch (mode) {
    case 'ocean_fcl': return 'Ocean FCL';
    case 'ocean_lcl': return 'Ocean LCL';
    case 'air_standard': return 'Air Freight';
    case 'road': return 'Road Freight';
    default: return mode;
  }
}
