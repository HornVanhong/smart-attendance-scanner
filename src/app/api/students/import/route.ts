import { NextRequest, NextResponse } from "next/server";
import { dbStore, StudentModel } from "@/lib/db-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { students: rawStudents, classId } = body;

    if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
      return NextResponse.json({ error: "No student records provided" }, { status: 400 });
    }

    const school = dbStore.getSchool();
    const existing = dbStore.getStudents();
    const existingNums = new Set(existing.map((s) => s.studentNumber.toUpperCase()));

    const imported: StudentModel[] = [];
    const skipped: string[] = [];

    rawStudents.forEach((raw) => {
      const num = (raw.studentNumber || raw["Student ID"] || raw.id || "").trim();
      const name = (raw.fullName || raw.name || raw["Full Name"] || "").trim();
      const gender = (raw.gender || raw.sex || "M").trim().toUpperCase() === "F" ? "F" : "M";
      const email = (raw.email || "").trim() || undefined;

      if (!num || !name) {
        skipped.push(`${num || "Unknown"}: Missing number or name`);
        return;
      }

      if (existingNums.has(num.toUpperCase())) {
        skipped.push(`${num} (${name}): Duplicate student number`);
        return;
      }

      existingNums.add(num.toUpperCase());
      const newSt = dbStore.createStudent({
        schoolId: school.id,
        classId: classId || "cls_10a",
        studentNumber: num,
        fullName: name,
        gender,
        email,
        enrollmentDate: new Date().toISOString().split("T")[0],
        status: "ACTIVE",
      });
      imported.push(newSt);
    });

    dbStore.addAuditLog({
      action: "BULK_STUDENT_IMPORT",
      entityType: "Student",
      userId: "usr_admin",
      userName: "Dr. Sarah Jenkins",
      details: JSON.stringify({ importedCount: imported.length, skippedCount: skipped.length }),
    });

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skipped,
      students: imported,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Failed to process bulk import" }, { status: 500 });
  }
}
