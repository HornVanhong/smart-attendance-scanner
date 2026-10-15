import fs from "fs";
import path from "path";

let runtimeGeminiApiKey = process.env.GEMINI_API_KEY || "";

export function getActiveGeminiApiKey(): string {
  return runtimeGeminiApiKey || process.env.GEMINI_API_KEY || "";
}

export function setActiveGeminiApiKey(key: string): void {
  runtimeGeminiApiKey = key.trim();
  process.env.GEMINI_API_KEY = key.trim();

  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    if (envContent.includes("GEMINI_API_KEY=")) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY="${key.trim()}"`);
    } else {
      envContent += `\nGEMINI_API_KEY="${key.trim()}"\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf-8");
  } catch (fsErr) {
    console.warn("Notice updating .env file:", fsErr);
  }
}
