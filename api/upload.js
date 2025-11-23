// api/upload.js - Upload and classify document
import formidable from "formidable";
import mammoth from "mammoth";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

async function readDocxWithRuns(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const paragraphs = result.value.split("\n").filter((p) => p.trim());

  return paragraphs.map((text) => ({
    text: text.trim(),
    runs: [{ text: text.trim(), bold: false, italic: false, size: 10 }],
    is_bold: false,
    is_italic: false,
    is_large: false,
  }));
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({ multiples: false });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const file = files.document;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read file
    const fs = await import("fs");
    const buffer = fs.readFileSync(file.filepath);

    // Parse and classify
    const paragraphs = await readDocxWithRuns(buffer);
    const classified = classifyParagraphs(paragraphs);

    res.status(200).json({
      success: true,
      paragraphs: classified,
      ieeeSpecs: IEEE_SPECS,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}
