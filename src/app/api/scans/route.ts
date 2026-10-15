import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";
import { ImagePreprocessingService } from "@/services/image-preprocessing.service";
import fs from "fs";
import path from "path";

export async function GET() {
  await ensureSystemInitialized();
  const sheets = await prisma.attendanceSheet.findMany({
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const formatted = sheets.map((s) => ({
    id: s.id,
    schoolId: s.schoolId,
    classId: s.classId,
    className: s.class?.name || "Unassigned",
    subjectId: s.subjectId,
    subjectName: s.subject?.name || "Unassigned",
    uploadedById: s.uploadedById,
    uploadedByName: s.uploadedBy?.name || "Staff",
    imageStorageKey: s.imageStorageKey,
    originalFileName: s.originalFileName,
    fileSize: s.fileSize,
    mimeType: s.mimeType,
    uploadedAt: s.uploadedAt.toISOString(),
    processedAt: s.processedAt?.toISOString() || null,
    processingStatus: s.processingStatus,
    verificationStatus: s.verificationStatus,
    detectedStudentCount: s.detectedStudentCount,
    detectedCellCount: s.detectedCellCount,
    highConfidenceCount: s.highConfidenceCount,
    lowConfidenceCount: s.lowConfidenceCount,
    sheetDate: s.sheetDate ? s.sheetDate.toISOString().split("T")[0] : undefined,
    sheetPeriod: s.sheetPeriod || 1,
  }));

  return NextResponse.json({ sheets: formatted });
}

export async function POST(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const currentUser = await prisma.user.findFirst();
    const contentType = req.headers.get("content-type") || "";

    let fileName = "attendance_scan.jpg";
    let fileSize = 0;
    let mimeType = "image/jpeg";
    let imageStorageKey = "";
    let classId: string | null = null;
    let subjectId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      classId = (formData.get("classId") as string) || null;
      subjectId = (formData.get("subjectId") as string) || null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const val = ImagePreprocessingService.validateImage(file.type, file.size, 15);
      if (!val.valid) {
        return NextResponse.json({ error: val.error }, { status: 400 });
      }

      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type;

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `scan_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      // Check if we can write to public/uploads (local dev / persistent VPS)
      let writtenToDisk = false;
      if (!process.env.VERCEL) {
        try {
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const filePath = path.join(uploadsDir, safeName);
          fs.writeFileSync(filePath, buffer);
          imageStorageKey = `/uploads/${safeName}`;
          writtenToDisk = true;
        } catch (fsErr) {
          console.warn("Could not write to local disk (Serverless/Vercel environment):", fsErr);
        }
      }

      // If running on Vercel or filesystem is read-only, optimize with sharp and encode as Data URI
      if (!writtenToDisk) {
        if (mimeType === "application/pdf") {
          imageStorageKey = `data:application/pdf;base64,${buffer.toString("base64")}`;
        } else {
          const sharp = (await import("sharp")).default;
          const optimizedBuffer = await sharp(buffer)
            .resize({ width: 1800, withoutEnlargement: true, fit: "inside" })
            .jpeg({ quality: 80 })
            .toBuffer();
          imageStorageKey = `data:image/jpeg;base64,${optimizedBuffer.toString("base64")}`;
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.imageStorageKey) {
        imageStorageKey = body.imageStorageKey;
      } else {
        return NextResponse.json({ error: "Please upload an attendance image file" }, { status: 400 });
      }
      if (body.fileName) fileName = body.fileName;
      if (body.classId) classId = body.classId;
      if (body.subjectId) subjectId = body.subjectId;
    }

    if (!imageStorageKey) {
      return NextResponse.json({ error: "Failed to save uploaded image" }, { status: 400 });
    }

    const sheet = await prisma.attendanceSheet.create({
      data: {
        schoolId: school.id,
        classId: classId || undefined,
        subjectId: subjectId || undefined,
        uploadedById: currentUser?.id || "usr_teacher",
        imageStorageKey,
        originalFileName: fileName,
        fileSize,
        mimeType,
        processingStatus: "PENDING",
        verificationStatus: "UNVERIFIED",
        detectedStudentCount: 0,
        detectedCellCount: 0,
        highConfidenceCount: 0,
        lowConfidenceCount: 0,
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        action: "SCAN_UPLOAD",
        entityType: "AttendanceSheet",
        entityId: sheet.id,
        userId: currentUser?.id || "usr_teacher",
        details: JSON.stringify({ fileName, fileSize, imageStorageKey }),
      },
    });

    return NextResponse.json(
      {
        sheet: {
          ...sheet,
          className: sheet.class?.name || "Unassigned",
          subjectName: sheet.subject?.name || "Unassigned",
          uploadedByName: sheet.uploadedBy?.name || "Staff",
          uploadedAt: sheet.uploadedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating scan:", error);
    return NextResponse.json({ error: "Failed to create attendance scan" }, { status: 500 });
  }
}
