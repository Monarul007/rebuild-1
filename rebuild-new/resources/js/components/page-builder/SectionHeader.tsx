import React from 'react';
import { usePageStore } from './store/PageStore';
import type { NodeId } from './types';

interface SectionHeaderProps {
  id: NodeId;
  tag: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function SectionHeader({ id, tag, collapsed, onToggleCollapse, dragHandleProps }: SectionHeaderProps) {
  const duplicateSection = usePageStore((s) => s.duplicateSection);
  const removeSection = usePageStore((s) => s.removeSection);

  return (
    <div
      aria-label={`Section header for ${tag}`}
      {...dragHandleProps}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
        borderRadius: '4px 4px 0 0',
        fontSize: '11px',
        color: '#64748b',
        userSelect: 'none',
        cursor: dragHandleProps ? 'grab' : 'default',
        ...dragHandleProps?.style,
      }}
    >
      {/* Section label */}
      <span
        style={{
          fontFamily: 'monospace',
          fontWeight: 600,
          color: '#475569',
          flex: 1,
        }}
      >
        {'<'}{tag}{'>'}
      </span>

      {/* Collapse toggle */}
      <button
        aria-label={collapsed ? 'Expand section' : 'Collapse section'}
        onClick={onToggleCollapse}
        style={headerBtnStyle}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '▶' : '▼'}
      </button>

      {/* Duplicate */}
      <button
        aria-label="Duplicate section"
        onClick={() => duplicateSection(id)}
        style={headerBtnStyle}
        title="Duplicate"
      >
        ⧉
      </button>

      {/* Delete */}
      <button
        aria-label="Delete section"
        onClick={() => removeSection(id)}
        style={{ ...headerBtnStyle, color: '#ef4444' }}
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

const headerBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '22px',
  border: 'none',
  borderRadius: '4px',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '11px',
  color: '#64748b',
  padding: 0,
  lineHeight: 1,
};
