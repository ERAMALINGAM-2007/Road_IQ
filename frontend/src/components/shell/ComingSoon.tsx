import { Link } from 'react-router-dom';
import { ArrowRight } from 'phosphor-react';

interface ComingSoonProps {
  name: string;
}

export function ComingSoon({ name }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] contour-bg">
      <div className="text-center max-w-md px-8">
        {/* Inspection tag label */}
        <div className="flex justify-center mb-6">
          <span className="inspection-tag text-[var(--ink-muted)]">
            Phase 0 · Foundations
          </span>
        </div>

        <h1 className="font-display text-lg text-[var(--ink)] mb-2" style={{ fontOpticalSizing: 'auto' } as React.CSSProperties}>
          {name}
        </h1>

        <p className="text-sm text-[var(--ink-muted)] mb-8">
          This screen is coming in a later phase. The design system below shows
          how it will look.
        </p>

        <Link
          to="/design"
          className="inline-flex items-center gap-2 btn btn-secondary text-sm"
        >
          See the design system <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
