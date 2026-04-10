import { nanoid } from 'nanoid';
import type { SectionNode } from '../types';

/**
 * Creates a CTA (Call-to-Action) preset section with a heading, body text, and a primary button.
 */
export function createCtaSection(): SectionNode {
  return {
    id: nanoid(),
    type: 'preset',
    tag: 'section',
    classes: ['py-20', 'px-6', 'bg-indigo-600', 'text-white', 'text-center'],
    overrides: {},
    children: [
      {
        id: nanoid(),
        type: 'preset',
        tag: 'div',
        classes: ['max-w-2xl', 'mx-auto', 'flex', 'flex-col', 'gap-6', 'items-center'],
        overrides: {},
        children: [
          {
            id: nanoid(),
            type: 'preset',
            tag: 'h2',
            textContent: 'Ready to get started?',
            classes: ['text-4xl', 'font-bold', 'leading-tight'],
            overrides: {},
            children: [],
          },
          {
            id: nanoid(),
            type: 'preset',
            tag: 'p',
            textContent: 'Join thousands of teams already using our platform. No credit card required.',
            classes: ['text-lg', 'text-indigo-200', 'max-w-md'],
            overrides: {},
            children: [],
          },
          {
            id: nanoid(),
            type: 'preset',
            tag: 'button',
            textContent: 'Start for free',
            classes: [
              'px-10',
              'py-4',
              'bg-white',
              'text-indigo-700',
              'font-semibold',
              'rounded-lg',
              'text-lg',
              'hover:bg-indigo-50',
              'transition-colors',
            ],
            overrides: {},
            children: [],
          },
        ],
      },
    ],
  };
}
