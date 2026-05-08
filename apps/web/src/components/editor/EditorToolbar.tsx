'use client';

import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorToolbarProps {
  editor: Editor | null;
  saveStatus: SaveStatus;
}

export function EditorToolbar({ editor, saveStatus }: EditorToolbarProps) {
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

      {/* Save status */}
      <div className="ml-auto">
        <SaveStatusIndicator status={saveStatus} />
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

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case 'saving':
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
          Saving…
        </Badge>
      );
    case 'saved':
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 animate-fade-in font-normal text-emerald-600 dark:text-emerald-400"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="3.5 8.5 6.5 11.5 12.5 5.5" />
          </svg>
          Saved
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="gap-1.5 animate-fade-in font-normal">
          Save failed
        </Badge>
      );
    default:
      return null;
  }
}
