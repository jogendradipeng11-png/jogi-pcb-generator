import { ComponentDefinition, PinDefinition } from '../types';
import { registerCustomComponentDef } from './components';

const STORAGE_KEY = 'eda_saved_custom_components_v1';

// Preset Google & Electronic Components Knowledge Base for instantaneous search & import
export const GOOGLE_COMPONENTS_DIRECTORY: ComponentDefinition[] = [
  {
    type: 'ext_ads1115',
    name: 'ADS1115 16-Bit 4-Channel I2C ADC Module',
    prefix: 'U',
    category: 'ics',
    defaultVal: 'ADS1115 16-Bit',
    defaultFootprint: 'MODULE_ADS1115_10P',
    width: 90,
    height: 75,
    pins: [
      { id: '1', name: 'VDD', x: -45, y: -25, direction: 'left', type: 'power' },
      { id: '2', name: 'GND', x: -45, y: 25, direction: 'left', type: 'ground' },
      { id: '3', name: 'SCL', x: -45, y: -10, direction: 'left' },
      { id: '4', name: 'SDA', x: -45, y: 5, direction: 'left' },
      { id: '5', name: 'ADDR', x: -45, y: 18, direction: 'left' },
      { id: '6', name: 'ALRT', x: 45, y: -25, direction: 'right' },
      { id: '7', name: 'A0', x: 45, y: -10, direction: 'right' },
      { id: '8', name: 'A1', x: 45, y: 5, direction: 'right' },
      { id: '9', name: 'A2', x: 45, y: 18, direction: 'right' },
      { id: '10', name: 'A3', x: 45, y: 30, direction: 'right' },
    ],
    description: 'Ultra-small, low-power, 16-bit precision Analog-to-Digital Converter with internal PGA & voltage reference.',
    symbol: 'generic_ic',
  },
  {
    type: 'ext_pca9685',
    name: 'PCA9685 16-Channel 12-Bit PWM / Servo Driver',
    prefix: 'U',
    category: 'modules',
    defaultVal: 'PCA9685 16xPWM',
    defaultFootprint: 'MODULE_PCA9685_8P',
    width: 95,
    height: 75,
    pins: [
      { id: '1', name: 'VCC', x: -47, y: -25, direction: 'left', type: 'power' },
      { id: '2', name: 'GND', x: -47, y: 25, direction: 'left', type: 'ground' },
      { id: '3', name: 'SCL', x: -47, y: -10, direction: 'left' },
      { id: '4', name: 'SDA', x: -47, y: 5, direction: 'left' },
      { id: '5', name: 'OE', x: -47, y: 18, direction: 'left' },
      { id: '6', name: 'V+', x: 47, y: -20, direction: 'right', type: 'power' },
      { id: '7', name: 'PWM0', x: 47, y: 0, direction: 'right' },
      { id: '8', name: 'PWM15', x: 47, y: 20, direction: 'right' },
    ],
    description: 'I2C-controlled 16-channel LED and PWM servo motor controller with dedicated power terminal.',
    symbol: 'generic_ic',
  },
  {
    type: 'ext_drv8825',
    name: 'DRV8825 Stepper Motor Driver Carrier',
    prefix: 'U',
    category: 'modules',
    defaultVal: 'DRV8825 1/32 Step',
    defaultFootprint: 'MODULE_DRV8825_16P',
    width: 90,
    height: 80,
    pins: [
      { id: '1', name: 'EN', x: -45, y: -30, direction: 'left' },
      { id: '2', name: 'M0', x: -45, y: -18, direction: 'left' },
      { id: '3', name: 'M1', x: -45, y: -6, direction: 'left' },
      { id: '4', name: 'M2', x: -45, y: 6, direction: 'left' },
      { id: '5', name: 'RST', x: -45, y: 18, direction: 'left' },
      { id: '6', name: 'SLP', x: -45, y: 30, direction: 'left' },
      { id: '7', name: 'STEP', x: 45, y: -30, direction: 'right' },
      { id: '8', name: 'DIR', x: 45, y: -18, direction: 'right' },
      { id: '9', name: 'VMOT', x: 45, y: -6, direction: 'right', type: 'power' },
      { id: '10', name: 'GND', x: 45, y: 6, direction: 'right', type: 'ground' },
      { id: '11', name: 'A1', x: 45, y: 18, direction: 'right' },
      { id: '12', name: 'A2', x: 45, y: 30, direction: 'right' },
    ],
    description: 'Microstepping bipolar stepper motor driver with adjustable current limiting, overcurrent and overtemp protection.',
    symbol: 'generic_ic',
  },
  {
    type: 'ext_sx1278_lora',
    name: 'SX1278 433MHz LoRa Long Range Transceiver (Ra-02)',
    prefix: 'U',
    category: 'modules',
    defaultVal: 'SX1278 LoRa',
    defaultFootprint: 'MODULE_LORA_8P',
    width: 85,
    height: 70,
    pins: [
      { id: '1', name: '3.3V', x: -42, y: -25, direction: 'left', type: 'power' },
      { id: '2', name: 'GND', x: -42, y: 25, direction: 'left', type: 'ground' },
      { id: '3', name: 'MISO', x: 42, y: -25, direction: 'right' },
      { id: '4', name: 'MOSI', x: 42, y: -10, direction: 'right' },
      { id: '5', name: 'SCK', x: 42, y: 5, direction: 'right' },
      { id: '6', name: 'NSS', x: 42, y: 20, direction: 'right' },
      { id: '7', name: 'RST', x: -42, y: -5, direction: 'left' },
      { id: '8', name: 'DIO0', x: -42, y: 10, direction: 'left' },
    ],
    description: 'Semtech SX1278 long range spread-spectrum wireless module (10km+ range) with SPI interface.',
    symbol: 'generic_ic',
  },
  {
    type: 'ext_sim800l',
    name: 'SIM800L GPRS / GSM Cellular Module',
    prefix: 'U',
    category: 'modules',
    defaultVal: 'SIM800L 2G Quad',
    defaultFootprint: 'MODULE_SIM800L_7P',
    width: 85,
    height: 70,
    pins: [
      { id: '1', name: 'VCC_4V', x: -42, y: -20, direction: 'left', type: 'power' },
      { id: '2', name: 'GND', x: -42, y: 20, direction: 'left', type: 'ground' },
      { id: '3', name: 'RST', x: -42, y: 0, direction: 'left' },
      { id: '4', name: 'TXD', x: 42, y: -15, direction: 'right' },
      { id: '5', name: 'RXD', x: 42, y: 0, direction: 'right' },
      { id: '6', name: 'RING', x: 42, y: 15, direction: 'right' },
    ],
    description: 'Quad-band GSM/GPRS wireless cellular breakout for SMS, voice calls, and data transmission. Requires 3.7V - 4.2V (2A burst current).',
    symbol: 'generic_ic',
  },
  {
    type: 'ext_esp32_cam',
    name: 'ESP32-CAM WiFi + Bluetooth Video Module',
    prefix: 'U',
    category: 'modules',
    defaultVal: 'ESP32-CAM OV2640',
    defaultFootprint: 'MODULE_ESP32CAM_16P',
    width: 95,
    height: 85,
    pins: [
      { id: '1', name: '5V', x: -47, y: -30, direction: 'left', type: 'power' },
      { id: '2', name: 'GND', x: -47, y: 30, direction: 'left', type: 'ground' },
      { id: '3', name: 'IO0', x: -47, y: -15, direction: 'left' },
      { id: '4', name: 'U0R', x: -47, y: 0, direction: 'left' },
      { id: '5', name: 'U0T', x: -47, y: 15, direction: 'left' },
      { id: '6', name: '3V3', x: 47, y: -30, direction: 'right', type: 'power' },
      { id: '7', name: 'IO4_FLASH', x: 47, y: -15, direction: 'right' },
      { id: '8', name: 'IO12', x: 47, y: 0, direction: 'right' },
      { id: '9', name: 'IO13', x: 47, y: 15, direction: 'right' },
      { id: '10', name: 'IO14', x: 47, y: 30, direction: 'right' },
    ],
    description: 'High-performance Dual-Core 32-bit MCU with integrated 2MP OV2640 camera, microSD slot, and high-brightness LED flash.',
    symbol: 'generic_ic',
  },
  {
    type: 'ext_oled_096_i2c',
    name: '0.96 inch I2C OLED Display (SSD1306 128x64)',
    prefix: 'DISP',
    category: 'modules',
    defaultVal: 'SSD1306 128x64',
    defaultFootprint: 'MODULE_OLED_4P',
    width: 80,
    height: 60,
    pins: [
      { id: '1', name: 'GND', x: -40, y: 15, direction: 'left', type: 'ground' },
      { id: '2', name: 'VCC', x: -40, y: -15, direction: 'left', type: 'power' },
      { id: '3', name: 'SCL', x: 40, y: -10, direction: 'right' },
      { id: '4', name: 'SDA', x: 40, y: 10, direction: 'right' },
    ],
    description: 'High contrast 128x64 dot matrix monochrome OLED graphic display module with I2C interface.',
    symbol: 'generic_ic',
  },
  {
    type: 'ext_ch340c_usb',
    name: 'CH340C USB-to-UART Serial Converter IC',
    prefix: 'U',
    category: 'ics',
    defaultVal: 'CH340C SOP-16',
    defaultFootprint: 'SOIC-16',
    width: 85,
    height: 70,
    pins: [
      { id: '1', name: 'GND', x: -42, y: 25, direction: 'left', type: 'ground' },
      { id: '2', name: 'TXD', x: 42, y: -20, direction: 'right' },
      { id: '3', name: 'RXD', x: 42, y: -5, direction: 'right' },
      { id: '4', name: 'V3', x: -42, y: -10, direction: 'left' },
      { id: '5', name: 'UD+', x: -42, y: 5, direction: 'left' },
      { id: '6', name: 'UD-', x: -42, y: 15, direction: 'left' },
      { id: '7', name: 'VCC', x: -42, y: -25, direction: 'left', type: 'power' },
      { id: '8', name: 'DTR#', x: 42, y: 10, direction: 'right' },
      { id: '9', name: 'RTS#', x: 42, y: 25, direction: 'right' },
    ],
    description: 'Full-speed USB to serial converter with internal oscillator. Direct USB-C/Micro-USB to MCU programming.',
    symbol: 'generic_ic',
  },
];

// Load permanently saved components from localStorage
export function loadUserSavedComponents(): ComponentDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: ComponentDefinition[] = JSON.parse(raw);
    list.forEach((def) => registerCustomComponentDef(def));
    return list;
  } catch (e) {
    console.error('Failed to load user saved components', e);
    return [];
  }
}

// Save a component to local storage permanently
export function saveUserComponent(def: ComponentDefinition): void {
  try {
    registerCustomComponentDef(def);
    const existing = loadUserSavedComponents();
    const updated = [def, ...existing.filter((c) => c.type !== def.type)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save user component to storage', e);
  }
}

// Remove a component from storage
export function removeUserComponent(type: string): void {
  try {
    const existing = loadUserSavedComponents();
    const updated = existing.filter((c) => c.type !== type);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete component from storage', e);
  }
}

// Build a custom component dynamically from pin list
export function synthesizeCustomPart(
  name: string,
  pinString: string,
  category: ComponentDefinition['category'] = 'modules',
  footprintPrefix = 'MODULE'
): ComponentDefinition {
  const cleanName = name.trim() || 'Custom Component';
  const cleanType = `user_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
  const pinNames = pinString
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pins: PinDefinition[] = [];
  const halfCount = Math.ceil(pinNames.length / 2);
  const spacing = 18;
  const startY = -((halfCount - 1) * spacing) / 2;

  pinNames.forEach((pName, idx) => {
    const isLeft = idx < halfCount;
    const rowIdx = isLeft ? idx : idx - halfCount;
    const y = Math.round(startY + rowIdx * spacing);
    const isPwr = /vcc|\+5v|\+3v3|vin|vdd|v\+|power/i.test(pName);
    const isGnd = /gnd|0v|ground|vss|v\-/i.test(pName);

    pins.push({
      id: String(idx + 1),
      name: pName,
      x: isLeft ? -45 : 45,
      y,
      direction: isLeft ? 'left' : 'right',
      type: isPwr ? 'power' : isGnd ? 'ground' : 'passive',
    });
  });

  const height = Math.max(60, halfCount * spacing + 30);
  const newDef: ComponentDefinition = {
    type: cleanType,
    name: cleanName,
    prefix: category === 'sensors' ? 'SEN' : 'U',
    category,
    defaultVal: cleanName,
    defaultFootprint: `${footprintPrefix}_${cleanName.toUpperCase().slice(0, 10)}`,
    width: 90,
    height,
    pins: pins.length > 0 ? pins : [
      { id: '1', name: 'VCC', x: -40, y: -15, direction: 'left', type: 'power' },
      { id: '2', name: 'GND', x: -40, y: 15, direction: 'left', type: 'ground' },
      { id: '3', name: 'OUT', x: 40, y: 0, direction: 'right' },
    ],
    description: `Custom ${cleanName} with ${pins.length} pins created via Google search/synthesizer`,
    symbol: 'generic_ic',
  };

  saveUserComponent(newDef);
  return newDef;
}
