// This file keeps PDF-specific parsing logic separate from the API route.
// The route only handles request validation and response formatting.
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // `pdf-parse` is loaded lazily on the server so this helper stays server-focused.
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default ?? pdfParseModule;

  const result = await pdfParse(buffer);
  const extractedText = result.text.replace(/\s+\n/g, "\n").trim();

  if (!extractedText) {
    throw new Error("No readable text was found in the uploaded PDF.");
  }

  return extractedText;
}
