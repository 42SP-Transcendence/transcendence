import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

const lineCode = cva('font-led inline-block leading-none tracking-wider', {
  variants: {
    tone: {
      text: 'text-led-text',
      sign: 'bg-night text-led rounded-sm px-2 py-1',
    },
    size: {
      sm: 'text-sm',
      md: 'text-xl',
      lg: 'text-4xl',
    },
  },
  defaultVariants: {
    tone: 'text',
    size: 'md',
  },
});

export interface LineCodeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, VariantProps<typeof lineCode> {
  code: string;
}

/**
 * Bus line code in the LED sign typeface, such as 4710-10, read out as "Linha 4710-10".
 */
export function LineCode({ code, tone, size, className, ...props }: LineCodeProps) {
  return (
    <span className={lineCode({ tone, size, className })} aria-label={`Linha ${code}`} {...props}>
      {code}
    </span>
  );
}
