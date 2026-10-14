import { NextRequest, NextResponse } from "next/server";
import { dbStore, generateSampleScanCells } from "@/lib/db-store";
import { ImagePreprocessingService } from "@/services/image-preprocessing.service";
import fs from "fs";
import path from "path";

export async function GET() {
  const sheets = dbStore.getSheets();
  return NextResponse.json({ sheets });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let fileName = "attendance_scan.jpg";
    let fileSize = 1024 * 500;
    let mimeType = "image/jpeg";
    let imageStorageKey = "/samples/attendance_sheet_sample.svg";
    let classId = "cls_10a";
    let subjectId = "sub_math101";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      classId = (formData.get("classId") as string) || classId;
      subjectId = (formData.get("subjectId") as string) || subjectId;

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

      // Ensure upload directory exists
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `scan_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, buffer);
      imageStorageKey = `/uploads/${safeName}`;
    } else {
      // JSON body (e.g. sample sheet load or direct key)
      const body = await req.json().catch(() => ({}));
      if (body.useSample) {
        fileName = "Grade10_Math_Attendance_Oct14.jpg";
        imageStorageKey = "/samples/attendance_sheet_sample.svg";
      } else if (body.imageStorageKey) {
        imageStorageKey = body.imageStorageKey;
      }
      if (body.classId) classId = body.classId;
      if (body.subjectId) subjectId = body.subjectId;
    }

    const currentSchool = dbStore.getSchool();
    const targetClass = dbStore.getClassById(classId);
    const targetSubject = dbStore.getSubjectById(subjectId);

    const sheet = dbStore.createSheet({
      schoolId: currentSchool.id,
      classId,
      className: targetClass?.name || "Grade 10 - Section A",
      subjectId,
      subjectName: targetSubject?.name || "Mathematics",
      uploadedById: "usr_teacher_chang",
      uploadedByName: "Prof. Michael Chang",
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
    });

    return NextResponse.json({ sheet }, { status: 201 });
  } catch (error) {
    console.error("Error creating scan:", error);
    return NextResponse.json({ error: "Failed to create attendance scan" }, { status: 500 });
  }
}
