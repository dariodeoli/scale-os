'use client';

import { Grid2X2, List } from 'lucide-react';
import styles from './view-toggle.module.css';

export type CollectionView = 'grid' | 'list';

type ViewToggleProps = {
  value: CollectionView;
  onChange: (value: CollectionView) => void;
  label: string;
};

const options = [
  { value: 'grid' as const, label: 'Ver como cuadrícula', Icon: Grid2X2 },
  { value: 'list' as const, label: 'Ver como lista', Icon: List },
];

export function ViewToggle({ value, onChange, label }: ViewToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label={label}>
      {options.map(({ value: optionValue, label: optionLabel, Icon }) => (
        <button
          key={optionValue}
          type="button"
          aria-label={optionLabel}
          aria-pressed={value === optionValue}
          title={optionLabel}
          onClick={() => onChange(optionValue)}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={2.25} />
          <span className="sr-only">{optionLabel}</span>
        </button>
      ))}
    </div>
  );
}
