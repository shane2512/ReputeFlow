'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type MessageProps = ComponentProps<'div'> & {
  from: 'user' | 'assistant';
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'flex gap-3',
      from === 'user' ? 'flex-row-reverse' : 'flex-row',
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = ComponentProps<'div'>;

export const MessageContent = ({ className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      'rounded-2xl px-4 py-2 max-w-[80%]',
      'bg-muted text-foreground',
      className,
    )}
    {...props}
  />
);
