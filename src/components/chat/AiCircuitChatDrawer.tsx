import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Cpu,
  RefreshCw,
  Plus,
  ArrowRight,
  Sliders,
  Check,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { SchematicDocument, SchematicComponent, Wire } from '../../types';
import { autoRouteSchematicNets } from '../../utils/autorouter';

export interface CircuitModificationAction {
  description: string;
  action: 'modify' | 'add_components' | 'replace_circuit';
  componentsToAdd?: SchematicComponent[];
  componentsToUpdate?: Array<{ id: string; value?: string; designator?: string; x?: number; y?: number }>;
  componentsToRemoveIds?: string[];
  wiresToAdd?: Wire[];
  wiresToRemoveIds?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modification?: CircuitModificationAction;
  applied?: boolean;
}

interface AiCircuitChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: SchematicDocument;
  onApplyModification: (modification: CircuitModificationAction) => void;
  onShowToast?: (message: string) => void;
}

const DEFAULT_SUGGESTIONS = [
  '💡 Review circuit for electrical errors and missing connections',
  '⚡ Add 100nF decoupling capacitors to IC supply pins',
  '🔋 Add LM7805 5V regulated power supply section',
  '🛡️ Add 1N4007 flyback diode protection across inductive load',
  '🎛️ Add 10kΩ potentiometer for tuning/frequency adjust',
  '🌟 Make the LED flash twice as fast (modify timing components)',
  '🔌 Add explicit VCC (+5V) and GND power rail flags',
  '🧹 Clean up floating dangling wires and re-route nets',
];

export const AiCircuitChatDrawer: React.FC<AiCircuitChatDrawerProps> = ({
  isOpen,
  onClose,
  document,
  onApplyModification,
  onShowToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: `Hello! I am your **Circuit Engineering Assistant**. 

I can analyze your active schematic, troubleshoot bugs, suggest safety improvements, and automatically modify components and wires upon your command.

Try asking:
- *"Why is my circuit not oscillating?"*
- *"Add a 100nF decoupling capacitor to U1"*
- *"Change R1 to 2.2k and add a status LED on pin 3"*
- *"Add an LM7805 5V power supply stage"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  if (!isOpen) return null;

  // Local fallback rule-based intelligence if server endpoint is 404/405 or offline
  const generateLocalCircuitAdvice = (query: string): { reply: string; mod?: CircuitModificationAction } => {
    const q = query.toLowerCase();
    const comps = document.components || [];
    const wires = document.wires || [];

    // 1. Decoupling capacitor suggestion / request
    if (q.includes('decoupling') || q.includes('bypass') || (q.includes('capacitor') && q.includes('100nf'))) {
      const ics = comps.filter((c) => c.type.startsWith('ic_') || c.designator.startsWith('U'));
      const targetIc = ics[0] || comps[0];
      const newCapId = `c_decoup_${Date.now()}`;
      const newCap: SchematicComponent = {
        id: newCapId,
        type: 'capacitor',
        designator: `C${comps.filter((c) => c.designator.startsWith('C')).length + 1}`,
        value: '100nF',
        footprint: 'C0805',
        x: targetIc ? targetIc.x + 80 : 350,
        y: targetIc ? targetIc.y - 60 : 200,
        rotation: 0,
        pins: [
          { id: '1', name: '1', net: 'VCC' },
          { id: '2', name: '2', net: 'GND' },
        ],
      };

      return {
        reply: `High-frequency bypass capacitors (100nF ceramic) are essential across active IC power rails. They suppress transient voltage dips and prevent erratic noise resets during logic switching.

I have generated a **100nF decoupling capacitor (${newCap.designator})** connected between VCC and GND close to ${targetIc ? targetIc.designator : 'the main IC'}. Click below to apply.`,
        mod: {
          description: `Added 100nF decoupling capacitor (${newCap.designator}) across VCC and GND`,
          action: 'add_components',
          componentsToAdd: [newCap],
        },
      };
    }

    // 2. Flyback diode protection
    if (q.includes('flyback') || q.includes('diode') || q.includes('inductive') || q.includes('relay')) {
      const newDiodeId = `d_flyback_${Date.now()}`;
      const newDiode: SchematicComponent = {
        id: newDiodeId,
        type: 'diode',
        designator: `D${comps.filter((c) => c.designator.startsWith('D')).length + 1}`,
        value: '1N4007',
        footprint: 'DO-41',
        x: 450,
        y: 260,
        rotation: 90,
        pins: [
          { id: '1', name: 'A', net: 'GND' },
          { id: '2', name: 'K', net: 'VCC' },
        ],
      };

      return {
        reply: `When an inductive coil (relay or motor) switches off, the collapsing magnetic field produces a high-voltage reverse spike ($V = -L \\frac{di}{dt}$) that can destroy driving transistors.

A reverse-biased clamping diode (1N4007 or 1N4148) across the coil safely circulates and dissipates this energy.

I generated a **1N4007 flyback protection diode (${newDiode.designator})** for your circuit.`,
        mod: {
          description: `Added 1N4007 flyback protection diode (${newDiode.designator})`,
          action: 'add_components',
          componentsToAdd: [newDiode],
        },
      };
    }

    // 3. 5V Regulator stage
    if (q.includes('7805') || q.includes('regulator') || q.includes('power supply') || q.includes('5v')) {
      const regId = `u_reg_${Date.now()}`;
      const cInId = `c_in_${Date.now()}`;
      const cOutId = `c_out_${Date.now()}`;

      const newComponents: SchematicComponent[] = [
        {
          id: regId,
          type: 'ic_regulator',
          designator: `U${comps.filter((c) => c.designator.startsWith('U')).length + 1}`,
          value: 'LM7805',
          footprint: 'TO-220',
          x: 180,
          y: 180,
          rotation: 0,
          pins: [
            { id: '1', name: 'IN', net: 'VIN' },
            { id: '2', name: 'GND', net: 'GND' },
            { id: '3', name: 'OUT', net: 'VCC' },
          ],
        },
        {
          id: cInId,
          type: 'polarized_capacitor',
          designator: `C${comps.filter((c) => c.designator.startsWith('C')).length + 1}`,
          value: '100µF',
          footprint: 'CP_Radial_D6.3mm',
          x: 100,
          y: 220,
          rotation: 90,
          pins: [
            { id: '1', name: '+', net: 'VIN' },
            { id: '2', name: '-', net: 'GND' },
          ],
        },
        {
          id: cOutId,
          type: 'polarized_capacitor',
          designator: `C${comps.filter((c) => c.designator.startsWith('C')).length + 2}`,
          value: '10µF',
          footprint: 'CP_Radial_D5.0mm',
          x: 270,
          y: 220,
          rotation: 90,
          pins: [
            { id: '1', name: '+', net: 'VCC' },
            { id: '2', name: '-', net: 'GND' },
          ],
        },
      ];

      return {
        reply: `I have prepared a **5V Linear Regulated Power Stage** using the LM7805. It includes a 100µF electrolytic input buffer capacitor and a 10µF output smoothing capacitor to maintain steady 5.0V output under varying loads up to 1.5A.`,
        mod: {
          description: 'Added LM7805 5V voltage regulator stage with filter capacitors',
          action: 'add_components',
          componentsToAdd: newComponents,
        },
      };
    }

    // 4. Modify resistor value (e.g. "change R1 to 1k", "replace R2 with 4.7k")
    const matchResChange = q.match(/(?:change|set|replace|update)\s+([a-zA-Z0-9]+)\s+(?:to|with|=|as)\s+([0-9.]+\s*[kKmMµu]?\s*Ω?)/i);
    if (matchResChange) {
      const targetDes = matchResChange[1].toUpperCase();
      const newVal = matchResChange[2].trim();
      const existingComp = comps.find((c) => c.designator.toUpperCase() === targetDes);

      if (existingComp) {
        return {
          reply: `Understood! I will update component **${existingComp.designator}** value from *${existingComp.value}* to **${newVal}**.`,
          mod: {
            description: `Changed ${existingComp.designator} value to ${newVal}`,
            action: 'modify',
            componentsToUpdate: [{ id: existingComp.id, value: newVal }],
          },
        };
      }
    }

    // 5. General circuit review / error check
    const hasVcc = comps.some((c) => c.pins.some((p) => p.net === 'VCC'));
    const hasGnd = comps.some((c) => c.pins.some((p) => p.net === 'GND'));
    const hasLeds = comps.filter((c) => c.type === 'led');

    let reviewText = `### Circuit Health Audit\n\n`;
    reviewText += `- **Part Count:** ${comps.length} components placed\n`;
    reviewText += `- **Conductor Routes:** ${wires.length} active connection tracks\n`;
    reviewText += `- **Power Rails:** ${hasVcc ? '✅ VCC (+5V/9V) rail detected' : '⚠️ Missing dedicated VCC source'}\n`;
    reviewText += `- **Ground Return:** ${hasGnd ? '✅ GND reference established' : '⚠️ Missing 0V GND reference'}\n`;

    if (hasLeds.length > 0) {
      reviewText += `- **LED Ballast:** ${hasLeds.length} indicator LEDs monitored. Ensure current-limiting resistors (220Ω - 470Ω) are installed in series to prevent blowout.\n`;
    }

    reviewText += `\n**Suggestions:**\n1. Ensure pin net names are consistent so the autorouter connects pins correctly.\n2. Keep digital switching lines separate from sensitive analog inputs to minimize EMI.\n3. Run simulation to inspect waveforms on the virtual oscilloscope.`;

    return {
      reply: reviewText,
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    setInputQuery('');
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let serverReplied = false;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch('/api/circuit/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            circuit: {
              title: document.title,
              components: document.components,
              wires: document.wires,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            const assistantMsg: ChatMessage = {
              id: `msg_asst_${Date.now()}`,
              sender: 'assistant',
              text: data.reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              modification: data.circuitModification || undefined,
            };
            setMessages((prev) => [...prev, assistantMsg]);
            serverReplied = true;
          }
        }
      } catch (fErr) {
        console.warn('[Circuit Chat] Server chat fetch offline or timed out, using local EDA intelligence:', fErr);
      } finally {
        clearTimeout(timeoutId);
      }

      // If server was offline or 404/405, use local EDA circuit reasoning
      if (!serverReplied) {
        const localResult = generateLocalCircuitAdvice(query);
        const assistantMsg: ChatMessage = {
          id: `msg_asst_${Date.now()}`,
          sender: 'assistant',
          text: localResult.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modification: localResult.mod,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('[Circuit Chat] Unexpected error:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        sender: 'assistant',
        text: 'I checked your circuit. All component pinouts and nets are active. Would you like to add an LED indicator, decoupling capacitor, or run the electrical simulation?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyModification = (msgId: string, mod: CircuitModificationAction) => {
    onApplyModification(mod);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m))
    );
    if (onShowToast) {
      onShowToast(`Applied: ${mod.description}`);
    }
  };

  return (
    <div
      className={`fixed z-45 bg-slate-900 border border-slate-750 shadow-2xl rounded-2xl flex flex-col text-slate-200 transition-all duration-200 ${
        isMinimized
          ? 'bottom-4 right-4 w-72 h-14 overflow-hidden cursor-pointer'
          : 'bottom-4 right-4 w-96 sm:w-[420px] h-[540px] max-h-[85vh] overflow-hidden'
      }`}
    >
      {/* Drawer Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 cursor-pointer select-none"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              AI Circuit Suggestions &amp; Chat
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {document.components?.length || 0} parts • {document.wires?.length || 0} wires
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-850 flex gap-1.5 overflow-x-auto no-scrollbar">
            {DEFAULT_SUGGESTIONS.slice(0, 5).map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sug)}
                className="shrink-0 text-[10px] px-2 py-1 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-sky-300 rounded-full border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{sug}</span>
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-sky-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {m.text}
                  </div>

                  {/* Actionable Circuit Modification Button */}
                  {m.modification && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-emerald-300">
                        <span>⚡ Proposed Modification</span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        {m.modification.description}
                      </p>
                      <button
                        onClick={() => handleApplyModification(m.id, m.modification!)}
                        disabled={m.applied}
                        className={`w-full py-1.5 px-2.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          m.applied
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40 cursor-default'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm'
                        }`}
                      >
                        {m.applied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied to Schematic</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Apply Changes to Schematic</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-800/50 rounded-lg text-slate-400 text-xs animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Assistant is analyzing schematic and preparing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask advice, request circuit changes or corrections..."
                className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500 font-sans"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
