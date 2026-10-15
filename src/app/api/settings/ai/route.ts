import { NextRequest, NextResponse } from "next/server";
import { GeminiVisionService } from "@/services/gemini-vision.service";
import { getActiveGeminiApiKey, setActiveGeminiApiKey } from "@/lib/gemini-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentKey = getActiveGeminiApiKey();
  const configured = !!currentKey && currentKey.length > 8;

  let maskedKey = "";
  if (configured) {
    maskedKey = currentKey.slice(0, 4) + "••••••••••••" + currentKey.slice(-4);
  }

  return NextResponse.json({
    configured,
    maskedKey,
    model: "gemini-1.5-flash",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, testOnly } = body;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return NextResponse.json({ error: "Please enter a valid Gemini API key" }, { status: 400 });
    }

    const test = await GeminiVisionService.testApiKey(apiKey.trim());
    if (!test.valid) {
      return NextResponse.json({ error: test.error || "Invalid Gemini API key" }, { status: 400 });
    }

    if (testOnly) {
      return NextResponse.json({ success: true, message: "Gemini API key is valid!" });
    }

    // Save to runtime cache and .env file
    setActiveGeminiApiKey(apiKey.trim());

    return NextResponse.json({
      success: true,
      message: "Gemini AI API connected successfully!",
      configured: true,
    });
  } catch (error: any) {
    console.error("Error setting Gemini API key:", error);
    return NextResponse.json({ error: error.message || "Failed to set Gemini API key" }, { status: 500 });
  }
}
