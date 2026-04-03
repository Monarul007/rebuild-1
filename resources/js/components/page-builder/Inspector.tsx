import React, { useState } from 'react';
import { usePageStore } from './store/PageStore';
import type { SectionNode, Viewport } from './types';
import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEXT_BEARING_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
  'p', 'span', 'a', 'li', 'button', 
  'div', 'strong', 'em', 'b', 'i', 'u', 
  'td', 'th', 'label', 'blockquote', 'small'
]);

const BREAKPOINT_KEY: Record<Viewport, keyof SectionNode['overrides']> = {
  desktop: 'base',
  tablet: 'md',
  mobile: 'sm',
};

type Tab = 'content' | 'style' | 'layout' | 'page';

// ---------------------------------------------------------------------------
// Shared control components
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  fontSize: '12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  boxSizing: 'border-box',
  background: '#fff',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

interface ControlProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  type?: 'text' | 'color' | 'number';
  placeholder?: string;
}

function Control({ label, value, onChange, onReset, type = 'text', placeholder }: ControlProps) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={type === 'color' ? { width: '32px', height: '28px', padding: '1px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' } : inputStyle}
        />
        {value && (
          <button
            onClick={onReset}
            title="Reset to default"
            style={{ fontSize: '10px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
          >
            ✕
          </button>
        )}
      </div>
    </Field>
  );
}

interface SelectControlProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  onReset: () => void;
}

function SelectControl({ label, value, options, onChange, onReset }: SelectControlProps) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {value && (
          <button
            onClick={onReset}
            title="Reset to default"
            style={{ fontSize: '10px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
          >
            ✕
          </button>
        )}
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Section header for control groups
// ---------------------------------------------------------------------------

function GroupHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 0 4px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px' }}>
      {title}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: get/set a single CSS property on the selected node's overrides
// ---------------------------------------------------------------------------

function useStyleControl(node: SectionNode, breakpointKey: keyof SectionNode['overrides']) {
  const updateNode = usePageStore((s) => s.updateNode);

  function get(prop: keyof CSSProperties): string {
    const val = (node.overrides[breakpointKey] as CSSProperties | undefined)?.[prop];
    return val != null ? String(val) : '';
  }

  function set(prop: keyof CSSProperties, value: string) {
    const existing = node.overrides[breakpointKey] ?? {};
    updateNode(node.id, {
      overrides: {
        ...node.overrides,
        [breakpointKey]: { ...existing, [prop]: value },
      },
    });
  }

  function reset(prop: keyof CSSProperties) {
    const existing = { ...(node.overrides[breakpointKey] ?? {}) } as Record<string, unknown>;
    delete existing[prop as string];
    updateNode(node.id, {
      overrides: {
        ...node.overrides,
        [breakpointKey]: existing as CSSProperties,
      },
    });
  }

  return { get, set, reset };
}

// ---------------------------------------------------------------------------
// Tab: Content
// ---------------------------------------------------------------------------

interface ContentTabProps {
  node: SectionNode;
  aiSuggestUrl: string;
}

function ContentTab({ node, aiSuggestUrl }: ContentTabProps) {
  const updateNode = usePageStore((s) => s.updateNode);
  const isTextBearing = TEXT_BEARING_TAGS.has(node.tag.toLowerCase());
  const isImage = node.tag.toLowerCase() === 'img';

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAiSuggest() {
    setIsLoading(true);
    setAiError(null);
    setSuggestion(null);
    try {
      const res = await fetch(aiSuggestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '',
        },
        body: JSON.stringify({ textContent: node.textContent ?? '', tag: node.tag }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed with status ${res.status}`);
      }
      setSuggestion(data.suggestion as string);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI suggestion failed.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirm() {
    if (suggestion !== null) {
      updateNode(node.id, { textContent: suggestion });
    }
    setSuggestion(null);
    setAiError(null);
  }

  function handleDismiss() {
    setSuggestion(null);
    setAiError(null);
  }

  return (
    <div>
      {isImage ? (
        /* Image element: edit src and alt */
        <div>
          <Field label="Image URL (src)">
            <input
              type="text"
              value={node.attrs?.src ?? ''}
              onChange={(e) =>
                updateNode(node.id, { attrs: { ...(node.attrs ?? {}), src: e.target.value } })
              }
              placeholder="https://..."
              style={inputStyle}
            />
          </Field>
          <Field label="Alt Text">
            <input
              type="text"
              value={node.attrs?.alt ?? ''}
              onChange={(e) =>
                updateNode(node.id, { attrs: { ...(node.attrs ?? {}), alt: e.target.value } })
              }
              placeholder="Describe the image"
              style={inputStyle}
            />
          </Field>
        </div>
      ) : isTextBearing ? (
        <Field label="Text Content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <textarea
              value={node.textContent ?? ''}
              onChange={(e) => updateNode(node.id, { textContent: e.target.value })}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />

            <button
              onClick={handleAiSuggest}
              disabled={isLoading}
              title="AI Suggest"
              style={{
                fontSize: '12px',
                padding: '5px 10px',
                background: isLoading ? '#f3f4f6' : '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                color: isLoading ? '#9ca3af' : '#1d4ed8',
              }}
            >
              {isLoading ? '⏳ Generating…' : '✨ AI Suggest'}
            </button>

            {/* Suggestion preview */}
            {suggestion !== null && (
              <div style={{ border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px', background: '#eff6ff', fontSize: '12px' }}>
                <div style={{ color: '#374151', marginBottom: '6px', whiteSpace: 'pre-wrap' }}>{suggestion}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleConfirm}
                    style={{ fontSize: '11px', padding: '3px 8px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDismiss}
                    style={{ fontSize: '11px', padding: '3px 8px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Inline error */}
            {aiError !== null && (
              <div style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '6px 8px' }}>
                {aiError}
              </div>
            )}
          </div>
        </Field>
      ) : (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '12px 0' }}>
          No text content for &lt;{node.tag}&gt; elements.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Style
// ---------------------------------------------------------------------------

function StyleTab({ node, breakpointKey }: { node: SectionNode; breakpointKey: keyof SectionNode['overrides'] }) {
  const { get, set, reset } = useStyleControl(node, breakpointKey);

  return (
    <div>
      {/* Typography */}
      <GroupHeader title="Typography" />
      <Control label="Font Size" value={get('fontSize')} onChange={(v) => set('fontSize', v)} onReset={() => reset('fontSize')} placeholder="e.g. 16px" />
      <SelectControl
        label="Font Weight"
        value={get('fontWeight')}
        options={[
          { value: '300', label: 'Light (300)' },
          { value: '400', label: 'Regular (400)' },
          { value: '500', label: 'Medium (500)' },
          { value: '600', label: 'Semi-Bold (600)' },
          { value: '700', label: 'Bold (700)' },
          { value: '800', label: 'Extra-Bold (800)' },
          { value: '900', label: 'Black (900)' },
        ]}
        onChange={(v) => set('fontWeight', v)}
        onReset={() => reset('fontWeight')}
      />
      <Control label="Line Height" value={get('lineHeight')} onChange={(v) => set('lineHeight', v)} onReset={() => reset('lineHeight')} placeholder="e.g. 1.5" />
      <Control label="Letter Spacing" value={get('letterSpacing')} onChange={(v) => set('letterSpacing', v)} onReset={() => reset('letterSpacing')} placeholder="e.g. 0.05em" />
      <SelectControl
        label="Text Align"
        value={get('textAlign')}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'justify', label: 'Justify' },
        ]}
        onChange={(v) => set('textAlign', v)}
        onReset={() => reset('textAlign')}
      />
      <Control label="Text Color" value={get('color')} onChange={(v) => set('color', v)} onReset={() => reset('color')} type="color" />
      <SelectControl
        label="Text Decoration"
        value={get('textDecoration')}
        options={[
          { value: 'none', label: 'None' },
          { value: 'underline', label: 'Underline' },
          { value: 'line-through', label: 'Line-through' },
          { value: 'overline', label: 'Overline' },
        ]}
        onChange={(v) => set('textDecoration', v)}
        onReset={() => reset('textDecoration')}
      />
      <SelectControl
        label="Text Transform"
        value={get('textTransform')}
        options={[
          { value: 'none', label: 'None' },
          { value: 'uppercase', label: 'Uppercase' },
          { value: 'lowercase', label: 'Lowercase' },
          { value: 'capitalize', label: 'Capitalize' },
        ]}
        onChange={(v) => set('textTransform', v)}
        onReset={() => reset('textTransform')}
      />

      {/* Colour & Background */}
      <GroupHeader title="Colour & Background" />
      <Control label="Background Color" value={get('backgroundColor')} onChange={(v) => set('backgroundColor', v)} onReset={() => reset('backgroundColor')} type="color" />
      <Control label="Background Image" value={get('backgroundImage')} onChange={(v) => set('backgroundImage', v)} onReset={() => reset('backgroundImage')} placeholder="url(...)" />
      <SelectControl
        label="Background Size"
        value={get('backgroundSize')}
        options={[
          { value: 'cover', label: 'Cover' },
          { value: 'contain', label: 'Contain' },
          { value: 'auto', label: 'Auto' },
        ]}
        onChange={(v) => set('backgroundSize', v)}
        onReset={() => reset('backgroundSize')}
      />
      <Control label="Background Position" value={get('backgroundPosition')} onChange={(v) => set('backgroundPosition', v)} onReset={() => reset('backgroundPosition')} placeholder="e.g. center" />

      {/* Border & Radius */}
      <GroupHeader title="Border & Radius" />
      <Control label="Border Width" value={get('borderWidth')} onChange={(v) => set('borderWidth', v)} onReset={() => reset('borderWidth')} placeholder="e.g. 1px" />
      <SelectControl
        label="Border Style"
        value={get('borderStyle')}
        options={[
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
          { value: 'none', label: 'None' },
        ]}
        onChange={(v) => set('borderStyle', v)}
        onReset={() => reset('borderStyle')}
      />
      <Control label="Border Color" value={get('borderColor')} onChange={(v) => set('borderColor', v)} onReset={() => reset('borderColor')} type="color" />
      <Control label="Border Radius" value={get('borderRadius')} onChange={(v) => set('borderRadius', v)} onReset={() => reset('borderRadius')} placeholder="e.g. 8px" />

      {/* Effects */}
      <GroupHeader title="Effects" />
      <Control label="Opacity" value={get('opacity')} onChange={(v) => set('opacity', v)} onReset={() => reset('opacity')} placeholder="0–1" />
      <Control label="Box Shadow" value={get('boxShadow')} onChange={(v) => set('boxShadow', v)} onReset={() => reset('boxShadow')} placeholder="e.g. 0 2px 4px rgba(0,0,0,0.1)" />
      <SelectControl
        label="Overflow"
        value={get('overflow')}
        options={[
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'scroll', label: 'Scroll' },
          { value: 'auto', label: 'Auto' },
        ]}
        onChange={(v) => set('overflow', v)}
        onReset={() => reset('overflow')}
      />
      <SelectControl
        label="Cursor"
        value={get('cursor')}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'pointer', label: 'Pointer' },
          { value: 'text', label: 'Text' },
          { value: 'not-allowed', label: 'Not Allowed' },
          { value: 'grab', label: 'Grab' },
        ]}
        onChange={(v) => set('cursor', v)}
        onReset={() => reset('cursor')}
      />
      <Control label="Z-Index" value={get('zIndex')} onChange={(v) => set('zIndex', v)} onReset={() => reset('zIndex')} placeholder="e.g. 10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Layout
// ---------------------------------------------------------------------------

function LayoutTab({ node, breakpointKey }: { node: SectionNode; breakpointKey: keyof SectionNode['overrides'] }) {
  const { get, set, reset } = useStyleControl(node, breakpointKey);

  return (
    <div>
      {/* Spacing */}
      <GroupHeader title="Spacing" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <Control label="Padding Top" value={get('paddingTop')} onChange={(v) => set('paddingTop', v)} onReset={() => reset('paddingTop')} placeholder="e.g. 16px" />
        <Control label="Padding Right" value={get('paddingRight')} onChange={(v) => set('paddingRight', v)} onReset={() => reset('paddingRight')} placeholder="e.g. 16px" />
        <Control label="Padding Bottom" value={get('paddingBottom')} onChange={(v) => set('paddingBottom', v)} onReset={() => reset('paddingBottom')} placeholder="e.g. 16px" />
        <Control label="Padding Left" value={get('paddingLeft')} onChange={(v) => set('paddingLeft', v)} onReset={() => reset('paddingLeft')} placeholder="e.g. 16px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <Control label="Margin Top" value={get('marginTop')} onChange={(v) => set('marginTop', v)} onReset={() => reset('marginTop')} placeholder="e.g. 0" />
        <Control label="Margin Right" value={get('marginRight')} onChange={(v) => set('marginRight', v)} onReset={() => reset('marginRight')} placeholder="e.g. 0" />
        <Control label="Margin Bottom" value={get('marginBottom')} onChange={(v) => set('marginBottom', v)} onReset={() => reset('marginBottom')} placeholder="e.g. 0" />
        <Control label="Margin Left" value={get('marginLeft')} onChange={(v) => set('marginLeft', v)} onReset={() => reset('marginLeft')} placeholder="e.g. 0" />
      </div>

      {/* Size & Layout */}
      <GroupHeader title="Size & Layout" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <Control label="Width" value={get('width')} onChange={(v) => set('width', v)} onReset={() => reset('width')} placeholder="e.g. 100%" />
        <Control label="Min Width" value={get('minWidth')} onChange={(v) => set('minWidth', v)} onReset={() => reset('minWidth')} placeholder="e.g. 0" />
        <Control label="Max Width" value={get('maxWidth')} onChange={(v) => set('maxWidth', v)} onReset={() => reset('maxWidth')} placeholder="e.g. 1280px" />
        <Control label="Height" value={get('height')} onChange={(v) => set('height', v)} onReset={() => reset('height')} placeholder="e.g. auto" />
        <Control label="Min Height" value={get('minHeight')} onChange={(v) => set('minHeight', v)} onReset={() => reset('minHeight')} placeholder="e.g. 0" />
        <Control label="Max Height" value={get('maxHeight')} onChange={(v) => set('maxHeight', v)} onReset={() => reset('maxHeight')} placeholder="e.g. none" />
      </div>
      <SelectControl
        label="Display"
        value={get('display')}
        options={[
          { value: 'block', label: 'Block' },
          { value: 'flex', label: 'Flex' },
          { value: 'grid', label: 'Grid' },
          { value: 'inline', label: 'Inline' },
          { value: 'inline-block', label: 'Inline Block' },
          { value: 'none', label: 'Hidden' },
        ]}
        onChange={(v) => set('display', v)}
        onReset={() => reset('display')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Page Settings
// ---------------------------------------------------------------------------

function PageSettings() {
  const customCss = usePageStore((s) => s.customCss);
  const setCustomCss = usePageStore((s) => s.setCustomCss);
  const customJs = usePageStore((s) => s.customJs);
  const setCustomJs = usePageStore((s) => s.setCustomJs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Field label="Custom CSS">
        <textarea
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          placeholder="/* Add your custom CSS here */"
          rows={10}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', minHeight: '150px' }}
        />
      </Field>

      <Field label="Custom JavaScript">
        <textarea
          value={customJs}
          onChange={(e) => setCustomJs(e.target.value)}
          placeholder="// Add your custom JS here"
          rows={10}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', minHeight: '150px' }}
        />
        <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
          Note: JavaScript will run inside the preview iframe. Be careful with infinite loops.
        </p>
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Inspector component
// ---------------------------------------------------------------------------

interface InspectorProps {
  aiSuggestUrl: string;
}

export function Inspector({ aiSuggestUrl }: InspectorProps) {
  const selectedNodeId = usePageStore((s) => s.selectedNodeId);
  const viewport = usePageStore((s) => s.viewport);
  const sections = usePageStore((s) => s.sections);

  const [activeTab, setActiveTab] = useState<Tab>('content');

  // Find the selected node anywhere in the tree
  function findNode(nodes: SectionNode[], id: string): SectionNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const selectedNode = selectedNodeId ? findNode(sections, selectedNodeId) : null;
  const breakpointKey = BREAKPOINT_KEY[viewport];

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '8px 4px',
    fontSize: '12px',
    fontWeight: activeTab === tab ? 600 : 400,
    color: activeTab === tab ? '#1d4ed8' : '#6b7280',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  });

  if (!selectedNode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '10px 12px 0', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            Page Settings
          </div>
          <div style={{ display: 'flex' }}>
            <button 
              style={{
                ...tabStyle('content'),
                flex: 'none',
                padding: '8px 16px',
                borderBottom: '2px solid #3b82f6',
                color: '#1d4ed8',
                fontWeight: 600,
              }}
            >
              Custom CSS/JS
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <PageSettings />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Node label */}
      <div style={{ padding: '10px 12px 0', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Selected</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          &lt;{selectedNode.tag}&gt;
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          <button style={tabStyle('content')} onClick={() => setActiveTab('content')}>Content</button>
          <button style={tabStyle('style')} onClick={() => setActiveTab('style')}>Style</button>
          <button style={tabStyle('layout')} onClick={() => setActiveTab('layout')}>Layout</button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {activeTab === 'content' && <ContentTab node={selectedNode} aiSuggestUrl={aiSuggestUrl} />}
        {activeTab === 'style' && <StyleTab node={selectedNode} breakpointKey={breakpointKey} />}
        {activeTab === 'layout' && <LayoutTab node={selectedNode} breakpointKey={breakpointKey} />}
      </div>
    </div>
  );
}
