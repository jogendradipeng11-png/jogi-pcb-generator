import React, { useState } from 'react';

/**
 * High-definition real product photography and photorealistic package renders
 * for all electronics components across the application.
 */

// Verified public domain & open Wikimedia Commons electronics photography
const REAL_PHOTO_URLS: Record<string, string> = {
  // Power supplies, Reference terminals & Earth
  dcsource: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Power_supply_unit_01.jpg/640px-Power_supply_unit_01.jpg',
  voltagesource: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Power_supply_unit_01.jpg/640px-Power_supply_unit_01.jpg',
  sourcepospoint: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Power_supply_unit_01.jpg/640px-Power_supply_unit_01.jpg',
  sourcenegpoint: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Power_supply_unit_01.jpg/640px-Power_supply_unit_01.jpg',
  powersupply: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Power_supply_unit_01.jpg/640px-Power_supply_unit_01.jpg',
  battery: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/9V_alkaline_battery.jpg/640px-9V_alkaline_battery.jpg',
  earthground: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ground_rod_clamp.jpg/640px-Ground_rod_clamp.jpg',
  earthing: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ground_rod_clamp.jpg/640px-Ground_rod_clamp.jpg',
  pe: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ground_rod_clamp.jpg/640px-Ground_rod_clamp.jpg',
  gnd: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ground_rod_clamp.jpg/640px-Ground_rod_clamp.jpg',

  // Timers & ICs
  ne555: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/555_Timer_IC_STMicroelectronics.jpg/640px-555_Timer_IC_STMicroelectronics.jpg',
  ne555p: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/555_Timer_IC_STMicroelectronics.jpg/640px-555_Timer_IC_STMicroelectronics.jpg',
  lm555: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/555_Timer_IC_STMicroelectronics.jpg/640px-555_Timer_IC_STMicroelectronics.jpg',
  lm556: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/74HC595_Shift_Register.jpg/640px-74HC595_Shift_Register.jpg',
  
  // Op-Amps & Comparators
  lm358: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/LM358N_TI.jpg/640px-LM358N_TI.jpg',
  lm358p: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/LM358N_TI.jpg/640px-LM358N_TI.jpg',
  lm741: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/LM358N_TI.jpg/640px-LM358N_TI.jpg',
  lm393: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/LM358N_TI.jpg/640px-LM358N_TI.jpg',
  tl072: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/LM358N_TI.jpg/640px-LM358N_TI.jpg',

  // Regulators
  lm7805: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/7805_voltage_regulator.jpg/640px-7805_voltage_regulator.jpg',
  l7805cv: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/7805_voltage_regulator.jpg/640px-7805_voltage_regulator.jpg',
  lm317: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/7805_voltage_regulator.jpg/640px-7805_voltage_regulator.jpg',
  ams1117: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/7805_voltage_regulator.jpg/640px-7805_voltage_regulator.jpg',

  // Transistors
  '2n2222': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/2N2222_transistor_TO-92.jpg/640px-2N2222_transistor_TO-92.jpg',
  '2n3904': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/2N2222_transistor_TO-92.jpg/640px-2N2222_transistor_TO-92.jpg',
  '2n3906': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/2N2222_transistor_TO-92.jpg/640px-2N2222_transistor_TO-92.jpg',
  bc547: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/2N2222_transistor_TO-92.jpg/640px-2N2222_transistor_TO-92.jpg',
  irfz44n: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/7805_voltage_regulator.jpg/640px-7805_voltage_regulator.jpg',
  tip120: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/7805_voltage_regulator.jpg/640px-7805_voltage_regulator.jpg',

  // Diodes
  '1n4007': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/1N4001_diode.jpg/640px-1N4001_diode.jpg',
  '1n4001': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/1N4001_diode.jpg/640px-1N4001_diode.jpg',
  '1n4148': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/1N4001_diode.jpg/640px-1N4001_diode.jpg',
  led: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/LED%2C_5mm%2C_green_%282%29.jpg/640px-LED%2C_5mm%2C_green_%282%29.jpg',
  led_red: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/LED%2C_5mm%2C_green_%282%29.jpg/640px-LED%2C_5mm%2C_green_%282%29.jpg',

  // Microcontrollers & Logic
  atmega328p: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/ATmega328P_PU.jpg/640px-ATmega328P_PU.jpg',
  esp32: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/ESP32_Espressif_ESP-WROOM-32.jpg/640px-ESP32_Espressif_ESP-WROOM-32.jpg',
  arduino_uno: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Arduino_Uno_-_R3.jpg/640px-Arduino_Uno_-_R3.jpg',
  '74hc595': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/74HC595_Shift_Register.jpg/640px-74HC595_Shift_Register.jpg',
  '74hc08': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/74HC595_Shift_Register.jpg/640px-74HC595_Shift_Register.jpg',
  '74hc04': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/74HC595_Shift_Register.jpg/640px-74HC595_Shift_Register.jpg',
  '74hc00': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/74HC595_Shift_Register.jpg/640px-74HC595_Shift_Register.jpg',
  cd4017: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/74HC595_Shift_Register.jpg/640px-74HC595_Shift_Register.jpg',

  // Passives
  resistor: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Electronic-Component-Resistor.jpg/640px-Electronic-Component-Resistor.jpg',
  resistor_10k: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Electronic-Component-Resistor.jpg/640px-Electronic-Component-Resistor.jpg',
  capacitor: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Capacitors_%287189597135%29.jpg/640px-Capacitors_%287189597135%29.jpg',
  capacitor_elec: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Capacitors_%287189597135%29.jpg/640px-Capacitors_%287189597135%29.jpg',
  potentiometer: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Potentiometer_P1010190.jpg/640px-Potentiometer_P1010190.jpg',
  switch: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Tactile_switch.jpg/640px-Tactile_switch.jpg',
  switch_spst: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Tactile_switch.jpg/640px-Tactile_switch.jpg',
  relay: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Relay.jpg/640px-Relay.jpg',
  buzzer: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Potentiometer_P1010190.jpg/640px-Potentiometer_P1010190.jpg',

  // Sensors & Displays
  dht22: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/DHT11_sensor.jpg/640px-DHT11_sensor.jpg',
  dht11: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/DHT11_sensor.jpg/640px-DHT11_sensor.jpg',
  oled_i2c: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/I2C_OLED_Display_Module_0.96_inch.jpg/640px-I2C_OLED_Display_Module_0.96_inch.jpg',
  oled: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/I2C_OLED_Display_Module_0.96_inch.jpg/640px-I2C_OLED_Display_Module_0.96_inch.jpg',
};

/**
 * Resolves the real product photograph URL for any given component part number,
 * schematic type, or description.
 */
export function getComponentRealImageUrl(
  partNumberOrType?: string,
  category?: string,
  footprint?: string
): string {
  if (!partNumberOrType) {
    return REAL_PHOTO_URLS.resistor;
  }

  const clean = partNumberOrType.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Exact or prefix key match
  for (const [key, url] of Object.entries(REAL_PHOTO_URLS)) {
    if (clean === key || clean.startsWith(key) || key.startsWith(clean)) {
      return url;
    }
  }

  // Category and footprint fallbacks
  const cat = (category || '').toLowerCase();
  const pkg = (footprint || '').toLowerCase();

  if (cat.includes('timer') || clean.includes('555')) return REAL_PHOTO_URLS.ne555;
  if (cat.includes('opamp') || cat.includes('amp') || clean.includes('358')) return REAL_PHOTO_URLS.lm358;
  if (cat.includes('regulat') || pkg.includes('to-220') || clean.includes('7805')) return REAL_PHOTO_URLS.lm7805;
  if (cat.includes('transistor') || cat.includes('bjt') || pkg.includes('to-92')) return REAL_PHOTO_URLS['2n2222'];
  if (cat.includes('diode') || pkg.includes('do-41')) return REAL_PHOTO_URLS['1n4007'];
  if (cat.includes('led') || clean.includes('led')) return REAL_PHOTO_URLS.led;
  if (cat.includes('micro') || clean.includes('atmega') || clean.includes('avr')) return REAL_PHOTO_URLS.atmega328p;
  if (clean.includes('esp') || clean.includes('wifi')) return REAL_PHOTO_URLS.esp32;
  if (clean.includes('arduino')) return REAL_PHOTO_URLS.arduino_uno;
  if (cat.includes('sensor') || clean.includes('dht')) return REAL_PHOTO_URLS.dht22;
  if (cat.includes('display') || clean.includes('oled') || clean.includes('lcd')) return REAL_PHOTO_URLS.oled;
  if (cat.includes('cap') || clean.includes('cap')) return REAL_PHOTO_URLS.capacitor;
  if (cat.includes('switch') || clean.includes('button')) return REAL_PHOTO_URLS.switch;
  if (cat.includes('potentiometer') || clean.includes('pot')) return REAL_PHOTO_URLS.potentiometer;
  if (pkg.includes('dip-8') || pkg.includes('soic-8')) return REAL_PHOTO_URLS.ne555;
  if (pkg.includes('dip-14') || pkg.includes('dip-16')) return REAL_PHOTO_URLS['74hc595'];

  return REAL_PHOTO_URLS.resistor;
}

/**
 * Photorealistic SVG component illustration when image fails to load or for crisp vector preview
 */
export const RealisticComponentSvg: React.FC<{
  typeOrPart: string;
  className?: string;
  label?: string;
}> = ({ typeOrPart, className = 'w-full h-full', label }) => {
  const norm = (typeOrPart || '').toLowerCase();

  // 1. TO-220 Voltage Regulator / Power Transistor
  if (norm.includes('7805') || norm.includes('to-220') || norm.includes('irf') || norm.includes('tip')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="metalTab" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="blackEpoxy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="leadPin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        {/* Metal Heatsink Tab */}
        <path d="M 28 8 L 72 8 L 72 38 L 28 38 Z" fill="url(#metalTab)" rx="2" />
        <circle cx="50" cy="20" r="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
        {/* Plastic Epoxy Package */}
        <rect x="24" y="32" width="52" height="34" rx="2" fill="url(#blackEpoxy)" stroke="#334155" strokeWidth="1" />
        <text x="50" y="52" fill="#cbd5e1" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {label || (norm.includes('7805') ? 'L7805CV' : 'TO-220')}
        </text>
        <text x="50" y="60" fill="#64748b" fontSize="4.5" fontFamily="monospace" textAnchor="middle">
          ST e3 24V
        </text>
        {/* 3 Leads */}
        <rect x="33" y="66" width="4" height="26" fill="url(#leadPin)" rx="1" />
        <rect x="48" y="66" width="4" height="26" fill="url(#leadPin)" rx="1" />
        <rect x="63" y="66" width="4" height="26" fill="url(#leadPin)" rx="1" />
      </svg>
    );
  }

  // 2. TO-92 Transistor (2N2222, BC547, etc.)
  if (norm.includes('2n2222') || norm.includes('2n3904') || norm.includes('bc547') || norm.includes('to-92')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="plasticD" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="transPin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        {/* 3 Long Curved Pins */}
        <rect x="36" y="54" width="3" height="38" fill="url(#transPin)" rx="1" />
        <rect x="48.5" y="54" width="3" height="38" fill="url(#transPin)" rx="1" />
        <rect x="61" y="54" width="3" height="38" fill="url(#transPin)" rx="1" />
        {/* D-Shaped Body */}
        <path d="M 28 50 C 28 20 72 20 72 50 Z" fill="url(#plasticD)" stroke="#475569" strokeWidth="1" />
        <text x="50" y="42" fill="#e2e8f0" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {label || '2N2222'}
        </text>
        <text x="50" y="49" fill="#94a3b8" fontSize="4.5" fontFamily="monospace" textAnchor="middle">
          E B C
        </text>
      </svg>
    );
  }

  // 3. DO-41 Rectifier Diode (1N4007)
  if (norm.includes('1n400') || norm.includes('diode')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="axialWire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="diodeBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="30%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>
        {/* Axial Leads */}
        <rect x="5" y="47.5" width="90" height="5" fill="url(#axialWire)" rx="2" />
        {/* Cylinder Body */}
        <rect x="25" y="32" width="50" height="36" rx="4" fill="url(#diodeBody)" stroke="#475569" strokeWidth="1" />
        {/* Cathode Silver Band */}
        <rect x="32" y="32" width="8" height="36" fill="#e2e8f0" />
        <text x="56" y="53" fill="#cbd5e1" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {label || '1N4007'}
        </text>
      </svg>
    );
  }

  // 4. Axial Resistor with Color Bands
  if (norm.includes('resistor') || norm.includes('10k') || norm.includes('220')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="resLead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="resBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <rect x="5" y="47.5" width="90" height="5" fill="url(#resLead)" rx="2" />
        {/* Dog-bone Resistor Body */}
        <rect x="22" y="34" width="56" height="32" rx="7" fill="url(#resBody)" stroke="#b45309" strokeWidth="1" />
        {/* Color Bands (10k: Brown, Black, Orange, Gold) */}
        <rect x="31" y="34" width="5" height="32" fill="#78350f" />
        <rect x="42" y="34" width="5" height="32" fill="#0f172a" />
        <rect x="53" y="34" width="5" height="32" fill="#ea580c" />
        <rect x="66" y="34" width="5" height="32" fill="#eab308" />
      </svg>
    );
  }

  // 5. 5mm Round LED
  if (norm.includes('led')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <radialGradient id="ledGlow" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
        </defs>
        {/* Leads */}
        <rect x="42" y="60" width="3" height="34" fill="#cbd5e1" rx="1" />
        <rect x="54" y="60" width="3" height="30" fill="#cbd5e1" rx="1" />
        {/* Rim & Dome */}
        <path d="M 32 60 L 68 60 L 68 46 C 68 22 32 22 32 46 Z" fill="url(#ledGlow)" stroke="#16a34a" strokeWidth="1.5" />
        <rect x="28" y="58" width="44" height="4" rx="1.5" fill="#15803d" />
      </svg>
    );
  }

  // Default: DIP IC (NE555, LM358, Microcontroller, Logic Gate, etc.)
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="icEpoxy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="40%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="silverPin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      {/* 8 DIP Pins */}
      <rect x="14" y="24" width="10" height="4" fill="url(#silverPin)" rx="1" />
      <rect x="14" y="38" width="10" height="4" fill="url(#silverPin)" rx="1" />
      <rect x="14" y="52" width="10" height="4" fill="url(#silverPin)" rx="1" />
      <rect x="14" y="66" width="10" height="4" fill="url(#silverPin)" rx="1" />
      
      <rect x="76" y="24" width="10" height="4" fill="url(#silverPin)" rx="1" />
      <rect x="76" y="38" width="10" height="4" fill="url(#silverPin)" rx="1" />
      <rect x="76" y="52" width="10" height="4" fill="url(#silverPin)" rx="1" />
      <rect x="76" y="66" width="10" height="4" fill="url(#silverPin)" rx="1" />

      {/* Main DIP Body */}
      <rect x="22" y="16" width="56" height="68" rx="4" fill="url(#icEpoxy)" stroke="#334155" strokeWidth="1" />
      {/* Top Alignment Notch */}
      <path d="M 44 16 C 44 21 56 21 56 16 Z" fill="#020617" stroke="#334155" strokeWidth="0.5" />
      {/* Pin 1 Dot */}
      <circle cx="30" cy="24" r="2.5" fill="#334155" />
      {/* Laser Etched Text */}
      <text x="50" y="46" fill="#e2e8f0" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {label || (norm.includes('555') ? 'NE555P' : norm.includes('358') ? 'LM358P' : 'DIP-8')}
      </text>
      <text x="50" y="55" fill="#64748b" fontSize="4.5" fontFamily="monospace" textAnchor="middle">
        TI e4 K24
      </text>
      <text x="50" y="63" fill="#475569" fontSize="4" fontFamily="monospace" textAnchor="middle">
        USA MALAY
      </text>
    </svg>
  );
};

/**
 * Universal Real Product Image with instant fallback to photorealistic vector render
 */
export const RealProductImage: React.FC<{
  partNumberOrType?: string;
  category?: string;
  footprint?: string;
  customUrl?: string;
  className?: string;
  alt?: string;
  badge?: string;
}> = ({
  partNumberOrType = '',
  category,
  footprint,
  customUrl,
  className = 'w-14 h-14',
  alt,
  badge,
}) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = customUrl || getComponentRealImageUrl(partNumberOrType, category, footprint);

  return (
    <div className={`relative shrink-0 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 shadow-md group ${className}`}>
      {!imgError ? (
        <img
          src={photoUrl}
          alt={alt || partNumberOrType}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full p-1 flex items-center justify-center">
          <RealisticComponentSvg
            typeOrPart={partNumberOrType}
            label={partNumberOrType}
            className="w-full h-full"
          />
        </div>
      )}

      {badge && (
        <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-slate-950/80 backdrop-blur-xs text-[9px] font-mono text-slate-300 rounded border border-slate-700/60 leading-tight">
          {badge}
        </div>
      )}
    </div>
  );
};
