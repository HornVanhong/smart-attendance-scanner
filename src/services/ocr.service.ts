/**
 * OCR Service
 * Integrates Tesseract.js / server OCR engine to extract printed text from headers,
 * student IDs, student names, and dates.
 */

export interface OcrTextResult {
  text: string;
  confidence: number; // 0 - 100
  words: Array<{ text: string; confidence: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
}

export interface HeaderExtractionResult {
  className?: string;
  subjectName?: string;
  date?: string;
  period?: number;
  confidence: number;
}

export class OCRService {
  /**
   * Cleans and normalizes OCR text (removes stray punctuation, excessive spaces)
   */
  public static cleanText(rawText: string): string {
    return rawText
      .replace(/[\r\n]+/g, " ")
      .replace(/[|\\_~`^*]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Normalizes student number format (e.g. STU-1001 or 1001)
   */
  public static normalizeStudentNumber(raw: string): string {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (/^\d{4}$/.test(cleaned)) {
      return `STU-${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Extracts likely date from header text (formats: YYYY-MM-DD, DD/MM/YYYY, Oct 14, 2024, etc.)
   */
  public static extractDateFromHeader(headerText: string): string | null {
    // Check ISO format YYYY-MM-DD
    const isoMatch = headerText.match(/\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // Check Month Day Year: e.g. Oct 14, 2024
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const regex = new RegExp(`\\b(${monthNames.join("|")})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, "i");
    const mMatch = headerText.match(regex);
    if (mMatch) {
      const monthIdx = monthNames.indexOf(mMatch[1].toLowerCase().slice(0, 3)) + 1;
      const mStr = String(monthIdx).padStart(2, "0");
      const dStr = String(parseInt(mMatch[2], 10)).padStart(2, "0");
      return `${mMatch[3]}-${mStr}-${dStr}`;
    }

    return null;
  }

  /**
   * Parses extracted header text to identify class, subject, and date
   */
  public static parseHeaderMetadata(headerText: string): HeaderExtractionResult {
    const cleaned = this.cleanText(headerText);
    const date = this.extractDateFromHeader(cleaned) || new Date().toISOString().split("T")[0];

    let className: string | undefined;
    let subjectName: string | undefined;
    let period = 1;

    // Detect period
    const periodMatch = cleaned.match(/period\s*[:#-]?\s*(\d+)/i) || cleaned.match(/p\s*[:#-]?\s*(\d+)/i);
    if (periodMatch) {
      period = parseInt(periodMatch[1], 10) || 1;
    }

    // Detect class
    const classMatch = cleaned.match(/(?:grade|class|section)\s*[:#-]?\s*([0-9a-zA-Z\s-]+?)(?:subject|period|date|$)/i);
    if (classMatch) {
      className = classMatch[1].trim();
    }

    // Detect subject
    const subjectMatch = cleaned.match(/(?:subject|course)\s*[:#-]?\s*([a-zA-Z\s-]+?)(?:class|grade|period|date|$)/i);
    if (subjectMatch) {
      subjectName = subjectMatch[1].trim();
    }

    return {
      className,
      subjectName,
      date,
      period,
      confidence: className || subjectName ? 0.88 : 0.65,
    };
  }
}
