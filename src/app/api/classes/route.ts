import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function GET() {
  const classes = dbStore.getClasses();
  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, gradeLevel, academicYear, teacherId } = body;

    if (!name || !gradeLevel) {
      return NextResponse.json({ error: "Name and Grade Level are required" }, { status: 400 });
    }

    const newClass = dbStore.createClass({
      schoolId: dbStore.getSchool().id,
      name,
      gradeLevel,
      academicYear: academicYear || "2024-2025",
      teacherId,
    });

    return NextResponse.json({ class: newClass }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
