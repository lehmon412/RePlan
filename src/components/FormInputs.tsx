'use client';

import { TIME_OPTIONS, DURATION_OPTIONS, COMMUTE_OPTIONS } from '@/types/profile';

interface SelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: readonly { value: string | number; label: string }[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, className = '' }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input cursor-pointer ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function TimePicker({ value, onChange, label, className = '' }: TimePickerProps) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <Select
        value={value}
        onChange={onChange}
        options={TIME_OPTIONS}
        placeholder="시간 선택"
      />
    </div>
  );
}

interface DurationPickerProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export function DurationPicker({ value, onChange, label, className = '' }: DurationPickerProps) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <Select
        value={value}
        onChange={(v) => onChange(Number(v))}
        options={DURATION_OPTIONS}
        placeholder="시간 선택"
      />
    </div>
  );
}

interface CommuteDurationPickerProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export function CommuteDurationPicker({ value, onChange, label, className = '' }: CommuteDurationPickerProps) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <Select
        value={value}
        onChange={(v) => onChange(Number(v))}
        options={COMMUTE_OPTIONS}
        placeholder="소요 시간"
      />
    </div>
  );
}

interface ToggleGroupProps {
  options: readonly { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  className?: string;
}

export function ToggleGroup({ options, selected, onChange, multiple = true, className = '' }: ToggleGroupProps) {
  const handleToggle = (value: string) => {
    if (multiple) {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      onChange([value]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleToggle(opt.value)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all
              ${isSelected
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-[var(--border)] hover:border-[var(--primary)]/50'
              }`}
            style={isSelected ? { backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface MealTimeInputProps {
  label: string;
  enabled: boolean;
  time?: string;
  onEnabledChange: (enabled: boolean) => void;
  onTimeChange: (time: string) => void;
}

export function MealTimeInput({ label, enabled, time, onEnabledChange, onTimeChange }: MealTimeInputProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border)]">
      <div className="flex-1">
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onEnabledChange(true)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all
            ${enabled
              ? 'bg-[var(--primary)] text-white'
              : 'border border-[var(--border)] hover:border-[var(--primary)]'
            }`}
        >
          먹음
        </button>
        <button
          type="button"
          onClick={() => onEnabledChange(false)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all
            ${!enabled
              ? 'bg-[var(--muted)] text-white'
              : 'border border-[var(--border)] hover:border-[var(--muted)]'
            }`}
        >
          안먹음
        </button>
      </div>
      {enabled && (
        <select
          value={time || ''}
          onChange={(e) => onTimeChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm"
        >
          <option value="" disabled>시간</option>
          {TIME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
