import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = dbStore.getStudentById(params.id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  return NextResponse.json({ student });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updated = dbStore.updateStudent(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ student: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const deleted = dbStore.deleteStudent(params.id);
  if (!deleted) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
