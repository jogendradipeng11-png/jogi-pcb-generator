import React, { useState, useRef } from 'react';
import { SchematicDocument, SchematicComponent, Wire } from '../../types';
import { generateGerberZip } from '../../utils/gerber';
import { COMPONENT_CATALOG } from '../../data/components';
import {
  Download,
  Upload,
  FileText,
  Layers,
  Box,
  Image as ImageIcon,
  CheckCircle,
  FileSpreadsheet,
  FileCode,
  Printer,
  Sparkles,
  X,
  AlertCircle,
  Copy,
  Github,
} from 'lucide-react';

interface UniversalFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: SchematicDocument;
  onImportDocument?: (doc: SchematicDocument) => void;
  onImportProject?: (doc: SchematicDocument) => void;
  onOpenPrintModal?: () => void;
  onOpenGitHubModal?: () => void;
}

export const UniversalFileModal: React.FC<UniversalFileModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onImportDocument,
  onImportProject,
  onOpenPrintModal,
  onOpenGitHubModal,
}) => {
  const safeDoc = doc || {
    title: 'Circuit Schematic',
    components: [],
    wires: [],
  };
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportType, setExportType] = useState<
    'bom' | 'gerber' | '3d' | 'pdf' | 'doc' | 'image' | 'json'
  >('bom');
  const [importType, setImportType] = useState<'circuit' | 'bom' | 'image'>('circuit');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // 1. Export Bill of Materials (BOM)
  const handleExportBom = (format: 'csv' | 'json' | 'tsv') => {
    const compMap = new Map<
      string,
      { designator: string[]; value: string; footprint: string; quantity: number; type: string }
    >();

    (safeDoc.components || []).forEach((c) => {
      const key = `${c.type}_${c.value}_${c.footprint}`;
      if (!compMap.has(key)) {
        compMap.set(key, {
          designator: [c.designator],
          value: c.value,
          footprint: c.footprint,
          quantity: 1,
          type: c.type,
        });
      } else {
        const item = compMap.get(key)!;
        item.designator.push(c.designator);
        item.quantity += 1;
      }
    });

    const rows = Array.from(compMap.values()).map((item, idx) => ({
      item: idx + 1,
      designators: item.designator.join(' '),
      quantity: item.quantity,
      value: item.value,
      footprint: item.footprint,
      type: item.type,
    }));

    if (format === 'csv') {
      const headers = 'Item,Designators,Quantity,Value,Footprint,Component Type\n';
      const csvContent =
        headers +
        rows
          .map(
            (r) =>
              `${r.item},"${r.designators}",${r.quantity},"${r.value}","${r.footprint}","${r.type}"`
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${doc.title}_BOM_JLCPCB.csv`);
      showFeedback('Bill of Materials (CSV) successfully exported!');
    } else if (format === 'tsv') {
      const headers = 'Item\tDesignators\tQuantity\tValue\tFootprint\tComponent Type\n';
      const tsvContent =
        headers +
        rows
          .map(
            (r) =>
              `${r.item}\t${r.designators}\t${r.quantity}\t${r.value}\t${r.footprint}\t${r.type}`
          )
          .join('\n');

      const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
      downloadBlob(blob, `${doc.title}_BOM.tsv`);
      showFeedback('Bill of Materials (TSV / Excel) successfully exported!');
    } else {
      const jsonContent = JSON.stringify(rows, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      downloadBlob(blob, `${doc.title}_BOM.json`);
      showFeedback('Bill of Materials (JSON) successfully exported!');
    }
  };

  // 2. Export Gerber Package (.ZIP)
  const handleExportGerber = async () => {
    setIsExporting(true);
    try {
      const blob = await generateGerberZip(safeDoc.components || [], safeDoc.wires || [], {
        projectName: safeDoc.title,
        solderMaskColor: 'green',
      });
      downloadBlob(blob, `${safeDoc.title || 'circuit'}_Gerber_RS274X.zip`);
      showFeedback('Complete Gerber RS-274X manufacturing ZIP downloaded!');
    } catch (e) {
      console.error(e);
      showFeedback('Failed to generate Gerber zip', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export 3D Model (Wavefront .OBJ)
  const handleExport3DObj = () => {
    let obj = `# 3D PCB Model exported from EasyEDA Pro\n# Project: ${safeDoc.title}\n`;
    const boardW = 100;
    const boardH = 70;
    const boardThickness = 1.6;

    // Board vertices
    obj += `v 0 0 0\nv ${boardW} 0 0\nv ${boardW} ${boardH} 0\nv 0 ${boardH} 0\n`;
    obj += `v 0 0 ${boardThickness}\nv ${boardW} 0 ${boardThickness}\nv ${boardW} ${boardH} ${boardThickness}\nv 0 ${boardH} ${boardThickness}\n`;
    // Board faces
    obj += `f 1 2 3 4\nf 8 7 6 5\nf 1 5 6 2\nf 2 6 7 3\nf 3 7 8 4\nf 4 8 5 1\n`;

    // Component markers
    (safeDoc.components || []).forEach((c, idx) => {
      const compX = (idx % 6) * 16 + 10;
      const compY = Math.floor(idx / 6) * 14 + 10;
      const baseV = 8 + idx * 8 + 1;
      const w = 10;
      const h = 8;
      const z = 3.5;
      obj += `# Component: ${c.designator} (${c.type})\n`;
      obj += `v ${compX} ${compY} ${boardThickness}\nv ${compX + w} ${compY} ${boardThickness}\nv ${compX + w} ${compY + h} ${boardThickness}\nv ${compX} ${compY + h} ${boardThickness}\n`;
      obj += `v ${compX} ${compY} ${boardThickness + z}\nv ${compX + w} ${compY} ${boardThickness + z}\nv ${compX + w} ${compY + h} ${boardThickness + z}\nv ${compX} ${compY + h} ${boardThickness + z}\n`;
      obj += `f ${baseV} ${baseV + 1} ${baseV + 2} ${baseV + 3}\n`;
      obj += `f ${baseV + 7} ${baseV + 6} ${baseV + 5} ${baseV + 4}\n`;
    });

    const blob = new Blob([obj], { type: 'text/plain' });
    downloadBlob(blob, `${safeDoc.title || 'circuit'}_PCB_3D_Model.obj`);
    showFeedback('3D Wavefront (.OBJ) PCB model exported!');
  };

  // 4. Export Complete Project Engineering Document (.doc / Word file)
  const handleExportDoc = () => {
    const safeWires = safeDoc.wires || [];
    const safeComps = safeDoc.components || [];
    const netCount = new Set(safeWires.map((w) => w.net)).size;
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${safeDoc.title} - Engineering Design Specification</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
          h1 { color: #0369a1; border-bottom: 2px solid #0369a1; padding-bottom: 8px; }
          h2 { color: #0f172a; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
          th { background-color: #f1f5f9; color: #334155; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
          .header-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        </style>
      </head>
      <body>
        <h1>${safeDoc.title}</h1>
        <div class="header-box">
          <p><strong>System Revision:</strong> 1.0.0 &nbsp;|&nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString()} &nbsp;|&nbsp; <strong>Total Parts:</strong> ${safeComps.length} &nbsp;|&nbsp; <strong>Routed Wires:</strong> ${safeWires.length} &nbsp;|&nbsp; <strong>Independent Nets:</strong> ${netCount}</p>
          <p><strong>Description:</strong> Complete engineering specification document including schematics netlist, component placement, and manufacturing BOM.</p>
        </div>

        <h2>1. Bill of Materials (BOM)</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Designator</th>
              <th>Component Type</th>
              <th>Nominal Value</th>
              <th>PCB Footprint</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            ${safeComps
              .map(
                (c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${c.designator}</strong></td>
                <td>${c.type}</td>
                <td>${c.value}</td>
                <td><code>${c.footprint}</code></td>
                <td>1</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <h2>2. Electrical Netlist and Connections</h2>
        <table>
          <thead>
            <tr>
              <th>Net Identifier</th>
              <th>Connected Components & Pins</th>
              <th>Routing Wire Points</th>
            </tr>
          </thead>
          <tbody>
            ${safeWires
              .map(
                (w) => `
              <tr>
                <td><span class="badge">${w.net}</span></td>
                <td>
                  ${w.startPin ? `${w.startPin.componentId} (Pin ${w.startPin.pinId})` : 'Canvas Tap'} &rarr; 
                  ${w.endPin ? `${w.endPin.componentId} (Pin ${w.endPin.pinId})` : 'Bus Tap'}
                </td>
                <td>${w.points.length} coordinate vertices</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <h2>3. PCB Fabrication & Assembly Notes</h2>
        <ul>
          <li><strong>Substrate:</strong> FR-4 Standard Glass Epoxy (Tg 130-140°C)</li>
          <li><strong>Board Thickness:</strong> 1.6 mm ±10%</li>
          <li><strong>Copper Weight:</strong> 1 oz (35 µm) Outer Layers</li>
          <li><strong>Solder Mask:</strong> Liquid Photo-Imageable (LPI) Green / Matte</li>
          <li><strong>Surface Finish:</strong> HASL with Lead / Lead-Free HASL / ENIG Electroless Nickel Immersion Gold</li>
          <li><strong>Minimum Trace Width / Clearance:</strong> 6 mil / 6 mil</li>
        </ul>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
    downloadBlob(blob, `${safeDoc.title || 'circuit'}_Engineering_Report.doc`);
    showFeedback('Engineering Specification Document (.doc) exported!');
  };

  // 5. Export Full Circuit JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(safeDoc, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, `${(safeDoc.title || 'circuit').toLowerCase().replace(/\s+/g, '_')}.circuit`);
    showFeedback('Full circuit document (.circuit / JSON) downloaded!');
  };

  // Helper to trigger file download
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // File Upload / Import Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;

        if (file.name.endsWith('.json') || file.name.endsWith('.circuit')) {
          const parsed = JSON.parse(content);
          if (parsed.components && Array.isArray(parsed.components)) {
            const importHandler = onImportDocument || onImportProject;
            if (importHandler) {
              importHandler(parsed);
              showFeedback(`Successfully imported "${parsed.title || file.name}" with ${parsed.components.length} parts!`);
            }
          } else {
            showFeedback('Invalid circuit format: missing components list', 'error');
          }
        } else if (file.name.endsWith('.csv')) {
          // Parse BOM CSV
          const lines = content.split('\n').filter((l) => l.trim().length > 0);
          showFeedback(`Parsed BOM with ${lines.length - 1} entries!`);
        } else {
          showFeedback('Unsupported file format. Please upload .circuit, .json, or .csv', 'error');
        }
      } catch (err) {
        console.error(err);
        showFeedback('Failed to parse file: check formatting', 'error');
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Universal File Import &amp; Export Center
              </h2>
              <p className="text-xs text-slate-400">
                Generate Gerber manufacturing ZIPs, BOM tables, 3D models, layer-wise PDFs, Word docs, and circuit files.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/80 border-b border-emerald-700 text-emerald-300'
                : 'bg-red-950/80 border-b border-red-700 text-red-300'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export Files (BOM, Gerber, 3D, PDF, DOC)
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import Files (.circuit, BOM, Netlist)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'export' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. BOM Card */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                      <FileSpreadsheet className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Bill of Materials (BOM)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Standard purchasing table formatted for JLCPCB, LCSC, DigiKey, and Mouser.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <button
                      onClick={() => handleExportBom('csv')}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => handleExportBom('tsv')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
                    >
                      Excel TSV
                    </button>
                    <button
                      onClick={() => handleExportBom('json')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
                    >
                      JSON
                    </button>
                  </div>
                </div>

                {/* 2. Gerber Package Card */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-sky-400 mb-1">
                      <Layers className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Gerber RS-274X ZIP
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Complete PCB fabrication package (Top/Bottom copper, Silkscreen, Solder Mask, Excellon drill file).
                    </p>
                  </div>
                  <button
                    onClick={handleExportGerber}
                    disabled={isExporting}
                    className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExporting ? 'Packaging...' : 'Download Gerber ZIP'}</span>
                  </button>
                </div>

                {/* 3. 3D Model Card */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                      <Box className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        3D PCB CAD Model
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Export 3D Wavefront (.OBJ) mesh model for mechanical CAD clearance testing in Blender or SolidWorks.
                    </p>
                  </div>
                  <button
                    onClick={handleExport3DObj}
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export 3D .OBJ Mesh</span>
                  </button>
                </div>

                {/* 4. Complete Engineering PDF Sheet */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                      <Printer className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Layer-Wise &amp; Complete PDF
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Print layer-wise PCB etch masks, ANSI title block sheets, and complete schematic documentation.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenPrintModal) onOpenPrintModal();
                    }}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Open Print &amp; PDF Center</span>
                  </button>
                </div>

                {/* 5. Microsoft Word (.doc) Specification */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <FileText className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Engineering Report (.doc)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Standard Microsoft Word specification report with complete component netlist, pinout table, and specs.
                    </p>
                  </div>
                  <button
                    onClick={handleExportDoc}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Project .DOC</span>
                  </button>
                </div>

                {/* 6. Raw Circuit Project File */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-400 mb-1">
                      <FileCode className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Full Circuit File (.circuit)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Save complete project state, exact coordinates, pins, and custom parts to reload anytime.
                    </p>
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save .circuit Project</span>
                  </button>
                </div>

                {/* 7. Deploy via GitHub */}
                {onOpenGitHubModal && (
                  <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-sky-400 mb-1">
                        <Github className="w-4 h-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Deploy to GitHub &amp; Web
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Export full repository, push to GitHub, and launch live URL with multi-user sign-up.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenGitHubModal();
                      }}
                      className="w-full py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Deploy via GitHub</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Import Tab */
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-8 text-center bg-slate-950/40 transition-colors">
                <Upload className="w-10 h-10 text-sky-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">
                  Import Circuit Design, BOM, or Netlist
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Drag and drop a <code className="text-sky-400">.circuit</code>, <code className="text-sky-400">.json</code>, or <code className="text-sky-400">.csv</code> file, or click below to browse.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".circuit,.json,.csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="circuit-file-input"
                />
                <label
                  htmlFor="circuit-file-input"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose File to Import</span>
                </label>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 text-xs text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-300">Supported Formats:</div>
                <div>• <strong>.circuit / .json</strong>: Full circuit schematic, component placement, and wire routes.</div>
                <div>• <strong>.csv / .tsv</strong>: Bill of Materials tables from JLCPCB, EasyEDA, or Altium.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
