import React, { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePageStore } from './store/PageStore';
import { SectionHeader } from './SectionHeader';
import type { SectionNode, Viewport } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tags that support inline text editing. */
const TEXT_BEARING_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'a', 'li', 'button',
  'div', 'strong', 'em', 'b', 'i', 'u',
  'td', 'th', 'label', 'blockquote', 'small'
]);

/** Breakpoint key mapping per viewport. */
const BREAKPOINT_KEY: Record<Viewport, keyof SectionNode['overrides']> = {
  desktop: 'base',
  tablet: 'md',
  mobile: 'sm',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SectionRendererProps {
  node: SectionNode;
  /** True when this node is a direct child of the Canvas (top-level section). */
  isTopLevel?: boolean;
}

// ---------------------------------------------------------------------------
// TopLevelSection — wraps a section with useSortable
// ---------------------------------------------------------------------------

interface TopLevelSectionProps {
  node: SectionNode;
  children: React.ReactNode;
}

function TopLevelSection({ node, children }: TopLevelSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { type: 'section', sectionId: node.id },
  });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    marginBottom: '8px',
  };

  return (
    <div
      ref={setNodeRef}
      data-section-id={node.id}
      style={sortableStyle}
    >
      <SectionHeader
        id={node.id}
        tag={node.tag}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        dragHandleProps={{ ...listeners, ...attributes }}
      />
      {!collapsed && children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectionRenderer({ node, isTopLevel = false }: SectionRendererProps) {
  const selectedNodeId = usePageStore((s) => s.selectedNodeId);
  const viewport = usePageStore((s) => s.viewport);
  const selectNode = usePageStore((s) => s.selectNode);
  const updateNode = usePageStore((s) => s.updateNode);

  const isSelected = node.id === selectedNodeId;
  const breakpointKey = BREAKPOINT_KEY[viewport];
  const overrideStyle = node.overrides[breakpointKey] ?? {};

  // Build className string from classes array
  const className = node.classes.join(' ') || undefined;

  // Selection outline overlay style
  const selectionStyle: React.CSSProperties = isSelected
    ? { outline: '2px solid #3B82F6', outlineOffset: '1px' }
    : {};

  // Merge override styles with selection outline
  const mergedStyle: React.CSSProperties = { ...overrideStyle, ...selectionStyle };

  const isTextBearing = TEXT_BEARING_TAGS.has(node.tag.toLowerCase());
  const isEditableLeaf = isTextBearing && node.children.length === 0;

  // Shared props for the rendered element
  const sharedProps: Record<string, unknown> = {
    className,
    style: mergedStyle,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(node.id);
    },
    ...(node.attrs ?? {}),
  };

  // contenteditable for text-bearing tags that are leaf nodes
  if (isEditableLeaf) {
    sharedProps['contentEditable'] = true;
    sharedProps['suppressContentEditableWarning'] = true;

    sharedProps['onBlur'] = (e: React.FocusEvent<HTMLElement>) => {
      // Commit final textContent immediately
      updateNode(node.id, { textContent: e.currentTarget.textContent ?? '' });
    };
  }

  // Render children recursively
  const renderedChildren = node.children.map((child) => (
    <SectionRenderer key={child.id} node={child} />
  ));

  // Determine element content:
  // - If the node has children (including mixed-content inline elements), render them.
  // - Otherwise fall back to textContent for leaf nodes with text.
  const elementContent =
    node.children.length > 0
      ? renderedChildren
      : (node.textContent ?? '') !== ''
        ? node.textContent
        : renderedChildren;

  // Render the element using React.createElement for dynamic tag
  const element = React.createElement(
    node.tag,
    sharedProps,
    ...(Array.isArray(elementContent) ? elementContent : [elementContent]),
  );

  // Top-level sections get a SectionHeader wrapper + sortable DnD
  if (isTopLevel) {
    return (
      <TopLevelSection node={node}>
        {element}
      </TopLevelSection>
    );
  }

  return element;
}
