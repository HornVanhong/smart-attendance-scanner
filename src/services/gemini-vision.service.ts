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

    // High-speed direct models (gemini-flash-lite-latest has 100% uptime and sub-8s response)
    const modelCandidates = ["gemini-flash-lite-latest", "gemini-flash-latest"];

    let lastError: any = null;

    for (const modelName of modelCandidates) {
      try {
        console.log(`[Gemini Fast Vision] Running with model: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });

        // Specialized prompt instructing Gemini to read the vertical handwritten subjects in the circled header
        const prompt = `You are an expert Cambodian attendance sheet scanner AI.
Analyze this attendance sheet image or PDF document.

TOP HEADER INSTRUCTIONS:
- Look at the 'DATE' row for days and dates (e.g. Mon 8/06/26, Tue 09/06/26, Wed 10/06/26, Thu 11/06/26, Fri 12/06/26).
- Look at the 'TIME' row for period numbers (1, 2, 3, 4, 5).
- CRITICAL: Read the vertical handwritten subject titles written in the 'SUBJECT' row for each column (e.g. 'English', 'Principle of Economics', 'Khmer Culture', 'Vector Design', 'Creation Concept', 'Creative Concept', etc.).

EXTRACT:
1. "className": Class name or section (e.g. "Year 1 - Group A1")
2. "date": Sheet start date (YYYY-MM-DD)
3. "columns": Array of column headers horizontally from left to right:
   [
     { "index": 0, "day": "Mon", "date": "2026-06-08", "period": 1, "subject": "English" },
     { "index": 1, "day": "Mon", "date": "2026-06-08", "period": 2, "subject": "Principle of Economics" }
   ]
4. "students": Array of student rows. For each student:
   - "rowIndex": number (0, 1, 2...)
   - "studentNumber": Student ID or No. (e.g. "1", "2" or "B20254724")
   - "fullName": Full Name
   - "gender": "M" or "F"
   - "marks": Array of strings representing marks along the row for each column:
     "✓" = present (checkmark or slash)
     "A" = unexcused absence (ឈប់អត់ច្បាប់)
     "P" = permission / excused (ឈប់មានច្បាប់)
     "L" = late (មកយឺត)
     ""  = blank / unmarked

Return ONLY valid JSON with className, date, columns, and students.`;

        const base64Image = imageBuffer.toString("base64");
        const startTime = Date.now();
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType || "image/jpeg",
            },
          },
        ]);
        console.log(`[Gemini Fast Vision] Finished in ${Date.now() - startTime}ms`);

        const responseText = result.response.text();
        const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const rawCols = Array.isArray(parsed.columns) && parsed.columns.length > 0
          ? parsed.columns
          : (Array.isArray(parsed.periods) ? parsed.periods : []);

        const formattedPeriods = rawCols.map((col: any, idx: number) => {
          if (typeof col === "string") {
            return { periodNumber: idx + 1, label: col, subject: col };
          }
          const sub = col.subject || col.title || col.label || "";
          const day = col.day || "";
          const label = sub ? (day ? `${day}: ${sub}` : sub) : `Period ${col.period || idx + 1}`;
          return {
            periodNumber: col.period || idx + 1,
            label,
            subject: sub || label,
            date: col.date || parsed.date,
          };
        });

        const periodsCount = Math.max(1, formattedPeriods.length);
        const colWidth = Math.max(45, Math.round((imageWidth * 0.55) / periodsCount));
        const totalStudents = Math.max(1, (parsed.students || []).length);
        const rowHeight = Math.max(25, Math.round((imageHeight * 0.70) / totalStudents));
        const startX = Math.round(imageWidth * 0.40);
        const startY = Math.round(imageHeight * 0.18);

        const students: GeminiExtractedStudent[] = (parsed.students || []).map((s: any, rIdx: number) => {
          const marksList = Array.isArray(s.marks) ? s.marks : [];
          const marks: GeminiExtractedCell[] = marksList.map((m: any, cIdx: number) => {
            let symbol = "✓";
            let status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW" | "UNMARKED" = "PRESENT";
            let confidence = 0.95;

            if (typeof m === "string") {
              const sym = m.trim();
              const upper = sym.toUpperCase();
              if (upper === "A") {
                symbol = "A";
                status = "ABSENT";
              } else if (upper === "P" || upper === "E" || upper === "C") {
                symbol = "P";
                status = "EXCUSED";
              } else if (upper === "L") {
                symbol = "L";
                status = "LATE";
              } else if (sym === "" || sym === "-" || sym === " ") {
                symbol = "";
                status = "UNMARKED";
              } else if (sym === "?" || sym === "??") {
                symbol = "?";
                status = "NEEDS_REVIEW";
                confidence = 0.5;
              } else {
                symbol = "✓";
                status = "PRESENT";
              }
            } else if (typeof m === "object" && m !== null) {
              symbol = m.symbol || "✓";
              status = m.status || "PRESENT";
              confidence = typeof m.confidence === "number" ? m.confidence : 0.95;
            }

            const bbox = {
              x: startX + cIdx * colWidth,
              y: startY + rIdx * rowHeight,
              w: Math.round(colWidth * 0.9),
              h: Math.round(rowHeight * 0.85),
            };

            return {
              period: formattedPeriods[cIdx]?.periodNumber || cIdx + 1,
              symbol,
              status,
              confidence,
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
          subjectName: parsed.subjectName || formattedPeriods[0]?.subject || "General Attendance",
          date: parsed.date,
          periods: formattedPeriods.length > 0 ? formattedPeriods : [
            { periodNumber: 1, label: "Period 1" },
            { periodNumber: 2, label: "Period 2" },
            { periodNumber: 3, label: "Period 3" },
          ],
          students,
          rawResponse: cleaned,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Fast Vision] Model ${modelName} error:`, err.message);
      }
    }

    throw new Error(lastError?.message || "Failed to process image with Gemini AI Vision.");
  }
}
