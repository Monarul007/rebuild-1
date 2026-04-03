import React from 'react';
import type { SectionNode } from './types';

interface PublishedRendererProps {
  node: SectionNode;
}

export function PublishedRenderer({ node }: PublishedRendererProps) {
  // Build className string
  const className = node.classes.join(' ') || undefined;

  // Static attributes
  const props: Record<string, any> = {
    className,
    'data-node-id': node.id,
    ...(node.attrs ?? {}),
  };

  // Render children recursively
  const renderedChildren = (node.children || []).map((child) => (
    <PublishedRenderer key={child.id} node={child} />
  ));

  // Determine element content
  const elementContent =
    (node.children && node.children.length > 0)
      ? renderedChildren
      : (node.textContent ?? '') !== ''
        ? node.textContent
        : null;

  // Create the element using the dynamic tag
  return React.createElement(
    node.tag,
    props,
    ...(Array.isArray(elementContent) ? elementContent : (elementContent !== null ? [elementContent] : []))
  );
}
