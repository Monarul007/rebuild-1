import { describe, it, expect } from 'vitest';
import { sanitiseHtml } from '../utils/sanitise';

describe('sanitiseHtml', () => {
  // --- <script> removal ---
  describe('script tag removal', () => {
    it('removes a simple <script> block', () => {
      const input = '<div><script>alert("xss")</script><p>Hello</p></div>';
      expect(sanitiseHtml(input)).not.toMatch(/<script/i);
      expect(sanitiseHtml(input)).toContain('<p>Hello</p>');
    });

    it('removes <script> with a src attribute', () => {
      const input = '<script src="evil.js"></script><p>Safe</p>';
      expect(sanitiseHtml(input)).not.toMatch(/<script/i);
    });

    it('removes multi-line <script> blocks', () => {
      const input = '<script>\nvar x = 1;\nalert(x);\n</script>';
      expect(sanitiseHtml(input)).not.toMatch(/<script/i);
    });

    it('removes multiple <script> blocks', () => {
      const input = '<script>a()</script><p>text</p><script>b()</script>';
      expect(sanitiseHtml(input)).not.toMatch(/<script/i);
      expect(sanitiseHtml(input)).toContain('<p>text</p>');
    });

    it('is case-insensitive for <SCRIPT> tags', () => {
      const input = '<SCRIPT>alert(1)</SCRIPT>';
      expect(sanitiseHtml(input)).not.toMatch(/<script/i);
    });
  });

  // --- on* event attribute removal ---
  describe('on* event attribute removal', () => {
    it('removes onclick attribute with double quotes', () => {
      const input = '<button onclick="alert(1)">Click</button>';
      expect(sanitiseHtml(input)).not.toMatch(/onclick/i);
      expect(sanitiseHtml(input)).toContain('<button');
    });

    it('removes onmouseover attribute with single quotes', () => {
      const input = "<img src='x.png' onmouseover='evil()' />";
      expect(sanitiseHtml(input)).not.toMatch(/onmouseover/i);
    });

    it('removes onerror attribute', () => {
      const input = '<img src="x" onerror="alert(1)">';
      expect(sanitiseHtml(input)).not.toMatch(/onerror/i);
    });

    it('removes multiple on* attributes from the same element', () => {
      const input = '<div onclick="a()" onmouseout="b()" class="foo">text</div>';
      const result = sanitiseHtml(input);
      expect(result).not.toMatch(/onclick/i);
      expect(result).not.toMatch(/onmouseout/i);
      expect(result).toContain('class="foo"');
    });

    it('removes on* attributes regardless of case', () => {
      const input = '<div onClick="evil()">x</div>';
      expect(sanitiseHtml(input)).not.toMatch(/onClick/i);
    });
  });

  // --- javascript: URI removal ---
  describe('javascript: URI scheme removal', () => {
    it('replaces javascript: href with #', () => {
      const input = '<a href="javascript:alert(1)">link</a>';
      const result = sanitiseHtml(input);
      expect(result).not.toMatch(/javascript:/i);
      expect(result).toContain('href="#"');
    });

    it('replaces javascript: src with #', () => {
      const input = '<img src="javascript:evil()">';
      const result = sanitiseHtml(input);
      expect(result).not.toMatch(/javascript:/i);
      expect(result).toContain('src="#"');
    });

    it('replaces javascript: href with single quotes', () => {
      const input = "<a href='javascript:void(0)'>x</a>";
      const result = sanitiseHtml(input);
      expect(result).not.toMatch(/javascript:/i);
    });

    it('preserves safe href values', () => {
      const input = '<a href="https://example.com">link</a>';
      expect(sanitiseHtml(input)).toContain('href="https://example.com"');
    });
  });

  // --- passthrough for clean HTML ---
  describe('clean HTML passthrough', () => {
    it('returns clean HTML unchanged (structurally)', () => {
      const input = '<div class="hero"><h1>Title</h1><p>Body text</p></div>';
      const result = sanitiseHtml(input);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<p>Body text</p>');
    });

    it('returns empty string for empty input', () => {
      expect(sanitiseHtml('')).toBe('');
    });
  });
});

// Feature: visual-page-builder, Property 13: HTML sanitisation removes all script content
import * as fc from 'fast-check';

describe('Property 13: HTML sanitisation removes all script content', () => {
  // Arbitrary: HTML string that may contain <script> tags
  const arbitraryHtmlWithScript = fc.tuple(
    fc.string({ maxLength: 50 }),
    fc.string({ maxLength: 50 }),
    fc.string({ maxLength: 50 }),
  ).map(([before, content, after]) =>
    `${before}<script>${content}</script>${after}`,
  );

  // Arbitrary: HTML string with on* event attributes
  const onEventNames = fc.constantFrom(
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onsubmit',
  );
  const arbitraryHtmlWithOnEvent = fc.tuple(
    fc.string({ maxLength: 30 }),
    onEventNames,
    fc.string({ maxLength: 30 }),
    fc.string({ maxLength: 30 }),
  ).map(([tag, event, value, after]) =>
    `<div ${event}="${value}">content</div>${after}`,
  );

  // Arbitrary: HTML string with javascript: URIs
  const arbitraryHtmlWithJavascriptUri = fc.tuple(
    fc.constantFrom('href', 'src'),
    fc.string({ maxLength: 50 }),
    fc.string({ maxLength: 30 }),
  ).map(([attr, payload, after]) =>
    `<a ${attr}="javascript:${payload}">link</a>${after}`,
  );

  // Arbitrary: general HTML string (may or may not contain threats)
  const arbitraryHtmlString = fc.oneof(
    fc.string({ maxLength: 200 }),
    arbitraryHtmlWithScript,
    arbitraryHtmlWithOnEvent,
    arbitraryHtmlWithJavascriptUri,
  );

  it('(a) sanitised output contains no <script substrings', () => {
    // Validates: Requirements 8.2, 15.1
    fc.assert(
      fc.property(arbitraryHtmlWithScript, (html) => {
        const result = sanitiseHtml(html);
        expect(result).not.toMatch(/<script/i);
      }),
      { numRuns: 100 },
    );
  });

  it('(b) sanitised output contains no on\\w+= attribute patterns', () => {
    // Validates: Requirements 15.1, 15.2
    fc.assert(
      fc.property(arbitraryHtmlWithOnEvent, (html) => {
        const result = sanitiseHtml(html);
        expect(result).not.toMatch(/\bon\w+\s*=/i);
      }),
      { numRuns: 100 },
    );
  });

  it('(c) sanitised output contains no javascript: URI schemes', () => {
    // Validates: Requirements 15.2, 15.3
    fc.assert(
      fc.property(arbitraryHtmlWithJavascriptUri, (html) => {
        const result = sanitiseHtml(html);
        expect(result).not.toMatch(/javascript:/i);
      }),
      { numRuns: 100 },
    );
  });

  it('all three properties hold simultaneously for arbitrary HTML', () => {
    // Validates: Requirements 8.2, 15.1, 15.2, 15.3
    fc.assert(
      fc.property(arbitraryHtmlString, (html) => {
        const result = sanitiseHtml(html);
        expect(result).not.toMatch(/<script/i);
        expect(result).not.toMatch(/\bon\w+\s*=/i);
        expect(result).not.toMatch(/javascript:/i);
      }),
      { numRuns: 100 },
    );
  });
});
