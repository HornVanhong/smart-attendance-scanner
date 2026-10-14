import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const students = dbStore.getStudents({ classId, status, search });
  return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentNumber, fullName, gender, classId, email, phone, enrollmentDate, status } = body;

    if (!studentNumber || !fullName || !classId) {
      return NextResponse.json(
        { error: "Student Number, Full Name, and Class are required" },
        { status: 400 }
      );
    }

    // Check duplicate student number
    const existing = dbStore.getStudents().find(
      (s) => s.studentNumber.toLowerCase() === studentNumber.trim().toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        { error: `Student number "${studentNumber}" already exists.` },
        { status: 409 }
      );
    }

    const newStudent = dbStore.createStudent({
      schoolId: dbStore.getSchool().id,
      studentNumber: studentNumber.trim(),
      fullName: fullName.trim(),
      gender: gender || "M",
      classId,
      email,
      phone,
      enrollmentDate: enrollmentDate || new Date().toISOString().split("T")[0],
      status: status || "ACTIVE",
    });

    dbStore.addAuditLog({
      action: "STUDENT_CREATED",
      entityType: "Student",
      entityId: newStudent.id,
      userId: "usr_teacher_chang",
      userName: "Prof. Michael Chang",
      details: JSON.stringify({ studentNumber, fullName, classId }),
    });

    return NextResponse.json({ student: newStudent }, { status: 201 });
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
