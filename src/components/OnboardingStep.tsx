'use client';

import { ReactNode } from 'react';

interface OnboardingStepProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function OnboardingStep({ title, subtitle, children }: OnboardingStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        {subtitle && (
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

interface RadioOptionProps {
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
}

export function RadioOption({ value, label, selected, onSelect }: RadioOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`radio-option ${selected ? 'selected' : ''}`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${selected ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
        {selected && (
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
        )}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface CheckboxOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxOption({ label, checked, onChange }: CheckboxOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="checkbox-option"
    >
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
        ${checked ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'}`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-[var(--muted)]">프로필 설정</span>
        <span className="text-sm font-medium">{current}/{total}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
