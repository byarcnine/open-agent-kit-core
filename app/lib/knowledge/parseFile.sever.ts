import { parse as csvParse } from "csv-parse/sync";
import readXlsxFile, { type CellValue } from "read-excel-file/node";
import * as mammoth from "mammoth";
import { parseString } from "xml2js";
import * as mime from "mime-types";
// @ts-ignore
import scribe from "scribe.js-ocr";

interface ParsedFile {
  content: string;
  format: string;
}

export async function parseFile(
  buffer: Buffer,
  name: string,
): Promise<ParsedFile> {
  const fileName = name;
  const mimeType = mime.lookup(fileName);
  try {
    switch (mimeType) {
      case "application/pdf": {
        const arrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        );

        const res = await scribe.extractText({
          pdfFiles: [arrayBuffer],
        });
        return { content: res, format: "pdf" };
      }
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
        const excelData = await readXlsxFile(buffer);
        // Skip the title row (index 0) and use row 1 as headers
        const headers = excelData[1];
        const rows = excelData.slice(2);

        // Convert rows to objects using headers
        const jsonData = rows.map((row) => {
          const obj: Record<string, any> = {};
          headers.forEach((header: CellValue, index: number) => {
            if (header && typeof header === "string") obj[header] = row[index];
          });
          return obj;
        });
        return { content: JSON.stringify(jsonData, null, 2), format: "excel" };

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
            },
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
