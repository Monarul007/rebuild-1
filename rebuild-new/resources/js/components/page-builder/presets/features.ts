import { nanoid } from 'nanoid';
import type { SectionNode } from '../types';

/** Creates a single feature card child node. */
function createFeatureCard(title: string, description: string): SectionNode {
  return {
    id: nanoid(),
    type: 'preset',
    tag: 'div',
    classes: [
      'flex',
      'flex-col',
      'gap-3',
      'p-6',
      'bg-white',
      'rounded-xl',
      'shadow-sm',
      'border',
      'border-gray-100',
    ],
    overrides: {},
    children: [
      {
        id: nanoid(),
        type: 'preset',
        tag: 'h2',
        textContent: title,
        classes: ['text-lg', 'font-semibold', 'text-gray-900'],
        overrides: {},
        children: [],
      },
      {
        id: nanoid(),
        type: 'preset',
        tag: 'p',
        textContent: description,
        classes: ['text-sm', 'text-gray-500', 'leading-relaxed'],
        overrides: {},
        children: [],
      },
    ],
  };
}

/**
 * Creates a Features preset section with a heading and three feature cards.
 */
export function createFeaturesSection(): SectionNode {
  return {
    id: nanoid(),
    type: 'preset',
    tag: 'section',
    classes: ['py-20', 'px-6', 'bg-gray-50'],
    overrides: {},
    children: [
      {
        id: nanoid(),
        type: 'preset',
        tag: 'div',
        classes: ['max-w-5xl', 'mx-auto', 'flex', 'flex-col', 'gap-12'],
        overrides: {},
        children: [
          {
            id: nanoid(),
            type: 'preset',
            tag: 'div',
            classes: ['text-center', 'flex', 'flex-col', 'gap-3'],
            overrides: {},
            children: [
              {
                id: nanoid(),
                type: 'preset',
                tag: 'h2',
                textContent: 'Everything you need',
                classes: ['text-4xl', 'font-bold', 'text-gray-900'],
                overrides: {},
                children: [],
              },
              {
                id: nanoid(),
                type: 'preset',
                tag: 'p',
                textContent: 'All the tools and features to help your team move faster.',
                classes: ['text-lg', 'text-gray-500', 'max-w-xl', 'mx-auto'],
                overrides: {},
                children: [],
              },
            ],
          },
          {
            id: nanoid(),
            type: 'preset',
            tag: 'div',
            classes: ['grid', 'grid-cols-1', 'sm:grid-cols-3', 'gap-6'],
            overrides: {},
            children: [
              createFeatureCard(
                'Fast by default',
                'Optimised for performance out of the box so your users get a snappy experience every time.',
              ),
              createFeatureCard(
                'Easy to customise',
                'Flexible configuration and a clean API make it simple to tailor everything to your needs.',
              ),
              createFeatureCard(
                'Built to scale',
                'Designed with growth in mind — handles traffic spikes without breaking a sweat.',
              ),
            ],
          },
        ],
      },
    ],
  };
}
