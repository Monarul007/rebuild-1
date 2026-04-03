import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { NodeId, Viewport, SectionNode, PageSchema } from '../types';

// ---------------------------------------------------------------------------
// State & actions interface
// ---------------------------------------------------------------------------

export interface PageState {
  sections: SectionNode[];
  selectedNodeId: NodeId | null;
  viewport: Viewport;
  customCss: string;
  customJs: string;

  addSection(node: SectionNode): void;
  removeSection(id: NodeId): void;
  reorderSections(fromIndex: number, toIndex: number): void;
  updateNode(id: NodeId, patch: Partial<SectionNode>): void;
  selectNode(id: NodeId): void;
  deselectNode(): void;
  setViewport(v: Viewport): void;
  setCustomCss(css: string): void;
  setCustomJs(js: string): void;
  importHtmlSection(html: string): Promise<void>;
  duplicateSection(id: NodeId): void;
  exportSchema(): PageSchema;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively remove a node (and its subtree) by id from a node array. */
function removeNodeById(nodes: SectionNode[], id: NodeId): SectionNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNodeById(n.children, id) }));
}

/** Recursively update a node by id, applying a shallow patch. */
function updateNodeById(
  nodes: SectionNode[],
  id: NodeId,
  patch: Partial<SectionNode>,
): SectionNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    return { ...n, children: updateNodeById(n.children, id, patch) };
  });
}

/** Deep-clone a SectionNode subtree, assigning fresh nanoid(10) ids to every node. */
function deepCloneWithNewIds(node: SectionNode): SectionNode {
  return {
    ...node,
    id: nanoid(10),
    children: node.children.map(deepCloneWithNewIds),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePageStore = create<PageState>()(
  temporal(
    (set, get) => ({
      sections: [],
      selectedNodeId: null,
      viewport: 'desktop' as Viewport,
      customCss: '',
      customJs: '',

      addSection(node: SectionNode) {
        set((s) => ({ sections: [...s.sections, node] }));
      },

      removeSection(id: NodeId) {
        set((s) => ({ sections: removeNodeById(s.sections, id) }));
      },

      reorderSections(fromIndex: number, toIndex: number) {
        set((s) => {
          const sections = [...s.sections];
          const [moved] = sections.splice(fromIndex, 1);
          sections.splice(toIndex, 0, moved);
          return { sections };
        });
      },

      updateNode(id: NodeId, patch: Partial<SectionNode>) {
        set((s) => ({ sections: updateNodeById(s.sections, id, patch) }));
      },

      selectNode(id: NodeId) {
        set({ selectedNodeId: id });
      },

      deselectNode() {
        set({ selectedNodeId: null });
      },

      setViewport(v: Viewport) {
        set({ viewport: v });
      },

      setCustomCss(css: string) {
        set({ customCss: css });
      },

      setCustomJs(js: string) {
        set({ customJs: js });
      },

      /**
       * Sanitises and parses the given HTML string into a SectionNode tree,
       * then appends it as a new `type: 'custom-html'` section.
       * If parsing fails, the store is not mutated.
       */
      async importHtmlSection(html: string): Promise<void> {
        const { sanitiseHtml } = await import('../utils/sanitise');
        const { parseHtmlToNodes } = await import('../utils/parser');

        const sanitised = sanitiseHtml(html);
        const parsedNodes = await parseHtmlToNodes(sanitised);

        let section: SectionNode;
        if (parsedNodes.length === 1 && parsedNodes[0].tag.toLowerCase() === 'section') {
          section = { ...parsedNodes[0], type: 'custom-html' };
        } else {
          section = {
            id: nanoid(10),
            type: 'custom-html',
            tag: 'section',
            classes: [],
            overrides: {},
            children: parsedNodes,
          };
        }
        set((s) => ({ sections: [...s.sections, section] }));
      },

      duplicateSection(id: NodeId) {
        set((s) => {
          const idx = s.sections.findIndex((sec) => sec.id === id);
          if (idx === -1) return s;
          const clone = deepCloneWithNewIds(s.sections[idx]);
          const sections = [...s.sections];
          sections.splice(idx + 1, 0, clone);
          return { sections };
        });
      },

      exportSchema(): PageSchema {
        const { sections, customCss, customJs } = get();
        return { version: 1, sections, customCss, customJs };
      },
    }),
    { limit: 50 },
  ),
);

/** Expose the temporal store for undo/redo access. */
export const useTemporalStore = <T>(
  selector: (state: ReturnType<typeof usePageStore.temporal.getState>) => T,
): T => selector(usePageStore.temporal.getState());
