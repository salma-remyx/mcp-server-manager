/**
 * OAuth callback page HTML loader
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache the HTML files
let successHtml: string | null = null;
let errorHtml: string | null = null;

function loadHtmlFile(filename: string): string {
  // In production, HTML files are copied to dist/ folder
  const distPath = path.join(__dirname, "..", filename);
  if (fs.existsSync(distPath)) {
    return fs.readFileSync(distPath, "utf-8");
  }

  // In development, load from src/services/
  const srcPath = path.join(__dirname, filename);
  if (fs.existsSync(srcPath)) {
    return fs.readFileSync(srcPath, "utf-8");
  }

  throw new Error(`Could not find ${filename}`);
}

export function renderCallbackPage(type: "success" | "error", message?: string): string {
  if (type === "success") {
    if (!successHtml) {
      successHtml = loadHtmlFile("auth-callback-success.html");
    }
    return successHtml;
  } else {
    if (!errorHtml) {
      errorHtml = loadHtmlFile("auth-callback-error.html");
    }
    // Replace the error message placeholder
    return errorHtml.replace("{{ERROR_MESSAGE}}", message || "Unknown error");
  }
}
