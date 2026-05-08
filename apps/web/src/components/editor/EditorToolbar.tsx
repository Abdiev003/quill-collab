'use client';

import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ConnectionStatus, CollaborationUser, CollabSnapshot } from '@/lib/collab/useCollaboration';

interface EditorToolbarProps {
  editor: Editor | null;
  connectionStatus: CollabSnapshot['connectionStatus'];
  collaborators: CollabSnapshot['collaborators'];
}

export function EditorToolbar({ editor, connectionStatus, collaborators }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 border-b bg-card px-3 py-1.5">
      {/* Format buttons */}
      <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          shortcut="⌘B"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          shortcut="⌘I"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          shortcut="⌘⇧S"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16 4H9a3 3 0 0 0-2.83 4" />
            <path d="M14 12a4 4 0 0 1 0 8H6" />
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Code"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          shortcut="⌘E"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Block type buttons */}
      <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
        <ToolbarButton
          label="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <span className="text-[11px] font-bold tracking-tight">H1</span>
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="text-[11px] font-bold tracking-tight">H2</span>
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <span className="text-[11px] font-bold tracking-tight">H3</span>
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-0.5 h-4" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
            <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <polyline points="8 8 5 12 8 16" />
            <polyline points="16 8 19 12 16 16" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Right side: collaborator avatars + connection status */}
      <div className="ml-auto flex items-center gap-2">
        {/* Collaborator avatars */}
        {collaborators.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {collaborators.slice(0, 5).map((collab) => (
              <Tooltip key={collab.userId}>
                <TooltipTrigger>
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white shadow-sm transition-transform hover:scale-110 hover:z-10"
                    style={{ backgroundColor: collab.color }}
                    title={collab.displayName}
                  >
                    {collab.displayName.charAt(0).toUpperCase()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{collab.displayName}</TooltipContent>
              </Tooltip>
            ))}
            {collaborators.length > 5 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
                +{collaborators.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Connection status */}
        <ConnectionStatusIndicator status={connectionStatus} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

function ToolbarButton({
  label,
  active,
  onClick,
  shortcut,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string;
  children: React.ReactNode;
}) {
  const btn = (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="icon-xs"
      onClick={onClick}
      aria-label={label}
      className={cn(active && 'shadow-sm')}
    >
      {children}
    </Button>
  );

  if (shortcut) {
    return (
      <Tooltip>
        <TooltipTrigger>{btn}</TooltipTrigger>
        <TooltipContent>
          {label} <kbd className="ml-1 text-[10px] text-muted-foreground">{shortcut}</kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger>{btn}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case 'connecting':
      return (
        <Badge variant="secondary" className="gap-1.5 animate-fade-in font-normal">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="28"
              strokeDashoffset="10"
              opacity="0.3"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="28"
              strokeDashoffset="22"
            />
          </svg>
          Connecting…
        </Badge>
      );
    case 'connected':
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 animate-fade-in font-normal text-emerald-600 dark:text-emerald-400"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge variant="destructive" className="gap-1.5 animate-fade-in font-normal">
          <span className="h-2 w-2 rounded-full bg-current opacity-60" />
          Offline
        </Badge>
      );
    default:
      return null;
  }
}
