'use client';

import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { EditorContent, useEditor } from '@tiptap/react';
import { useRef, useEffect } from 'react';
import * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import { EditorToolbar } from './EditorToolbar';
import {
  SlashCommandExtension,
  slashCommands,
  type SlashCommandItem,
} from './SlashCommandExtension';
import { SlashCommandMenu, type SlashCommandMenuRef } from './SlashCommandMenu';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { createRoot, type Root } from 'react-dom/client';
import {
  type CollabSnapshot,
} from '@/lib/collab/useCollaboration';

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
  collab: CollabSnapshot;
}

export function Editor({ collab }: EditorProps) {
  const { ydoc, provider, connectionStatus, collaborators } = collab;

  // Wait until WebSocket connects — the 'connected' event triggers a
  // re-render via connectionStatus, at which point refs hold valid instances.
  if (!ydoc || !provider || connectionStatus !== 'connected') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-muted-foreground border-r-muted-foreground" />
          <p className="text-sm text-muted-foreground">Connecting to document…</p>
        </div>
      </div>
    );
  }

  return (
    <EditorInner
      ydoc={ydoc}
      provider={provider}
      connectionStatus={connectionStatus}
      collaborators={collaborators}
    />
  );
}

// Separated so useEditor only runs when provider is guaranteed non-null
function EditorInner({
  ydoc,
  provider,
  connectionStatus,
  collaborators,
}: {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  connectionStatus: CollabSnapshot['connectionStatus'];
  collaborators: CollabSnapshot['collaborators'];
}) {
  // Build suggestion renderer once
  const suggestionRendererRef = useRef(createSuggestionRenderer());

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          // Disable undo/redo — Collaboration handles it via Yjs
          undoRedo: false,
        }),
        Placeholder.configure({
          placeholder: "Type '/' for commands…",
        }),
        Collaboration.configure({
          document: ydoc,
          provider,
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
      editorProps: {
        attributes: {
          class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none px-6 py-4',
        },
      },
      immediatelyRender: false,
    },
    [ydoc, provider],
  );

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar
        editor={editor}
        connectionStatus={connectionStatus}
        collaborators={collaborators}
      />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
}

