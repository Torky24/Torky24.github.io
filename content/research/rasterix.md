---
title: "rasterix"
kind: project
status: side project
year: "2026"
summary: "A document engine in pure Rust with Python bindings. It started over a weekend as a PDF rasterizer and grew into a full package that turns PDFs and nine office formats into Markdown. On olmOCR-bench it comes first of six open-source text extractors, and it’s the fastest and leanest of them."
tags: ["Rust", "Python", "PDF to Markdown", "PDF rendering", "Document ingestion"]
links:
  write-up: "https://www.linkedin.com/posts/islam-torky_ive-been-working-over-the-weekend-for-a-activity-7460784045136945152-X8iw"
order: 20
---

rasterix started as a weekend project: a Rust-backed PDF rasterizer for one small but important part of our ingestion pipeline at neuland.ai. It kept growing. Today it’s a document engine in pure Rust with Python bindings, and it does two things: it extracts documents to Markdown or plain text, and it renders PDF pages to images for OCR and layout models.

## Turning documents into Markdown

It reads PDFs plus nine office formats: CSV, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF and EPUB. The office formats already carry their structure, so they go straight to Markdown. PDFs are the hard part. There’s usually no structure to rely on, so rasterix rebuilds it from what the page actually draws: glyph positions, ruled lines, cell rectangles and shading. That’s how it recovers columns, the reading order across them, tables, and which lines are running heads and page numbers that should be left out.

## How it compares

I measured it on [olmOCR-bench](https://huggingface.co/datasets/allenai/olmOCR-bench), 7,019 assertions over 1,403 real PDFs, scored with allenai’s own test code rather than mine. rasterix comes first of the six text extractors I compared:

| Engine | Assertions passed | Share of reachable |
|---|---:|---:|
| **rasterix** | **1,939** | **61.0%** |
| pymupdf4llm | 1,710 | 53.8% |
| anydoc | 1,339 | 42.1% |
| pymupdf | 1,077 | 33.9% |
| pypdf | 1,023 | 32.2% |
| pdfplumber | 757 | 23.8% |

“Reachable” leaves out the 55% of the benchmark that needs OCR or a vision model, which no text extractor can pass. rasterix is ahead on reading order, on text that should be there and on text that shouldn’t. It’s behind pymupdf4llm on tables, 538 against 615, and I’d rather say that out loud than hide it. Every change to the extraction rules is also checked on a set of ordinary documents, because a benchmark gain that deletes real text is really a regression.

Against PyMuPDF on the same documents:

- **Text extraction:** 722 pages per second against 368, with the same page counts and practically the same amount of text.
- **Rendering on many cores:** page-level work stealing in a single process reaches 768 pages per second with 16 workers, against 115 for a PyMuPDF process pool, about 6.7 times faster.
- **The bad pages:** the slowest page in the corpus takes 383 ms against 1,041 ms, and no page takes over a second. On a typical page PyMuPDF is still a little quicker.

## Built for documents nobody has checked

rasterix is meant to run in a container with one vCPU and 1 GB of memory, on whatever documents people throw at it. Every allocation that grows with the document is capped by a named limit, the crate forbids unsafe code, and in batch mode a file that fails to open is reported and skipped, so one bad file costs one file. Extracting a single file uses about 2.6 ms of CPU per page and around 14 MB of memory.

## Where it started

The first version solved one specific problem. We spread documents across Ray workers, but if you split the work by document, one worker ends up with a 700-page book while the others sit idle. So rasterix flattens a bundle of PDFs into page-level jobs and lets Rust workers steal work from each other inside one process. In the version I first [wrote about](https://www.linkedin.com/posts/islam-torky_ive-been-working-over-the-weekend-for-a-activity-7460784045136945152-X8iw), that path rendered 12,000 pages at 150 DPI in 5.28 ms per page.
