import { GoogleGenAI, Type } from "@google/genai";
import { HarmonographParams, AttractorParams, AppMode } from "../types";
import { DEFAULT_PARAMS, DEFAULT_ATTRACTOR, generateId } from "../constants";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateConfig = async (prompt: string, mode: AppMode): Promise<HarmonographParams | AttractorParams> => {
  const ai = getAiClient();

  if (mode === 'harmonograph') {
     return generateHarmonographParamsInternal(ai, prompt);
  } else {
     return generateAttractorParams(ai, prompt);
  }
};

const generateHarmonographParamsInternal = async (ai: GoogleGenAI, prompt: string): Promise<HarmonographParams> => {
  const oscillatorSchema = {
    type: Type.OBJECT,
    properties: {
      amplitude: { type: Type.NUMBER, description: "Amplitude between 0.1 and 2.0" },
      frequency: { type: Type.NUMBER, description: "Frequency in Hz, typically between 1.0 and 10.0" },
      phase: { type: Type.NUMBER, description: "Phase in radians, 0 to 2*PI" },
      damping: { type: Type.NUMBER, description: "Damping factor, typically 0.001 to 0.1" },
    },
    required: ["amplitude", "frequency", "phase", "damping"],
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      xOscillators: {
        type: Type.ARRAY,
        items: oscillatorSchema,
        description: "List of oscillators affecting the X axis (usually 1-3)",
      },
      yOscillators: {
        type: Type.ARRAY,
        items: oscillatorSchema,
        description: "List of oscillators affecting the Y axis (usually 1-3)",
      },
      turntableOmega: { type: Type.NUMBER, description: "Turntable rotation speed in Hz. 0 to disable." },
      turntableDamping: { type: Type.NUMBER, description: "Turntable damping. 0 for constant speed." },
      lineColor: { type: Type.STRING, description: "Hex color code for the line." },
    },
    required: ["xOscillators", "yOscillators", "turntableOmega", "turntableDamping"],
  };

  const systemInstruction = `
    You are an expert mathematical artist specializing in Harmonographs. 
    Translate abstract user descriptions into physics parameters for a damped pendulum harmonograph.
    
    Simulation: x = sum(A*exp(-dt)*sin(wt+p)).
    - "Chaotic": high frequencies, non-integer ratios.
    - "Calm": simple ratios (3:2), low damping.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from AI");
    
    const data = JSON.parse(jsonText);

    return {
      ...DEFAULT_PARAMS,
      xOscillators: data.xOscillators.map((o: any) => ({ ...o, id: generateId() })),
      yOscillators: data.yOscillators.map((o: any) => ({ ...o, id: generateId() })),
      turntableOmega: data.turntableOmega ?? 0,
      turntableDamping: data.turntableDamping ?? 0,
      lineColor: data.lineColor ?? DEFAULT_PARAMS.lineColor,
    };
  } catch (error) {
    console.error("Failed to generate Harmonograph params", error);
    throw error;
  }
};

const generateAttractorParams = async (ai: GoogleGenAI, prompt: string): Promise<AttractorParams> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      model: { type: Type.STRING, enum: ["clifford", "dejong"] },
      a: { type: Type.NUMBER, description: "Parameter a, usually between -3 and 3" },
      b: { type: Type.NUMBER, description: "Parameter b, usually between -3 and 3" },
      c: { type: Type.NUMBER, description: "Parameter c, usually between -3 and 3" },
      d: { type: Type.NUMBER, description: "Parameter d, usually between -3 and 3" },
      color: { type: Type.STRING, description: "Hex color code" },
      zoom: { type: Type.NUMBER, description: "Zoom level, 0.5 to 2.0" }
    },
    required: ["model", "a", "b", "c", "d"],
  };

  const systemInstruction = `
    You are an expert in Chaos Theory and Strange Attractors.
    Generate parameters (a, b, c, d) for Clifford or De Jong attractors based on the user's description.
    
    Clifford: x' = sin(ay) + c*cos(ax), y' = sin(bx) + d*cos(by)
    De Jong: x' = sin(ay) - cos(bx), y' = sin(cx) - cos(dy)
    
    Choose parameters known to produce beautiful, chaotic attractors.
    - "Stormy/Chaotic": High variance parameters.
    - "Organic/Flowing": Parameters closer to standard integer ratios or known golden attractors.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from AI");
    
    const data = JSON.parse(jsonText);

    return {
      ...DEFAULT_ATTRACTOR,
      model: data.model === 'dejong' ? 'dejong' : 'clifford',
      a: data.a,
      b: data.b,
      c: data.c,
      d: data.d,
      color: data.color ?? DEFAULT_ATTRACTOR.color,
      zoom: data.zoom ?? 1.0,
    };
  } catch (error) {
    console.error("Failed to generate Attractor params", error);
    throw error;
  }
};

// Backwards compatibility alias if needed, but we updated the App to use generateConfig
export const generateHarmonographParams = (prompt: string) => generateConfig(prompt, 'harmonograph') as Promise<HarmonographParams>;