import { prisma } from "./prisma";

export async function ensureSystemInitialized() {
  // Check if school exists
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        id: "sch_main",
        name: "Lincoln Academy",
        code: "SCH-001",
        address: "100 Academic Way, Springfield",
        phone: "+1 (555) 019-2834",
        email: "admin@lincoln.edu",
      },
    });
  }

  // Check if default users exist
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.createMany({
      data: [
        {
          id: "usr_teacher",
          schoolId: school.id,
          name: "Teacher",
          email: "teacher@school.edu",
          passwordHash: "secure-hash",
          role: "TEACHER",
          isActive: true,
        },
        {
          id: "usr_admin",
          schoolId: school.id,
          name: "School Administrator",
          email: "admin@school.edu",
          passwordHash: "secure-hash",
          role: "ADMIN",
          isActive: true,
        },
        {
          id: "usr_reviewer",
          schoolId: school.id,
          name: "Attendance Reviewer",
          email: "reviewer@school.edu",
          passwordHash: "secure-hash",
          role: "ATTENDANCE_REVIEWER",
          isActive: true,
        },
      ],
    });
  }

  // Check if default symbol configs exist
  const symbolCount = await prisma.attendanceSymbolConfig.count();
  if (symbolCount === 0) {
    await prisma.attendanceSymbolConfig.createMany({
      data: [
        {
          schoolId: school.id,
          symbol: "✓",
          mappedStatus: "PRESENT",
          description: "Standard checkmark indicating student is present",
          isDefault: true,
        },
        {
          schoolId: school.id,
          symbol: "A",
          mappedStatus: "ABSENT",
          description: "Letter A indicating unexcused absence",
          isDefault: true,
        },
        {
          schoolId: school.id,
          symbol: "P",
          mappedStatus: "PRESENT",
          description: "Letter P indicating present in roll call",
          isDefault: false,
        },
        {
          schoolId: school.id,
          symbol: "L",
          mappedStatus: "LATE",
          description: "Letter L indicating tardiness/late arrival",
          isDefault: true,
        },
        {
          schoolId: school.id,
          symbol: "E",
          mappedStatus: "EXCUSED",
          description: "Letter E indicating authorized medical/family leave",
          isDefault: true,
        },
        {
          schoolId: school.id,
          symbol: "?",
          mappedStatus: "NEEDS_REVIEW",
          description: "Uncertain or smudged handwritten mark requiring review",
          isDefault: true,
        },
      ],
    });
  }

  return school;
}
