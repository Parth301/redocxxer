// api/export.js - Export IEEE formatted DOCX
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

function buildStructure(labeled) {
  const struct = {
    title: "",
    authors: "",
    affiliation: "",
    abstract: "",
    keywords: "",
    sections: [],
    references: [],
  };

  let currentSection = null;

  for (const item of labeled) {
    const text = item.text.trim();
    const label = item.label.toUpperCase();

    switch (label) {
      case "TITLE":
        struct.title = struct.title ? `${struct.title} ${text}` : text;
        break;

      case "AUTHOR":
        struct.authors = struct.authors ? `${struct.authors} | ${text}` : text;
        break;

      case "AFFILIATION":
        struct.affiliation = struct.affiliation
          ? `${struct.affiliation} | ${text}`
          : text;
        break;

      case "ABSTRACT":
        const cleanAbstract = text.replace(/^\s*abstract[:\-\s]*/i, "");
        struct.abstract = struct.abstract
          ? `${struct.abstract} ${cleanAbstract}`
          : cleanAbstract;
        break;

      case "KEYWORDS":
        const cleanKeywords = text.replace(/^\s*keywords?[:\-\s]*/i, "");
        struct.keywords = struct.keywords
          ? `${struct.keywords}; ${cleanKeywords}`
          : cleanKeywords;
        break;

      case "REFERENCES":
        struct.references.push(text);
        break;

      case "TABLE_CAPTION":
      case "FIGURE_CAPTION":
        if (!struct.sections.length) {
          struct.sections.push({
            heading: "Figures and Tables",
            content: [text],
          });
        } else {
          struct.sections[struct.sections.length - 1].content.push(text);
        }
        break;

      case "HEADING":
      case "INTRODUCTION":
      case "BACKGROUND":
      case "METHOD":
      case "RESULTS":
      case "CONCLUSION":
        if (currentSection) {
          struct.sections.push(currentSection);
        }
        currentSection = { heading: text, content: [] };
        break;

      default:
        if (currentSection) {
          currentSection.content.push(text);
        } else {
          if (!struct.sections.length) {
            struct.sections.push({ heading: "Introduction", content: [text] });
          } else {
            struct.sections[0].content.push(text);
          }
        }
    }
  }

  if (currentSection) {
    struct.sections.push(currentSection);
  }

  return struct;
}

function createIEEEDocument(struct) {
  const children = [];

  if (struct.title) {
    children.push(
      new Paragraph({
        text: struct.title,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        style: {
          font: { name: "Times New Roman", size: 48 },
          bold: true,
        },
      })
    );
  }

  if (struct.authors) {
    children.push(
      new Paragraph({
        text: struct.authors,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        style: {
          font: { name: "Times New Roman", size: 22 },
        },
      })
    );
  }

  if (struct.affiliation) {
    children.push(
      new Paragraph({
        text: struct.affiliation,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        style: {
          font: { name: "Times New Roman", size: 20 },
          italics: true,
        },
      })
    );
  }

  if (struct.abstract) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Abstract— ",
            font: "Times New Roman",
            size: 20,
            bold: true,
          }),
          new TextRun({
            text: struct.abstract,
            font: "Times New Roman",
            size: 20,
            italics: true,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
      })
    );
  }

  if (struct.keywords) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Keywords— ",
            font: "Times New Roman",
            size: 20,
            bold: true,
          }),
          new TextRun({
            text: struct.keywords,
            font: "Times New Roman",
            size: 20,
            italics: true,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  const romanNumerals = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
  ];

  struct.sections.forEach((section, idx) => {
    let heading = section.heading.trim();

    if (!/^[IVX]+\.|^\d+\./.test(heading)) {
      const numeral = romanNumerals[idx] || `${idx + 1}`;
      heading = `${numeral}. ${heading.toUpperCase()}`;
    }

    children.push(
      new Paragraph({
        text: heading,
        spacing: { before: 240, after: 120 },
        style: {
          font: { name: "Times New Roman", size: 20 },
          bold: true,
        },
      })
    );

    section.content.forEach((para, pIdx) => {
      children.push(
        new Paragraph({
          text: para,
          alignment: AlignmentType.JUSTIFIED,
          indent: {
            firstLine: pIdx === 0 ? 0 : 244,
          },
          spacing: { after: 120 },
          style: {
            font: { name: "Times New Roman", size: 20 },
          },
        })
      );
    });
  });

  if (struct.references.length > 0) {
    children.push(
      new Paragraph({
        text: "REFERENCES",
        spacing: { before: 240, after: 120 },
        style: {
          font: { name: "Times New Roman", size: 20 },
          bold: true,
        },
      })
    );

    struct.references.forEach((ref, idx) => {
      let refText = ref.trim();
      if (!/^\[\d+\]/.test(refText)) {
        refText = `[${idx + 1}] ${refText}`;
      }

      children.push(
        new Paragraph({
          text: refText,
          indent: {
            left: 288,
            hanging: 288,
          },
          spacing: { after: 60 },
          style: {
            font: { name: "Times New Roman", size: 18 },
          },
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,
              bottom: 1440,
              left: 900,
              right: 900,
            },
          },
          column: {
            count: 2,
            space: 244,
          },
        },
        children,
      },
    ],
  });

  return doc;
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
    const { paragraphs } = req.body;

    if (!paragraphs || !Array.isArray(paragraphs)) {
      return res.status(400).json({ error: "Invalid paragraphs data" });
    }

    const struct = buildStructure(paragraphs);
    const doc = createIEEEDocument(struct);
    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="IEEE_Formatted_Document.docx"'
    );
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}