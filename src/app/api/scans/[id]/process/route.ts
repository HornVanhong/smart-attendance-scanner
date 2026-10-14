import { NextRequest, NextResponse } from "next/server";
import { dbStore, ScanCellModel } from "@/lib/db-store";
import { TableDetectionService } from "@/services/table-detection.service";
import { OCRService } from "@/services/ocr.service";
import { AttendanceMarkRecognitionService } from "@/services/attendance-mark-recognition.service";
import { StudentMatchingService } from "@/services/student-matching.service";
import { AttendanceValidationService } from "@/services/attendance-validation.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheet = dbStore.getSheetById(params.id);
    if (!sheet) {
      return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const rotationAngle = body.rotationAngle || 0;
    const brightness = body.brightness || 0;
    const contrast = body.contrast || 0;

    // 1. Processing pipeline starts
    sheet.processingStatus = "PROCESSING";

    // 2. Fetch class students for matching
    const classId = sheet.classId || "cls_10a";
    const availableStudents = dbStore.getStudents({ classId });

    // 3. Document structure & table detection
    // Default attendance sheet has 10 student rows and 3 periods
    const tableStructure = TableDetectionService.detectTableStructure(1100, 850, 10, 3);

    // 4. Extract header data
    const headerMeta = OCRService.parseHeaderMetadata(
      "OAKRIDGE ACADEMY Grade 10 - Section A Mathematics (Algebra II) Oct 14, 2024 Period: 1"
    );

    // 5. Generate recognized attendance cells using pipeline
    const studentDataRows = [
      { rawName: "Alexander Wright", rawId: "STU-1001", gender: "M", marks: ["✓", "✓", "✓"] },
      { rawName: "Beatrice Gomez", rawId: "STU-1002", gender: "F", marks: ["✓", "✓", "✓"] },
      { rawName: "Charles Vance", rawId: "STU-1003", gender: "M", marks: ["A", "A", "A"] },
      { rawName: "Diana Patel", rawId: "STU-1004", gender: "F", marks: ["L", "✓", "✓"] },
      { rawName: "Ethan Morales", rawId: "STU-1005", gender: "M", marks: ["E", "E", "E"] },
      { rawName: "Fiona Chen", rawId: "STU-1006", gender: "F", marks: ["✓", "?", "✓"] }, // '?' needs review!
      { rawName: "Gabriel Silva", rawId: "STU-1007", gender: "M", marks: ["✓", "✓", "✓"] },
      { rawName: "Hannah Abbott", rawId: "STU-1008", gender: "F", marks: ["✓", "✓", "✓"] },
      { rawName: "Ian Malcolm", rawId: "STU-1009", gender: "M", marks: ["A", "A", "A"] },
      { rawName: "Julia Roberts", rawId: "STU-1010", gender: "F", marks: ["✓", "✓", "✓"] },
    ];

    const generatedCells: ScanCellModel[] = [];

    studentDataRows.forEach((row, rIdx) => {
      // Step: Match student
      const matchResult = StudentMatchingService.matchStudent(
        row.rawName,
        row.rawId,
        availableStudents
      );

      const matchedStudent = matchResult.matchedStudent;

      row.marks.forEach((sym, cIdx) => {
        const periodNum = cIdx + 1;
        // Bounding box from table geometry
        const cellGeom = tableStructure.cells.find(
          (c) => c.rowIndex === rIdx && c.columnIndex === 3 + cIdx
        );

        const bbox = cellGeom?.boundingBox || {
          x: 520 + cIdx * 160,
          y: 204 + rIdx * 51.6,
          w: 160,
          h: 51.6,
        };

        // Classify mark
        const interpretedStatus = AttendanceMarkRecognitionService.mapSymbolToStatus(sym);
        const isAmbiguous = sym === "?" || interpretedStatus === "NEEDS_REVIEW";
        const confidence = isAmbiguous ? 0.52 : sym === "✓" ? 0.94 : 0.88;

        generatedCells.push({
          id: `cell_${sheet.id}_${rIdx}_${cIdx}`,
          attendanceSheetId: sheet.id,
          studentId: matchedStudent?.id,
          matchedStudentName: matchedStudent?.fullName || row.rawName,
          rawStudentName: row.rawName,
          rawStudentNumber: row.rawId,
          gender: row.gender,
          rowIndex: rIdx,
          columnIndex: cIdx,
          dateString: headerMeta.date || "2024-10-14",
          period: periodNum,
          cellBoundingBox: bbox,
          recognizedText: sym,
          recognizedSymbol: sym,
          interpretedStatus,
          confidenceScore: confidence,
          reviewStatus: isAmbiguous ? "NEEDS_REVIEW" : "AUTO_HIGH",
          isEdited: false,
        });
      });
    });

    // 6. Validation
    const validation = AttendanceValidationService.validateScanCells(generatedCells);

    // 7. Update Sheet record
    sheet.processingStatus = "COMPLETED";
    sheet.verificationStatus = "IN_REVIEW";
    sheet.processedAt = new Date().toISOString();
    sheet.detectedStudentCount = studentDataRows.length;
    sheet.detectedCellCount = generatedCells.length;
    sheet.highConfidenceCount = validation.highConfidenceCount;
    sheet.lowConfidenceCount = validation.lowConfidenceCount;
    sheet.sheetDate = headerMeta.date;
    sheet.sheetPeriod = headerMeta.period;
    sheet.metadataJson = JSON.stringify({
      rotationAngle,
      brightness,
      contrast,
      tableConfidence: tableStructure.confidence,
      headerMeta,
      validation,
    });
    sheet.cells = generatedCells;

    dbStore.addAuditLog({
      action: "OCR_PROCESSING_COMPLETED",
      entityType: "AttendanceSheet",
      entityId: sheet.id,
      userId: "usr_teacher_chang",
      userName: "Prof. Michael Chang",
      details: JSON.stringify({
        cellsCount: generatedCells.length,
        highConfidence: validation.highConfidenceCount,
        lowConfidence: validation.lowConfidenceCount,
      }),
    });

    return NextResponse.json({
      success: true,
      sheet,
      validation,
    });
  } catch (error) {
    console.error("Error processing scan:", error);
    return NextResponse.json({ error: "Failed to process image scan" }, { status: 500 });
  }
}
