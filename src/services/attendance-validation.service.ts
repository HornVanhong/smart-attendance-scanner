import { ScanCellModel } from "@/lib/db-store";

export interface ScanValidationSummary {
  totalStudents: number;
  totalCells: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  unmatchedStudentsCount: number;
  emptyCellsCount: number;
  needsReviewCount: number;
  canConfirmImmediately: boolean;
  issues: string[];
}

export class AttendanceValidationService {
  public static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.75;

  /**
   * Evaluates an array of scan cells and produces a comprehensive validation summary
   */
  public static validateScanCells(
    cells: ScanCellModel[],
    threshold: number = this.DEFAULT_CONFIDENCE_THRESHOLD
  ): ScanValidationSummary {
    const totalCells = cells.length;
    const uniqueStudentRows = new Set(cells.map((c) => c.rowIndex));
    const totalStudents = uniqueStudentRows.size;

    let highConfidenceCount = 0;
    let lowConfidenceCount = 0;
    let emptyCellsCount = 0;
    let needsReviewCount = 0;
    const unmatchedStudents = new Set<number>();
    const issues: string[] = [];

    cells.forEach((cell) => {
      // Check student match
      if (!cell.studentId) {
        unmatchedStudents.add(cell.rowIndex);
      }

      // Check empty
      if (cell.interpretedStatus === "UNMARKED" || !cell.recognizedSymbol) {
        emptyCellsCount++;
      }

      // Check confidence & review flag
      const isLowConfidence = cell.confidenceScore < threshold;
      const isMarkedNeedsReview = cell.interpretedStatus === "NEEDS_REVIEW" || cell.reviewStatus === "NEEDS_REVIEW";

      if (isLowConfidence || isMarkedNeedsReview) {
        lowConfidenceCount++;
        needsReviewCount++;
      } else {
        highConfidenceCount++;
      }
    });

    if (unmatchedStudents.size > 0) {
      issues.push(`${unmatchedStudents.size} student name(s) could not be matched automatically to the database.`);
    }

    if (needsReviewCount > 0) {
      issues.push(`${needsReviewCount} attendance cell(s) have low confidence or ambiguous symbols requiring review.`);
    }

    const canConfirmImmediately = unmatchedStudents.size === 0 && needsReviewCount === 0;

    return {
      totalStudents,
      totalCells,
      highConfidenceCount,
      lowConfidenceCount,
      unmatchedStudentsCount: unmatchedStudents.size,
      emptyCellsCount,
      needsReviewCount,
      canConfirmImmediately,
      issues,
    };
  }

  /**
   * Find index of the next cell requiring review (for the "Review Next Error" button)
   */
  public static findNextErrorIndex(
    cells: ScanCellModel[],
    currentIndex: number = -1,
    threshold: number = this.DEFAULT_CONFIDENCE_THRESHOLD
  ): number {
    if (cells.length === 0) return -1;

    // Search from currentIndex + 1 to end
    for (let i = currentIndex + 1; i < cells.length; i++) {
      const c = cells[i];
      if (!c.studentId || c.confidenceScore < threshold || c.interpretedStatus === "NEEDS_REVIEW" || c.reviewStatus === "NEEDS_REVIEW") {
        return i;
      }
    }

    // Wrap around to beginning
    for (let i = 0; i <= currentIndex; i++) {
      const c = cells[i];
      if (!c.studentId || c.confidenceScore < threshold || c.interpretedStatus === "NEEDS_REVIEW" || c.reviewStatus === "NEEDS_REVIEW") {
        return i;
      }
    }

    return -1; // No errors remaining
  }
}
