import * as React from 'react';
import { Label } from './label';
import { Input, Textarea } from './input';
import { CurrencyInput } from './currency-input';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  className?: string;
}

export function Field({
  label,
  name,
  required,
  hint,
  className,
  children,
}: FieldProps & { children: React.ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-brand-500">{hint}</p> : null}
    </div>
  );
}

interface TextFieldProps extends FieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, name, required, hint, className, ...rest }, ref) => (
    <Field label={label} name={name} required={required} hint={hint} className={className}>
      <Input ref={ref} id={name} name={name} required={required} {...rest} />
    </Field>
  ),
);
TextField.displayName = 'TextField';

interface TextareaFieldProps extends FieldProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, name, required, hint, className, ...rest }, ref) => (
    <Field label={label} name={name} required={required} hint={hint} className={className}>
      <Textarea ref={ref} id={name} name={name} required={required} {...rest} />
    </Field>
  ),
);
TextareaField.displayName = 'TextareaField';

interface CurrencyFieldProps extends FieldProps {
  value: number | null | undefined;
  onChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencyField({
  label,
  name,
  required,
  hint,
  className,
  value,
  onChange,
  placeholder,
  disabled,
}: CurrencyFieldProps) {
  return (
    <Field label={label} name={name} required={required} hint={hint} className={className}>
      <CurrencyInput
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  );
}

