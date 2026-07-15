import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { SpinLoading, ErrorBlock } from 'antd-mobile';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure the pdf.js worker. Uses the same new URL(..., import.meta.url) pattern
// already proven in this project (avoids a ?url import that wouldn't type-check).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  fileUrl: string;
  fileName?: string;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const THUMB_WIDTH = 96;

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, fileName }) => {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Measure the main scroll area for fit-to-width rendering.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Track the most-visible page so the page indicator stays accurate on scroll.
  useEffect(() => {
    const root = scrollRef.current;
    if (!numPages || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = pageRefs.current.indexOf(visible.target as HTMLDivElement);
        if (idx >= 0) setCurrentPage(idx + 1);
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );
    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [numPages]);

  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined;
    return Math.max(containerWidth - 16, 100) * zoom;
  }, [containerWidth, zoom]);

  const scrollToPage = useCallback((page: number) => {
    pageRefs.current[page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), numPages || 1);
    setCurrentPage(clamped);
    scrollToPage(clamped);
  };

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  // Native viewer gives the most reliable print / share on mobile browsers.
  const handlePrint = () => window.open(fileUrl, '_blank');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const onDocumentLoad = (pdf: PDFDocumentProxy) => {
    pageRefs.current = new Array(pdf.numPages).fill(null);
    setNumPages(pdf.numPages);
    setCurrentPage(1);
  };

  const btnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 13,
    padding: '6px 8px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#525659' }}>
      {/* Toolbar (horizontally scrollable so all controls fit narrow screens) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '4px 8px',
          background: '#323639',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        <button style={btnStyle} onClick={() => setShowThumbnails((s) => !s)}>
          {showThumbnails ? 'Hide' : 'Pages'}
        </button>
        <span style={{ width: 1, height: 16, background: '#555' }} />
        <button style={btnStyle} onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
          ‹
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 13 }}>
          <input
            value={currentPage}
            inputMode="numeric"
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) setCurrentPage(n);
            }}
            onBlur={(e) => goToPage(parseInt(e.target.value, 10) || 1)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            style={{
              width: 32,
              textAlign: 'center',
              background: '#525659',
              border: '1px solid #555',
              borderRadius: 4,
              color: '#fff',
              fontSize: 13,
              padding: '2px 0',
            }}
          />
          / {numPages || '–'}
        </span>
        <button style={btnStyle} onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages}>
          ›
        </button>
        <span style={{ width: 1, height: 16, background: '#555' }} />
        <button style={btnStyle} onClick={zoomOut} disabled={zoom <= ZOOM_MIN}>
          −
        </button>
        <span style={{ color: '#fff', fontSize: 12, minWidth: 38, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button style={btnStyle} onClick={zoomIn} disabled={zoom >= ZOOM_MAX}>
          +
        </button>
        <span style={{ width: 1, height: 16, background: '#555' }} />
        <button style={btnStyle} onClick={rotate}>
          Rotate
        </button>
        <button style={btnStyle} onClick={handlePrint}>
          Print
        </button>
        <button style={btnStyle} onClick={handleDownload}>
          Save
        </button>
      </div>

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoad}
        className="listo-pdf-document"
        loading={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <SpinLoading color="white" />
          </div>
        }
        error={<ErrorBlock status="default" title="Unable to display PDF" description="Try downloading it instead." />}
      >
        {/* Thumbnail rail */}
        {showThumbnails && (
          <div
            style={{
              width: THUMB_WIDTH + 24,
              flexShrink: 0,
              overflowY: 'auto',
              background: '#3a3f42',
              padding: 8,
            }}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                onClick={() => {
                  goToPage(i + 1);
                  setShowThumbnails(false);
                }}
                style={{
                  marginBottom: 8,
                  cursor: 'pointer',
                  border: currentPage === i + 1 ? '2px solid #1677ff' : '2px solid transparent',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <Page
                  pageNumber={i + 1}
                  width={THUMB_WIDTH}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div style={{ height: THUMB_WIDTH * 1.3, background: '#4a4f52' }} />}
                />
                <div style={{ textAlign: 'center', color: '#ccc', fontSize: 11, padding: '2px 0' }}>{i + 1}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main paged scroll area */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '8px 0', minWidth: 0 }}>
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 8px' }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                rotate={rotation}
                loading={
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <SpinLoading color="white" />
                  </div>
                }
              />
            </div>
          ))}
        </div>
      </Document>
    </div>
  );
};

export default PdfViewer;
