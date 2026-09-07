// High-Precision Circuit Engineering PDF & Documentation Exporter
// Generates standard ANSI-bordered engineering schematic sheets with BOM and Netlist for direct PDF print/save.

import { SchematicDocument, SchematicComponent, Wire } from '../types';

export function generateCircuitPdfHtml(doc: SchematicDocument): string {
  const components = doc.components || [];
  const wires = doc.wires || [];
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Compute SVG bounding coordinates
  let minX = 100;
  let maxX = 800;
  let minY = 80;
  let maxY = 550;

  components.forEach((c) => {
    if (c.x < minX) minX = c.x - 60;
    if (c.x > maxX) maxX = c.x + 120;
    if (c.y < minY) minY = c.y - 40;
    if (c.y > maxY) maxY = c.y + 100;
  });

  const width = Math.max(900, maxX - minX + 120);
  const height = Math.max(550, maxY - minY + 100);

  // BOM Summary
  const bomMap = new Map<string, { designator: string[]; value: string; footprint: string; type: string; count: number }>();
  components.forEach((c) => {
    const key = `${c.type}_${c.value}_${c.footprint}`;
    if (!bomMap.has(key)) {
      bomMap.set(key, {
        designator: [c.designator],
        value: c.value,
        footprint: c.footprint || 'MODULE',
        type: c.type,
        count: 1,
      });
    } else {
      const existing = bomMap.get(key)!;
      existing.designator.push(c.designator);
      existing.count += 1;
    }
  });

  // Net connections summary
  const netMap = new Map<string, string[]>();
  components.forEach((c) => {
    (c.pins || []).forEach((p) => {
      if (p.net) {
        if (!netMap.has(p.net)) netMap.set(p.net, []);
        netMap.get(p.net)!.push(`${c.designator}.${p.name || p.id}`);
      }
    });
  });

  // Build SVG Component Nodes
  const svgComponents = components.map((c) => {
    const boxW = 80;
    const boxH = Math.max(50, (c.pins?.length || 2) * 16);
    const pinList = (c.pins || []).map((p, idx) => {
      const pinY = c.y - boxH / 2 + 15 + idx * 14;
      const isLeft = idx % 2 === 0;
      const pinX = isLeft ? c.x - boxW / 2 : c.x + boxW / 2;
      return `
        <circle cx="${pinX}" cy="${pinY}" r="3" fill="#0284c7" stroke="#0369a1" stroke-width="1"/>
        <text x="${isLeft ? pinX + 6 : pinX - 6}" y="${pinY + 3.5}" text-anchor="${isLeft ? 'start' : 'end'}" font-size="9" fill="#334155" font-family="monospace">${p.name || p.id}</text>
      `;
    }).join('');

    return `
      <g id="comp_${c.id}">
        <rect x="${c.x - boxW / 2}" y="${c.y - boxH / 2}" width="${boxW}" height="${boxH}" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.8"/>
        <text x="${c.x}" y="${c.y - boxH / 2 - 6}" text-anchor="middle" font-size="11" font-weight="bold" fill="#0369a1" font-family="sans-serif">${c.designator}</text>
        <text x="${c.x}" y="${c.y + boxH / 2 + 12}" text-anchor="middle" font-size="9.5" fill="#475569" font-family="sans-serif">${c.value}</text>
        ${pinList}
      </g>
    `;
  }).join('');

  // Build SVG Wires
  const svgWires = wires.map((w) => {
    if (!w.points || w.points.length < 2) return '';
    const d = w.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const color = w.net === 'GND' ? '#1e293b' : (w.net && w.net.includes('VCC') ? '#dc2626' : '#2563eb');
    return `
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${w.points[0].x}" cy="${w.points[0].y}" r="3" fill="${color}"/>
      <circle cx="${w.points[w.points.length - 1].x}" cy="${w.points[w.points.length - 1].y}" r="3" fill="${color}"/>
    `;
  }).join('');

  // BOM Table Rows
  const bomRows = Array.from(bomMap.values()).map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #f8fafc;' : ''}">
      <td style="padding: 6px 10px; font-weight: bold; color: #0369a1;">${item.designator.join(', ')}</td>
      <td style="padding: 6px 10px; font-weight: 600;">${item.value}</td>
      <td style="padding: 6px 10px; color: #475569;">${item.type}</td>
      <td style="padding: 6px 10px; font-family: monospace; font-size: 10px; color: #64748b;">${item.footprint}</td>
      <td style="padding: 6px 10px; text-align: center; font-weight: bold;">${item.count}</td>
    </tr>
  `).join('');

  // Netlist Rows
  const netRows = Array.from(netMap.entries()).map(([netName, nodes], idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #f8fafc;' : ''}">
      <td style="padding: 5px 10px; font-weight: bold; font-family: monospace; color: #0f766e;">${netName}</td>
      <td style="padding: 5px 10px; font-size: 11px; color: #334155;">${nodes.join('  •  ')}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${doc.title || 'Schematic'} - CircuitForge EDA PDF Engineering Sheet</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 10px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet-container {
      border: 2px solid #0f172a;
      padding: 12px;
      box-sizing: border-box;
      min-height: 96vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .title-area h1 {
      margin: 0;
      font-size: 18px;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-area p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #64748b;
    }
    .meta-tags {
      text-align: right;
      font-size: 10px;
      color: #334155;
      font-family: monospace;
    }
    .schematic-box {
      border: 1px solid #cbd5e1;
      background: #fdfdfd;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 6px;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      padding: 6px 10px;
      text-align: left;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-sections {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }
    .section-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
    }
    .section-card h3 {
      margin: 0 0 4px;
      font-size: 11px;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .ansi-title-block {
      display: grid;
      grid-template-columns: 3fr 1fr 1fr 1fr;
      border-top: 2px solid #0f172a;
      margin-top: 12px;
      font-size: 10px;
      font-family: monospace;
    }
    .ansi-cell {
      border: 1px solid #94a3b8;
      padding: 4px 8px;
    }
    .ansi-label {
      font-size: 8.5px;
      color: #64748b;
      text-transform: uppercase;
      display: block;
    }
    .ansi-val {
      font-weight: bold;
      color: #0f172a;
    }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #f1f5f9; padding: 10px 16px; margin-bottom: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <strong style="color: #0369a1; font-size: 14px;">⚡ CircuitForge PDF Engineering Print Sheet</strong>
      <span style="font-size: 12px; color: #475569; margin-left: 10px;">Select "Save as PDF" destination in the print dialog.</span>
    </div>
    <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 7px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">
      🖨️ Print / Save to PDF
    </button>
  </div>

  <div class="sheet-container">
    <div>
      <div class="header-bar">
        <div class="title-area">
          <h1>${doc.title || 'Schematic Diagram'}</h1>
          <p>${doc.summary || 'Engineered circuit diagram, automated net routing & manufacturing BOM'}</p>
        </div>
        <div class="meta-tags">
          <div>DOCUMENT ID: CF-${(doc.id || 'DOC').toUpperCase().slice(0, 16)}</div>
          <div>STANDARD: IEEE 315 / ANSI Y32.2</div>
          <div>DATE: ${dateStr}</div>
        </div>
      </div>

      <!-- Vector Schematic SVG -->
      <div class="schematic-box">
        <svg viewBox="${minX} ${minY} ${width} ${height}" style="width: 100%; height: auto; max-height: 480px; display: block;">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="#e2e8f0" />
            </pattern>
          </defs>
          <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#grid)" />
          ${svgWires}
          ${svgComponents}
        </svg>
      </div>

      <!-- Technical Specifications & Design Rules -->
      ${doc.specifications && doc.specifications.length > 0 ? `
        <div style="margin-bottom: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; font-size: 10.5px;">
          <strong style="color: #0369a1;">DESIGN SPECIFICATIONS & OPERATING RULES:</strong>
          <ul style="margin: 4px 0 0; padding-left: 18px; color: #334155;">
            ${doc.specifications.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Bottom Grids: BOM & Netlist -->
      <div class="grid-sections">
        <div class="section-card">
          <h3>Bill of Materials (BOM) — Total: ${components.length} Components</h3>
          <table>
            <thead>
              <tr>
                <th>Designator</th>
                <th>Part Value</th>
                <th>Type</th>
                <th>Footprint</th>
                <th style="text-align: center;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${bomRows || '<tr><td colspan="5" style="text-align:center; padding: 8px;">No components</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section-card">
          <h3>Netlist Interconnections — Total: ${netMap.size} Nets</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 35%;">Net Name</th>
                <th>Connected Component Pins</th>
              </tr>
            </thead>
            <tbody>
              ${netRows || '<tr><td colspan="2" style="text-align:center; padding: 8px;">No routed nets</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ANSI Engineering Title Block -->
    <div class="ansi-title-block">
      <div class="ansi-cell">
        <span class="ansi-label">PROJECT TITLE</span>
        <span class="ansi-val">${doc.title || 'CircuitForge Project'}</span>
      </div>
      <div class="ansi-cell">
        <span class="ansi-label">CATEGORY</span>
        <span class="ansi-val">${doc.category || 'General Electronics'}</span>
      </div>
      <div class="ansi-cell">
        <span class="ansi-label">REVISION</span>
        <span class="ansi-val">REV 1.0</span>
      </div>
      <div class="ansi-cell">
        <span class="ansi-label">SHEET</span>
        <span class="ansi-val">1 OF 1</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Directly triggers standard browser print dialog to export high-res vector PDF.
 */
export function exportCircuitToPdf(doc: SchematicDocument): void {
  const html = generateCircuitPdfHtml(doc);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for DOM to finish rendering
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
  } else {
    // Fallback: create an invisible iframe to print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const frameDoc = iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
  }
}
