import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";

import { parseResumeText } from "@/lib/parser";

export const runtime = "nodejs";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "doc" || extension === "docx") {
    throw new Error(
      "DOC and DOCX formats are not supported yet. Please export your resume as PDF or plain text and try again.",
    );
  }

  throw new Error(
    "Unsupported file type. Please upload a PDF or plain text resume.",
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get("resume");

    if (!resumeFile || !(resumeFile instanceof File)) {
      return NextResponse.json(
        { error: "Resume file is required under the `resume` field." },
        { status: 400 },
      );
    }

    const text = await extractTextFromFile(resumeFile);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "We could not read any text from the provided resume." },
        { status: 400 },
      );
    }

    const parsedResume = parseResumeText(text);

    return NextResponse.json({ data: parsedResume });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while parsing resume.",
      },
      { status: 500 },
    );
  }
}
