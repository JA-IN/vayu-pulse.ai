import React from 'react';

export function DisclosureAction() {
  return (
    <span className="disclosure-action" aria-hidden="true">
      <span className="disclosure-action-open">Explore</span>
      <span className="disclosure-action-close">Close</span>
      <span className="disclosure-icon">+</span>
    </span>
  );
}
