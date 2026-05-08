'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import type { SlashCommandItem } from './SlashCommandExtension';

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

const COMMAND_ICONS: Record<string, React.ReactNode> = {
  'Heading 1': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17 12l3-2v8" />
    </svg>
  ),
  'Heading 2': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
  ),
  'Heading 3': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" /><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
    </svg>
  ),
  'Bullet List': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  'Code Block': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  'Paragraph': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 4v16" /><path d="M17 4v16" /><path d="M19 4H9.5a4.5 4.5 0 1 0 0 9H13" />
    </svg>
  ),
};

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuRef,
  SlashCommandMenuProps
>(function SlashCommandMenu({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const el = containerRef.current?.children[selectedIndex + 1] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
        return true;
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border bg-popover p-3 shadow-lg animate-fade-in">
        <p className="px-2 py-1 text-xs text-muted-foreground">No matching commands</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-72 min-w-[240px] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg animate-fade-in"
    >
      <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Blocks
      </p>
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          onClick={() => command(item)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
            index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
          )}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
            {COMMAND_ICONS[item.title] ?? <span className="text-xs">◇</span>}
          </div>
          <div>
            <span className="block text-[13px] font-medium text-popover-foreground">
              {item.title}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {item.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
});
