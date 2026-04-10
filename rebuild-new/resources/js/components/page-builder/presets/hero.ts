import { nanoid } from 'nanoid';
import type { SectionNode } from '../types';

/**
 * Creates a Hero preset section with a heading, subheading, and CTA button.
 */
export function createHeroSection(): SectionNode {
  return {
    id: nanoid(),
    type: 'preset',
    tag: 'section',
    classes: [
      'relative',
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'text-center',
      'py-24',
      'px-6',
      'bg-gradient-to-br',
      'from-indigo-600',
      'to-purple-700',
      'text-white',
    ],
    overrides: {},
    children: [
      {
        id: nanoid(),
        type: 'preset',
        tag: 'div',
        classes: ['max-w-3xl', 'mx-auto', 'flex', 'flex-col', 'gap-6'],
        overrides: {},
        children: [
          {
            id: nanoid(),
            type: 'preset',
            tag: 'h1',
            textContent: 'Build something amazing',
            classes: ['text-5xl', 'font-bold', 'leading-tight', 'tracking-tight'],
            overrides: {},
            children: [],
          },
          {
            id: nanoid(),
            type: 'preset',
            tag: 'p',
            textContent: 'A powerful, flexible platform to help you launch faster and scale with confidence.',
            classes: ['text-xl', 'text-indigo-100', 'max-w-xl', 'mx-auto'],
            overrides: {},
            children: [],
          },
          {
            id: nanoid(),
            type: 'preset',
            tag: 'div',
            classes: ['flex', 'gap-4', 'justify-center', 'flex-wrap'],
            overrides: {},
            children: [
              {
                id: nanoid(),
                type: 'preset',
                tag: 'button',
                textContent: 'Get started',
                classes: [
                  'px-8',
                  'py-3',
                  'bg-white',
                  'text-indigo-700',
                  'font-semibold',
                  'rounded-lg',
                  'hover:bg-indigo-50',
                  'transition-colors',
                ],
                overrides: {},
                children: [],
              },
              {
                id: nanoid(),
                type: 'preset',
                tag: 'button',
                textContent: 'Learn more',
                classes: [
                  'px-8',
                  'py-3',
                  'border',
                  'border-white',
                  'text-white',
                  'font-semibold',
                  'rounded-lg',
                  'hover:bg-white/10',
                  'transition-colors',
                ],
                overrides: {},
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };
}
