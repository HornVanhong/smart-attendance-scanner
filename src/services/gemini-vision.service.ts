import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiExtractedCell {
  period: number;
  symbol: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW" | "UNMARKED";
  confidence: number;
  cellBoundingBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface GeminiExtractedStudent {
  rowIndex: number;
  studentNumber: string;
  fullName: string;
  gender: "M" | "F";
  rowBoundingBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  marks: GeminiExtractedCell[];
}

export interface GeminiExtractionResult {
  className?: string;
  subjectName?: string;
  date?: string;
  periods: Array<{ periodNumber: number; label: string; subject?: string }>;
  students: GeminiExtractedStudent[];
  rawResponse?: string;
}

export class GeminiVisionService {
  /**
   * Discovers which models are enabled and available for this API key
   */
  public static async listAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const trimmed = apiKey.trim();
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`);
      if (!res.ok) {
        const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${trimmed}`);
        if (!resV1.ok) return [];
        const dataV1 = await resV1.json();
        return (dataV1.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name.replace(/^models\//, ""));
      }
      const data = await res.json();
      return (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace(/^models\//, ""));
    } catch {
      return [];
    }
  }

  /**
   * Verifies if a given Gemini API key is valid by querying the ModelService.ListModels endpoint
   */
  public static async testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string; models?: string[] }> {
    try {
      const trimmed = apiKey.trim();
      if (!trimmed || trimmed.length < 10) {
        return { valid: false, error: "API key is too short or empty." };
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        return {
          valid: false,
          error: data.error?.message || "Invalid Gemini API key or unauthorized project.",
        };
      }

      const availableModels = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace(/^models\//, ""));

      return {
        valid: true,
        models: availableModels,
      };
    } catch (err: any) {
      return { valid: false, error: err.message || "Failed to authenticate Gemini API key." };
    }
  }

  /**
   * Processes a paper attendance sheet image using Gemini Multimodal Vision
   */
  public static async extractAttendanceSheet(
    imageBuffer: Buffer,
    mimeType: string,
    apiKey: string,
    imageWidth: number = 1000,
    imageHeight: number = 800
  ): Promise<GeminiExtractionResult> {
    const genAI = new GoogleGenerativeAI(apiKey.trim());

    // 1. Discover models supported by this specific API key
    const availableFromApi = await GeminiVisionService.listAvailableModels(apiKey);

    // 2. High-speed priority order for multimodal document analysis
    // gemini-flash-latest and gemini-flash-lite-latest are verified working & respond in under 5 seconds
    const preferredOrder = [
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-pro-latest",
    ];

    let modelCandidates: string[] = [];

    if (availableFromApi.length > 0) {
      for (const pref of preferredOrder) {
        if (availableFromApi.includes(pref)) {
          modelCandidates.push(pref);
        }
      }
    }

    if (modelCandidates.length === 0) {
      modelCandidates = ["gemini-flash-latest", "gemini-flash-lite-latest"];
    }

    // Restrict to top 2 fastest candidates to eliminate delays
    modelCandidates = modelCandidates.slice(0, 2);

    let lastError: any = null;

    for (const modelName of modelCandidates) {
      try {
        console.log(`Attempting document recognition with model: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });

        const prompt = `You are an expert Document AI specialized in analyzing and digitizing school and university attendance sheets, rosters, and handwritten roll-call grids.
Analyze this uploaded attendance sheet image with high precision.

Extract:
1. Header information:
   - Class name / section if visible
   - Subject / course name(s) across all columns
   - Date(s) or weekdays (e.g. Mon, Tue, Wed, Thu, Fri)
2. All columns across days and subjects:
   - Inspect the columns horizontally from left to right. This sheet contains multiple class sessions across weekdays (e.g. Mon, Tue, Wed, Thu, Fri) and subjects (e.g. English, Principle of Economics, Khmer Culture, Khmer Literature, Vector Design, Creation Concept, etc.).
   - Extract every session column with its period number, subject title, and date.
3. All student rows in the roster table:
   - Sequence Number / No.
   - Student ID or Student Number (if visible, otherwise assign STU-001, STU-002, etc.)
   - Student Full Name (read handwriting/printed text carefully, e.g. Buna Sovanrith, Chan Bophaynydo, Chheang Chorvy, Chheang Narong, etc.)
   - Sex / Gender (M or F)
4. Handwritten attendance marks for each cell along the row:
   - Carefully inspect each cell along the student's row across all columns.
   - Standard attendance mark rules:
     - Letter 'A' or 'a' -> symbol: "A", status: "ABSENT" (means ឈប់អត់ច្បាប់ / Unexcused absence)
     - Letter 'P' or 'p' -> symbol: "P", status: "EXCUSED" (means ឈប់មានច្បាប់ / Permission / Excused absence)
     - Checkmark ('✓', '/', 'v') -> symbol: "✓", status: "PRESENT" (means វត្តមាន / Present)
     - Letter 'E' or 'C' -> symbol: "E", status: "EXCUSED" (means ឈប់មានច្បាប់ / Excused absence)
     - Letter 'L' -> symbol: "L", status: "LATE" (means មកយឺត / Late)
     - Empty / blank cell -> symbol: "", status: "UNMARKED"
     - Ambiguous or smudged scribble -> symbol: "?", status: "NEEDS_REVIEW"
   - Assign a realistic confidence score (0.0 to 1.0).
   - Estimate normalized coordinates [ymin, xmin, ymax, xmax] on a scale of 0 to 1000 for each cell bounding box.

Return ONLY a valid JSON object matching this schema:
{
  "className": string,
  "subjectName": string,
  "date": string,
  "periods": [
    { "periodNumber": number, "label": string, "subject": string, "date": string }
  ],
  "students": [
    {
      "rowIndex": number,
      "studentNumber": string,
      "fullName": string,
      "gender": "M" | "F",
      "marks": [
        {
          "period": number,
          "subject": string,
          "date": string,
          "symbol": string,
          "status": "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW" | "UNMARKED",
          "confidence": number,
          "box": [number, number, number, number]
        }
      ]
    }
  ]
}`;

        const base64Image = imageBuffer.toString("base64");
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType || "image/jpeg",
            },
          },
        ]);

        const responseText = result.response.text();
        const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        // Map normalized coordinates [ymin, xmin, ymax, xmax] (0-1000) to actual image pixels { x, y, w, h }
        const students: GeminiExtractedStudent[] = (parsed.students || []).map((s: any, rIdx: number) => {
          const marks: GeminiExtractedCell[] = (s.marks || []).map((m: any, cIdx: number) => {
            let bbox = {
              x: Math.round(imageWidth * 0.45 + cIdx * 90),
              y: Math.round(imageHeight * 0.2 + rIdx * 35),
              w: 80,
              h: 30,
            };

            if (Array.isArray(m.box) && m.box.length === 4) {
              const [ymin, xmin, ymax, xmax] = m.box;
              const x = Math.round((xmin / 1000) * imageWidth);
              const y = Math.round((ymin / 1000) * imageHeight);
              const w = Math.round(((xmax - xmin) / 1000) * imageWidth);
              const h = Math.round(((ymax - ymin) / 1000) * imageHeight);
              if (w > 0 && h > 0) {
                bbox = { x, y, w, h };
              }
            }

            return {
              period: m.period || cIdx + 1,
              symbol: m.symbol || "✓",
              status: m.status || "PRESENT",
              confidence: typeof m.confidence === "number" ? m.confidence : 0.95,
              cellBoundingBox: bbox,
            };
          });

          return {
            rowIndex: typeof s.rowIndex === "number" ? s.rowIndex : rIdx,
            studentNumber: s.studentNumber || `STU-${String(rIdx + 1).padStart(3, "0")}`,
            fullName: s.fullName || `Student ${rIdx + 1}`,
            gender: s.gender === "F" ? "F" : "M",
            marks,
          };
        });

        return {
          className: parsed.className,
          subjectName: parsed.subjectName,
          date: parsed.date,
          periods: parsed.periods || [
            { periodNumber: 1, label: "Period 1" },
            { periodNumber: 2, label: "Period 2" },
            { periodNumber: 3, label: "Period 3" },
          ],
          students,
          rawResponse: cleaned,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed, trying next model:`, err.message);
      }
    }

    throw new Error(lastError?.message || "Failed to process image with Gemini AI Vision.");
  }
}
