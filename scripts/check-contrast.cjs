#!/usr/bin/env node
/**
 * WCAG AA contrast check for Marga design tokens.
 * Checks all text/background pairs in our palette.
 * Run: node scripts/check-contrast.cjs
 */

const PAIRS = [
  // [foreground, background, label]
  ['#1B1A17', '#F3EFE6', 'ink on paper (light)'],
  ['#1B1A17', '#FBF9F4', 'ink on surface (light)'],
  ['#5F5B52', '#F3EFE6', 'ink-muted on paper (light)'],
  ['#5F5B52', '#FBF9F4', 'ink-muted on surface (light)'],
  ['#ECE8DD', '#14161A', 'ink on paper (dark)'],
  ['#ECE8DD', '#1C1F24', 'ink on surface (dark)'],
  ['#9B9589', '#14161A', 'ink-muted on paper (dark)'],
  ['#F2C230', '#2B2D2F', 'marking on asphalt (nav)'],
  ['#F2C230', '#0D0F12', 'marking on asphalt-dark (nav)'],
  ['#ECE8DD', '#2B2D2F', 'ink on asphalt (nav)'],
  ['#ffffff', '#C84A08', 'white on accent (button light)'],    // fixed: #C84A08
  ['#ffffff', '#C44E11', 'white on accent-dark (button)'],    // fixed: #C44E11
  ['#ffffff', '#2F7D5B', 'white on ok (verified)'],
  ['#ffffff', '#B3202A', 'white on critical (badge)'],
  ['#2E5C30', '#C5DCC7', 'sev-low-text on low-bg chip'],      // fixed chip
  ['#7A5500', '#F5E0A0', 'sev-medium-text on medium-bg chip'],// fixed chip
  ['#8B2E0A', '#F2C5B0', 'sev-high-text on high-bg chip'],    // fixed chip
  ['#6B0E14', '#E8B0B5', 'sev-critical-text on critical-bg'], // fixed chip
  ['#2B6693', '#F3EFE6', 'info on paper (experimental badge)'],// fixed: #2B6693
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

let allPass = true;

console.log('\nMarga WCAG Contrast Check\n' + '─'.repeat(70));
console.log('Requirement: ≥ 4.5:1 for text (AA normal), ≥ 3:1 for UI components\n');

const rows = PAIRS.map(([fg, bg, label]) => {
  const ratio = contrastRatio(fg, bg);
  const passAA = ratio >= 4.5;
  const passUI = ratio >= 3.0;
  if (!passAA) allPass = false;
  return { label, fg, bg, ratio, passAA, passUI };
});

// Print table
const maxLen = Math.max(...rows.map(r => r.label.length));
rows.forEach(({ label, fg, bg, ratio, passAA }) => {
  const status = passAA ? '✓ AA' : '✗ FAIL';
  const padded = label.padEnd(maxLen + 2);
  console.log(`${status}  ${ratio.toFixed(2).padStart(5)}:1  ${padded}  ${fg} on ${bg}`);
});

console.log('\n' + '─'.repeat(70));
if (allPass) {
  console.log('✓ All pairs pass WCAG AA (≥ 4.5:1 for text)\n');
} else {
  const fails = rows.filter(r => !r.passAA);
  console.log(`✗ ${fails.length} pair(s) fail WCAG AA. Fix in docs/DESIGN.md and global.css.\n`);
  process.exit(1);
}
