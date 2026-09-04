import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Cpu,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  FileCode,
  BookOpen,
  Layers,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
} from 'lucide-react';
import { SchematicDocument } from '../../types';
import { autoRouteSchematicNets } from '../../utils/autorouter';

interface AiCircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCircuit: (circuit: SchematicDocument, mode: 'replace' | 'append') => void;
  currentCircuit?: SchematicDocument;
}

const PRESET_PROMPTS = [
  {
    title: '555 Astable LED Flasher',
    badge: 'Oscillator',
    prompt: 'Create a 555 timer astable multivibrator circuit that flashes an LED at approximately 1Hz with a 9V power supply, timing resistors R1 and R2, capacitor C1, and an output limiting resistor.',
  },
  {
    title: '5V Regulated Power Supply',
    badge: 'Power',
    prompt: 'Design a 5V DC linear voltage regulator circuit using the LM7805 with input filter electrolytic capacitor (470uF), high frequency bypass caps (100nF), power indicator LED, and 2-pin DC screw terminals.',
  },
  {
    title: 'LM358 Audio Preamplifier',
    badge: 'Analog',
    prompt: 'Design a non-inverting operational amplifier audio preamplifier using LM358 with a gain of 10, AC coupling input capacitor, feedback resistors, and single 9V battery supply.',
  },
  {
    title: 'Transistor Relay Driver',
    badge: 'Switching',
    prompt: 'Design an NPN 2N2222 transistor switch driver for a 5V DC relay, including base current-limiting resistor, flyback protection diode 1N4007 across the coil, and indicator LED.',
  },
  {
    title: 'ESP32 IoT Sensor Node',
    badge: 'Microcontroller',
    prompt: 'Design a minimal ESP32 microcontroller board circuit with 3.3V LDO regulator, power filter capacitors, tactile reset button, status LED on GPIO2, and a 4-pin I2C sensor header.',
  },
  {
    title: 'Light-Activated Relay Switch',
    badge: 'Sensor',
    prompt: 'Design an automatic night light circuit with a photoresistor (LDR), potentiometer threshold adjustment, LM358 voltage comparator, and a transistor driving a 5V buzzer/relay.',
  },
];

// Sample SVG Rough Sketch Data URLs for 1-click test of diagram conversion
const SAMPLE_SKETCHES = [
  {
    name: '555 Timer Whiteboard Sketch',
    desc: 'Rough pencil sketch of 555 timer with pins 2, 6, 7 tied to RC timing loop',
    prompt: 'Transcribe this 555 timer rough sketch into a clean production schematic with properly named components and standard values for 1Hz oscillation.',
    svgData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" style="background:%23fef3c7"><rect x="100" y="50" width="100" height="90" fill="none" stroke="%23334155" stroke-width="2" stroke-dasharray="3,2"/><text x="125" y="100" font-family="cursive" font-size="16" fill="%231e293b">NE555</text><line x1="60" y1="70" x2="100" y2="70" stroke="%23334155" stroke-width="2"/><text x="35" y="75" font-family="cursive" font-size="12">VCC</text><line x1="200" y1="95" x2="250" y2="95" stroke="%23334155" stroke-width="2"/><text x="255" y="100" font-family="cursive" font-size="12">OUT</text><line x1="150" y1="140" x2="150" y2="180" stroke="%23334155" stroke-width="2"/><text x="140" y="195" font-family="cursive" font-size="12">GND</text></svg>`,
  },
  {
    name: 'Op-Amp Audio Filter Draft',
    desc: 'Hand-drawn notebook diagram of LM358 inverting amplifier',
    prompt: 'Convert this hand-drawn schematic diagram of an inverting op-amp audio stage into a formal schematic with decoupling caps and standard 10k resistors.',
    svgData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" style="background:%23fef3c7"><polygon points="110,50 110,150 190,100" fill="none" stroke="%23334155" stroke-width="2"/><text x="125" y="80" font-family="sans-serif" font-size="14">-</text><text x="125" y="130" font-family="sans-serif" font-size="14">+</text><text x="140" y="105" font-family="cursive" font-size="14">LM358</text><line x1="60" y1="75" x2="110" y2="75" stroke="%23334155" stroke-width="2"/><line x1="190" y1="100" x2="250" y2="100" stroke="%23334155" stroke-width="2"/></svg>`,
  },
];

export const AiCircuitModal: React.FC<AiCircuitModalProps> = ({
  isOpen,
  onClose,
  onApplyCircuit,
}) => {
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedCircuit, setGeneratedCircuit] = useState<SchematicDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file selection or drag and drop
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImage(e.target.result as string);
        if (!prompt) {
          setPrompt(
            `Analyze this circuit diagram or rough sketch (${file.name}), transcribe all components with proper engineering designators, values, and footprints, and route all connections into a workable schematic ready for simulation.`
          );
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (targetPrompt?: string, targetImage?: string) => {
    const textToUse = targetPrompt || prompt;
    const imageToUse = targetImage !== undefined ? targetImage : uploadedImage;

    if (!textToUse.trim() && !imageToUse) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedCircuit(null);
    setGenerationStep(1);

    const stepTimer1 = setTimeout(() => setGenerationStep(2), 1200);
    const stepTimer2 = setTimeout(() => setGenerationStep(3), 2600);

    try {
      const response = await fetch('/api/circuit/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToUse,
          image: imageToUse || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (!data.circuit) {
        throw new Error('No circuit data received from generator');
      }

      const raw = data.circuit;

      // Transform raw components into SchematicDocument format
      const doc: SchematicDocument = {
        id: `ai-circuit-${Date.now()}`,
        title: raw.title || 'AI Generated Circuit',
        category: raw.category || 'AI Generated',
        summary: raw.summary || '',
        explanation: raw.explanation || '',
        formula: raw.formula || '',
        specifications: raw.specifications || [],
        tips: raw.tips || [],
        components: (raw.components || []).map((c: any, index: number) => ({
          id: c.id || `comp_${index + 1}`,
          type: c.type || 'resistor',
          designator: c.designator || `C${index + 1}`,
          value: c.value || '10k',
          footprint: c.footprint || 'R0805',
          x: typeof c.x === 'number' ? c.x : 150 + (index % 5) * 120,
          y: typeof c.y === 'number' ? c.y : 150 + Math.floor(index / 5) * 120,
          rotation: (c.rotation as any) || 0,
          pins: (c.pins || []).map((p: any) => ({
            id: String(p.id),
            name: p.name || String(p.id),
            net: p.net || undefined,
          })),
        })),
        wires: [],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Perform complete autorouting on nets
      const routeResult = autoRouteSchematicNets(doc.components, []);
      doc.wires = routeResult.newWires;

      setGeneratedCircuit(doc);
    } catch (err: any) {
      console.error('Generation failure:', err);
      let cleanMsg = err.message || 'Failed to synthesize circuit schematic';
      try {
        if (cleanMsg.includes('{') && cleanMsg.includes('}')) {
          const start = cleanMsg.indexOf('{');
          const end = cleanMsg.lastIndexOf('}');
          const parsed = JSON.parse(cleanMsg.slice(start, end + 1));
          if (parsed?.error?.message) {
            cleanMsg = parsed.error.message;
          }
        }
      } catch {
        // use cleanMsg as-is
      }

      if (cleanMsg.includes('503') || cleanMsg.includes('high demand') || cleanMsg.includes('UNAVAILABLE')) {
        setError(
          'Gemini is currently experiencing temporary high demand (503). You can retry immediately, or load one of our verified starter circuits below.'
        );
      } else {
        setError(cleanMsg);
      }
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                AI Schematic Synthesizer &amp; Diagram Reader
                <span className="text-xs px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-800 rounded-full font-mono">
                  Multimodal Gemini
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Load documents, whiteboard photos, rough sketches, or prompt requirements to synthesize a workable schematic
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload Zone for Documents / Diagrams / Rough Sketches */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                Load Diagram, Document, or Rough Sketch (Optional):
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                PNG, JPG, WebP, SVG
              </span>
            </label>

            {!uploadedImage ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 bg-slate-950/60 hover:bg-slate-900/80 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="p-2.5 rounded-full bg-slate-800 text-sky-400 group-hover:bg-sky-950 group-hover:scale-105 transition-all">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="text-xs text-slate-200 font-medium">
                  Click or drag and drop your circuit sketch, diagram, or schematic document photo here
                </div>
                <div className="text-[11px] text-slate-500">
                  The AI visual model will read the components, nets, and pins from the image
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-sky-500/40 rounded-xl">
                <div className="flex items-center gap-3">
                  <img
                    src={uploadedImage}
                    alt="Loaded Diagram"
                    className="w-16 h-12 object-cover rounded border border-slate-700"
                  />
                  <div>
                    <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{imageFileName || 'Loaded Circuit Diagram'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Image attached and ready for multimodal circuit synthesis
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setImageFileName(null);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Rough Diagram Samples */}
          {!uploadedImage && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Or test with a sample rough drawing:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_SKETCHES.map((sk, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setUploadedImage(sk.svgData);
                      setImageFileName(sk.name);
                      setPrompt(sk.prompt);
                    }}
                    className="flex items-center gap-3 p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-lg text-left transition-colors group"
                  >
                    <img
                      src={sk.svgData}
                      alt={sk.name}
                      className="w-12 h-9 object-contain rounded bg-amber-100 border border-slate-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300">
                        {sk.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {sk.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Describe your electronic circuit or additional instructions:
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Read the uploaded diagram and create a 555 timer flasher, or describe your system from scratch..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-colors"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
                className="absolute right-3 bottom-3 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium rounded-md shadow flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {uploadedImage ? 'Synthesize from Image' : 'Generate Schematic'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Preset Library */}
          {!generatedCircuit && !isGenerating && !uploadedImage && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span>Or select a popular circuit template:</span>
                <span className="text-[11px] text-slate-500 font-mono">1-Click Load</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {PRESET_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(p.prompt);
                      handleGenerate(p.prompt);
                    }}
                    className="flex flex-col text-left p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 rounded-lg transition-all group"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                        {p.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-700/50 font-mono">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {p.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generating Progress State */}
          {isGenerating && (
            <div className="p-8 rounded-xl border border-sky-500/30 bg-sky-950/20 text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
                  <Cpu className="w-6 h-6 text-sky-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-sky-200">
                  AI EDA Engine Analyzing &amp; Generating Schematic
                </h3>
                <p className="text-xs text-sky-300/80 mt-1 font-mono">
                  {generationStep === 1 && 'Reading visual shapes, components, and reference designators...'}
                  {generationStep === 2 && 'Calculating pinout nets, values, and autorouting Manhattan paths...'}
                  {generationStep === 3 && 'Synthesizing verified BOM and preparing simulation models...'}
                </p>
              </div>
              <div className="w-48 mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-400 h-full transition-all duration-700"
                  style={{ width: `${generationStep * 33}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-100">Generation Notice</div>
                  <div className="mt-0.5 text-amber-200/90">{error}</div>
                  <div className="mt-1.5 text-slate-400">
                    Tip: You can retry now, or pick any template below for instant 1-click generation.
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
                className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded flex items-center gap-1.5 transition-colors text-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedCircuit && (
            <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-medium">
                      {generatedCircuit.category || 'Circuit'}
                    </span>
                    <h3 className="text-base font-bold text-slate-100">
                      {generatedCircuit.title}
                    </h3>
                  </div>
                  {generatedCircuit.summary && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {generatedCircuit.summary}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-slate-400 font-mono">
                  <div>{generatedCircuit.components.length} Components</div>
                  <div>{generatedCircuit.wires.length} Autorouted Wires</div>
                </div>
              </div>

              {/* Engineering Analysis & Formula */}
              {generatedCircuit.explanation && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    How this Circuit Operates:
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded border border-slate-800 font-sans">
                    {generatedCircuit.explanation}
                  </p>
                </div>
              )}

              {generatedCircuit.formula && (
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 text-xs">
                  <span className="font-semibold text-amber-300 font-mono">Key Formula: </span>
                  <span className="text-slate-200 font-mono">{generatedCircuit.formula}</span>
                </div>
              )}

              {/* Component Summary Chips */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  Synthesized Bill of Materials:
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-900/40 rounded border border-slate-800/50">
                  {generatedCircuit.components.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[11px] font-mono border border-slate-700"
                    >
                      <strong className="text-sky-400">{c.designator}</strong>
                      <span className="text-slate-400">({c.value})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {generatedCircuit ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onApplyCircuit(generatedCircuit, 'append')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Append to Current Sheet
              </button>
              <button
                onClick={() => onApplyCircuit(generatedCircuit, 'replace')}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-sky-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Open &amp; Simulate in Schematic Editor
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
              <span>Ready for circuit prompt or image upload</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

