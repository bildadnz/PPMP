
import { GoogleGenAI, Type } from "@google/genai";

export interface GroundingLink {
  uri: string;
  title: string;
}

export const analyzeProcessData = async (
  nodeTitle: string, 
  rawText: string, 
  userPrompt: string, 
  location?: { latitude: number, longitude: number },
  language: string = 'English'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isMapsQuery = userPrompt.toLowerCase().includes('near') || 
                      userPrompt.toLowerCase().includes('map') || 
                      userPrompt.toLowerCase().includes('location');
  
  // Maps grounding is only supported in Gemini 2.5 series
  const modelName = isMapsQuery ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

  const schemaDescription = `
  {
    "type": "object",
    "properties": {
      "summary": { "type": "string", "description": "A detailed summary of the execution strategy in ${language}." },
      "comparison_weight": { "type": "number", "description": "The calculated alignment metric (float, max 3.0)." },
      "resources": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "type": { "type": "string" },
            "cost": { "type": "number", "description": "Estimated cost in USD" },
            "available": { "type": "boolean" }
          },
          "required": ["name", "type", "cost", "available"]
        }
      }
    },
    "required": ["summary", "comparison_weight", "resources"]
  }`;

  const systemInstruction = `You are a Process Intelligence Analyst. 
  Your task is to analyze process steps and provide structured, data-driven insights.
  
  LANGUAGE REQUIREMENT: You must respond in ${language}.
  
  CRITICAL: You must calculate a "comparison_weight" (float, max 3.0) based on the following formula:
  weight = (number of pre-defined tasks in slots / number of instructions in your generated strategy) 
         + (number of resources identified in user data / total resources identified as needed) 
         + (number of tasks mentioned as 'done' or 'ready' in user notes / number of instructions in your generated strategy).
  
  Provide a summary of execution strategy and a list of required resources with estimated costs in USD (US Dollars).
  If external information is needed, use the Search tool. If geographic information is needed, use the Maps tool.

  OUTPUT FORMAT:
  You must return a valid JSON object strictly adhering to the following schema. Do not include markdown formatting (like \`\`\`json) in the response if possible, but if you do, ensure the content is valid JSON.
  
  Schema: ${schemaDescription}`;

  const contents = `
    STEP TITLE: ${nodeTitle}
    CONTEXT DATA & USER NOTES: ${rawText}
    USER REQUEST: ${userPrompt}
  `;

  const tools: any[] = isMapsQuery ? [{ googleSearch: {} }, { googleMaps: {} }] : [{ googleSearch: {} }];

  try {
    // Note: We avoid passing responseSchema/responseMimeType in config when using Tools to prevent 500 Internal Errors.
    // Instead, we enforce JSON via system instructions.
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction,
        tools,
        toolConfig: location ? {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        } : undefined
      }
    });

    let jsonStr = response.text || '{}';
    
    // Clean markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();
    
    const parsed = JSON.parse(jsonStr);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links: GroundingLink[] = [];
    
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        links.push({ uri: chunk.web.uri, title: chunk.web.title });
      } else if (chunk.maps) {
        links.push({ uri: chunk.maps.uri, title: chunk.maps.title });
      }
    });

    return {
      summary: parsed.summary,
      resources: parsed.resources || [],
      comparison_weight: parsed.comparison_weight,
      links: Array.from(new Set(links.map(l => JSON.stringify(l)))).map(s => JSON.parse(s)) as GroundingLink[]
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback response to prevent UI crash
    return {
      summary: "Analysis failed due to a service error. Please try again or refine your input.",
      resources: [],
      comparison_weight: 0,
      links: []
    };
  }
};

export const generateGlobalStrategy = async (
  projectTitle: string,
  nodes: any[],
  connections: any[],
  insightsMap: Record<string, any>,
  language: string = 'English'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const nodeContext = nodes.map(n => {
    const ins = insightsMap[n.id];
    return `STEP: ${n.title}\nSTATUS: ${n.status}\nSUMMARY: ${ins?.summary || 'N/A'}\nWEIGHT: ${ins?.comparison_weight || 0}`;
  }).join('\n\n');

  const connectionContext = connections.map(c => `${c.sourceNodeId} -> ${c.targetNodeId} (${c.type})`).join('\n');

  const prompt = `Based on the provided process blueprint and individual node insights, generate a high-level "Full Execution Strategy" for ${projectTitle}.
  Account for the relationship connections (graph) between steps. 
  Address any failure points identified in nodes with status "failed".
  Format the response as professional markdown with sections for Objectives, Holistic Workflow, Risk Mitigation (based on failures), and Conclusion.
  
  IMPORTANT: The output must be written in ${language}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `PROJECT: ${projectTitle}\n\nCONNECTIONS:\n${connectionContext}\n\nNODES:\n${nodeContext}\n\n${prompt}`,
      config: { temperature: 0.7 }
    });
    return response.text;
  } catch (error) {
    console.error("Global Strategy Error:", error);
    return `Failed to synthesize global strategy in ${language}. Please verify all milestones are synchronized.`;
  }
};
