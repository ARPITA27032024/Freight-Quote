/* ==========================================================================
   PDF Quote Document Exporter
   ========================================================================== */

function exportQuoteToPDF(quoteData) {
  const container = document.getElementById('pdfExportContainer');
  if (!container) return;

  // Populate PDF fields
  document.getElementById('pdfQuoteId').innerText = quoteData.quoteId;
  document.getElementById('pdfDate').innerText = `Issue Date: ${quoteData.issueDate}`;
  document.getElementById('pdfExpiry').innerText = `Valid Until: ${quoteData.expiryDate}`;
  document.getElementById('pdfOrigin').innerText = `${quoteData.origin.name} (${quoteData.origin.country})`;
  document.getElementById('pdfDest').innerText = `${quoteData.destination.name} (${quoteData.destination.country})`;
  document.getElementById('pdfModeBadge').innerText = quoteData.mode.toUpperCase().replace('_', ' ');
  document.getElementById('pdfTransit').innerText = `Est. ${quoteData.transitDaysStr}`;
  
  let cargoText = "";
  if (quoteData.mode === 'ocean_fcl') {
    cargoText = `${quoteData.containerQty}x ${quoteData.containerType.toUpperCase()} Container(s)`;
  } else {
    cargoText = `${quoteData.weightKg} KG / ${quoteData.volumeCbm} CBM`;
  }
  document.getElementById('pdfCargoDetails').innerText = cargoText;
  document.getElementById('pdfDeclaredValue').innerText = `$${quoteData.declaredValue.toLocaleString()} USD`;

  // Populate line items table
  const tbody = document.getElementById('pdfTableBody');
  tbody.innerHTML = quoteData.lineItems.map(item => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:8px 12px; color:#334155;">${item.name}</td>
      <td style="padding:8px 12px; text-align:right; font-weight:600; color:#10233f;">${item.formatted}</td>
    </tr>
  `).join('');

  document.getElementById('pdfTotalVal').innerText = quoteData.finalTotalFormatted;

  // Temporarily show container for pdf generation
  container.classList.remove('hidden');

  const opt = {
    margin:       0.5,
    filename:     `Freight_Quote_${quoteData.quoteId}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save().then(() => {
    container.classList.add('hidden');
  }).catch(err => {
    console.error("PDF export error:", err);
    container.classList.add('hidden');
    // Fallback: window.print()
    window.print();
  });
}
