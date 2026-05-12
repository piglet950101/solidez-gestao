'use client';
import * as React from 'react';
import { Input } from './input';
import { brlToNumber } from '@/lib/format';

interface Props
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined;
  onChange?: (value: number) => void;
  /** Name for the hidden form field that carries the parsed numeric value. */
  name?: string;
}

function formatBR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n === 0) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Money input that accepts Brazilian (R$ 37.479,12) and US format freely.
 * Renders a visible text field for typing plus a hidden numeric input that
 * carries the parsed value into FormData. Form code does not need any
 * manual parsing — the action receives a clean number string.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, name, onBlur, onFocus, placeholder = '0,00', ...rest }, ref) => {
    const [text, setText] = React.useState<string>(formatBR(value));
    const [focused, setFocused] = React.useState(false);

    // Sync external value into text when not actively editing.
    React.useEffect(() => {
      if (!focused) setText(formatBR(value));
    }, [value, focused]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      setText(raw);
      const parsed = brlToNumber(raw);
      onChange?.(parsed);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(false);
      const parsed = brlToNumber(text);
      setText(parsed === 0 ? '' : formatBR(parsed));
      onChange?.(parsed);
      onBlur?.(e);
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(true);
      onFocus?.(e);
    }

    return (
      <>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          {...rest}
        />
        {name ? <input type="hidden" name={name} value={value == null ? '' : String(value)} /> : null}
      </>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
