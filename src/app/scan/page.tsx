"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Upload,
  Camera,
  RotateCw,
  Sun,
  Contrast,
  FileCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { ImagePreprocessingService } from "@/services/image-preprocessing.service";

export default function ScanAttendancePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("/samples/attendance_sheet_sample.svg");
  const [isUsingSample, setIsUsingSample] = useState(true);

  // Preprocessing controls
  const [rotationAngle, setRotationAngle] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrastVal, setContrastVal] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Target class & subject selection
  const [classId, setClassId] = useState("cls_10a");
  const [subjectId, setSubjectId] = useState("sub_math101");
  const [classesList, setClassesList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((d) => setClassesList(d.classes || []))
      .catch(() => {});

    fetch("/api/subjects")
      .then((res) => res.json())
      .then((d) => setSubjectsList(d.subjects || []))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const val = ImagePreprocessingService.validateImage(file.type, file.size, 15);
    if (!val.valid) {
      setErrorMessage(val.error || "Invalid file");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setIsUsingSample(false);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const val = ImagePreprocessingService.validateImage(file.type, file.size, 15);
    if (!val.valid) {
      setErrorMessage(val.error || "Invalid file");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setIsUsingSample(false);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const loadSampleSheet = () => {
    setSelectedFile(null);
    setIsUsingSample(true);
    setImagePreviewUrl("/samples/attendance_sheet_sample.svg");
    setRotationAngle(0);
    setBrightness(0);
    setContrastVal(0);
    setGrayscale(false);
    setErrorMessage(null);
  };

  const handleRotate = () => {
    setRotationAngle((prev) => (prev + 90) % 360);
  };

  const handleStartProcessing = async () => {
    setIsProcessing(true);
    setProcessingStep(1);
    setErrorMessage(null);

    try {
      // 1. Create scan record
      let scanId = "scan_sample_01";

      if (!isUsingSample && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("classId", classId);
        formData.append("subjectId", subjectId);

        const uploadRes = await fetch("/api/scans", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
        scanId = uploadData.sheet.id;
      } else {
        // Sample sheet route
        const sampleRes = await fetch("/api/scans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useSample: true, classId, subjectId }),
        });
        const sampleData = await sampleRes.json();
        if (sampleData.sheet?.id) scanId = sampleData.sheet.id;
      }

      // Step 2: Table boundary detection
      setProcessingStep(2);
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: OCR Header & Student Columns
      setProcessingStep(3);
      await new Promise((r) => setTimeout(r, 700));

      // Step 4: Classifying handwritten marks
      setProcessingStep(4);
      const processRes = await fetch(`/api/scans/${scanId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rotationAngle,
          brightness,
          contrast: contrastVal,
        }),
      });

      if (!processRes.ok) {
        throw new Error("Failed to process attendance sheet");
      }

      // Step 5: Verification & Fuzzy Matching Complete
      setProcessingStep(5);
      await new Promise((r) => setTimeout(r, 500));

      // Redirect to the review workspace
      router.push(`/scan/${scanId}/review`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Processing failed");
      setIsProcessing(false);
      setProcessingStep(0);
    }
  };

  const filterString = ImagePreprocessingService.getCssFilterString({
    brightness,
    contrast: contrastVal,
    grayscale,
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Scan &amp; Digitize Attendance Sheet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Upload paper attendance sheets, calibrate image angles, and run AI mark classification.
          </p>
        </div>

        {/* 1-Click Sample Sheet Button */}
        <button
          onClick={loadSampleSheet}
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-semibold text-xs shadow-sm transition-all"
        >
          <Sparkles className="w-4 h-4 text-sky-600" />
          Load Realistic Sample Sheet
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Upload & Controls on Left, Live Preprocessed Image Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Box + Preprocessing Sliders + Target Selectors */}
        <div className="lg:col-span-5 space-y-5">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              selectedFile || isUsingSample
                ? "border-sky-300 bg-sky-50/30"
                : "border-slate-300 hover:border-sky-500 bg-white"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <p className="text-sm font-bold text-slate-800">
              {isUsingSample
                ? "Sample Attendance Sheet Loaded"
                : selectedFile
                ? selectedFile.name
                : "Drag & drop attendance photo here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports JPG, JPEG, PNG, or WebP up to 15 MB
            </p>

            <div className="flex items-center justify-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
              >
                Browse Files
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Camera
              </button>
            </div>
          </div>

          {/* Class & Subject Assignment */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" /> Target Class &amp; Subject
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Class
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                >
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Image Preprocessing Adjustment Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-600" /> Image Calibration
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRotationAngle(0);
                  setBrightness(0);
                  setContrastVal(0);
                  setGrayscale(false);
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Rotation */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Rotation Angle:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-700 font-bold">{rotationAngle}°</span>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    title="Rotate 90° clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-slate-400" /> Contrast
                  </span>
                  <span className="font-mono text-slate-700 font-bold">{contrastVal}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={contrastVal}
                  onChange={(e) => setContrastVal(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-600"
                />
              </div>

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-slate-400" /> Brightness
                  </span>
                  <span className="font-mono text-slate-700 font-bold">{brightness}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-600"
                />
              </div>

              {/* Grayscale Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600 font-medium">Binarize / Grayscale Filter:</span>
                <button
                  type="button"
                  onClick={() => setGrayscale(!grayscale)}
                  className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                    grayscale ? "bg-sky-600 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <div className="bg-white w-3.5 h-3.5 rounded-full shadow-md transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleStartProcessing}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing Attendance Sheet...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                Run AI Recognition &amp; Review
              </>
            )}
          </button>
        </div>

        {/* Right Column: Interactive Real-Time Preview */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Document Image Preview</h3>
              <p className="text-xs text-slate-500">Live perspective &amp; contrast calibration</p>
            </div>
            {isUsingSample && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                Official Roster Sample
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[460px] bg-slate-900/5 rounded-xl border border-slate-200/80 mt-4 p-4 flex items-center justify-center overflow-hidden relative">
            {/* Live Filtered Preview */}
            <div
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                filter: filterString,
                transition: "transform 0.3s ease, filter 0.15s ease",
              }}
              className="max-w-full max-h-full flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Attendance Sheet Preview"
                className="max-h-[520px] w-auto object-contain rounded-lg shadow-md border border-slate-200"
              />
            </div>

            {/* Instruction Callout Overlay */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] p-2.5 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Tip: Keep the sheet aligned horizontally. AI will automatically segment columns and recognize handwritten marks (✓, A, P, L, E).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-step Processing Modal Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Processing Attendance Sheet
                </h3>
                <p className="text-xs text-slate-500">
                  Executing modular OCR and computer vision pipeline...
                </p>
              </div>
            </div>

            {/* Pipeline Step Checklist */}
            <div className="space-y-3 pt-2 text-xs">
              <div className={`flex items-center gap-3 p-2 rounded-lg ${processingStep >= 1 ? "bg-slate-50" : "opacity-40"}`}>
                {processingStep > 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin shrink-0" />
                )}
                <span className="font-medium text-slate-800">1. Image validation &amp; calibration</span>
              </div>

              <div className={`flex items-center gap-3 p-2 rounded-lg ${processingStep >= 2 ? "bg-slate-50" : "opacity-40"}`}>
                {processingStep > 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : processingStep === 2 ? (
                  <div className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className="font-medium text-slate-800">2. Table grid line &amp; boundary detection</span>
              </div>

              <div className={`flex items-center gap-3 p-2 rounded-lg ${processingStep >= 3 ? "bg-slate-50" : "opacity-40"}`}>
                {processingStep > 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : processingStep === 3 ? (
                  <div className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className="font-medium text-slate-800">3. OCR Header &amp; Student Column Extraction</span>
              </div>

              <div className={`flex items-center gap-3 p-2 rounded-lg ${processingStep >= 4 ? "bg-slate-50" : "opacity-40"}`}>
                {processingStep > 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : processingStep === 4 ? (
                  <div className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className="font-medium text-slate-800">4. Handwritten mark morphology classification</span>
              </div>

              <div className={`flex items-center gap-3 p-2 rounded-lg ${processingStep >= 5 ? "bg-slate-50" : "opacity-40"}`}>
                {processingStep >= 5 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className="font-medium text-slate-800">5. Student fuzzy database matching &amp; confidence</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
