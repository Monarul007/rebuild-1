import React, { useState, useRef } from 'react';
import { usePageStore } from './store/PageStore';

interface HtmlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HtmlImportModal({ isOpen, onClose }: HtmlImportModalProps) {
  const importHtmlSection = usePageStore((s) => s.importHtmlSection);
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  async function handleImport() {
    if (!html.trim()) {
      setError('Please paste some HTML before importing.');
      return;
    }
    setError(null);
    setImporting(true);
    try {
      await importHtmlSection(html);
      setHtml('');
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to parse the HTML. Please check your markup and try again.',
      );
    } finally {
      setImporting(false);
    }
  }

  function handleCancel() {
    setHtml('');
    setError(null);
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleCancel();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import HTML"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          width: '560px',
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
          Import HTML
        </h2>

        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
          Paste any HTML + Tailwind snippet below. Scripts and unsafe attributes will be stripped
          automatically.
        </p>

        <textarea
          ref={textareaRef}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="<section class=&quot;py-16&quot;>…</section>"
          rows={10}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '10px 12px',
            border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
            borderRadius: '8px',
            resize: 'vertical',
            outline: 'none',
            color: '#111827',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p
            role="alert"
            style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}
          >
            {error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={handleCancel}
            disabled={importing}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              padding: '8px 16px',
              background: importing ? '#a5b4fc' : '#6366f1',
              border: 'none',
              borderRadius: '8px',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
            }}
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
