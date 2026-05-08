'use client';

import { Extension } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

export interface SlashCommandItem {
  title: string;
  description: string;
  command: (props: { editor: ReturnType<typeof import('@tiptap/react').useEditor>; range: { from: number; to: number } }) => void;
}

export const slashCommands: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    command: ({ editor, range }) => {
      editor?.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    command: ({ editor, range }) => {
      editor?.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    command: ({ editor, range }) => {
      editor?.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list of items',
    command: ({ editor, range }) => {
      editor?.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Display a code snippet',
    command: ({ editor, range }) => {
      editor?.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Paragraph',
    description: 'Plain text paragraph',
    command: ({ editor, range }) => {
      editor?.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
];

export type SlashCommandSuggestionOptions = Omit<SuggestionOptions<SlashCommandItem>, 'editor'>;

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: unknown; range: { from: number; to: number }; props: SlashCommandItem }) => {
          props.command({
            editor: editor as ReturnType<typeof import('@tiptap/react').useEditor>,
            range,
          });
        },
      } as SlashCommandSuggestionOptions,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
