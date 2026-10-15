import { describe, it, expect } from "vitest";
import { ImagePreprocessingService } from "../src/services/image-preprocessing.service";
import { TableDetectionService } from "../src/services/table-detection.service";
import { OCRService } from "../src/services/ocr.service";
import { AttendanceMarkRecognitionService } from "../src/services/attendance-mark-recognition.service";
import { StudentMatchingService } from "../src/services/student-matching.service";
import { AttendanceValidationService } from "../src/services/attendance-validation.service";

describe("ImagePreprocessingService", () => {
  it("validates allowed mime types and size limits", () => {
    const validJpg = ImagePreprocessingService.validateImage("image/jpeg", 2 * 1024 * 1024, 15);
    expect(validJpg.valid).toBe(true);

    const validPdf = ImagePreprocessingService.validateImage("application/pdf", 1024, 15);
    expect(validPdf.valid).toBe(true);

    const invalidType = ImagePreprocessingService.validateImage("application/zip", 1024, 15);
    expect(invalidType.valid).toBe(false);

    const tooLarge = ImagePreprocessingService.validateImage("image/png", 20 * 1024 * 1024, 15);
    expect(tooLarge.valid).toBe(false);
  });

  it("adjusts brightness and contrast properly", () => {
    const [r, g, b] = ImagePreprocessingService.adjustPixelBrightnessContrast(100, 100, 100, 20, 10);
    expect(r).toBeGreaterThan(100);
    expect(g).toBeGreaterThan(100);
    expect(b).toBeGreaterThan(100);
  });
});

describe("TableDetectionService", () => {
  it("computes cell bounding boxes accurately for 10 students and 3 periods", () => {
    const structure = TableDetectionService.detectTableStructure(1000, 800, 10, 3);
    expect(structure.rowCount).toBe(10);
    expect(structure.columnCount).toBe(6); // ID, Name, Gender + 3 periods
    expect(structure.attendanceColumnCount).toBe(3);
    expect(structure.cells.length).toBe(10 * 6); // 60 total cells
  });
});

describe("OCRService", () => {
  it("parses header text dates and metadata", () => {
    const header = "OAKRIDGE ACADEMY - Grade 10 - Section A | Subject: Mathematics | Date: Oct 14, 2024 | Period: 2";
    const parsed = OCRService.parseHeaderMetadata(header);
    expect(parsed.date).toBe("2024-10-14");
    expect(parsed.period).toBe(2);
    expect(parsed.subjectName?.toLowerCase()).toContain("mathematics");
  });

  it("normalizes student IDs", () => {
    expect(OCRService.normalizeStudentNumber("1001")).toBe("STU-1001");
    expect(OCRService.normalizeStudentNumber("stu-1002")).toBe("STU-1002");
  });
});

describe("AttendanceMarkRecognitionService", () => {
  it("classifies checkmark ✓ with high confidence", () => {
    const res = AttendanceMarkRecognitionService.classifyFromFeatures({
      pixelDensity: 6.5,
      aspectRatio: 1.1,
      centerOfMassX: 0.58, // shifted right
      centerOfMassY: 0.55, // shifted bottom
      symmetryX: 0.4,
    });
    expect(res.symbol).toBe("✓");
    expect(res.status).toBe("PRESENT");
    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies blank cell as UNMARKED", () => {
    const res = AttendanceMarkRecognitionService.classifyFromFeatures({
      pixelDensity: 0.4,
      aspectRatio: 1.0,
      centerOfMassX: 0.5,
      centerOfMassY: 0.5,
      symmetryX: 0.5,
    });
    expect(res.isEmpty).toBe(true);
    expect(res.status).toBe("UNMARKED");
  });

  it("flags ambiguous mark for review", () => {
    const res = AttendanceMarkRecognitionService.classifyFromFeatures({
      pixelDensity: 22.0, // heavy blob
      aspectRatio: 2.5,
      centerOfMassX: 0.2,
      centerOfMassY: 0.8,
      symmetryX: 0.1,
    });
    expect(res.symbol).toBe("?");
    expect(res.status).toBe("NEEDS_REVIEW");
    expect(res.isAmbiguous).toBe(true);
  });
});

describe("StudentMatchingService", () => {
  const mockStudents = [
    { id: "stu_1", schoolId: "s1", classId: "c1", studentNumber: "STU-1001", fullName: "Alexander Wright", gender: "M" as const, enrollmentDate: "2024", status: "ACTIVE" as const },
    { id: "stu_2", schoolId: "s1", classId: "c1", studentNumber: "STU-1002", fullName: "Beatrice Gomez", gender: "F" as const, enrollmentDate: "2024", status: "ACTIVE" as const },
  ];

  it("matches student exactly by student number", () => {
    const match = StudentMatchingService.matchStudent("Unknown Name", "1001", mockStudents);
    expect(match.matchedStudent?.id).toBe("stu_1");
    expect(match.matchType).toBe("EXACT_ID");
  });

  it("matches student fuzzily by slight OCR typo in name", () => {
    const match = StudentMatchingService.matchStudent("Alexandr Wrigt", undefined, mockStudents);
    expect(match.matchedStudent?.id).toBe("stu_1");
    expect(match.confidence).toBeGreaterThan(0.8);
  });
});

describe("AttendanceValidationService", () => {
  it("identifies low confidence and needs review count", () => {
    const mockCells = [
      {
        id: "c1",
        attendanceSheetId: "s1",
        studentId: "stu_1",
        rowIndex: 0,
        columnIndex: 0,
        period: 1,
        cellBoundingBox: { x: 0, y: 0, w: 10, h: 10 },
        interpretedStatus: "PRESENT" as const,
        confidenceScore: 0.95,
        reviewStatus: "AUTO_HIGH" as const,
        isEdited: false,
      },
      {
        id: "c2",
        attendanceSheetId: "s1",
        studentId: "stu_2",
        rowIndex: 1,
        columnIndex: 0,
        period: 1,
        cellBoundingBox: { x: 0, y: 0, w: 10, h: 10 },
        interpretedStatus: "NEEDS_REVIEW" as const,
        confidenceScore: 0.52,
        reviewStatus: "NEEDS_REVIEW" as const,
        isEdited: false,
      },
    ];

    const val = AttendanceValidationService.validateScanCells(mockCells);
    expect(val.totalCells).toBe(2);
    expect(val.highConfidenceCount).toBe(1);
    expect(val.lowConfidenceCount).toBe(1);
    expect(val.canConfirmImmediately).toBe(false);

    const nextErrorIdx = AttendanceValidationService.findNextErrorIndex(mockCells, -1);
    expect(nextErrorIdx).toBe(1);
  });
});
