import { GoogleGenAI, Type } from "@google/genai";

// Vercel Serverless Function Handler
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
    const { prompt, image } = req.body || {};
    const effectivePrompt = (prompt && typeof prompt === "string" ? prompt.trim() : "") || "Electronic circuit schematic";

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an expert Electronic Design Automation (EDA) schematic engineer.
Your task is to take a natural language circuit description or diagram and produce an authentic, electrically sound schematic diagram netlist with exact components, pinout connections, coordinates, and engineering documentation.`;

        const promptText = `Generate a complete electronic schematic circuit diagram for:
"${effectivePrompt}"
Return valid JSON adhering to the specified schema.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                summary: { type: Type.STRING },
                explanation: { type: Type.STRING },
                formula: { type: Type.STRING },
                specifications: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                tips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                components: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING },
                      designator: { type: Type.STRING },
                      value: { type: Type.STRING },
                      footprint: { type: Type.STRING },
                      x: { type: Type.INTEGER },
                      y: { type: Type.INTEGER },
                      rotation: { type: Type.INTEGER },
                      pins: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            net: { type: Type.STRING },
                          },
                          required: ["id", "name"],
                        },
                      },
                    },
                    required: ["id", "type", "designator", "value", "x", "y", "pins"],
                  },
                },
              },
              required: ["title", "category", "summary", "components"],
            },
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          return res.status(200).json({
            circuit: parsed,
            modelUsed: "gemini-3.1-flash-lite (Vercel Serverless)",
            isFallback: false,
          });
        }
      } catch (geminiErr) {
        console.warn("[Vercel Serverless] Gemini call failed, returning structured fallback circuit:", geminiErr);
      }
    }

    // Fallback: Generate structured electronic circuit based on prompt keywords
    const p = effectivePrompt.toLowerCase();
    let title = "Synthesized Schematic Circuit";
    let category = "General Electronics";
    let summary = `Automated circuit schematic synthesized for "${effectivePrompt}".`;

    let components: any[] = [];

    if (p.includes("555") || p.includes("timer") || p.includes("flasher") || p.includes("astable")) {
      title = "555 Timer Astable Multivibrator (1Hz)";
      category = "Oscillator / Timer";
      summary = "555 astable multivibrator producing square wave clock pulses with an LED indicator.";
      components = [
        {
          id: "c_vcc",
          type: "vcc",
          designator: "VCC1",
          value: "+9V",
          footprint: "POWER_PORT",
          x: 120,
          y: 80,
          pins: [{ id: "1", name: "VCC", net: "VCC" }],
        },
        {
          id: "c_r1",
          type: "resistor",
          designator: "R1",
          value: "10kΩ",
          footprint: "R0805",
          x: 220,
          y: 120,
          pins: [
            { id: "1", name: "1", net: "VCC" },
            { id: "2", name: "2", net: "NODE_DISCH" },
          ],
        },
        {
          id: "c_ic1",
          type: "ic_dip8",
          designator: "U1",
          value: "NE555",
          footprint: "DIP-8",
          x: 400,
          y: 220,
          pins: [
            { id: "1", name: "GND", net: "GND" },
            { id: "2", name: "TRIG", net: "NODE_THRESH" },
            { id: "3", name: "OUT", net: "OUT" },
            { id: "4", name: "RESET", net: "VCC" },
            { id: "5", name: "CTRL", net: "NODE_CTRL" },
            { id: "6", name: "THRES", net: "NODE_THRESH" },
            { id: "7", name: "DISCH", net: "NODE_DISCH" },
            { id: "8", name: "VCC", net: "VCC" },
          ],
        },
        {
          id: "c_led",
          type: "led",
          designator: "LED1",
          value: "Red",
          footprint: "LED0805",
          x: 620,
          y: 220,
          pins: [
            { id: "1", name: "A", net: "OUT" },
            { id: "2", name: "K", net: "GND" },
          ],
        },
        {
          id: "c_gnd",
          type: "gnd",
          designator: "GND1",
          value: "0V",
          footprint: "POWER_PORT",
          x: 400,
          y: 360,
          pins: [{ id: "1", name: "GND", net: "GND" }],
        },
      ];
    } else {
      title = `${effectivePrompt.slice(0, 40)} Schematic`;
      components = [
        {
          id: "pwr_in",
          type: "dc_source",
          designator: "V1",
          value: "12V",
          footprint: "POWER_PORT",
          x: 140,
          y: 200,
          pins: [
            { id: "1", name: "+", net: "VCC" },
            { id: "2", name: "-", net: "GND" },
          ],
        },
        {
          id: "r_in",
          type: "resistor",
          designator: "R1",
          value: "10kΩ",
          footprint: "R0805",
          x: 320,
          y: 200,
          pins: [
            { id: "1", name: "1", net: "VCC" },
            { id: "2", name: "2", net: "SIG_OUT" },
          ],
        },
        {
          id: "c_load",
          type: "capacitor",
          designator: "C1",
          value: "100nF",
          footprint: "C0805",
          x: 480,
          y: 200,
          pins: [
            { id: "1", name: "1", net: "SIG_OUT" },
            { id: "2", name: "2", net: "GND" },
          ],
        },
        {
          id: "gnd_port",
          type: "gnd",
          designator: "GND1",
          value: "0V",
          footprint: "POWER_PORT",
          x: 320,
          y: 320,
          pins: [{ id: "1", name: "GND", net: "GND" }],
        },
      ];
    }

    return res.status(200).json({
      circuit: {
        title,
        category,
        summary,
        explanation: "Synthesized electronic schematic ready for simulation and PCB routing.",
        specifications: ["Operating Voltage: 5V - 12V DC", "Standard SMT / THT Footprints"],
        tips: ["Verify all net connections in the schematic inspector."],
        components,
        synthesizedFallback: true,
      },
      modelUsed: "Vercel Edge Synthesizer (Instant)",
      isFallback: true,
    });
  } catch (err: any) {
    return res.status(200).json({
      circuit: {
        title: "Default Electronic Circuit",
        category: "General",
        summary: "Standard electronic circuit stage.",
        components: [
          {
            id: "vcc_1",
            type: "vcc",
            designator: "VCC1",
            value: "5V",
            footprint: "POWER_PORT",
            x: 150,
            y: 150,
            pins: [{ id: "1", name: "VCC", net: "VCC" }],
          },
          {
            id: "r_1",
            type: "resistor",
            designator: "R1",
            value: "1kΩ",
            footprint: "R0805",
            x: 300,
            y: 150,
            pins: [
              { id: "1", name: "1", net: "VCC" },
              { id: "2", name: "2", net: "OUT" },
            ],
          },
          {
            id: "led_1",
            type: "led",
            designator: "LED1",
            value: "Green",
            footprint: "LED0805",
            x: 450,
            y: 150,
            pins: [
              { id: "1", name: "A", net: "OUT" },
              { id: "2", name: "K", net: "GND" },
            ],
          },
          {
            id: "gnd_1",
            type: "gnd",
            designator: "GND1",
            value: "0V",
            footprint: "POWER_PORT",
            x: 450,
            y: 280,
            pins: [{ id: "1", name: "GND", net: "GND" }],
          },
        ],
        synthesizedFallback: true,
      },
      modelUsed: "Client Resilience Mode",
      isFallback: true,
    });
  }
}
