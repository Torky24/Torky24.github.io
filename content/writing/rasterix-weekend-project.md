---
title: "rasterix: a weekend PDF rasterizer for Ray"
description: "Why page rendering sits on the critical path of a low-latency ingestion pipeline, and how a Rust renderer shaped around Ray batching gets to 5.28 ms per page."
date: "2026-05-14"
tags: ["Rust", "Python", "Ray", "Document ingestion"]
status: published
order: 20
---

I've been working over the weekend on a toy project called [rasterix](#/research/rasterix). It’s a Rust-backed Python PDF rasterizer, built for a very specific part of the ingestion stack we’re building at neuland.ai.

In low-latency ingestion pipelines, the document rendering step is not some boring preprocessing detail. It is directly on the critical path:

PDF page → PNG image → OCR or vision-language model worker.

We care about milliseconds here. When you’re rendering millions or billions of pages, a 1 ms per page difference is not cosmetic. It’s throughput, latency and infrastructure cost.

## Where the idea came from

It came out of a discussion with a colleague about the Ray-based ingestion pipelines we’re building, and the idea popped up: what if we had a Rust-native renderer with Python bindings, shaped around the way we actually batch and distribute rendering work?

That is the part we care about most: batching and parallel work. In Ray, documents are naturally distributed across tasks or actors, but local batching inside each actor still matters. If you parallelise only by document, one worker might get a 700-page book while the others get short papers and finish early. That creates long tails.

## A bundled page-worker mode

rasterix exposes a bundled page-worker mode:

PDF bundle → page jobs → parallel Rust workers → PNG bytes

So one Python process can reserve N CPUs, flatten a bundle of PDFs into page-level work, and let Rust workers steal tasks across the bundle.

Rendering-wise, rasterix still does the normal PDF pipeline: parse objects, xrefs and page trees, decode streams, interpret drawing operators, resolve fonts, images and colours, rasterize into a pixel buffer, and return encoded PNG bytes.

## The numbers

On a local benchmark of 12,000 pages at 150 DPI, returning PNG bytes through Python APIs, the nuance matters: PyMuPDF is extremely strong in a Python process-pool setup.

But the result I’m really happy about is that rasterix exposes the Ray-shaped batching path directly, and gets to 5.28 ms per page with one Python process and internal Rust workers. That means less Python scheduling glue, fewer document-level long tails, and PNG bytes ready for OCR and vision-model inference inside Ray.

For the kind of ingestion pipelines we’re building, this is exactly the kind of thing that matters.

*Since then, rasterix has grown from a rasterizer into a full document engine that turns PDFs and office files into Markdown. The [project page](#/research/rasterix) has where it stands today.*
