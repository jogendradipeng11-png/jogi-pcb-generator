import { GoogleGenAI, Type } from "@google/genai";

// Vercel Serverless Function Handler for Google Search Reference
export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { query, type = "all" } = req.body || {};
    const q = (typeof query === "string" ? query.trim() : "") || "Electronic Components & Circuits";

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an expert Google Electronics & EDA Schematic Search agent.
Your task is to search electronic component databases, manufacturer datasheets, and circuit repositories for the user's query.
Return an array of 3 to 6 verified real-world electronic components and/or modular subcircuits matching the query.
For circuits, identify all the individual components (resistors, capacitors, ICs, transistors, power supplies, grounds) needed to construct the circuit.`;

        const promptText = `Search electronic parts and circuit diagrams for query: "${q}"
Filter type: ${type} (all, component, circuit).
Return valid JSON matching the schema.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                results: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      type: { type: Type.STRING, description: "component or circuit" },
                      category: { type: Type.STRING },
                      description: { type: Type.STRING },
                      manufacturer: { type: Type.STRING },
                      partNumber: { type: Type.STRING },
                      datasheetUrl: { type: Type.STRING },
                      googleSearchUrl: { type: Type.STRING },
                      supplyVoltage: { type: Type.STRING },
                      footprint: { type: Type.STRING },
                      pins: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            direction: { type: Type.STRING },
                            type: { type: Type.STRING },
                          },
                          required: ["id", "name"],
                        },
                      },
                      identifiedParts: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            designator: { type: Type.STRING },
                            value: { type: Type.STRING },
                            type: { type: Type.STRING },
                            footprint: { type: Type.STRING },
                            description: { type: Type.STRING },
                          },
                          required: ["designator", "value", "type"],
                        },
                      },
                    },
                    required: ["id", "title", "type", "description"],
                  },
                },
              },
              required: ["results"],
            },
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed.results) && parsed.results.length > 0) {
            return res.status(200).json({
              success: true,
              results: parsed.results,
              modelUsed: "gemini-3.1-flash-lite (Vercel Serverless)",
            });
          }
        }
      } catch (geminiErr) {
        console.warn("[Vercel Serverless Google Search] Gemini call failed, returning curated results:", geminiErr);
      }
    }

    // Fallback curated Google references with identified parts
    const lower = q.toLowerCase();
    const fallbackResults = [
      {
        id: "goog_555_astable",
        title: "555 Timer Astable Pulse & Flasher Circuit",
        type: "circuit",
        category: "Oscillator / Timer",
        description: "Classic 555 astable multivibrator producing 1Hz square wave clock pulses with an LED indicator and noise bypass.",
        manufacturer: "Texas Instruments / Standard EDA",
        partNumber: "NE555P",
        datasheetUrl: "https://www.ti.com/lit/ds/symlink/ne555.pdf",
        googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(q + " 555 timer circuit schematic")}`,
        supplyVoltage: "4.5V - 15.0V DC",
        footprint: "DIP-8 / THT",
        pins: [
          { id: "1", name: "GND", direction: "left", type: "ground" },
          { id: "2", name: "TRIG", direction: "left", type: "input" },
          { id: "3", name: "OUT", direction: "right", type: "output" },
          { id: "4", name: "RESET", direction: "left", type: "input" },
          { id: "5", name: "CTRL", direction: "left", type: "input" },
          { id: "6", name: "THRES", direction: "left", type: "input" },
          { id: "7", name: "DISCH", direction: "left", type: "output" },
          { id: "8", name: "VCC", direction: "left", type: "power" },
        ],
        identifiedParts: [
          { designator: "U1", value: "NE555", type: "ic_dip8", footprint: "DIP-8", description: "Precision Analog Timer IC" },
          { designator: "R1", value: "10kΩ", type: "resistor", footprint: "R0805", description: "Timing Charge Resistor" },
          { designator: "R2", value: "47kΩ", type: "resistor", footprint: "R0805", description: "Timing Discharge Resistor" },
          { designator: "R3", value: "470Ω", type: "resistor", footprint: "R0805", description: "LED Current Limiting Resistor" },
          { designator: "C1", value: "10μF", type: "capacitor", footprint: "C0805", description: "Timing Electrolytic Capacitor" },
          { designator: "C2", value: "10nF", type: "capacitor", footprint: "C0805", description: "Control Voltage Noise Bypass Cap" },
          { designator: "LED1", value: "Red", type: "led", footprint: "LED0805", description: "Pulse Output Indicator LED" },
          { designator: "VCC1", value: "+9V", type: "vcc", footprint: "POWER_PORT", description: "DC Power Rail" },
          { designator: "GND1", value: "0V", type: "gnd", footprint: "POWER_PORT", description: "Ground Reference" },
        ],
      },
      {
        id: "goog_ina219",
        title: "INA219 Zero-Drift Bidirectional Current/Power Monitor",
        type: "component",
        category: "sensors",
        description: "I2C-interface current and power monitor with 12-bit ADC, senses bus voltages up to 26V with high accuracy.",
        manufacturer: "Texas Instruments",
        partNumber: "INA219AIDR",
        datasheetUrl: "https://www.ti.com/lit/ds/symlink/ina219.pdf",
        googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(q + " INA219 datasheet")}`,
        supplyVoltage: "3.0V - 5.5V DC",
        footprint: "MODULE_6PIN",
        pins: [
          { id: "1", name: "VCC", direction: "left", type: "power" },
          { id: "2", name: "GND", direction: "left", type: "ground" },
          { id: "3", name: "SCL", direction: "left", type: "input" },
          { id: "4", name: "SDA", direction: "left", type: "bidirectional" },
          { id: "5", name: "VIN+", direction: "right", type: "input" },
          { id: "6", name: "VIN-", direction: "right", type: "input" },
        ],
        identifiedParts: [
          { designator: "U1", value: "INA219", type: "ic_dip8", footprint: "SOT-23-8", description: "High-Side Current Sensor IC" },
          { designator: "R_SHUNT", value: "0.1Ω 1%", type: "resistor", footprint: "R1206", description: "Precision Current Shunt Resistor" },
          { designator: "R_PU1", value: "4.7kΩ", type: "resistor", footprint: "R0805", description: "I2C SCL Pull-Up Resistor" },
          { designator: "R_PU2", value: "4.7kΩ", type: "resistor", footprint: "R0805", description: "I2C SDA Pull-Up Resistor" },
          { designator: "C_BYPASS", value: "100nF", type: "capacitor", footprint: "C0805", description: "VCC Decoupling Capacitor" },
        ],
      },
      {
        id: "goog_light_relay",
        title: "Light-Activated Relay Driver Circuit (LDR + LM358)",
        type: "circuit",
        category: "Sensor / Automation",
        description: "Automatic dark/light sensor circuit with photoresistor, adjustable threshold potentiometer, LM358 voltage comparator, and transistor driving a 5V relay with flyback diode.",
        manufacturer: "STMicroelectronics / DFRobot",
        partNumber: "LM358N",
        datasheetUrl: "https://www.st.com/resource/en/datasheet/lm358.pdf",
        googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(q + " light sensor relay circuit schematic")}`,
        supplyVoltage: "5.0V - 12.0V DC",
        footprint: "MODULE_RELAY",
        pins: [
          { id: "1", name: "VCC", direction: "left", type: "power" },
          { id: "2", name: "GND", direction: "left", type: "ground" },
          { id: "3", name: "NO", direction: "right", type: "output" },
          { id: "4", name: "COM", direction: "right", type: "passive" },
          { id: "5", name: "NC", direction: "right", type: "output" },
        ],
        identifiedParts: [
          { designator: "U1", value: "LM358", type: "ic_dip8", footprint: "DIP-8", description: "Dual Voltage Comparator" },
          { designator: "Q1", value: "2N2222", type: "npn", footprint: "TO-92", description: "Relay Driver NPN Transistor" },
          { designator: "D1", value: "1N4007", type: "diode", footprint: "DO-41", description: "Flyback Inductive Protection Diode" },
          { designator: "K1", value: "5V Relay", type: "relay", footprint: "RELAY_SPDT", description: "Electromechanical Switch Relay" },
          { designator: "R_LDR", value: "Photoresistor", type: "ldr", footprint: "LDR_5MM", description: "Cadmium Sulfide Light Sensor" },
          { designator: "POT1", value: "10kΩ Pot", type: "potentiometer", footprint: "POT_TRIMMER", description: "Sensitivity Threshold Trimmer" },
          { designator: "R_BASE", value: "1kΩ", type: "resistor", footprint: "R0805", description: "Base Current Limiting Resistor" },
          { designator: "LED_STAT", value: "Green", type: "led", footprint: "LED0805", description: "Relay Active Status LED" },
          { designator: "VCC1", value: "+5V", type: "vcc", footprint: "POWER_PORT", description: "5V Power Supply" },
          { designator: "GND1", value: "0V", type: "gnd", footprint: "POWER_PORT", description: "Common Ground" },
        ],
      },
      {
        id: "goog_esp32_wroom",
        title: "ESP32-WROOM-32D Wi-Fi & Bluetooth MCU Module",
        type: "component",
        category: "modules",
        description: "Dual-core Tensilica Xtensa 32-bit LX6 MCU running up to 240 MHz with integrated 2.4 GHz Wi-Fi, BLE, and hardware crypto acceleration.",
        manufacturer: "Espressif Systems",
        partNumber: "ESP32-WROOM-32D",
        datasheetUrl: "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32d_esp32-wroom-32u_datasheet_en.pdf",
        googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(q + " ESP32-WROOM-32 datasheet")}`,
        supplyVoltage: "3.0V - 3.6V DC",
        footprint: "MODULE_ESP32_38PIN",
        pins: [
          { id: "1", name: "3V3", direction: "left", type: "power" },
          { id: "2", name: "EN", direction: "left", type: "input" },
          { id: "3", name: "GPIO34", direction: "left", type: "input" },
          { id: "4", name: "GPIO35", direction: "left", type: "input" },
          { id: "5", name: "GPIO32", direction: "left", type: "bidirectional" },
          { id: "6", name: "GPIO33", direction: "left", type: "bidirectional" },
          { id: "7", name: "GND", direction: "right", type: "ground" },
          { id: "8", name: "GPIO23", direction: "right", type: "bidirectional" },
          { id: "9", name: "GPIO22", direction: "right", type: "bidirectional" },
          { id: "10", name: "TXD0", direction: "right", type: "output" },
          { id: "11", name: "RXD0", direction: "right", type: "input" },
          { id: "12", name: "GPIO21", direction: "right", type: "bidirectional" },
        ],
        identifiedParts: [
          { designator: "U1", value: "ESP32-WROOM-32D", type: "esp32", footprint: "MODULE_ESP32", description: "Main Wi-Fi/BLE Microcontroller" },
          { designator: "U_REG", value: "AMS1117-3.3", type: "regulator", footprint: "SOT-223", description: "3.3V Low-Dropout Linear Voltage Regulator" },
          { designator: "C_IN", value: "10μF", type: "capacitor", footprint: "C0805", description: "Input Voltage Filter Capacitor" },
          { designator: "C_OUT", value: "22μF", type: "capacitor", footprint: "C0805", description: "Output Stability Capacitor" },
          { designator: "SW_RST", value: "Tactile Switch", type: "switch", footprint: "SW_PUSH", description: "Hardware Reset Pushbutton" },
          { designator: "R_PU", value: "10kΩ", type: "resistor", footprint: "R0805", description: "EN Pin Pull-Up Resistor" },
          { designator: "C_EN", value: "100nF", type: "capacitor", footprint: "C0805", description: "Auto-Reset Timing Capacitor" },
        ],
      },
      {
        id: "goog_lm2596_buck",
        title: "LM2596 DC-DC Step-Down Buck Converter Module",
        type: "circuit",
        category: "power",
        description: "High efficiency step-down voltage converter. Accepts 4.5V-35V input and produces stable adjustable 1.25V-30V output up to 3A.",
        manufacturer: "Texas Instruments / Multi-vendor",
        partNumber: "LM2596S-ADJ",
        datasheetUrl: "https://www.ti.com/lit/ds/symlink/lm2596.pdf",
        googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(q + " LM2596 circuit")}`,
        supplyVoltage: "4.5V - 35V DC",
        footprint: "MODULE_BUCK_4PIN",
        pins: [
          { id: "1", name: "IN+", direction: "left", type: "power" },
          { id: "2", name: "IN- (GND)", direction: "left", type: "ground" },
          { id: "3", name: "OUT+", direction: "right", type: "power" },
          { id: "4", name: "OUT- (GND)", direction: "right", type: "ground" },
        ],
        identifiedParts: [
          { designator: "U1", value: "LM2596S-ADJ", type: "regulator", footprint: "TO-263", description: "3A Step-Down Switching Regulator" },
          { designator: "L1", value: "33μH", type: "inductor", footprint: "IND_12X12", description: "Toroidal Power Choke Inductor" },
          { designator: "D1", value: "SS34 (Schottky)", type: "diode", footprint: "SMA", description: "Fast Recovery Catch Diode" },
          { designator: "C_IN", value: "220μF 50V", type: "capacitor", footprint: "CAP_ELEC_8MM", description: "High-Ripple Input Filter Capacitor" },
          { designator: "C_OUT", value: "470μF 35V", type: "capacitor", footprint: "CAP_ELEC_10MM", description: "Low-ESR Output Filter Capacitor" },
          { designator: "POT1", value: "10kΩ Multi-turn", type: "potentiometer", footprint: "POT_3296W", description: "Precision Voltage Feedback Trimmer" },
          { designator: "R_DIV", value: "1.2kΩ", type: "resistor", footprint: "R0805", description: "Feedback Resistor Divider" },
        ],
      },
    ];

    return res.status(200).json({
      success: true,
      results: fallbackResults,
      modelUsed: "curated_catalogue",
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      results: [
        {
          id: "goog_general_component",
          title: "Standard Electronic Component Reference",
          type: "component",
          category: "General",
          description: "General electronic component reference with verified standard pinouts.",
          pins: [
            { id: "1", name: "VCC", direction: "left", type: "power" },
            { id: "2", name: "GND", direction: "left", type: "ground" },
            { id: "3", name: "SIG", direction: "right", type: "bidirectional" },
          ],
        },
      ],
      modelUsed: "resilience_fallback",
    });
  }
}
