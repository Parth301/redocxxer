// src/App.js - IEEE Formatter with Material-UI
import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  Visibility,
  ArrowBack,
  ArrowForward,
} from "@mui/icons-material";

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
  TITLE: "#1976d2",
  AUTHOR: "#9c27b0",
  AFFILIATION: "#673ab7",
  ABSTRACT: "#00796b",
  KEYWORDS: "#0097a7",
  INTRODUCTION: "#388e3c",
  BACKGROUND: "#689f38",
  METHOD: "#f57c00",
  RESULTS: "#e64a19",
  CONCLUSION: "#c62828",
  REFERENCES: "#455a64",
  TABLE_CAPTION: "#5e35b1",
  FIGURE_CAPTION: "#3949ab",
  BODY: "#757575",
  HEADING: "#1565c0",
};

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [structuredPreview, setStructuredPreview] = useState(null);

  const steps = [
    "Upload Document",
    "Review & Edit Labels",
    "Export IEEE Format",
  ];

  // Handle file selection
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".docx")) {
        setError("Please select a .docx file");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  // Upload and classify document
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setParagraphs(data.paragraphs);
      setActiveStep(1);
    } catch (err) {
      setError("Failed to upload document: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update label for a paragraph
  const handleLabelChange = (index, newLabel) => {
    const updated = [...paragraphs];
    updated[index].label = newLabel;
    setParagraphs(updated);
  };

  // Delete paragraph
  const handleDeleteParagraph = (index) => {
    const updated = paragraphs.filter((_, i) => i !== index);
    setParagraphs(updated);
    if (selectedIndex === index) {
      setSelectedIndex(null);
    }
  };

  // Generate structured preview
  const generatePreview = () => {
    const structure = {
      title: "",
      authors: "",
      affiliation: "",
      abstract: "",
      keywords: "",
      sections: [],
      references: [],
    };

    let currentSection = null;

    paragraphs.forEach((para) => {
      const label = para.label.toUpperCase();
      const text = para.text;

      switch (label) {
        case "TITLE":
          structure.title = structure.title
            ? `${structure.title} ${text}`
            : text;
          break;
        case "AUTHOR":
          structure.authors = structure.authors
            ? `${structure.authors} | ${text}`
            : text;
          break;
        case "AFFILIATION":
          structure.affiliation = structure.affiliation
            ? `${structure.affiliation} | ${text}`
            : text;
          break;
        case "ABSTRACT":
          structure.abstract = structure.abstract
            ? `${structure.abstract} ${text}`
            : text;
          break;
        case "KEYWORDS":
          structure.keywords = structure.keywords
            ? `${structure.keywords}; ${text}`
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
          if (currentSection) {
            structure.sections.push(currentSection);
          }
          currentSection = { heading: text, content: [] };
          break;
        default:
          if (currentSection) {
            currentSection.content.push(text);
          } else {
            if (structure.sections.length === 0) {
              structure.sections.push({
                heading: "Introduction",
                content: [text],
              });
            } else {
              structure.sections[0].content.push(text);
            }
          }
      }
    });

    if (currentSection) {
      structure.sections.push(currentSection);
    }

    setStructuredPreview(structure);
    setPreviewOpen(true);
  };

  // Export formatted document
  const handleExport = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paragraphs }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IEEE_Formatted_Document.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setActiveStep(2);
    } catch (err) {
      setError("Failed to export document: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset to start
  const handleReset = () => {
    setActiveStep(0);
    setFile(null);
    setParagraphs([]);
    setSelectedIndex(null);
    setError("");
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          align="center"
          color="primary"
        >
          IEEE Document Formatter
        </Typography>
        <Typography
          variant="subtitle1"
          gutterBottom
          align="center"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Convert your academic papers to IEEE format with automatic
          classification
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Step 1: Upload */}
        {activeStep === 0 && (
          <Box sx={{ textAlign: "center" }}>
            <input
              accept=".docx"
              style={{ display: "none" }}
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                component="span"
                size="large"
                startIcon={<CloudUpload />}
                sx={{ mb: 2 }}
              >
                Choose DOCX File
              </Button>
            </label>

            {file && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={file.name}
                  onDelete={() => setFile(null)}
                  color="primary"
                  sx={{ mb: 2 }}
                />
                <Box>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={handleUpload}
                    disabled={loading}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <CloudUpload />
                    }
                  >
                    {loading ? "Processing..." : "Upload & Classify"}
                  </Button>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 4, p: 3, bgcolor: "grey.100", borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                IEEE Formatting Standards
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    • Page: US Letter (8.5" × 11")
                  </Typography>
                  <Typography variant="body2">
                    • Margins: 0.75" top, 1.0" bottom, 0.625" sides
                  </Typography>
                  <Typography variant="body2">
                    • Layout: Two columns, 0.17" spacing
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    • Font: Times New Roman, 10pt body
                  </Typography>
                  <Typography variant="body2">
                    • Title: 24pt bold, centered
                  </Typography>
                  <Typography variant="body2">
                    • Single-spaced, justified text
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        )}

        {/* Step 2: Review & Edit */}
        {activeStep === 1 && (
          <Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}
            >
              <Button
                startIcon={<ArrowBack />}
                onClick={() => setActiveStep(0)}
              >
                Back
              </Button>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={generatePreview}
                  sx={{ mr: 2 }}
                >
                  Preview Structure
                </Button>
                <Button
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={handleExport}
                  disabled={loading || paragraphs.length === 0}
                >
                  Export Document
                </Button>
              </Box>
            </Box>

            <Typography variant="h6" gutterBottom>
              Review and Edit Paragraph Classifications ({paragraphs.length}{" "}
              paragraphs)
            </Typography>

            <Grid container spacing={2}>
              {paragraphs.map((para, index) => (
                <Grid item xs={12} key={index}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      bgcolor:
                        selectedIndex === index
                          ? "action.selected"
                          : "background.paper",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <Chip
                              label={para.label}
                              size="small"
                              sx={{
                                bgcolor: LABEL_COLORS[para.label] || "#757575",
                                color: "white",
                                fontWeight: "bold",
                                mr: 2,
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Paragraph {index + 1}
                            </Typography>
                          </Box>
                          <Typography variant="body2" noWrap>
                            {para.text.substring(0, 150)}...
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <Select
                              value={para.label}
                              onChange={(e) =>
                                handleLabelChange(index, e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                            >
                              {LABEL_OPTIONS.map((label) => (
                                <MenuItem key={label} value={label}>
                                  {label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteParagraph(index);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 3: Success */}
        {activeStep === 2 && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" color="success.main" gutterBottom>
              ✓ Document Exported Successfully!
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              Your IEEE-formatted document has been downloaded.
            </Typography>
            <Button variant="contained" onClick={handleReset} size="large">
              Format Another Document
            </Button>
          </Box>
        )}
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Structure Preview</DialogTitle>
        <DialogContent dividers>
          {structuredPreview && (
            <Box>
              {structuredPreview.title && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    TITLE
                  </Typography>
                  <Typography variant="h6">
                    {structuredPreview.title}
                  </Typography>
                </Box>
              )}

              {structuredPreview.authors && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    AUTHORS
                  </Typography>
                  <Typography variant="body2">
                    {structuredPreview.authors}
                  </Typography>
                </Box>
              )}

              {structuredPreview.affiliation && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    AFFILIATION
                  </Typography>
                  <Typography variant="body2">
                    {structuredPreview.affiliation}
                  </Typography>
                </Box>
              )}

              {structuredPreview.abstract && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    ABSTRACT
                  </Typography>
                  <Typography variant="body2">
                    {structuredPreview.abstract.substring(0, 200)}...
                  </Typography>
                </Box>
              )}

              {structuredPreview.keywords && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    KEYWORDS
                  </Typography>
                  <Typography variant="body2">
                    {structuredPreview.keywords}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Sections ({structuredPreview.sections.length})
              </Typography>
              <List>
                {structuredPreview.sections.map((section, idx) => (
                  <ListItem key={idx}>
                    <ListItemText
                      primary={section.heading}
                      secondary={`${section.content.length} paragraphs`}
                    />
                  </ListItem>
                ))}
              </List>

              {structuredPreview.references.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    References ({structuredPreview.references.length})
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Processing...
            </Typography>
          </Paper>
        </Box>
      )}
    </Container>
  );
}

export default App;
