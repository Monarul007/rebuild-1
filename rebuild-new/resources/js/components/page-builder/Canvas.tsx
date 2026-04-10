import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { nanoid } from 'nanoid';
import { usePageStore } from './store/PageStore';
import { SectionRenderer } from './SectionRenderer';
import { primitiveFactories } from './primitives';
import type { Viewport, SectionNode } from './types';
import type { PrimitiveType } from './primitives';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CanvasProps {
  /** Active viewport — drives the iframe width so Tailwind @media queries
   *  fire against the iframe's own viewport, not the browser window. */
  viewport: Viewport;
}

// ---------------------------------------------------------------------------
// Viewport width mapping
// ---------------------------------------------------------------------------

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

// ---------------------------------------------------------------------------
// IframeCanvas
// ---------------------------------------------------------------------------
// Renders children into an isolated <iframe> via a React portal.
// Because they are rendered into the iframe's document, Tailwind's @media breakpoint
// queries (sm:, md:, lg:, etc.) respond to the iframe width — not the
// outer browser window — giving responsive simulation.

interface IframeCanvasProps {
  width: string;
  onBackgroundClick: () => void;
  customCss: string;
  customJs: string;
  children: React.ReactNode;
}

function IframeCanvas({ width, onBackgroundClick, customCss, customJs, children }: IframeCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  // Initialise the iframe document once it loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function init() {
      const doc = iframe!.contentDocument;
      if (!doc) return;

      // Tailwind CDN — runs inside the iframe so its @media rules fire against the outer window.
      if (!doc.getElementById('tw-cdn')) {
        const script = doc.createElement('script');
        script.id = 'tw-cdn';
        script.src = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
        doc.head.appendChild(script);
      }

      // Reset body margin/padding and ensure it can scroll
      if (!doc.getElementById('canvas-base')) {
        const style = doc.createElement('style');
        style.id = 'canvas-base';
        style.textContent = `
          @import "tailwindcss";
          @theme {
            --color-accent: #0B6E6E;
            --color-accent-dark: #095A5A;
            --color-accent-light: #E6F2F2;
            --color-brand-dark: #1A1A1A;
            --font-sans: 'Poppins', sans-serif;
            --font-bn: 'Noto Sans Bengali', sans-serif;
            --max-width-page: 1120px;
            --max-width-reading: 720px;
          }
          body { margin: 0; padding: 0; background: #fff; min-height: 100%; overflow-x: hidden; } 
          html { height: 100%; }
        `;
        doc.head.appendChild(style);
      }

      // Mount point for the React portal
      let mount = doc.getElementById('react-mount') as HTMLElement | null;
      if (!mount) {
        mount = doc.createElement('div');
        mount.id = 'react-mount';
        doc.body.appendChild(mount);
      }
      setMountNode(mount);
    }

    if (iframe.contentDocument?.readyState === 'complete') {
      init();
    } else {
      iframe.addEventListener('load', init);
      return () => iframe.removeEventListener('load', init);
    }
  }, []);

  // Update dynamic CSS
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    let style = doc.getElementById('canvas-custom-css');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'canvas-custom-css';
      doc.head.appendChild(style);
    }
    style.textContent = customCss;
  }, [customCss, mountNode]);

  // Update dynamic JS
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !customJs) return;

    // We remove old scripts and re-inject. Note: this might cause side effects
    // but for simple visual JS it's usually what's expected in a builder.
    const oldScript = doc.getElementById('canvas-custom-js');
    if (oldScript) oldScript.remove();

    const script = doc.createElement('script');
    script.id = 'canvas-custom-js';
    script.textContent = `
      (function() {
        try {
          ${customJs}
        } catch (e) {
          console.error('Custom JS Error:', e);
        }
      })();
    `;
    doc.body.appendChild(script);
  }, [customJs, mountNode]);

  /* ResizeObserver removed to prevent infinite loop with vh units */

  // Deselect when clicking the iframe background (not a child element)
  useEffect(() => {
    if (!mountNode) return;
    const doc = mountNode.ownerDocument;
    function handleClick(e: MouseEvent) {
      if (e.target === doc.body || e.target === mountNode) {
        onBackgroundClick();
      }
    }
    doc.body.addEventListener('click', handleClick);
    return () => doc.body.removeEventListener('click', handleClick);
  }, [mountNode, onBackgroundClick]);

  return (
    <iframe
      ref={iframeRef}
      aria-label="Page canvas"
      title="Page canvas"
      src="about:blank"
      style={{
        width,
        height: '100%',
        border: 'none',
        background: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'width 0.2s ease',
        display: 'block',
      }}
    >
      {mountNode && ReactDOM.createPortal(children, mountNode)}
    </iframe>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findNodeById(nodes: SectionNode[], id: string): SectionNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// DropZoneIndicator
// ---------------------------------------------------------------------------

function DropZoneIndicator({ sectionIndex }: { sectionIndex: number }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-zone-${sectionIndex}`,
    data: { type: 'drop-zone', index: sectionIndex },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        height: isOver ? '4px' : '2px',
        margin: '2px 0',
        background: isOver ? '#3B82F6' : 'transparent',
        borderRadius: '2px',
        transition: 'height 0.15s ease, background 0.15s ease',
        pointerEvents: 'none',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export function Canvas({ viewport }: CanvasProps) {
  const sections = usePageStore((s) => s.sections);
  const deselectNode = usePageStore((s) => s.deselectNode);
  const reorderSections = usePageStore((s) => s.reorderSections);
  const addSection = usePageStore((s) => s.addSection);
  const updateNode = usePageStore((s) => s.updateNode);
  const customCss = usePageStore((s) => s.customCss);
  const customJs = usePageStore((s) => s.customJs);

  const canvasWidth = VIEWPORT_WIDTH[viewport];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'section' && overData?.type === 'section') {
      const fromIndex = sections.findIndex((s) => s.id === active.id);
      const toIndex = sections.findIndex((s) => s.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        reorderSections(fromIndex, toIndex);
      }
      return;
    }

    if (activeData?.type === 'primitive' && overData?.type === 'container') {
      const primitive = primitiveFactories[activeData.primitiveType as PrimitiveType]();
      const containerNode = findNodeById(sections, over.id as string);
      if (containerNode && containerNode.tag === 'div' && containerNode.type === 'scratch') {
        updateNode(over.id as string, { children: [...containerNode.children, primitive] });
      }
      return;
    }

    if (activeData?.type === 'primitive') {
      const primitive = primitiveFactories[activeData.primitiveType as PrimitiveType]();
      addSection({
        id: nanoid(10),
        type: 'scratch',
        tag: 'section',
        classes: [],
        overrides: {},
        children: [primitive],
      });
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'hidden',
        background: '#e5e7eb',
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 0',
      }}
    >
      <IframeCanvas
        width={canvasWidth}
        onBackgroundClick={deselectNode}
        customCss={customCss}
        customJs={customJs}
      >
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {sections.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#9ca3af',
                fontSize: '14px',
              }}
            >
              Add a section from the sidebar to get started
            </div>
          ) : (
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section, index) => (
                <React.Fragment key={section.id}>
                  <DropZoneIndicator sectionIndex={index} />
                  <SectionRenderer node={section} isTopLevel />
                </React.Fragment>
              ))}
              <DropZoneIndicator sectionIndex={sections.length} />
            </SortableContext>
          )}
          <DragOverlay />
        </DndContext>
      </IframeCanvas>
    </div>
  );
}
