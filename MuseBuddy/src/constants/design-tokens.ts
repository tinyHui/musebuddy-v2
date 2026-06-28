export const museBuddyColors = {
  background: '#fff3c7',
  primary: '#ffb347',
  ink: '#201b22',
  surface: '#fff8e8',
  surfaceMuted: '#f4ead5',
  accentRed: '#ff5a5f',
  accentGreen: '#2ecc71',
  accentBlue: '#2f80ed',
  accentPurple: '#9b5de5',
  white: '#ffffff',
} as const;

export const museBuddyRadii = {
  small: 6,
  medium: 8,
  large: 10,
  round: 999,
} as const;

export const museBuddyBorders = {
  bold: 4,
  extraBold: 5,
} as const;

export const museBuddyShadows = {
  dropSmall: {
    x: 0,
    y: 4,
    blur: 0,
    color: museBuddyColors.ink,
  },
  dropMedium: {
    x: 0,
    y: 8,
    blur: 0,
    color: museBuddyColors.ink,
  },
} as const;

export const museBuddyTypography = {
  body: 'system-ui',
  rounded: 'ui-rounded',
  mono: 'ui-monospace',
} as const;
