import { NextRequest, NextResponse } from "next/server";
import { dbStore, ScanCellModel } from "@/lib/db-store";
import { AttendanceValidationService } from "@/services/attendance-validation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sheet = dbStore.getSheetById(params.id);
  if (!sheet) {
    return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
  }

  const validation = AttendanceValidationService.validateScanCells(sheet.cells);

  return NextResponse.json({
    sheet,
    cells: sheet.cells,
    validation,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheet = dbStore.getSheetById(params.id);
    if (!sheet) {
      return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
    }

    const body = await req.json();
    const { cells, singleCellUpdate, isDraft } = body;

    if (singleCellUpdate) {
      // Single cell update
      const cell = sheet.cells.find((c) => c.id === singleCellUpdate.cellId);
      if (cell) {
        const prevStatus = cell.interpretedStatus;
        if (singleCellUpdate.interpretedStatus) {
          cell.interpretedStatus = singleCellUpdate.interpretedStatus;
        }
        if (singleCellUpdate.studentId !== undefined) {
          cell.studentId = singleCellUpdate.studentId;
          const st = dbStore.getStudentById(singleCellUpdate.studentId);
          cell.matchedStudentName = st ? st.fullName : cell.rawStudentName;
        }
        cell.reviewStatus = "CORRECTED";
        cell.isEdited = true;
        cell.confidenceScore = 1.0; // Teacher confirmed

        dbStore.addAuditLog({
          action: "CELL_CORRECTION",
          entityType: "ScanCell",
          entityId: cell.id,
          userId: "usr_teacher_chang",
          userName: "Prof. Michael Chang",
          details: JSON.stringify({
            previousStatus: prevStatus,
            newStatus: cell.interpretedStatus,
            cellId: cell.id,
          }),
        });
      }
    } else if (Array.isArray(cells)) {
      // Bulk update
      dbStore.updateSheetCells(params.id, cells);
    }

    if (isDraft) {
      sheet.verificationStatus = "IN_REVIEW";
    }

    const validation = AttendanceValidationService.validateScanCells(sheet.cells);

    return NextResponse.json({
      success: true,
      sheet,
      validation,
    });
  } catch (error) {
    console.error("Error updating scan results:", error);
    return NextResponse.json({ error: "Failed to update scan results" }, { status: 500 });
  }
}
