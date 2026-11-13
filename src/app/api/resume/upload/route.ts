import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

function cleanText(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 30000);
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach a resume file (.pdf, .docx, .txt)" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large — keep it under 4 MB" }, { status: 413 });
    }

    const name = (file.name || "").toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const mod = await import("pdf-parse/lib/pdf-parse.js");
      const result = await mod.default(buffer);
      text = result.text;
    } else if (
      name.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const { extractRawText } = await import("mammoth");
      const result = await extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json(
        { error: "Unsupported format — upload a .pdf, .docx, or .txt resume" },
        { status: 415 }
      );
    }

    const cleaned = cleanText(text);
    const words = cleaned ? cleaned.split(/\s+/).length : 0;
    if (words < 30) {
      return NextResponse.json(
        {
          error:
            "Could not extract enough text from that file. If it is a scanned image PDF, export a text-based copy instead.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: cleaned, words, fileName: file.name });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/resume/upload]", err);
    return NextResponse.json(
      { error: "Failed to parse that file. Try a .txt export of your resume." },
      { status: 500 }
    );
  }
}
