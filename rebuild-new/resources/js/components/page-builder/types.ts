import type { CSSProperties } from 'react';

/**
 * Unique identifier for a SectionNode, generated via nanoid(10).
 */
export type NodeId = string;

/**
 * Active responsive simulation viewport.
 */
export type Viewport = 'mobile' | 'tablet' | 'desktop';

/**
 * Core data model unit representing any element in the page tree.
 * Covers sections, containers, and primitives at any nesting depth.
 */
export interface SectionNode {
  id: NodeId;
  type: 'preset' | 'custom-html' | 'scratch';
  /** HTML tag name, e.g. 'section', 'div', 'h1', 'p' */
  tag: string;
  textContent?: string;
  /** Non-style HTML attributes */
  attrs?: Record<string, string>;
  /** Tailwind class list */
  classes: string[];
  /** Per-breakpoint inline style overrides */
  overrides: {
    base?: CSSProperties;
    sm?: CSSProperties;
    md?: CSSProperties;
    lg?: CSSProperties;
  };
  children: SectionNode[];
}

/**
 * Serialisable page payload POSTed to the Laravel controller on publish.
 * Contains no circular references, React refs, or DOM nodes.
 */
export interface PageSchema {
  version: 1;
  sections: SectionNode[];
  customCss?: string;
  customJs?: string;
}
