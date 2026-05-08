'use client';

import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUpdateContent } from '@/hooks/useDocument';
import { EditorToolbar, type SaveStatus } from './EditorToolbar';
import {
  SlashCommandExtension,
  slashCommands,
  type SlashCommandItem,
} from './SlashCommandExtension';
import { SlashCommandMenu, type SlashCommandMenuRef } from './SlashCommandMenu';
import type { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { createRoot, type Root } from 'react-dom/client';

// ---------------------------------------------------------------------------
// Suggestion render helpers (creates a floating popup with React)
// ---------------------------------------------------------------------------

function createSuggestionRenderer() {
  return {
    onStart: (props: {
      editor: unknown;
      clientRect: (() => DOMRect | null) | null;
      query: string;
      items: SlashCommandItem[];
      command: (item: SlashCommandItem) => void;
    }) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      const componentRef: { current: SlashCommandMenuRef | null } = {
        current: null,
      };

      root.render(
        <SlashCommandMenu
          ref={(r) => {
            componentRef.current = r;
          }}
          items={props.items}
          command={props.command}
        />,
      );

      const popup = tippy(document.body, {
        getReferenceClientRect: props.clientRect as () => DOMRect,
        appendTo: () => document.body,
        content: container,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        maxWidth: 'none',
      });

      return {
        popup,
        root,
        componentRef,
        container,
      };
    },

    onUpdate: (
      props: {
        items: SlashCommandItem[];
        command: (item: SlashCommandItem) => void;
        clientRect: (() => DOMRect | null) | null;
      },
      state: {
        popup: TippyInstance;
        root: Root;
        componentRef: { current: SlashCommandMenuRef | null };
      },
    ) => {
      state.root.render(
        <SlashCommandMenu
          ref={(r) => {
            state.componentRef.current = r;
          }}
          items={props.items}
          command={props.command}
        />,
      );

      state.popup.setProps({
        getReferenceClientRect: props.clientRect as () => DOMRect,
      });
    },

    onKeyDown: (
      props: { event: KeyboardEvent },
      state: { componentRef: { current: SlashCommandMenuRef | null } },
    ) => {
      if (props.event.key === 'Escape') {
        return true;
      }
      return state.componentRef.current?.onKeyDown(props) ?? false;
    },

    onExit: (state: { popup: TippyInstance; root: Root }) => {
      state.popup.destroy();
      // Defer unmount to avoid React warnings about synchronous unmount
      requestAnimationFrame(() => state.root.unmount());
    },
  };
}

// ---------------------------------------------------------------------------
// Main Editor component
// ---------------------------------------------------------------------------

interface EditorProps {
  documentId: string;
  initialContent: JSONContent | null;
}

const SAVE_DEBOUNCE_MS = 1000;

export function Editor({ documentId, initialContent }: EditorProps) {
  const updateContent = useUpdateContent(documentId);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build suggestion renderer once
  const suggestionRendererRef = useRef(createSuggestionRenderer());

  const handleSave = useCallback(
    (json: Record<string, unknown>) => {
      setSaveStatus('saving');
      updateContent.mutate(json, {
        onSuccess: () => {
          setSaveStatus('saved');
          // Auto-fade back to idle after 2s
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
        },
        onError: () => {
          setSaveStatus('error');
        },
      });
    },
    [updateContent],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands…",
      }),
      SlashCommandExtension.configure({
        suggestion: {
          items: ({ query }: { query: string }) =>
            slashCommands.filter((cmd) => cmd.title.toLowerCase().includes(query.toLowerCase())),
          render: () => {
            const renderer = suggestionRendererRef.current;
            let state: ReturnType<typeof renderer.onStart> | null = null;

            return {
              onStart: (props: Parameters<typeof renderer.onStart>[0]) => {
                state = renderer.onStart(props);
              },
              onUpdate: (props: Parameters<typeof renderer.onUpdate>[0]) => {
                if (state) renderer.onUpdate(props, state);
              },
              onKeyDown: (props: Parameters<typeof renderer.onKeyDown>[0]) => {
                if (state) return renderer.onKeyDown(props, state);
                return false;
              },
              onExit: () => {
                if (state) renderer.onExit(state);
                state = null;
              },
            };
          },
        },
      }),
    ],
    content: initialContent ?? undefined,
    onUpdate: ({ editor: ed }) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const json = ed.getJSON();
        handleSave(json as Record<string, unknown>);
      }, SAVE_DEBOUNCE_MS);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none px-6 py-4',
      },
    },
    immediatelyRender: false,
  });

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar editor={editor} saveStatus={saveStatus} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
}
