/**
 * Design token constants — mirror of the CSS custom properties in global.css.
 * Import these in components that need token values in JS (e.g., ECharts config).
 */

export const TOKENS = {
  // Colours
  paper:       '#F3EFE6',
  surface:     '#FBF9F4',
  ink:         '#1B1A17',
  inkMuted:    '#5F5B52',
  rule:        '#D9D3C5',
  asphalt:     '#2B2D2F',
  marking:     '#F2C230',
  accent:      '#C84A08',
  ok:          '#2F7D5B',

  // Severity
  sevLow:      '#5E8C61',
  sevMedium:   '#D9A21B',
  sevHigh:     '#D9531E',
  sevCritical: '#B3202A',

  // Dark mode (used programmatically when theme = dark)
  dark: {
    paper:       '#14161A',
    surface:     '#1C1F24',
    ink:         '#ECE8DD',
    inkMuted:    '#9B9589',
    rule:        '#2E3138',
    asphalt:     '#0D0F12',
    marking:     '#F2C230',
    accent:      '#C44E11',
    ok:          '#3D9E72',
    sevLow:      '#6EA871',
    sevMedium:   '#DEAE36',
    sevHigh:     '#E26035',
    sevCritical: '#D43040',
  },
} as const;

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type DefectClass = 'pothole' | 'longitudinal_crack' | 'transverse_crack' | 'surface_damage' | 'water';
export type Role = 'inspector' | 'engineer' | 'admin';
export type WorkOrderStatus = 'detected' | 'verified' | 'scheduled' | 'in_progress' | 'repaired' | 're_inspected';

export const SEVERITY_COLOURS: Record<SeverityLevel, string> = {
  low:      TOKENS.sevLow,
  medium:   TOKENS.sevMedium,
  high:     TOKENS.sevHigh,
  critical: TOKENS.sevCritical,
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low:      'Low',
  medium:   'Medium',
  high:     'High',
  critical: 'Critical',
};

/** Severity band from 0–100 score */
export function severityFromScore(score: number): SeverityLevel {
  if (score < 25) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'critical';
}
