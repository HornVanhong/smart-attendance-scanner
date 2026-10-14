import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sheet = dbStore.getSheetById(params.id);
  if (!sheet) {
    return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
  }
  return NextResponse.json({ sheet });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sheet = dbStore.getSheetById(params.id);
  if (!sheet) {
    return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
  }

  const allSheets = dbStore.getSheets();
  const idx = allSheets.findIndex((s) => s.id === params.id);
  if (idx >= 0) {
    allSheets.splice(idx, 1);
  }

  return NextResponse.json({ success: true });
}
