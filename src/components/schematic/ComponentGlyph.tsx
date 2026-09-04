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
}

export const ComponentGlyph: React.FC<ComponentGlyphProps> = ({
  component,
  isSelected = false,
  onPinHover,
  hoveredPinId,
  simulationResult,
  isSimulating = false,
  onToggleSwitch,
}) => {
  const def = getComponentDef(component.type);
  const rot = component.rotation || 0;

  // Check if LED is actively conducting
  const isLedLit =
    component.type === 'led' &&
    isSimulating &&
    simulationResult &&
    simulationResult.current > 0.001;

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
            {isLedLit && (
              <>
                <circle cx="0" cy="0" r="22" fill="#22c55e" fillOpacity="0.4" />
                <circle cx="0" cy="0" r="14" fill="#86efac" fillOpacity="0.6" />
              </>
            )}
            <line x1="-25" y1="0" x2="-8" y2="0" />
            <line x1="8" y1="0" x2="25" y2="0" />
            <polygon
              points="-8,-10 -8,10 8,0"
              fill={isLedLit ? '#4ade80' : '#22c55e'}
              stroke={isLedLit ? '#dcfce7' : 'currentColor'}
              strokeWidth={isLedLit ? '2.5' : '1.5'}
            />
            <line x1="8" y1="-10" x2="8" y2="10" strokeWidth="2.5" />
            {/* Light emission arrows */}
            <g stroke={isLedLit ? '#fde047' : '#eab308'} strokeWidth={isLedLit ? '2' : '1.5'}>
              <line x1="2" y1="-12" x2="10" y2="-20" />
              <polygon points="10,-20 6,-18 9,-15" fill={isLedLit ? '#fef08a' : '#eab308'} stroke="none" />
              <line x1="8" y1="-8" x2="16" y2="-16" />
              <polygon points="16,-16 12,-14 15,-11" fill={isLedLit ? '#fef08a' : '#eab308'} stroke="none" />
            </g>
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
        <rect
          x={-def.width / 2 - 8}
          y={-def.height / 2 - 8}
          width={def.width + 16}
          height={def.height + 16}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          rx="4"
        />
      )}

      {/* Main Symbol Graphic */}
      <g className="text-slate-100">{renderSymbolGraphic()}</g>

      {/* Pins and Pin Terminals */}
      {def.pins.map((pin) => {
        const isHovered = hoveredPinId === pin.id;
        return (
          <g
            key={pin.id}
            transform={`translate(${pin.x}, ${pin.y})`}
            onMouseEnter={() => onPinHover && onPinHover(pin.id)}
            onMouseLeave={() => onPinHover && onPinHover(null)}
            className="cursor-crosshair"
          >
            {/* Terminal Pad Dot */}
            <circle
              cx="0"
              cy="0"
              r={isHovered ? 5 : 3}
              fill={isHovered ? '#38bdf8' : '#ef4444'}
              stroke="#ffffff"
              strokeWidth={isHovered ? 1.5 : 1}
              className="transition-all duration-150"
            />

            {/* Pin name or number label (only if not a simple passive) */}
            {pin.name && def.category === 'ics' && (
              <text
                x={pin.direction === 'left' ? 6 : pin.direction === 'right' ? -6 : 0}
                y={pin.direction === 'top' ? 12 : pin.direction === 'bottom' ? -6 : 3}
                textAnchor={pin.direction === 'left' ? 'start' : pin.direction === 'right' ? 'end' : 'middle'}
                fontSize="8"
                fill="#94a3b8"
                stroke="none"
                fontFamily="monospace"
              >
                {pin.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Text Labels: Reference Designator & Value */}
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
          y={def.height / 2 + 14}
          textAnchor="middle"
          fontSize="9"
          fill="#e2e8f0"
          stroke="#0f172a"
          strokeWidth="0.5"
        >
          {component.value}
        </text>

        {/* Live Simulation Telemetry (Current / Voltage / Frequency) */}
        {isSimulating && simulationResult && (
          <g>
            <rect
              x="-36"
              y={def.height / 2 + 18}
              width="72"
              height="14"
              rx="3"
              fill="#064e3b"
              stroke="#10b981"
              strokeWidth="0.8"
            />
            <text
              x="0"
              y={def.height / 2 + 28}
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="#6ee7b7"
            >
              {simulationResult.frequency
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
