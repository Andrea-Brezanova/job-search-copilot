// This file handles resume file uploads and delegates PDF parsing to a helper.
import { NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/parsers/pdfParser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A resume file is required." },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "pdf") {
      return NextResponse.json(
        { error: "Only PDF parsing is supported in this route right now." },
        { status: 400 }
      );
    }

    // Convert the uploaded PDF into a Node.js Buffer so the helper can parse it.
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const extractedText = await extractTextFromPdf(pdfBuffer);

    return NextResponse.json({
      extractedText,
      message: "PDF parsed successfully. Resume text added to the form."
    });
  } catch (error) {
    console.error("parse-resume error", error);

    return NextResponse.json(
      { error: "Unable to parse the uploaded PDF resume." },
      { status: 500 }
    );
  }
}
