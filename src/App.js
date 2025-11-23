import React, { useState } from "react";
import {
  CloudUpload,
  Delete,
  Eye,
  ArrowLeft,
  Check,
  Settings,
  Edit3,
  Download,
  ChevronRight,
} from "lucide-react";

const LABEL_OPTIONS = [
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

const LABEL_COLORS = {
  TITLE: "#0066cc",
  AUTHOR: "#9c27b0",
  AFFILIATION: "#7e57c2",
  ABSTRACT: "#00897b",
  KEYWORDS: "#0097a7",
  INTRODUCTION: "#388e3c",
  BACKGROUND: "#7cb342",
  METHOD: "#f57c00",
  RESULTS: "#ff7043",
  CONCLUSION: "#d32f2f",
  REFERENCES: "#37474f",
  TABLE_CAPTION: "#6a1b9a",
  FIGURE_CAPTION: "#1565c0",
  BODY: "#616161",
  HEADING: "#0d47a1",
};

export default function App() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [structuredPreview, setStructuredPreview] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");

  const filteredParagraphs = paragraphs.filter(
    (p) =>
      p.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.text.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".docx")) {
        setError("Please select a .docx file");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("document", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setParagraphs(data.paragraphs || []);
      setStep(1);
    } catch (err) {
      setError("Failed to upload document: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelChange = (index, newLabel) => {
    const updated = [...paragraphs];
    updated[index].label = newLabel;
    setParagraphs(updated);
  };

  const handleDeleteParagraph = (index) => {
    const updated = paragraphs.filter((_, i) => i !== index);
    setParagraphs(updated);
    if (selectedIndex === index) setSelectedIndex(null);
  };

  const generatePreview = () => {
    const structure = {
      title: "",
      authors: "",
      abstract: "",
      sections: [],
      references: [],
    };

    let currentSection = null;

    paragraphs.forEach((para) => {
      const label = para.label.toUpperCase();
      const text = para.text;

      switch (label) {
        case "TITLE":
          structure.title = structure.title ? `${structure.title} ${text}` : text;
          break;
        case "AUTHOR":
          structure.authors = structure.authors
            ? `${structure.authors} | ${text}`
            : text;
          break;
        case "ABSTRACT":
          structure.abstract = structure.abstract
            ? `${structure.abstract} ${text}`
            : text;
          break;
        case "REFERENCES":
          structure.references.push(text);
          break;
        case "HEADING":
        case "INTRODUCTION":
        case "BACKGROUND":
        case "METHOD":
        case "RESULTS":
        case "CONCLUSION":
          if (currentSection) structure.sections.push(currentSection);
          currentSection = { heading: text, content: [] };
          break;
        default:
          if (currentSection) {
            currentSection.content.push(text);
          }
      }
    });

    if (currentSection) structure.sections.push(currentSection);
    setStructuredPreview(structure);
    setPreviewOpen(true);
  };

  const handleExport = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphs }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IEEE_Formatted_Document.docx";
      a.click();
      window.URL.revokeObjectURL(url);

      setStep(2);
    } catch (err) {
      setError("Failed to export: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setFile(null);
    setParagraphs([]);
    setSelectedIndex(null);
    setSearchFilter("");
    setError("");
  };

  const getProgressValue = () => {
    if (paragraphs.length === 0) return 0;
    const labeledCount = paragraphs.filter((p) => p.label).length;
    return Math.round((labeledCount / paragraphs.length) * 100);
  };

  const bgGradient = "from-purple-600 via-indigo-600 to-blue-600";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} py-8`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 text-white">
          <h1 className="text-5xl font-black mb-2 tracking-tight">
            IEEE Formatter
          </h1>
          <p className="text-lg font-light opacity-95">
            Convert academic papers to IEEE format with AI-powered classification
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Step 1: Upload */}
          {step === 0 && (
            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Upload Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      1
                    </div>
                    <h2 className="text-3xl font-bold">Upload Your Document</h2>
                  </div>

                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Select a DOCX file to get started. Our AI will automatically classify
                    each paragraph by section type.
                  </p>

                  <label htmlFor="file-upload">
                    <div className="inline-flex cursor-pointer">
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                        <CloudUpload size={20} />
                        Choose DOCX File
                      </button>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>

                  {file && (
                    <div className="mt-6">
                      <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 mb-4">
                        <Check size={18} />
                        <span className="font-medium text-sm">{file.name}</span>
                      </div>

                      <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CloudUpload size={20} />
                            Upload & Classify
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-purple-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings size={20} className="text-purple-600" />
                    <h3 className="text-xl font-bold">IEEE Standards</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Format:</span> Two-column layout
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Font:</span> Times New Roman, 10pt
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Title:</span> 24pt bold, centered
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Page:</span> US Letter (8.5" × 11")
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Margins:</span> 0.75" top/bottom, 0.625" sides
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review & Edit */}
          {step === 1 && (
            <div className="p-8 md:p-12">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    2
                  </div>
                  <h2 className="text-3xl font-bold">Review & Classify</h2>
                </div>

                <div className="flex gap-3 mb-6 flex-wrap">
                  <select
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">All Sections</option>
                    {LABEL_OPTIONS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={generatePreview}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 transition-colors"
                  >
                    <Eye size={18} />
                    Preview Structure
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Classification Progress</span>
                    <span className="text-sm font-semibold text-purple-600">
                      {getProgressValue()}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${getProgressValue()}%` }}
                    ></div>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  {filteredParagraphs.length} of {paragraphs.length} paragraphs
                </p>
              </div>

              {/* Paragraphs List */}
              <div className="space-y-3 mb-8">
                {filteredParagraphs.map((para, idx) => {
                  const originalIdx = paragraphs.indexOf(para);
                  return (
                    <div
                      key={originalIdx}
                      onClick={() => setSelectedIndex(originalIdx)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedIndex === originalIdx
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="px-3 py-1 rounded-full text-white text-xs font-bold"
                              style={{
                                backgroundColor:
                                  LABEL_COLORS[para.label] || "#757575",
                              }}
                            >
                              {para.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              #{originalIdx + 1}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm line-clamp-2">
                            {para.text.substring(0, 100)}...
                          </p>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <select
                            value={para.label}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleLabelChange(originalIdx, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          >
                            {LABEL_OPTIONS.map((label) => (
                              <option key={label} value={label}>
                                {label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteParagraph(originalIdx);
                            }}
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          >
                            <Delete size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>

                <button
                  onClick={handleExport}
                  disabled={loading || paragraphs.length === 0}
                  className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 font-semibold flex items-center gap-2 transition-all"
                >
                  <Download size={18} />
                  Export Document
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 2 && (
            <div className="p-12 md:p-16 text-center bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-6">
                <Check size={50} className="text-white" />
              </div>

              <h3 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Export Successful!
              </h3>

              <p className="text-gray-600 mb-8 text-lg">
                Your IEEE-formatted document is ready to download.
              </p>

              <button
                onClick={handleReset}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2"
              >
                <ChevronRight size={20} />
                Format Another Document
              </button>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">Document Structure Preview</h3>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                {structuredPreview && (
                  <div className="space-y-4">
                    {structuredPreview.title && (
                      <div>
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">
                          Title
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {structuredPreview.title}
                        </p>
                      </div>
                    )}

                    {structuredPreview.authors && (
                      <div>
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">
                          Authors
                        </p>
                        <p className="text-sm text-gray-700">
                          {structuredPreview.authors}
                        </p>
                      </div>
                    )}

                    {structuredPreview.abstract && (
                      <div>
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">
                          Abstract
                        </p>
                        <p className="text-sm text-gray-700">
                          {structuredPreview.abstract.substring(0, 200)}...
                        </p>
                      </div>
                    )}

                    {structuredPreview.sections.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-bold mb-3">
                          Sections ({structuredPreview.sections.length})
                        </p>
                        <ul className="space-y-2">
                          {structuredPreview.sections.map((section, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              <span className="font-semibold">{section.heading}</span>
                              <span className="text-gray-500 ml-2">
                                ({section.content.length} paragraphs)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
