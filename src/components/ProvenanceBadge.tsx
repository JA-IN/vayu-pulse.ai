/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DataKind, PROVENANCE_BADGES } from '../lib/provenance.ts';

interface ProvenanceBadgeProps {
  kind: DataKind;
  stale?: boolean;
  className?: string;
  sourceNote?: string;
  size?: 'sm' | 'md';
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  kind,
  stale = false,
  className = '',
  sourceNote,
  size = 'md',
}) => {
  const config = PROVENANCE_BADGES[kind] || PROVENANCE_BADGES.derived;
  const isSm = size === 'sm';

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span
        title={`${config.description}${sourceNote ? ` (${sourceNote})` : ''}`}
        className={`inline-flex items-center ${isSm ? 'px-1.5 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]'} rounded-full font-mono font-semibold uppercase tracking-wider border ${
          config.bgColor
        } ${config.textColor} ${config.borderColor} ${
          config.borderDashed ? 'border-dashed' : 'border-solid'
        } transition-colors select-none`}
      >
        {config.label}
      </span>
      {stale && (
        <span
          title="Observed timestamp is older than 30 minutes from provider"
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse select-none"
        >
          STALE (&gt;30m)
        </span>
      )}
    </div>
  );
};
