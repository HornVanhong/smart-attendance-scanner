import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

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
    const verifiedById = body.verifiedById || "usr_teacher_chang";
    const verifiedUser = dbStore.getUserById(verifiedById);
    const verifiedByName = verifiedUser?.name || "Prof. Michael Chang";

    const updatedSheet = dbStore.confirmSheetAttendance(params.id, verifiedById, verifiedByName);
    if (!updatedSheet) {
      return NextResponse.json({ error: "Failed to confirm attendance" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Attendance sheet verified and records finalized successfully",
      sheet: updatedSheet,
      totalRecordsCreated: updatedSheet.cells.length,
    });
  } catch (error) {
    console.error("Error confirming attendance:", error);
    return NextResponse.json({ error: "Failed to finalize attendance records" }, { status: 500 });
  }
}
