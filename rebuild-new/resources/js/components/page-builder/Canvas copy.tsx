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

// ----------------------------------------
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
// Because the irt, Tailwind's @media breakpoint
// queries (sm:, md:, lg:, etc.) respond to the iframe width — not the
// outer browser window — gisive simulation.

interface IframeCanvasProps {
  width: string;
  onBackgroundClick: () => void;
  children: React.ReactNode;
}

function IframeCanvas({ width, onBackgroundClick, children }: IframeCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState(600);

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

      // Reset body margin/padding
      if (!doc.getElementById('canvas-base')) {
        const style = doc.createElement('style');
        style.id = 'canvas-base';
        style.textContent = 'body { margin: 0; padding: 0; background: #fff; }';
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

  // Auto-size the iframe to its content height
  useEfeect{
    if (!mountNode) return;
    const ro = new ResizeObserver
      const h = mountNode.scrollHeight;
      if (h > 0) setIframeHeight(h);
    });
    ro.observe(mountNode);
    return () => ro.disconnect();
  }, [mountNode]);

  // Deselect when clicking the iframe background (not a child element)
  useEffect(() => {
    if (!mountNode) return;
    const doc = mountNode.ownerDocument;
    function handleClick(e: MouseEvent) {
      if (e.target === doc.body || e.target === mountNode) {
        onBackgroundClick();
      }
    }
    doc.bo handleClick);
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
        height: iframeHeight,
        border: 'none',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        transition: 'width 0.2s ease',
        display: 'block',
      }}
    >
      {mountNode && ReactDOM.createPortal(children, mountNode)}
    </iframe>
  );
}

-----
// Helpers
// ------------------------------------------------

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

fun{
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

as({ viewport }: CanvasProps) {
  const sections = usePageStore((s) => s.sections);
  const deselectNode = usePageStore((s) => s.deselectNode);
  const reorderSections = usePageStore((s) => s.reorderSections);
  const addSection = usePageStore((s) => s.addSection);
  const updateNode = usePageStore((s) => s.updateNode);

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
pe === 'scratch') {
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
        overflowY: 'auto',
        background: '#e5e7eb',
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 0',
      }}
    >
      <IframeCanvas width={canvasWidth} onBackgroundClick={deselectNode}>
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
              Index={sections.length} />
            </SortableContext>
          )}
          <DragOverlay />
        </DndContext>
      </IframeCanvas>
    </div>
  );
}
              <SectionRenderer node={section} isTopLevel />
            </React.Fragment>
          ))}
          <DropZoneIndicator sectionIndex={sections.length} />
        </SortableContext>
      )}
      <DragOverlay />
    </DndContext>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        background: '#e5e7eb',
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 0',
      }}
    >
      <IframeCanvas width={canvasWidth} onClick={handleCanvasClick}>
        {canvasContent}
      </IframeCanvas>
    </div>
  );
}

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
  );

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    // Only deselect when clicking directly on the canvas background
    if (e.target === e.currentTarget) {
      deselectNode();
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Section reorder
    if (activeData?.type === 'section' && overData?.type === 'section') {
      const fromIndex = sections.findIndex((s) => s.id === active.id);
      const toIndex = sections.findIndex((s) => s.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        reorderSections(fromIndex, toIndex);
      }
      return;
    }

    // Primitive drop into Container
    if (activeData?.type === 'primitive' && overData?.type === 'container') {
      const primitiveType = activeData.primitiveType as PrimitiveType;
      const primitive = primitiveFactories[primitiveType]();
      const containerId = over.id as string;

      // Find the container node and append primitive as child
      const containerNode = findNodeById(sections, containerId);
      if (containerNode && containerNode.tag === 'div' && containerNode.type === 'scratch') {
        updateNode(containerId, {
          children: [...containerNode.children, primitive],
        });
      }
      return;
    }

    // Primitive drop between sections (or at end)
    if (activeData?.type === 'primitive') {
      const primitiveType = activeData.primitiveType as PrimitiveType;
      const primitive = primitiveFactories[primitiveType]();
      const newSection: SectionNode = {
        id: nanoid(10),
        type: 'scratch',
        tag: 'section',
        classes: [],
        overrides: {},
        children: [primitive],
      };
      addSection(newSection);
    }
  }

  return (
    // Outer wrapper: fills the panel, centres the canvas
    <div
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        background: '#e5e7eb',
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 0',
      }}
    >
      {/* Scoped container-query stylesheet */}
      <style id={styleId} dangerouslySetInnerHTML={{ __html: containerQueryCSS }} />

      {/* Inner canvas constrained to viewport width */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          aria-label="Page canvas"
          className="page-builder-canvas"
          onClick={handleCanvasClick}
          style={{
            width: canvasWidth,
            minHeight: '100%',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            transition: 'width 0.2s ease',
            padding: '0',
            boxSizing: 'border-box',
          }}
        >
          {sections.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#9ca3af',
                fontSize: '14px',
                pointerEvents: 'none',
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
                  {/* Drop-zone indicator between sections */}
                  <DropZoneIndicator sectionIndex={index} />
                  <SectionRenderer node={section} isTopLevel />
                </React.Fragment>
              ))}
              {/* Drop-zone indicator at the end */}
              <DropZoneIndicator sectionIndex={sections.length} />
            </SortableContext>
          )}
        </div>
        <DragOverlay />
      </DndContext>
    </div>
  );
}
