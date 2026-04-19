import type { PropsWithChildren } from 'react';
import { cn } from '@/utils/cn';

type ShellPrimitiveProps = PropsWithChildren<{
  className?: string;
}>;

export function ShellRoot({ className, children }: ShellPrimitiveProps) {
  return <div className={cn('h-screen flex overflow-hidden bg-background text-foreground', className)}>{children}</div>;
}

export function ShellMain({ className, children }: ShellPrimitiveProps) {
  return <main className={cn('flex-1 min-h-0 flex flex-col overflow-x-hidden', className)}>{children}</main>;
}

export function ShellSurface({ className, children }: ShellPrimitiveProps) {
  return <div className={cn('bg-card text-card-foreground border-border', className)}>{children}</div>;
}
