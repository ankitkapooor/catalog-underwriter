export const money = (value: number, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: digits,
  }).format(value);

export const percent = (value: number, digits = 1) =>
  `${(value * 100).toFixed(digits)}%`;

export const count = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

/** Signed compact dollars, e.g. "+$84M" or "−$12M". */
export const signedMoney = (value: number) =>
  `${value >= 0 ? '+' : '−'}${money(Math.abs(value))}`;
