// api/update-labels.js - Update paragraph labels
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

    const validLabels = [
      "TITLE",
      "AUTHOR",
      "AFFILIATION",
      "ABSTRACT",
      "KEYWORDS",
      "INTRODUCTION",
      "BACKGROUND",
      "METHOD",
      "RESULTS",
      "CONCLUSION",
      "REFERENCES",
      "TABLE_CAPTION",
      "FIGURE_CAPTION",
      "BODY",
      "HEADING",
    ];

    const validated = paragraphs.map((p) => {
      if (!p.text || !p.label) {
        throw new Error("Each paragraph must have text and label");
      }
      if (!validLabels.includes(p.label.toUpperCase())) {
        throw new Error(`Invalid label: ${p.label}`);
      }
      return {
        text: p.text,
        label: p.label.toUpperCase(),
        index: p.index,
      };
    });

    res.status(200).json({
      success: true,
      message: "Labels updated successfully",
      paragraphs: validated,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(400).json({ error: error.message });
  }
}
