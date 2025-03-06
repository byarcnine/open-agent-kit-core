import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import { parseString } from "xml2js";
import * as mime from "mime-types";
import { PdfReader } from "pdfreader";

interface ParsedFile {
  content: string;
  format: string;
}

export async function parseFile(
  buffer: Buffer,
  name: string
): Promise<ParsedFile> {
  const fileName = name;
  const mimeType = mime.lookup(fileName);
  try {
    switch (mimeType) {
      case "application/pdf":
        return new Promise<ParsedFile>((resolve, reject) => {
          let textContent = "";

          const reader = new PdfReader();
          reader.parseBuffer(buffer, (err, item) => {
            if (err) {
              console.error(err);
              reject(new Error(`PDF parsing error`));
            } else if (!item) {
              // End of file, resolve with accumulated text
              resolve({ content: textContent, format: "pdf" });
            } else if (item.text) {
              // Accumulate text content
              textContent += item.text + " ";
            }
          });
        });

      case "application/json":
        const jsonText = new TextDecoder().decode(buffer);
        const jsonObj = JSON.parse(jsonText);
        return { content: JSON.stringify(jsonObj, null, 2), format: "json" };

      case "text/csv":
        const csvText = new TextDecoder().decode(buffer);
        const records = csvParse(csvText, {
          columns: true,
          skip_empty_lines: true,
        });
        return { content: JSON.stringify(records, null, 2), format: "csv" };

      case "application/vnd.ms-excel":
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData: Record<string, unknown>[] =
          XLSX.utils.sheet_to_json(firstSheet);
        return { content: JSON.stringify(excelData, null, 2), format: "excel" };

      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        const result: { value: string } = await mammoth.extractRawText({
          buffer,
        });
        return { content: result.value, format: "word" };

      case "application/xml":
        const xmlText = new TextDecoder().decode(buffer);
        return new Promise<ParsedFile>((resolve, reject) => {
          parseString(
            xmlText,
            (err: Error | null, result: Record<string, unknown>) => {
              if (err) reject(err);
              resolve({
                content: JSON.stringify(result, null, 2),
                format: "xml",
              });
            }
          );
        });

      case "text/markdown":
        const mdText = new TextDecoder().decode(buffer);
        return { content: mdText, format: "markdown" };

      default:
        throw new Error(`Unsupported file format: ${mimeType} - ${fileName}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error parsing file: ${error.message}`);
    } else {
      throw new Error("Error parsing file: Unknown error");
    }
  }
}
