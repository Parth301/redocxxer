// api/upload.js - Upload and classify document (Pure In-Memory with Streams)
import mammoth from "mammoth";

const IEEE_SPECS = {
  pageSize: { width: 8.5, height: 11 },
  margins: {
    top: 0.75,
    bottom: 1.0,
    left: 0.625,
    right: 0.625,
  },
  columns: {
    count: 2,
    spacing: 0.17,
  },
  fonts: {
    title: { name: "Times New Roman", size: 24, bold: true },
    authors: { name: "Times New Roman", size: 11 },
    abstract: { name: "Times New Roman", size: 10 },
    body: { name: "Times New Roman", size: 10 },
    headings: { name: "Times New Roman", size: 10, bold: true },
    subheadings: { name: "Times New Roman", size: 10, italic: true },
  },
  spacing: {
    singleSpaced: true,
    paragraphIndent: 0.17,
    firstParagraphIndent: 0,
  },
};

// Parse multipart form data manually
async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    const maxSize = 50 * 1024 * 1024; // 50MB

    req.on("data", (chunk) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        reject(new Error("File too large"));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });

    req.on("error", reject);
  });
}

// Extract file data from multipart boundary
function extractFileFromMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) throw new Error("Invalid multipart data");

  const boundary = boundaryMatch[1];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  let startIdx = buffer.indexOf(boundaryBuffer);
  if (startIdx === -1) throw new Error("Boundary not found");

  // Find the start of actual file data (after headers)
  let headerEndIdx = buffer.indexOf("\r\n\r\n", startIdx);
  if (headerEndIdx === -1) headerEndIdx = buffer.indexOf("\n\n", startIdx);
  if (headerEndIdx === -1) throw new Error("Headers not found");

  headerEndIdx += headerEndIdx.includes("\r\n\r\n") ? 4 : 2;

  // Find the end boundary
  let endIdx = buffer.indexOf(boundaryBuffer, headerEndIdx);
  if (endIdx === -1) throw new Error("End boundary not found");

  // Remove trailing CRLF before boundary
  while (
    endIdx > 0 &&
    (buffer[endIdx - 1] === 13 || buffer[endIdx - 1] === 10)
  ) {
    endIdx--;
  }

  return buffer.slice(headerEndIdx, endIdx);
}

async function readDocxWithRuns(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const paragraphs = result.value.split("\n").filter((p) => p.trim());

    return paragraphs.map((text) => ({
      text: text.trim(),
      runs: [{ text: text.trim(), bold: false, italic: false, size: 10 }],
      is_bold: false,
      is_italic: false,
      is_large: false,
    }));
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

function classifyParagraphs(paragraphs) {
  return paragraphs.map((para, idx) => {
    const text = para.text.toLowerCase();
    let label = "BODY";

    if (idx === 0) {
      label = "TITLE";
    } else if (text.includes("abstract")) {
      label = "ABSTRACT";
    } else if (text.match(/keywords?:/i)) {
      label = "KEYWORDS";
    } else if (text.match(/^references|^bibliography/i)) {
      label = "REFERENCES";
    } else if (text.includes("introduction")) {
      label = "INTRODUCTION";
    } else if (text.match(/method|methodology/i)) {
      label = "METHOD";
    } else if (text.match(/results|evaluation/i)) {
      label = "RESULTS";
    } else if (text.match(/conclusion|future work/i)) {
      label = "CONCLUSION";
    } else if (text.includes("@") || text.includes(".edu")) {
      label = "AUTHOR";
    } else if (text.match(/^table\s+[ivx\d]/i)) {
      label = "TABLE_CAPTION";
    } else if (text.match(/^fig(ure)?\s*\d/i)) {
      label = "FIGURE_CAPTION";
    } else if (text.split(" ").length <= 10 && !text.endsWith(".")) {
      label = "HEADING";
    }

    return { text: para.text, label, index: idx };
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, multipart/form-data");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const contentType = req.headers["content-type"];

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Expected multipart/form-data" });
    }

    // Read entire request into buffer (in-memory)
    const buffer = await parseMultipartForm(req);

    // Extract DOCX file from multipart
    const fileBuffer = extractFileFromMultipart(buffer, contentType);

    if (fileBuffer.length === 0) {
      return res.status(400).json({ error: "No file data found" });
    }

    // Parse and classify
    const paragraphs = await readDocxWithRuns(fileBuffer);
    const classified = classifyParagraphs(paragraphs);

    return res.status(200).json({
      success: true,
      paragraphs: classified,
      ieeeSpecs: IEEE_SPECS,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process document",
    });
  }
}
