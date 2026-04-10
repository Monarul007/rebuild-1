import { nanoid } from 'nanoid';
import type { SectionNode } from '../types';

/**
 * Primitive element types available in the sidebar for scratch-built sections.
 */
export type PrimitiveType =
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'button'
  | 'divider'
  | 'container'
  | 'spacer';

/**
 * Factory map for creating minimal SectionNode instances for each primitive type.
 * Each factory returns a scratch-built node with a unique id, correct tag, and empty defaults.
 */
export const primitiveFactories: Record<PrimitiveType, () => SectionNode> = {
  text: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'p',
    classes: [],
    overrides: {},
    children: [],
  }),

  heading: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'h2',
    classes: [],
    overrides: {},
    children: [],
  }),

  image: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'img',
    classes: [],
    overrides: {},
    children: [],
  }),

  video: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'video',
    classes: [],
    overrides: {},
    children: [],
  }),

  button: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'button',
    classes: [],
    overrides: {},
    children: [],
  }),

  divider: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'hr',
    classes: [],
    overrides: {},
    children: [],
  }),

  container: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'div',
    classes: [],
    overrides: {},
    children: [],
  }),

  spacer: () => ({
    id: nanoid(10),
    type: 'scratch',
    tag: 'div',
    classes: ['h-8'],
    attrs: { 'aria-hidden': 'true' },
    overrides: {},
    children: [],
  }),
};
