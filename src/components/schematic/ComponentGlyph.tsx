import React from 'react';
import { SchematicComponent, ComponentSimResult } from '../../types';
import { getComponentDef } from '../../data/components';

interface ComponentGlyphProps {
  component: SchematicComponent;
  isSelected?: boolean;
  onPinHover?: (pinId: string | null) => void;
  hoveredPinId?: string | null;
  simulationResult?: ComponentSimResult;
  isSimulating?: boolean;
  onToggleSwitch?: (component: SchematicComponent) => void;
  probedPinId?: string | null;
  onPinClick?: (pinId: string, event?: React.MouseEvent) => void;
}

export const ComponentGlyph: React.FC<ComponentGlyphProps> = ({
  component,
  isSelected = false,
  onPinHover,
  hoveredPinId,
  simulationResult,
  isSimulating = false,
  onToggleSwitch,
  probedPinId,
  onPinClick,
}) => {
  const def = getComponentDef(component.type);
  const rot = component.rotation || 0;

  // Check if LED is actively conducting
  const isLedBurnedOut =
    component.type === 'led' &&
    isSimulating &&
    Boolean(simulationResult?.isBurnedOut);

  const isLedOverloaded =
    component.type === 'led' &&
    isSimulating &&
    Boolean(simulationResult?.isOverloaded) &&
    !isLedBurnedOut;

  const isLedLit =
    component.type === 'led' &&
    isSimulating &&
    simulationResult &&
    simulationResult.current > 0.001 &&
    !isLedBurnedOut;

  // Check switch state
  const isSwitchClosed = component.testSettings?.isClosed ?? true;

  // Render specific SVG symbol graphic based on component type
  const renderSymbolGraphic = () => {
    switch (component.type) {
      case 'resistor':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            {/* Leads */}
            <line x1="-30" y1="0" x2="-20" y2="0" />
            <line x1="20" y1="0" x2="30" y2="0" />
            {/* Zigzag body */}
            <path d="M -20 0 L -16 -8 L -8 8 L 0 -8 L 8 8 L 16 -8 L 20 0" strokeLinejoin="round" />
          </g>
        );

      case 'pot':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-30" y1="-10" x2="-20" y2="-10" />
            <line x1="20" y1="-10" x2="30" y2="-10" />
            <path d="M -20 -10 L -16 -18 L -8 -2 L 0 -18 L 8 -2 L 16 -18 L 20 -10" strokeLinejoin="round" />
            {/* Wiper arrow */}
            <line x1="0" y1="25" x2="0" y2="2" />
            <polygon points="0,-3 -4,5 4,5" fill="currentColor" />
          </g>
        );

      case 'capacitor':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-25" y1="0" x2="-6" y2="0" />
            <line x1="6" y1="0" x2="25" y2="0" />
            {/* Parallel plates */}
            <line x1="-6" y1="-14" x2="-6" y2="14" strokeWidth="2.5" />
            <line x1="6" y1="-14" x2="6" y2="14" strokeWidth="2.5" />
          </g>
        );

      case 'polarized_capacitor':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-25" y1="0" x2="-6" y2="0" />
            <line x1="6" y1="0" x2="25" y2="0" />
            {/* Positive flat plate */}
            <line x1="-6" y1="-14" x2="-6" y2="14" strokeWidth="2.5" />
            {/* Negative curved plate */}
            <path d="M 6 -14 Q 2 0 6 14" strokeWidth="2.5" />
            {/* Plus sign */}
            <text x="-14" y="-8" fontSize="10" fill="#f87171" stroke="none" fontWeight="bold">
              +
            </text>
          </g>
        );

      case 'inductor':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-30" y1="0" x2="-21" y2="0" />
            <line x1="21" y1="0" x2="30" y2="0" />
            {/* Coils */}
            <path d="M -21 0 A 7 7 0 0 1 -7 0 A 7 7 0 0 1 7 0 A 7 7 0 0 1 21 0" />
          </g>
        );

      case 'crystal':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-25" y1="0" x2="-8" y2="0" />
            <line x1="8" y1="0" x2="25" y2="0" />
            <line x1="-8" y1="-12" x2="-8" y2="12" />
            <line x1="8" y1="-12" x2="8" y2="12" />
            <rect x="-5" y="-14" width="10" height="28" fill="#1e293b" />
          </g>
        );

      case 'diode':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-25" y1="0" x2="-8" y2="0" />
            <line x1="8" y1="0" x2="25" y2="0" />
            {/* Triangle pointing right */}
            <polygon points="-8,-12 -8,12 8,0" fill="#38bdf8" stroke="currentColor" />
            {/* Cathode bar */}
            <line x1="8" y1="-12" x2="8" y2="12" strokeWidth="2.5" />
          </g>
        );

      case 'zener_diode':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-25" y1="0" x2="-8" y2="0" />
            <line x1="8" y1="0" x2="25" y2="0" />
            <polygon points="-8,-12 -8,12 8,0" fill="#a855f7" stroke="currentColor" />
            {/* Zener bent bar */}
            <path d="M 4 -12 L 8 -12 L 8 12 L 12 12" strokeWidth="2" />
          </g>
        );

      case 'led':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            {/* Burnout / Damage Graphics: Smoke & Sparks */}
            {isLedBurnedOut && (
              <g className="animate-pulse">
                {/* Smoke clouds rising above destroyed LED */}
                <circle cx="2" cy="-15" r="7" fill="#475569" opacity="0.8" />
                <circle cx="-5" cy="-26" r="10" fill="#64748b" opacity="0.6" />
                <circle cx="6" cy="-38" r="13" fill="#94a3b8" opacity="0.4" />
                {/* Spark lines */}
                <line x1="-12" y1="-12" x2="-22" y2="-22" stroke="#f97316" strokeWidth="2.5" />
                <line x1="12" y1="-12" x2="22" y2="-22" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="0" y1="-16" x2="0" y2="-28" stroke="#eab308" strokeWidth="2" />
              </g>
            )}

            {/* Overload Heat Aura */}
            {isLedOverloaded && (
              <>
                <circle cx="0" cy="0" r="26" fill="#ef4444" fillOpacity="0.4" className="animate-ping" />
                <circle cx="0" cy="0" r="18" fill="#f97316" fillOpacity="0.6" />
              </>
            )}

            {/* Normal Lit Glow */}
            {isLedLit && (
              <>
                <circle cx="0" cy="0" r="22" fill="#22c55e" fillOpacity="0.4" />
                <circle cx="0" cy="0" r="14" fill="#86efac" fillOpacity="0.6" />
              </>
            )}

            <line x1="-25" y1="0" x2="-8" y2="0" />
            <line x1="8" y1="0" x2="25" y2="0" />

            {/* Diode body: charred dark-red if burned out, hot orange if overloaded, green if normal */}
            <polygon
              points="-8,-10 -8,10 8,0"
              fill={isLedBurnedOut ? '#1c1917' : isLedOverloaded ? '#ea580c' : isLedLit ? '#4ade80' : '#22c55e'}
              stroke={isLedBurnedOut ? '#dc2626' : isLedOverloaded ? '#fef08a' : isLedLit ? '#dcfce7' : 'currentColor'}
              strokeWidth={isLedBurnedOut || isLedLit ? '2.5' : '1.5'}
            />
            <line x1="8" y1="-10" x2="8" y2="10" strokeWidth="2.5" stroke={isLedBurnedOut ? '#ef4444' : 'currentColor'} />

            {/* Burnout crack inside semiconductor die */}
            {isLedBurnedOut && (
              <path d="M -5 -6 L -1 1 L 2 -4 L 6 4" stroke="#f87171" strokeWidth="2" />
            )}

            {/* Light emission arrows: crossed out if destroyed, hot yellow if lit */}
            {!isLedBurnedOut ? (
              <g stroke={isLedOverloaded ? '#ffedd5' : isLedLit ? '#fde047' : '#eab308'} strokeWidth={isLedLit || isLedOverloaded ? '2' : '1.5'}>
                <line x1="2" y1="-12" x2="10" y2="-20" />
                <polygon points="10,-20 6,-18 9,-15" fill={isLedLit ? '#fef08a' : '#eab308'} stroke="none" />
                <line x1="8" y1="-8" x2="16" y2="-16" />
                <polygon points="16,-16 12,-14 15,-11" fill={isLedLit ? '#fef08a' : '#eab308'} stroke="none" />
              </g>
            ) : (
              <g stroke="#ef4444" strokeWidth="2">
                {/* Red cross out */}
                <line x1="2" y1="-20" x2="16" y2="-8" />
                <line x1="2" y1="-8" x2="16" y2="-20" />
              </g>
            )}
          </g>
        );

      case 'npn_bjt':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            {/* Circle boundary */}
            <circle cx="0" cy="0" r="22" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Base */}
            <line x1="-25" y1="0" x2="-6" y2="0" />
            <line x1="-6" y1="-14" x2="-6" y2="14" strokeWidth="3" />
            {/* Collector */}
            <line x1="-6" y1="-6" x2="15" y2="-18" />
            <line x1="15" y1="-18" x2="15" y2="-25" />
            {/* Emitter with arrow pointing away */}
            <line x1="-6" y1="6" x2="15" y2="18" />
            <line x1="15" y1="18" x2="15" y2="25" />
            <polygon points="15,18 7,12 12,9" fill="currentColor" />
          </g>
        );

      case 'pnp_bjt':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="0" cy="0" r="22" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="-25" y1="0" x2="-6" y2="0" />
            <line x1="-6" y1="-14" x2="-6" y2="14" strokeWidth="3" />
            {/* Emitter with arrow pointing towards base */}
            <line x1="15" y1="-25" x2="15" y2="-18" />
            <line x1="15" y1="-18" x2="-6" y2="-6" />
            <polygon points="-6,-6 2,-12 -3,-15" fill="currentColor" />
            {/* Collector */}
            <line x1="-6" y1="6" x2="15" y2="18" />
            <line x1="15" y1="18" x2="15" y2="25" />
          </g>
        );

      case 'n_mosfet':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            {/* Gate */}
            <line x1="-25" y1="0" x2="-10" y2="0" />
            <line x1="-10" y1="-14" x2="-10" y2="14" strokeWidth="2.5" />
            {/* Channel segments */}
            <line x1="-4" y1="-14" x2="-4" y2="-7" strokeWidth="2.5" />
            <line x1="-4" y1="-3" x2="-4" y2="3" strokeWidth="2.5" />
            <line x1="-4" y1="7" x2="-4" y2="14" strokeWidth="2.5" />
            {/* Drain */}
            <line x1="-4" y1="-10" x2="15" y2="-10" />
            <line x1="15" y1="-10" x2="15" y2="-25" />
            {/* Source */}
            <line x1="-4" y1="10" x2="15" y2="10" />
            <line x1="15" y1="10" x2="15" y2="25" />
            {/* Substrate connection + arrow */}
            <line x1="-4" y1="0" x2="6" y2="0" />
            <line x1="6" y1="0" x2="6" y2="10" />
            <polygon points="-4,0 4,-4 4,4" fill="currentColor" />
          </g>
        );

      case 'dc_source':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            {/* Top lead to + terminal */}
            <line x1="0" y1="-30" x2="0" y2="-18" stroke="#ef4444" strokeWidth="2.5" />
            {/* Bottom lead to - terminal */}
            <line x1="0" y1="18" x2="0" y2="30" stroke="#0ea5e9" strokeWidth="2.5" />
            
            {/* Voltage source outer circle */}
            <circle cx="0" cy="0" r="18" stroke="#38bdf8" strokeWidth="2" fill="#0f172a" />
            
            {/* Prominent + sign near top */}
            <g transform="translate(0, -9)">
              <line x1="-5" y1="0" x2="5" y2="0" stroke="#ef4444" strokeWidth="2.5" />
              <line x1="0" y1="-5" x2="0" y2="5" stroke="#ef4444" strokeWidth="2.5" />
            </g>
            
            {/* Prominent - sign near bottom */}
            <line x1="-5" y1="9" x2="5" y2="9" stroke="#0ea5e9" strokeWidth="2.5" />
            
            {/* Center label DC */}
            <text x="0" y="2" textAnchor="middle" fill="#94a3b8" fontSize="6.5" stroke="none" fontWeight="bold" fontFamily="monospace">
              DC
            </text>
          </g>
        );

      case 'source_pos_point':
        return (
          <g stroke="#ef4444" strokeWidth="2" fill="none">
            {/* Lead from top arrow down to connection terminal */}
            <line x1="0" y1="0" x2="0" y2="16" stroke="#ef4444" strokeWidth="2.5" />
            {/* Bold + Arrow / Indicator */}
            <circle cx="0" cy="-4" r="10" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.5" />
            <line x1="-4" y1="-4" x2="4" y2="-4" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="-8" x2="0" y2="0" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <text x="13" y="-1" fill="#f87171" fontSize="8" stroke="none" fontWeight="bold" fontFamily="monospace">
              +V
            </text>
          </g>
        );

      case 'source_neg_point':
        return (
          <g stroke="#0ea5e9" strokeWidth="2" fill="none">
            {/* Lead from terminal up to negative indicator */}
            <line x1="0" y1="-16" x2="0" y2="0" stroke="#0ea5e9" strokeWidth="2.5" />
            {/* Bold - Indicator */}
            <circle cx="0" cy="4" r="10" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.5" />
            <line x1="-4" y1="4" x2="4" y2="4" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <text x="13" y="7" fill="#38bdf8" fontSize="8" stroke="none" fontWeight="bold" fontFamily="monospace">
              -Ve
            </text>
          </g>
        );

      case 'earth_ground':
        return (
          <g stroke="#10b981" strokeWidth="2" fill="none">
            {/* Vertical lead from terminal pad to ground symbol */}
            <line x1="0" y1="-18" x2="0" y2="0" stroke="#10b981" strokeWidth="2.5" />
            {/* Main horizontal ground bar */}
            <line x1="-15" y1="0" x2="15" y2="0" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            {/* Intermediate bar */}
            <line x1="-10" y1="5" x2="10" y2="5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            {/* Shortest bottom bar */}
            <line x1="-5" y1="10" x2="5" y2="10" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
            {/* Earth ⏚ symbol badge */}
            <text x="14" y="6" fill="#34d399" fontSize="7.5" stroke="none" fontWeight="bold" fontFamily="monospace">
              ⏚ PE
            </text>
          </g>
        );

      case 'vcc':
      case 'vcc_3v3':
        return (
          <g stroke="#f43f5e" strokeWidth="2" fill="none">
            <line x1="0" y1="15" x2="0" y2="0" />
            <polygon points="0,-12 -8,0 8,0" fill="#f43f5e" stroke="#f43f5e" />
          </g>
        );

      case 'gnd':
        return (
          <g stroke="#38bdf8" strokeWidth="2" fill="none">
            <line x1="0" y1="-15" x2="0" y2="0" />
            <line x1="-14" y1="0" x2="14" y2="0" strokeWidth="2.5" />
            <line x1="-9" y1="5" x2="9" y2="5" strokeWidth="2" />
            <line x1="-4" y1="10" x2="4" y2="10" strokeWidth="1.5" />
          </g>
        );

      case 'battery':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="0" y1="-25" x2="0" y2="-10" />
            <line x1="0" y1="10" x2="0" y2="25" />
            {/* Long positive plate */}
            <line x1="-16" y1="-10" x2="16" y2="-10" strokeWidth="2.5" />
            {/* Short thick negative plate */}
            <line x1="-9" y1="-2" x2="9" y2="-2" strokeWidth="4" />
            <line x1="-16" y1="4" x2="16" y2="4" strokeWidth="2.5" />
            <line x1="-9" y1="10" x2="9" y2="10" strokeWidth="4" />
            <text x="8" y="-14" fontSize="10" fill="#f87171" stroke="none" fontWeight="bold">
              +
            </text>
          </g>
        );

      case 'ic_ne555':
        return (
          <g>
            {/* DIP-8 IC Body */}
            <rect
              x="-50"
              y="-55"
              width="100"
              height="110"
              rx="4"
              fill="#1e293b"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            {/* Top notch for pin 1 orientation */}
            <path d="M -10 -55 A 10 10 0 0 0 10 -55" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Part label */}
            <text
              x="0"
              y="-10"
              textAnchor="middle"
              fill="#f1f5f9"
              fontSize="12"
              fontWeight="bold"
            >
              NE555
            </text>
            <text x="0" y="8" textAnchor="middle" fill="#94a3b8" fontSize="9">
              TIMER
            </text>
          </g>
        );

      case 'ic_opamp':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            {/* Triangle op-amp */}
            <polygon points="-40,-35 -40,35 40,0" fill="#1e293b" stroke="#38bdf8" />
            {/* - and + signs */}
            <text x="-32" y="-12" fontSize="14" fill="#cbd5e1" stroke="none" fontWeight="bold">
              -
            </text>
            <text x="-32" y="24" fontSize="14" fill="#cbd5e1" stroke="none" fontWeight="bold">
              +
            </text>
          </g>
        );

      case 'ic_regulator':
        return (
          <g>
            <rect
              x="-40"
              y="-25"
              width="80"
              height="50"
              rx="3"
              fill="#1e293b"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <text x="0" y="2" textAnchor="middle" fill="#f1f5f9" fontSize="11" fontWeight="bold">
              7805
            </text>
            <text x="0" y="14" textAnchor="middle" fill="#94a3b8" fontSize="8">
              REGULATOR
            </text>
          </g>
        );

      case 'ic_mcu':
        return (
          <g>
            <rect
              x="-70"
              y="-85"
              width="140"
              height="170"
              rx="4"
              fill="#1e293b"
              stroke="#a855f7"
              strokeWidth="2"
            />
            <path d="M -12 -85 A 12 12 0 0 0 12 -85" fill="#0f172a" stroke="#a855f7" strokeWidth="1.5" />
            <text x="0" y="-30" textAnchor="middle" fill="#f1f5f9" fontSize="13" fontWeight="bold">
              ATmega328P
            </text>
            <text x="0" y="-12" textAnchor="middle" fill="#c084fc" fontSize="9">
              AVR RISC MCU
            </text>
          </g>
        );

      case 'switch':
        return (
          <g
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            onClick={(e) => {
              if (onToggleSwitch) {
                e.stopPropagation();
                onToggleSwitch(component);
              }
            }}
            className={onToggleSwitch ? 'cursor-pointer hover:opacity-80' : ''}
          >
            <line x1="-25" y1="0" x2="-10" y2="0" />
            <circle cx="-8" cy="0" r="2.5" fill="#1e293b" />
            <circle cx="10" cy="-15" r="2.5" fill="#1e293b" />
            <circle cx="10" cy="15" r="2.5" fill="#1e293b" />
            <line x1="12" y1="-15" x2="25" y2="-15" />
            <line x1="12" y1="15" x2="25" y2="15" />
            {/* Switch blade: connected if closed, open if not */}
            {isSwitchClosed ? (
              <line x1="-8" y1="0" x2="10" y2="-15" stroke="#22c55e" strokeWidth="3" />
            ) : (
              <line x1="-8" y1="0" x2="8" y2="-8" stroke="#eab308" strokeWidth="2.5" />
            )}
            <text x="0" y="24" fontSize="7" fill={isSwitchClosed ? '#22c55e' : '#eab308'} textAnchor="middle" stroke="none">
              {isSwitchClosed ? 'CLOSED' : 'OPEN'}
            </text>
          </g>
        );

      case 'push_button':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-25" y1="0" x2="-8" y2="0" />
            <line x1="8" y1="0" x2="25" y2="0" />
            <circle cx="-8" cy="0" r="2" fill="#1e293b" />
            <circle cx="8" cy="0" r="2" fill="#1e293b" />
            {/* Button bar held above contacts */}
            <line x1="-12" y1="-8" x2="12" y2="-8" strokeWidth="2.5" />
            <line x1="0" y1="-8" x2="0" y2="-18" strokeWidth="2" />
            <rect x="-6" y="-22" width="12" height="4" fill="currentColor" />
          </g>
        );

      case 'buzzer':
        return (
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="-22" y1="0" x2="-12" y2="0" />
            <line x1="12" y1="0" x2="22" y2="0" />
            {/* Piezo horn body */}
            <rect x="-12" y="-15" width="24" height="30" fill="#1e293b" />
            <path d="M 12 -15 L 20 -22 L 20 22 L 12 15 Z" fill="#334155" />
            <text x="-6" y="4" fontSize="8" fill="#e2e8f0" stroke="none">
              BZ
            </text>
          </g>
        );

      case 'connector_2pin':
      case 'connector_4pin':
        return (
          <g>
            <rect
              x={-def.width / 2}
              y={-def.height / 2}
              width={def.width}
              height={def.height}
              rx="3"
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {def.pins.map((p) => (
              <circle
                key={p.id}
                cx={p.x - 8}
                cy={p.y}
                r="4"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
            ))}
          </g>
        );

      case 'source_terminal_block':
        return (
          <g>
            <rect
              x="-30"
              y="-35"
              width="60"
              height="70"
              rx="4"
              fill="#0f172a"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            {/* Terminal screws */}
            <circle cx="-14" cy="-22" r="5" fill="#1e293b" stroke="#60a5fa" strokeWidth="1" />
            <circle cx="-14" cy="0" r="5" fill="#1e293b" stroke="#60a5fa" strokeWidth="1" />
            <circle cx="-14" cy="22" r="5" fill="#1e293b" stroke="#10b981" strokeWidth="1" />
            {/* Screwdriver slots */}
            <line x1="-17" y1="-22" x2="-11" y2="-22" stroke="#93c5fd" strokeWidth="1.2" />
            <line x1="-17" y1="0" x2="-11" y2="0" stroke="#93c5fd" strokeWidth="1.2" />
            <line x1="-17" y1="22" x2="-11" y2="22" stroke="#6ee7b7" strokeWidth="1.2" />
            {/* Header label */}
            <text x="2" y="-28" fill="#93c5fd" fontSize="7" fontWeight="bold" fontFamily="monospace">
              SRC
            </text>
            <text x="5" y="-19" fill="#ef4444" fontSize="8" fontWeight="bold" fontFamily="monospace">
              + / L
            </text>
            <text x="5" y="3" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
              - / N
            </text>
            <text x="5" y="25" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">
              PE ⏚
            </text>
          </g>
        );

      case 'load_terminal_block':
        return (
          <g>
            <rect
              x="-30"
              y="-35"
              width="60"
              height="70"
              rx="4"
              fill="#064e3b"
              fillOpacity="0.25"
              stroke="#10b981"
              strokeWidth="2"
            />
            {/* Terminal screws */}
            <circle cx="14" cy="-22" r="5" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
            <circle cx="14" cy="0" r="5" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
            <circle cx="14" cy="22" r="5" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <line x1="11" y1="-22" x2="17" y2="-22" stroke="#6ee7b7" strokeWidth="1.2" />
            <line x1="11" y1="0" x2="17" y2="0" stroke="#6ee7b7" strokeWidth="1.2" />
            <line x1="11" y1="22" x2="17" y2="22" stroke="#6ee7b7" strokeWidth="1.2" />
            <text x="-5" y="-28" fill="#6ee7b7" fontSize="7" fontWeight="bold" fontFamily="monospace">
              LOAD
            </text>
            <text x="-22" y="-19" fill="#facc15" fontSize="8" fontWeight="bold" fontFamily="monospace">
              IN+
            </text>
            <text x="-22" y="3" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
              IN-
            </text>
            <text x="-22" y="25" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">
              PE ⏚
            </text>
          </g>
        );

      case 'three_phase_source_terminal':
        return (
          <g>
            <rect
              x="-35"
              y="-55"
              width="70"
              height="110"
              rx="5"
              fill="#0f172a"
              stroke="#e11d48"
              strokeWidth="2"
            />
            <rect x="-35" y="-55" width="70" height="14" rx="4" fill="#881337" />
            <text x="0" y="-45" textAnchor="middle" fill="#ffe4e6" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
              440V 3Φ SOURCE
            </text>
            {/* 5 Phase indicators with colors: Red, Yellow, Blue, Neutral, Earth */}
            <circle cx="-16" cy="-40" r="4.5" fill="#ef4444" />
            <text x="-6" y="-37" fill="#fca5a5" fontSize="8" fontWeight="bold" fontFamily="monospace">L1</text>
            <circle cx="-16" cy="-20" r="4.5" fill="#eab308" />
            <text x="-6" y="-17" fill="#fde047" fontSize="8" fontWeight="bold" fontFamily="monospace">L2</text>
            <circle cx="-16" cy="0" r="4.5" fill="#3b82f6" />
            <text x="-6" y="3" fill="#93c5fd" fontSize="8" fontWeight="bold" fontFamily="monospace">L3</text>
            <circle cx="-16" cy="20" r="4.5" fill="#64748b" />
            <text x="-6" y="23" fill="#cbd5e1" fontSize="8" fontWeight="bold" fontFamily="monospace">N</text>
            <circle cx="-16" cy="40" r="4.5" fill="#10b981" />
            <text x="-6" y="43" fill="#6ee7b7" fontSize="8" fontWeight="bold" fontFamily="monospace">PE</text>
          </g>
        );

      case 'three_phase_load_terminal':
        return (
          <g>
            <rect
              x="-35"
              y="-45"
              width="70"
              height="90"
              rx="5"
              fill="#064e3b"
              fillOpacity="0.3"
              stroke="#059669"
              strokeWidth="2"
            />
            <rect x="-35" y="-45" width="70" height="14" rx="4" fill="#065f46" />
            <text x="0" y="-35" textAnchor="middle" fill="#d1fae5" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
              MOTOR LOAD (3Φ)
            </text>
            <circle cx="16" cy="-30" r="4.5" fill="#ef4444" />
            <text x="-16" y="-27" fill="#fca5a5" fontSize="8" fontWeight="bold" fontFamily="monospace">U/T1</text>
            <circle cx="16" cy="-10" r="4.5" fill="#eab308" />
            <text x="-16" y="-7" fill="#fde047" fontSize="8" fontWeight="bold" fontFamily="monospace">V/T2</text>
            <circle cx="16" cy="10" r="4.5" fill="#3b82f6" />
            <text x="-16" y="13" fill="#93c5fd" fontSize="8" fontWeight="bold" fontFamily="monospace">W/T3</text>
            <circle cx="16" cy="30" r="4.5" fill="#10b981" />
            <text x="-16" y="33" fill="#6ee7b7" fontSize="8" fontWeight="bold" fontFamily="monospace">PE ⏚</text>
          </g>
        );

      case 'industrial_contactor':
        return (
          <g>
            <rect
              x="-45"
              y="-60"
              width="90"
              height="120"
              rx="4"
              fill="#1e293b"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            {/* Header */}
            <rect x="-45" y="-60" width="90" height="15" rx="3" fill="#78350f" />
            <text x="0" y="-49" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              CONTACTOR KM1
            </text>
            {/* 3 Main Power Poles */}
            <g stroke="#f59e0b" strokeWidth="1.5" fill="none">
              {/* Pole 1 */}
              <line x1="-35" y1="-45" x2="-20" y2="-45" />
              <line x1="-15" y1="-49" x2="5" y2="-40" />
              <line x1="10" y1="-45" x2="35" y2="-45" />
              {/* Pole 2 */}
              <line x1="-35" y1="-20" x2="-20" y2="-20" />
              <line x1="-15" y1="-24" x2="5" y2="-15" />
              <line x1="10" y1="-20" x2="35" y2="-20" />
              {/* Pole 3 */}
              <line x1="-35" y1="5" x2="-20" y2="5" />
              <line x1="-15" y1="1" x2="5" y2="10" />
              <line x1="10" y1="5" x2="35" y2="5" />
            </g>
            {/* Mechanical Link Dashed */}
            <line x1="-5" y1="-45" x2="-5" y2="25" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
            {/* Auxiliary NO Contact */}
            <text x="-25" y="27" fill="#cbd5e1" fontSize="7" fontFamily="monospace">13 NO</text>
            <text x="10" y="27" fill="#cbd5e1" fontSize="7" fontFamily="monospace">14 NO</text>
            {/* Contactor Coil Rect */}
            <rect x="-18" y="40" width="36" height="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" rx="2" />
            <line x1="-18" y1="40" x2="18" y2="58" stroke="#38bdf8" strokeWidth="0.8" />
            <text x="0" y="52" textAnchor="middle" fill="#7dd3fc" fontSize="8" fontWeight="bold" fontFamily="monospace">
              COIL
            </text>
          </g>
        );

      case 'overload_relay':
        return (
          <g>
            <rect
              x="-40"
              y="-50"
              width="80"
              height="100"
              rx="4"
              fill="#1e293b"
              stroke="#ef4444"
              strokeWidth="2"
            />
            <rect x="-40" y="-50" width="80" height="14" rx="3" fill="#991b1b" />
            <text x="0" y="-40" textAnchor="middle" fill="#fee2e2" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
              THERMAL OLR
            </text>
            {/* Bi-metallic heater symbols */}
            <g stroke="#ef4444" strokeWidth="1.5" fill="none">
              <path d="M -30 -35 L -10 -35 Q 0 -40 10 -35 L 30 -35" />
              <path d="M -30 -15 L -10 -15 Q 0 -20 10 -15 L 30 -15" />
              <path d="M -30 5 L -10 5 Q 0 0 10 5 L 30 5" />
            </g>
            {/* 95-96 NC contact label */}
            <text x="-30" y="25" fill="#fca5a5" fontSize="7" fontFamily="monospace">95 NC</text>
            <text x="8" y="25" fill="#fca5a5" fontSize="7" fontFamily="monospace">96 NC</text>
            {/* 97-98 NO contact label */}
            <text x="-30" y="42" fill="#fef08a" fontSize="7" fontFamily="monospace">97 NO</text>
            <text x="8" y="42" fill="#fef08a" fontSize="7" fontFamily="monospace">98 NO</text>
          </g>
        );

      case 'three_phase_motor':
        return (
          <g>
            {/* Motor Outer Circle */}
            <circle cx="0" cy="0" r="34" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="28" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
            <text x="0" y="-8" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
              M
            </text>
            <text x="0" y="10" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
              3 ~
            </text>
            <text x="0" y="22" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">
              INDUCTION
            </text>
          </g>
        );

      case 'optocoupler':
      case 'pc817':
        return (
          <g>
            <rect
              x="-38"
              y="-30"
              width="76"
              height="60"
              rx="4"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="1.8"
            />
            {/* Center optical isolation barrier */}
            <line x1="0" y1="-28" x2="0" y2="28" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" />
            {/* Left side: LED */}
            <g stroke="#f59e0b" strokeWidth="1.5" fill="none">
              <line x1="-38" y1="-18" x2="-20" y2="-18" />
              <line x1="-20" y1="-18" x2="-20" y2="-8" />
              <polygon points="-26,-8 -14,-8 -20,6" fill="#f59e0b" />
              <line x1="-26" y1="6" x2="-14" y2="6" />
              <line x1="-20" y1="6" x2="-20" y2="18" />
              <line x1="-20" y1="18" x2="-38" y2="18" />
              {/* Emitted light arrows */}
              <line x1="-12" y1="-4" x2="-4" y2="-9" stroke="#fbbf24" strokeWidth="1.2" />
              <line x1="-10" y1="4" x2="-2" y2="-1" stroke="#fbbf24" strokeWidth="1.2" />
            </g>
            {/* Right side: Output Detector (Phototriac or phototransistor) */}
            <g stroke="#38bdf8" strokeWidth="1.5" fill="none">
              <line x1="38" y1="-18" x2="18" y2="-18" />
              <line x1="18" y1="-18" x2="18" y2="-6" />
              {/* Output thyristor/transistor symbol */}
              <polygon points="12,-6 24,-6 18,6" fill="#38bdf8" opacity="0.8" />
              <line x1="18" y1="6" x2="18" y2="18" />
              <line x1="18" y1="18" x2="38" y2="18" />
            </g>
            <text x="0" y="-21" textAnchor="middle" fill="#7dd3fc" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
              ISO 7.5kV
            </text>
          </g>
        );

      case 'triac':
        return (
          <g stroke="#f59e0b" strokeWidth="1.8" fill="none">
            {/* Main Terminals Leads */}
            <line x1="-28" y1="20" x2="-10" y2="20" />
            <line x1="-10" y1="20" x2="-10" y2="10" />
            <line x1="10" y1="0" x2="28" y2="0" />
            {/* Antiparallel Thyristor Triangles */}
            <polygon points="-10,12 8,-2 -10,-16" fill="#f59e0b" fillOpacity="0.3" />
            <polygon points="6,16 -12,2 6,-12" fill="#f59e0b" fillOpacity="0.3" />
            {/* Anode/Cathode bars */}
            <line x1="-10" y1="-18" x2="-10" y2="16" />
            <line x1="8" y1="-14" x2="8" y2="18" />
            {/* Gate lead */}
            <path d="M -28,-15 L -6,-15 L -2,-4" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="-2" cy="-4" r="2" fill="#f59e0b" />
            <text x="-16" y="-19" fill="#fbbf24" fontSize="7" fontWeight="bold" fontFamily="monospace" stroke="none">
              G
            </text>
          </g>
        );

      case 'bridge_rectifier':
        return (
          <g>
            {/* Diamond container */}
            <polygon
              points="0,-26 28,0 0,26 -28,0"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="1.8"
            />
            {/* Diode bridge internal graphics */}
            <text x="-18" y="-4" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">~</text>
            <text x="-18" y="14" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">~</text>
            <text x="10" y="-4" fill="#ef4444" fontSize="8" fontWeight="bold" fontFamily="monospace">+</text>
            <text x="10" y="14" fill="#0284c7" fontSize="8" fontWeight="bold" fontFamily="monospace">-</text>
            <text x="0" y="3" textAnchor="middle" fill="#38bdf8" fontSize="7" fontWeight="bold" fontFamily="monospace">
              AC/DC
            </text>
          </g>
        );

      case 'relay_spdt':
        return (
          <g>
            <rect
              x="-38"
              y="-28"
              width="76"
              height="56"
              rx="4"
              fill="#0f172a"
              stroke="#10b981"
              strokeWidth="1.8"
            />
            {/* Coil Section on left */}
            <g stroke="#38bdf8" strokeWidth="1.4" fill="none">
              <line x1="-38" y1="-20" x2="-22" y2="-20" />
              <rect x="-22" y="-12" width="12" height="24" rx="2" stroke="#38bdf8" fill="#1e293b" />
              <line x1="-22" y1="-12" x2="-10" y2="12" stroke="#38bdf8" />
              <line x1="-38" y1="20" x2="-22" y2="20" />
            </g>
            {/* Mechanical Link dashed */}
            <line x1="-10" y1="0" x2="6" y2="0" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
            {/* Switch Contacts on right */}
            <g stroke="#10b981" strokeWidth="1.6" fill="none">
              <line x1="38" y1="0" x2="16" y2="0" />
              {/* Contact blade pivoting at (16, 0) pointing to NO (22, -18) */}
              <line x1="16" y1="0" x2="26" y2="-12" />
              <circle cx="28" cy="-18" r="2" fill="#10b981" />
              <circle cx="28" cy="18" r="2" fill="#10b981" />
              <line x1="28" y1="-18" x2="38" y2="-18" />
              <line x1="28" y1="18" x2="38" y2="18" />
            </g>
            <text x="22" y="-20" fill="#cbd5e1" fontSize="6" fontFamily="monospace">NO</text>
            <text x="22" y="24" fill="#cbd5e1" fontSize="6" fontFamily="monospace">NC</text>
            <text x="22" y="4" fill="#cbd5e1" fontSize="6" fontFamily="monospace">COM</text>
          </g>
        );

      case 'transformer':
        return (
          <g stroke="#f59e0b" strokeWidth="1.8" fill="none">
            {/* Primary Inductor Coils */}
            <line x1="-38" y1="-20" x2="-16" y2="-20" />
            <path d="M -16,-20 A 7,7 0 0,1 -16,-6 A 7,7 0 0,1 -16,8 A 7,7 0 0,1 -16,20" />
            <line x1="-16" y1="20" x2="-38" y2="20" />
            {/* Core Plates in middle */}
            <line x1="-2" y1="-22" x2="-2" y2="22" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="2" y1="-22" x2="2" y2="22" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Secondary Inductor Coils */}
            <line x1="38" y1="-20" x2="16" y2="-20" />
            <path d="M 16,-20 A 7,7 0 0,0 16,-6 A 7,7 0 0,0 16,8 A 7,7 0 0,0 16,20" />
            <line x1="16" y1="20" x2="38" y2="20" />
          </g>
        );

      case 'lamp':
        return (
          <g>
            {/* Leads */}
            <line x1="-25" y1="0" x2="-14" y2="0" stroke="#f59e0b" strokeWidth="2" />
            <line x1="14" y1="0" x2="25" y2="0" stroke="#f59e0b" strokeWidth="2" />
            {/* Circle */}
            <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
            {/* Filament X */}
            <line x1="-9" y1="-9" x2="9" y2="9" stroke="#fbbf24" strokeWidth="2" />
            <line x1="-9" y1="9" x2="9" y2="-9" stroke="#fbbf24" strokeWidth="2" />
          </g>
        );

      case 'fuse':
        return (
          <g stroke="#f59e0b" strokeWidth="1.8" fill="none">
            {/* Leads */}
            <line x1="-25" y1="0" x2="-16" y2="0" />
            <line x1="16" y1="0" x2="25" y2="0" />
            {/* Fuse Cartridge */}
            <rect x="-16" y="-8" width="32" height="16" rx="2" fill="#0f172a" stroke="#f59e0b" />
            {/* Conductor through center */}
            <line x1="-16" y1="0" x2="16" y2="0" stroke="#fbbf24" strokeWidth="1.2" />
          </g>
        );

      case 'relay_4channel_module':
        return (
          <g>
            {/* Main Blue PCB Board */}
            <rect x="-65" y="-75" width="130" height="150" rx="6" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
            {/* Header banner */}
            <rect x="-65" y="-75" width="130" height="16" rx="4" fill="#172554" />
            <text x="0" y="-64" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              4-CHANNEL 5V RELAY MODULE
            </text>
            {/* 4x Songle Relay Cubes */}
            {[-56, -24, 8, 40].map((yPos, i) => (
              <g key={i} transform={`translate(0, ${yPos})`}>
                <rect x="-35" y="0" width="70" height="24" rx="2" fill="#2563eb" stroke="#93c5fd" strokeWidth="1" />
                <text x="0" y="11" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold" fontFamily="monospace">
                  SONGLE 5VDC
                </text>
                <text x="0" y="19" textAnchor="middle" fill="#bfdbfe" fontSize="5.5" fontFamily="sans-serif">
                  10A 250VAC • K{i + 1}
                </text>
                {/* Status LED */}
                <circle cx="-45" cy="12" r="2.5" fill="#ef4444" stroke="#ffffff" strokeWidth="0.5" />
              </g>
            ))}
            {/* Input & Output terminal indicators */}
            <text x="-58" y="70" textAnchor="start" fill="#93c5fd" fontSize="6" fontFamily="monospace">
              VCC GND IN1-4
            </text>
            <text x="58" y="70" textAnchor="end" fill="#93c5fd" fontSize="6" fontFamily="monospace">
              NO COM NC
            </text>
          </g>
        );

      case 'ir_receiver_1838':
        return (
          <g>
            {/* Metal casing */}
            <rect x="-25" y="-22" width="50" height="44" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            {/* IR Sensor Dome with mesh */}
            <circle cx="0" cy="-2" r="13" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Crosshatch mesh lines */}
            <line x1="-9" y1="-2" x2="9" y2="-2" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="-11" x2="0" y2="7" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="-8" x2="6" y2="4" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="4" x2="6" y2="-8" stroke="#64748b" strokeWidth="1" />
            <text x="0" y="18" textAnchor="middle" fill="#e2e8f0" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
              VS1838B IR
            </text>
          </g>
        );

      case 'battery_18650_pack':
        return (
          <g>
            {/* Battery holder frame */}
            <rect x="-46" y="-28" width="92" height="56" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            {/* Cell 1 (Purple Li-ion cylinder) */}
            <rect x="-40" y="-24" width="36" height="48" rx="3" fill="#6b21a8" stroke="#c084fc" strokeWidth="1.2" />
            <rect x="-26" y="-27" width="8" height="3" rx="1" fill="#e2e8f0" />
            <text x="-22" y="4" textAnchor="middle" fill="#f3e8ff" fontSize="6" fontWeight="bold" fontFamily="monospace" transform="rotate(-90 -22 4)">
              18650 Li-ion
            </text>
            {/* Cell 2 (Purple Li-ion cylinder) */}
            <rect x="4" y="-24" width="36" height="48" rx="3" fill="#6b21a8" stroke="#c084fc" strokeWidth="1.2" />
            <rect x="18" y="-27" width="8" height="3" rx="1" fill="#e2e8f0" />
            <text x="22" y="4" textAnchor="middle" fill="#f3e8ff" fontSize="6" fontWeight="bold" fontFamily="monospace" transform="rotate(-90 22 4)">
              18650 Li-ion
            </text>
            {/* Voltage badge */}
            <text x="0" y="24" textAnchor="middle" fill="#38bdf8" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
              DUAL 18650 (3.7V - 7.4V)
            </text>
          </g>
        );

      default:
        // Generic rectangular IC
        return (
          <g>
            <rect
              x={-def.width / 2}
              y={-def.height / 2}
              width={def.width}
              height={def.height}
              rx="3"
              fill="#1e293b"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <text x="0" y="4" textAnchor="middle" fill="#f1f5f9" fontSize="10" fontWeight="bold">
              {component.type.toUpperCase()}
            </text>
          </g>
        );
    }
  };

  return (
    <g
      id={`comp-${component.id}`}
      transform={`translate(${component.x}, ${component.y}) rotate(${rot})`}
      className="cursor-move select-none"
    >
      {/* Selection bounding box */}
      {isSelected && (
        <g className="pointer-events-none">
          <rect
            x={-def.width / 2 - 8}
            y={-def.height / 2 - 8}
            width={def.width + 16}
            height={def.height + 16}
            fill="#38bdf8"
            fillOpacity="0.08"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            rx="4"
          />
          {/* Corner anchor handles */}
          <rect x={-def.width / 2 - 11} y={-def.height / 2 - 11} width="6" height="6" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" rx="1" />
          <rect x={def.width / 2 + 5} y={-def.height / 2 - 11} width="6" height="6" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" rx="1" />
          <rect x={-def.width / 2 - 11} y={def.height / 2 + 5} width="6" height="6" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" rx="1" />
          <rect x={def.width / 2 + 5} y={def.height / 2 + 5} width="6" height="6" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" rx="1" />
        </g>
      )}

      {/* Main Symbol Graphic */}
      <g className="text-slate-100">{renderSymbolGraphic()}</g>

      {/* Pins and Pin Terminals */}
      {def.pins.map((pin) => {
        const isHovered = hoveredPinId === pin.id;
        const isProbed = probedPinId === pin.id;
        return (
          <g
            key={pin.id}
            transform={`translate(${pin.x}, ${pin.y})`}
            onMouseEnter={() => onPinHover && onPinHover(pin.id)}
            onMouseLeave={() => onPinHover && onPinHover(null)}
            onClick={(e) => {
              if (onPinClick) {
                e.stopPropagation();
                onPinClick(pin.id, e);
              }
            }}
            className="cursor-crosshair group/pin"
          >
            {/* Generous invisible hit-test area for effortless clicking */}
            <circle cx="0" cy="0" r="12" fill="transparent" />

            {/* Active Probed Pin Pulse Halo */}
            {isProbed && (
              <circle
                cx="0"
                cy="0"
                r="10"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                className="animate-ping"
                opacity="0.8"
              />
            )}

            {/* Terminal Pad Dot with Polarity/Reference Color-Coding */}
            {(() => {
              const isPositive = pin.name === '+' || pin.name === 'VCC' || pin.name === 'V+';
              const isNegative = pin.name === '-' || pin.name === 'GND' || pin.name === 'V-';
              const isEarth = pin.name === 'EARTH' || pin.name === 'PE';
              
              const defaultPadColor = isPositive
                ? '#ef4444'
                : isNegative
                ? '#0284c7'
                : isEarth
                ? '#10b981'
                : '#f59e0b';

              const padColor = isProbed
                ? '#0284c7'
                : isHovered
                ? '#38bdf8'
                : defaultPadColor;

              return (
                <>
                  <circle
                    cx="0"
                    cy="0"
                    r={isHovered ? 5.5 : isProbed ? 4.5 : 3.5}
                    fill={padColor}
                    stroke="#ffffff"
                    strokeWidth={isHovered || isProbed ? 1.5 : 1}
                    className="transition-all duration-150"
                  />

                  {/* Polarity/Reference badge for + / - / EARTH pins */}
                  {(isPositive || isNegative || isEarth) && (
                    <g transform={`translate(${pin.direction === 'left' ? -12 : pin.direction === 'right' ? 12 : 0}, ${pin.direction === 'top' ? -12 : pin.direction === 'bottom' ? 12 : 0})`} className="pointer-events-none select-none">
                      <circle
                        cx="0"
                        cy="0"
                        r="5.5"
                        fill={isPositive ? '#ef4444' : isNegative ? '#0284c7' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth="0.8"
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="6"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {isPositive ? '+' : isNegative ? '-' : '⏚'}
                      </text>
                    </g>
                  )}
                </>
              );
            })()}

            {/* Hover probe tooltip cue during live simulation */}
            {isSimulating && isHovered && (
              <g transform="translate(10, -10)" className="pointer-events-none select-none">
                <rect x="0" y="-10" width="80" height="18" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                <text x="40" y="2" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  ⚡ PROBE PIN
                </text>
              </g>
            )}

            {/* Pin name or number label */}
            {pin.name && (
              <text
                x={pin.direction === 'left' ? 7 : pin.direction === 'right' ? -7 : 0}
                y={pin.direction === 'top' ? 12 : pin.direction === 'bottom' ? -7 : 3}
                textAnchor={pin.direction === 'left' ? 'start' : pin.direction === 'right' ? 'end' : 'middle'}
                fontSize="7.5"
                fill={isSelected ? '#38bdf8' : (pin.name === '+' ? '#f87171' : pin.name === '-' ? '#38bdf8' : pin.name === 'EARTH' || pin.name === 'PE' ? '#34d399' : '#94a3b8')}
                stroke="none"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {pin.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Text Labels: Reference Designator, Value, and Footprint */}
      {/* We rotate the text back if the component is rotated so labels remain right-side-up */}
      <g
        transform={`rotate(${-rot})`}
        className="pointer-events-none select-none font-mono"
      >
        <text
          x={0}
          y={-def.height / 2 - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#38bdf8"
          stroke="#0f172a"
          strokeWidth="0.5"
        >
          {component.designator}
        </text>
        <text
          x={0}
          y={def.height / 2 + 13}
          textAnchor="middle"
          fontSize="9.5"
          fill="#f1f5f9"
          stroke="#0f172a"
          strokeWidth="0.5"
          fontWeight="500"
        >
          {component.value}
        </text>
        {/* Footprint / Package Details clearly mentioned */}
        {(component.footprint || def.defaultFootprint) && (
          <text
            x={0}
            y={def.height / 2 + 24}
            textAnchor="middle"
            fontSize="7.5"
            fill={isSelected ? '#7dd3fc' : '#64748b'}
            stroke="none"
            fontWeight={isSelected ? 'bold' : 'normal'}
            opacity={0.9}
          >
            [{component.footprint || def.defaultFootprint}]
          </text>
        )}

        {/* Live Simulation Telemetry (Current / Voltage / Frequency / Overload / Burnout) */}
        {isSimulating && simulationResult && (
          <g>
            <rect
              x={simulationResult.isBurnedOut ? -48 : simulationResult.isOverloaded ? -44 : -36}
              y={def.height / 2 + 18}
              width={simulationResult.isBurnedOut ? 96 : simulationResult.isOverloaded ? 88 : 72}
              height="15"
              rx="3"
              fill={
                simulationResult.isBurnedOut
                  ? '#450a0a'
                  : simulationResult.isOverloaded
                  ? '#451a03'
                  : '#064e3b'
              }
              stroke={
                simulationResult.isBurnedOut
                  ? '#ef4444'
                  : simulationResult.isOverloaded
                  ? '#f59e0b'
                  : '#10b981'
              }
              strokeWidth="1"
              className={simulationResult.isBurnedOut ? 'animate-pulse' : undefined}
            />
            <text
              x="0"
              y={def.height / 2 + 29}
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill={
                simulationResult.isBurnedOut
                  ? '#fca5a5'
                  : simulationResult.isOverloaded
                  ? '#fcd34d'
                  : '#6ee7b7'
              }
            >
              {simulationResult.isBurnedOut
                ? `💥 BURNT (${(simulationResult.current * 1000).toFixed(0)}mA)`
                : simulationResult.isOverloaded
                ? `⚠️ OVERLOAD (${(simulationResult.current * 1000).toFixed(1)}mA)`
                : simulationResult.frequency !== undefined
                ? `${simulationResult.frequency.toFixed(1)}Hz`
                : simulationResult.current >= 0.001
                ? `${(simulationResult.current * 1000).toFixed(1)}mA`
                : `${simulationResult.voltageDrop.toFixed(1)}V`}
            </text>
          </g>
        )}
      </g>
    </g>
  );
};
