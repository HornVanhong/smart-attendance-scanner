/**
 * Attendance Mark Recognition Service
 * Analyzes handwritten marks inside cropped attendance cells.
 * Uses stroke morphology, aspect ratio, center-of-mass, and density heuristics
 * to classify ✓, A, P, L, E, ambiguous marks (?), and empty/unmarked cells.
 */

export interface MarkAnalysisFeatures {
  pixelDensity: number; // Percentage of dark pixels (0 - 100)
  aspectRatio: number; // Width / Height of stroke bounding box
  centerOfMassY: number; // 0.0 (top) to 1.0 (bottom)
  centerOfMassX: number; // 0.0 (left) to 1.0 (right)
  symmetryX: number; // Horizontal balance
}

export interface RecognizedMarkResult {
  symbol: string; // "✓", "A", "P", "L", "E", "?", ""
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW" | "UNMARKED";
  confidence: number; // 0.0 to 1.0
  isAmbiguous: boolean;
  isEmpty: boolean;
  features?: MarkAnalysisFeatures;
}

export class AttendanceMarkRecognitionService {
  /**
   * Minimum stroke density required to consider a cell non-empty (to ignore paper grain/scanner noise)
   */
  public static readonly EMPTY_THRESHOLD_PERCENT = 1.8;

  /**
   * Classify attendance mark from extracted geometric features
   */
  public static classifyFromFeatures(features: MarkAnalysisFeatures): RecognizedMarkResult {
    // 1. Check if cell is blank
    if (features.pixelDensity < this.EMPTY_THRESHOLD_PERCENT) {
      return {
        symbol: "",
        status: "UNMARKED",
        confidence: 0.95,
        isAmbiguous: false,
        isEmpty: true,
        features,
      };
    }

    // Check for abnormal ink blobs, smudges, or multi-stroke scribbles
    if (features.pixelDensity > 18.0 || features.aspectRatio > 2.0 || features.aspectRatio < 0.4) {
      return {
        symbol: "?",
        status: "NEEDS_REVIEW",
        confidence: 0.50,
        isAmbiguous: true,
        isEmpty: false,
        features,
      };
    }

    // 2. Checkmark detection (✓)
    // Characteristic: right-leaning asymmetry, center-of-mass shifted downward and rightward
    if (
      features.centerOfMassX > 0.48 &&
      features.centerOfMassY > 0.45 &&
      features.aspectRatio > 0.6 &&
      features.aspectRatio < 1.6 &&
      features.pixelDensity >= 2.0 &&
      features.pixelDensity <= 16.0
    ) {
      // High-confidence checkmark
      const confidence = features.centerOfMassX > 0.52 ? 0.94 : 0.86;
      return {
        symbol: "✓",
        status: "PRESENT",
        confidence,
        isAmbiguous: false,
        isEmpty: false,
        features,
      };
    }

    // 3. Letter 'A' (Absent)
    // Peak near top (centerOfMassY < 0.52), balanced horizontally
    if (
      features.pixelDensity >= 3.5 &&
      features.pixelDensity <= 14.0 &&
      Math.abs(features.centerOfMassX - 0.5) < 0.15 &&
      features.centerOfMassY <= 0.55
    ) {
      return {
        symbol: "A",
        status: "ABSENT",
        confidence: 0.89,
        isAmbiguous: false,
        isEmpty: false,
        features,
      };
    }

    // 4. Letter 'L' (Late)
    // Heavy left and bottom weight with balanced stroke
    if (
      features.pixelDensity >= 2.5 &&
      features.pixelDensity <= 12.0 &&
      features.centerOfMassX < 0.46 &&
      features.centerOfMassY > 0.52
    ) {
      return {
        symbol: "L",
        status: "LATE",
        confidence: 0.84,
        isAmbiguous: false,
        isEmpty: false,
        features,
      };
    }

    // 5. Letter 'P' or 'E'
    if (
      features.pixelDensity >= 2.5 &&
      features.pixelDensity <= 13.0 &&
      features.centerOfMassX < 0.48 &&
      features.centerOfMassY < 0.50
    ) {
      return {
        symbol: "P",
        status: "PRESENT",
        confidence: 0.82,
        isAmbiguous: false,
        isEmpty: false,
        features,
      };
    }

    // 6. Smudged, ambiguous or low-confidence mark
    return {
      symbol: "?",
      status: "NEEDS_REVIEW",
      confidence: 0.55,
      isAmbiguous: true,
      isEmpty: false,
      features,
    };
  }

  /**
   * Helper to map recognized symbol string to interpreted status using configurable school rules
   */
  public static mapSymbolToStatus(
    symbol: string,
    customRules?: Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW">
  ): "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW" | "UNMARKED" {
    if (!symbol || symbol.trim() === "") return "UNMARKED";

    if (customRules && customRules[symbol]) {
      return customRules[symbol];
    }

    const clean = symbol.trim().toUpperCase();
    switch (clean) {
      case "✓":
      case "/":
      case "V":
      case "P":
        return "PRESENT";
      case "A":
      case "X":
        return "ABSENT";
      case "L":
      case "T":
        return "LATE";
      case "E":
        return "EXCUSED";
      case "?":
      default:
        return "NEEDS_REVIEW";
    }
  }
}
