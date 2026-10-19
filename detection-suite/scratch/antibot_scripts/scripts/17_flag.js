/**
 * DetectExpert Pro Extracted Script
 * Target: https://anti.bot/static/js/flag.js?v=1328a45ec42b
 * Detected Engine: Unknown
 * Vectors Invoked: 
 */

'use strict';

function countryCodeToFlagImg(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized === 'N/A') return 'N/A';
  if (!/^[A-Z]{2}$/.test(normalized)) return '';
  const flag = [...normalized]
    .map(letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join('');
  return `<span class="flag-wrapper flag-wrapper--emoji" role="img" aria-label="${normalized} flag">${flag}</span>`;
}
