import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export async function POST(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const body = await req.json();
    const { students: rawStudents, classId } = body;

    if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
      return NextResponse.json({ error: "No student records provided" }, { status: 400 });
    }

    if (!classId) {
      return NextResponse.json({ error: "Please select an existing class for import" }, { status: 400 });
    }

    const existingStudents = await prisma.student.findMany({
      where: { schoolId: school.id },
      select: { studentNumber: true },
    });
    const existingNums = new Set(existingStudents.map((s) => s.studentNumber.toUpperCase()));

    const imported: any[] = [];
    const skipped: string[] = [];

    for (const raw of rawStudents) {
      const num = (raw.studentNumber || raw["Student ID"] || raw.id || "").trim().toUpperCase();
      const name = (raw.fullName || raw.name || raw["Full Name"] || "").trim();
      const gender = (raw.gender || raw.sex || "M").trim().toUpperCase() === "F" ? "F" : "M";
      const email = (raw.email || "").trim() || null;

      if (!num || !name) {
        skipped.push(`${num || "Unknown"}: Missing number or name`);
        continue;
      }

      if (existingNums.has(num)) {
        skipped.push(`${num} (${name}): Duplicate student number`);
        continue;
      }

      existingNums.add(num);
      const newSt = await prisma.student.create({
        data: {
          schoolId: school.id,
          classId,
          studentNumber: num,
          fullName: name,
          gender,
          email,
          enrollmentDate: new Date(),
          status: "ACTIVE",
        },
        include: {
          class: { select: { name: true } },
        },
      });

      imported.push({
        ...newSt,
        className: newSt.class?.name || "Unassigned",
        enrollmentDate: newSt.enrollmentDate.toISOString().split("T")[0],
      });
    }

    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        action: "BULK_STUDENT_IMPORT",
        entityType: "Student",
        details: JSON.stringify({ importedCount: imported.length, skippedCount: skipped.length }),
      },
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
