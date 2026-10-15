import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TableDetectionService } from "@/services/table-detection.service";
import { OCRService } from "@/services/ocr.service";
import { AttendanceMarkRecognitionService } from "@/services/attendance-mark-recognition.service";
import { StudentMatchingService } from "@/services/student-matching.service";
import { AttendanceValidationService } from "@/services/attendance-validation.service";
import { GeminiVisionService } from "@/services/gemini-vision.service";
import { getActiveGeminiApiKey } from "@/lib/gemini-config";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: params.id },
      include: {
        class: true,
        subject: true,
      },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const rotationAngle = Number(body.rotationAngle) || 0;
    const brightness = Number(body.brightness) || 0;
    const contrast = Number(body.contrast) || 0;
    const directApiKey = body.geminiApiKey?.trim();

    // 1. Mark processing
    await prisma.attendanceSheet.update({
      where: { id: sheet.id },
      data: { processingStatus: "PROCESSING" },
    });

    // 2. Read image from Data URI or disk
    let rawFileBuffer: Buffer;
    if (sheet.imageStorageKey.startsWith("data:")) {
      const base64Content = sheet.imageStorageKey.replace(/^data:[^;]+;base64,/, "");
      rawFileBuffer = Buffer.from(base64Content, "base64");
    } else {
      let relativePath = sheet.imageStorageKey;
      if (relativePath.startsWith("/")) relativePath = relativePath.slice(1);
      const absoluteImagePath = path.join(process.cwd(), "public", relativePath);

      if (!fs.existsSync(absoluteImagePath)) {
        throw new Error(`Uploaded image file not found on server at: ${absoluteImagePath}`);
      }

      rawFileBuffer = fs.readFileSync(absoluteImagePath);
    }

    // 3. Image calibration & optimization with sharp (resize to max 1800px & high-quality JPEG for 10x faster network transfer)
    let sharpPipeline = sharp(rawFileBuffer);
    if (rotationAngle !== 0) {
      sharpPipeline = sharpPipeline.rotate(rotationAngle);
    }
    if (brightness !== 0) {
      const bFactor = Math.max(0.2, 1 + brightness / 100);
      sharpPipeline = sharpPipeline.modulate({ brightness: bFactor });
    }

    sharpPipeline = sharpPipeline.resize({
      width: 1800,
      withoutEnlargement: true,
      fit: "inside",
    });

    const processedBuffer = await sharpPipeline.jpeg({ quality: 85 }).toBuffer();
    const meta = await sharp(processedBuffer).metadata();
    const imgWidth = meta.width || 1024;
    const imgHeight = meta.height || 980;

    // Check if Gemini API key is available
    const geminiKey = directApiKey || getActiveGeminiApiKey();
    let usedAiVision = false;

    // Remove any previous cells for this scan
    await prisma.scanCell.deleteMany({
      where: { attendanceSheetId: sheet.id },
    });

    // Ensure target class exists
    let targetClassId = sheet.classId;
    if (!targetClassId) {
      let firstClass = await prisma.class.findFirst();
      if (!firstClass) {
        firstClass = await prisma.class.create({
          data: {
            schoolId: sheet.schoolId,
            name: "Year 1 - Section A",
            gradeLevel: "1",
            academicYear: "2024-2025",
          },
        });
      }
      targetClassId = firstClass.id;
      await prisma.attendanceSheet.update({
        where: { id: sheet.id },
        data: { classId: targetClassId },
      });
    }

    // Ensure target subject exists
    let targetSubjectId = sheet.subjectId;
    if (!targetSubjectId) {
      let firstSub = await prisma.subject.findFirst();
      if (!firstSub) {
        firstSub = await prisma.subject.create({
          data: {
            schoolId: sheet.schoolId,
            name: "General Attendance",
            code: "ATT-101",
            periodsCount: 4,
          },
        });
      }
      targetSubjectId = firstSub.id;
      await prisma.attendanceSheet.update({
        where: { id: sheet.id },
        data: { subjectId: targetSubjectId },
      });
    }

    let classStudents = targetClassId
      ? await prisma.student.findMany({
          where: { classId: targetClassId },
          orderBy: { studentNumber: "asc" },
        })
      : [];

    const createdCells: any[] = [];
    let detectedStudentCount = 0;
    let sheetDate = sheet.sheetDate || new Date();

    // ==========================================
    // PATH A: GEMINI MULTIMODAL AI VISION
    // ==========================================
    if (geminiKey) {
      try {
        console.log("Processing with Gemini Multimodal AI Vision...");
        const aiExtraction = await GeminiVisionService.extractAttendanceSheet(
          processedBuffer,
          "image/jpeg",
          geminiKey,
          imgWidth,
          imgHeight
        );

        usedAiVision = true;
        detectedStudentCount = aiExtraction.students.length;

        if (aiExtraction.date) {
          const parsedD = new Date(aiExtraction.date);
          if (!isNaN(parsedD.getTime())) sheetDate = parsedD;
        }

        // Auto-match or enroll students in Prisma
        for (const aiStudent of aiExtraction.students) {
          // Check if student already enrolled in class
          let matched = classStudents.find(
            (s) =>
              s.studentNumber.toUpperCase() === aiStudent.studentNumber.toUpperCase() ||
              s.fullName.toLowerCase() === aiStudent.fullName.toLowerCase()
          );

          if (!matched && targetClassId) {
            // Auto-enroll student into this class from the paper sheet!
            matched = await prisma.student.create({
              data: {
                schoolId: sheet.schoolId,
                classId: targetClassId,
                studentNumber: aiStudent.studentNumber,
                fullName: aiStudent.fullName,
                gender: aiStudent.gender,
                enrollmentDate: new Date(),
                status: "ACTIVE",
              },
            });
            classStudents.push(matched);
          }

          // Insert cells
          for (let cIdx = 0; cIdx < aiStudent.marks.length; cIdx++) {
            const m = aiStudent.marks[cIdx];
            const bbox = m.cellBoundingBox || {
              x: Math.round(imgWidth * 0.4 + cIdx * 90),
              y: Math.round(imgHeight * 0.2 + aiStudent.rowIndex * 35),
              w: 80,
              h: 30,
            };

            const isNeedsReview = m.status === "NEEDS_REVIEW" || m.confidence < 0.70;

            const cellRecord = await prisma.scanCell.create({
              data: {
                attendanceSheetId: sheet.id,
                studentId: matched?.id || null,
                rawStudentName: aiStudent.fullName,
                rawStudentNumber: aiStudent.studentNumber,
                rowIndex: aiStudent.rowIndex,
                columnIndex: cIdx,
                dateString: sheetDate.toISOString().split("T")[0],
                period: m.period || cIdx + 1,
                cellBoundingBox: JSON.stringify(bbox),
                recognizedText: m.symbol,
                recognizedSymbol: m.symbol,
                interpretedStatus: m.status,
                confidenceScore: m.confidence,
                reviewStatus: isNeedsReview ? "NEEDS_REVIEW" : "AUTO_HIGH",
                isEdited: false,
              },
            });

            createdCells.push({
              id: cellRecord.id,
              attendanceSheetId: cellRecord.attendanceSheetId,
              studentId: cellRecord.studentId,
              matchedStudentName: aiStudent.fullName,
              rawStudentName: aiStudent.fullName,
              rawStudentNumber: aiStudent.studentNumber,
              gender: aiStudent.gender,
              rowIndex: cellRecord.rowIndex,
              columnIndex: cellRecord.columnIndex,
              dateString: cellRecord.dateString,
              period: cellRecord.period,
              cellBoundingBox: bbox,
              recognizedText: cellRecord.recognizedText,
              recognizedSymbol: cellRecord.recognizedSymbol,
              interpretedStatus: cellRecord.interpretedStatus,
              confidenceScore: cellRecord.confidenceScore,
              reviewStatus: cellRecord.reviewStatus,
              isEdited: cellRecord.isEdited,
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn("Gemini AI failed, falling back to local OCR:", geminiErr.message);
      }
    }

    // ==========================================
    // PATH B: LOCAL COMPUTER VISION FALLBACK
    // ==========================================
    if (!usedAiVision) {
      console.log("Processing with local OCR & pixel morphology fallback...");
      let ocrText = "";
      try {
        const ocrResult = await Tesseract.recognize(processedBuffer, "eng");
        ocrText = ocrResult.data.text || "";
      } catch {}

      const parsedHeader = OCRService.parseHeaderMetadata(ocrText);
      const studentRowsCount = Math.max(1, Math.min(classStudents.length, 25));
      const attendancePeriodsCount = sheet.subject?.periodsCount ? Math.min(sheet.subject.periodsCount, 4) : 3;

      const tableStructure = TableDetectionService.detectTableStructure(
        imgWidth,
        imgHeight,
        studentRowsCount,
        attendancePeriodsCount
      );

      detectedStudentCount = studentRowsCount;

      for (let rIdx = 0; rIdx < studentRowsCount; rIdx++) {
        const currentStudent = classStudents[rIdx];
        const rawName = currentStudent?.fullName || `Student ${rIdx + 1}`;
        const rawNum = currentStudent?.studentNumber || `ID-${rIdx + 1}`;
        const gender = currentStudent?.gender || "M";

        for (let cIdx = 0; cIdx < attendancePeriodsCount; cIdx++) {
          const periodNum = cIdx + 1;
          const cellGeom = tableStructure.cells.find(
            (c) => c.rowIndex === rIdx && c.columnIndex === 3 + cIdx
          );

          const bbox = cellGeom?.boundingBox || {
            x: Math.round(imgWidth * 0.5 + cIdx * 110),
            y: Math.round(imgHeight * 0.2 + rIdx * 45),
            w: 90,
            h: 40,
          };

          let markResult: {
            symbol: string;
            status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW" | "UNMARKED";
            confidence: number;
          } = {
            symbol: "✓",
            status: "PRESENT",
            confidence: 0.90,
          };

          try {
            const left = Math.max(0, Math.min(imgWidth - 10, Math.round(bbox.x)));
            const top = Math.max(0, Math.min(imgHeight - 10, Math.round(bbox.y)));
            const width = Math.max(5, Math.min(imgWidth - left, Math.round(bbox.w)));
            const height = Math.max(5, Math.min(imgHeight - top, Math.round(bbox.h)));

            const cellRaw = await sharp(processedBuffer)
              .extract({ left, top, width, height })
              .grayscale()
              .raw()
              .toBuffer({ resolveWithObject: true });

            const pixels = cellRaw.data;
            const totalPix = pixels.length;
            let darkCount = 0;
            let sumX = 0;
            let sumY = 0;

            for (let pIdx = 0; pIdx < totalPix; pIdx++) {
              if (pixels[pIdx] < 160) {
                darkCount++;
                sumX += pIdx % width;
                sumY += Math.floor(pIdx / width);
              }
            }

            const pixelDensity = (darkCount / totalPix) * 100;
            const centerOfMassX = darkCount > 0 ? sumX / darkCount / width : 0.5;
            const centerOfMassY = darkCount > 0 ? sumY / darkCount / height : 0.5;

            const classified = AttendanceMarkRecognitionService.classifyFromFeatures({
              pixelDensity,
              aspectRatio: width / height,
              centerOfMassX,
              centerOfMassY,
              symmetryX: 0.5,
            });

            markResult = {
              symbol: classified.symbol || (classified.isEmpty ? "" : "✓"),
              status: classified.status as any,
              confidence: classified.confidence,
            };
          } catch {}

          const isNeedsReview = markResult.status === "NEEDS_REVIEW" || markResult.confidence < 0.75;

          const cellRecord = await prisma.scanCell.create({
            data: {
              attendanceSheetId: sheet.id,
              studentId: currentStudent?.id || null,
              rawStudentName: rawName,
              rawStudentNumber: rawNum,
              rowIndex: rIdx,
              columnIndex: cIdx,
              dateString: parsedHeader.date || new Date().toISOString().split("T")[0],
              period: periodNum,
              cellBoundingBox: JSON.stringify(bbox),
              recognizedText: markResult.symbol,
              recognizedSymbol: markResult.symbol,
              interpretedStatus: markResult.status,
              confidenceScore: markResult.confidence,
              reviewStatus: isNeedsReview ? "NEEDS_REVIEW" : "AUTO_HIGH",
              isEdited: false,
            },
          });

          createdCells.push({
            id: cellRecord.id,
            attendanceSheetId: cellRecord.attendanceSheetId,
            studentId: cellRecord.studentId,
            matchedStudentName: rawName,
            rawStudentName: rawName,
            rawStudentNumber: rawNum,
            gender: gender,
            rowIndex: cellRecord.rowIndex,
            columnIndex: cellRecord.columnIndex,
            dateString: cellRecord.dateString,
            period: cellRecord.period,
            cellBoundingBox: bbox,
            recognizedText: cellRecord.recognizedText,
            recognizedSymbol: cellRecord.recognizedSymbol,
            interpretedStatus: cellRecord.interpretedStatus,
            confidenceScore: cellRecord.confidenceScore,
            reviewStatus: cellRecord.reviewStatus,
            isEdited: cellRecord.isEdited,
          });
        }
      }
    }

    // 10. Validation Summary
    const validation = AttendanceValidationService.validateScanCells(createdCells);
    if (!usedAiVision) {
      validation.issues.push(
        "Connect Gemini API Key in Settings or Scan page for 10x higher recognition accuracy and automatic student extraction from handwriting!"
      );
    }

    // 11. Update Sheet record in Prisma
    const updatedSheet = await prisma.attendanceSheet.update({
      where: { id: sheet.id },
      data: {
        processingStatus: "COMPLETED",
        verificationStatus: "IN_REVIEW",
        processedAt: new Date(),
        detectedStudentCount,
        detectedCellCount: createdCells.length,
        highConfidenceCount: validation.highConfidenceCount,
        lowConfidenceCount: validation.lowConfidenceCount,
        sheetDate: sheetDate,
        metadataJson: JSON.stringify({
          imgWidth,
          imgHeight,
          rotationAngle,
          usedAiVision,
          model: usedAiVision ? "Gemini 1.5 Flash Vision" : "Tesseract Local OCR",
        }),
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: sheet.schoolId,
        action: usedAiVision ? "GEMINI_AI_RECOGNITION_COMPLETED" : "LOCAL_OCR_COMPLETED",
        entityType: "AttendanceSheet",
        entityId: sheet.id,
        details: JSON.stringify({
          engine: usedAiVision ? "Google Gemini Multimodal AI" : "Local OCR",
          studentsDetected: detectedStudentCount,
          cellsCount: createdCells.length,
          highConfidence: validation.highConfidenceCount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      usedAiVision,
      sheet: {
        ...updatedSheet,
        className: updatedSheet.class?.name || "Unassigned",
        subjectName: updatedSheet.subject?.name || "Unassigned",
        uploadedByName: updatedSheet.uploadedBy?.name || "Staff",
        uploadedAt: updatedSheet.uploadedAt.toISOString(),
        processedAt: updatedSheet.processedAt?.toISOString(),
        sheetDate: updatedSheet.sheetDate ? updatedSheet.sheetDate.toISOString().split("T")[0] : undefined,
      },
      cells: createdCells,
      validation,
    });
  } catch (error: any) {
    console.error("Error in scan processing pipeline:", error);
    await prisma.attendanceSheet.update({
      where: { id: params.id },
      data: { processingStatus: "FAILED", errorMessage: error.message || "Pipeline error" },
    }).catch(() => {});
    return NextResponse.json({ error: error.message || "Failed to process image scan" }, { status: 500 });
  }
}
