import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';

import {
  museBuddyBorders,
  museBuddyColors,
  museBuddyRadii,
  museBuddyShadows,
} from './src/constants/design-tokens';

const museBuddyTokens = {
  ...defaultConfig.tokens,
  radius: {
    ...defaultConfig.tokens.radius,
    small: museBuddyRadii.small,
    medium: museBuddyRadii.medium,
    large: museBuddyRadii.large,
    round: museBuddyRadii.round,
  },
  space: {
    ...defaultConfig.tokens.space,
    shadowSmall: museBuddyShadows.dropSmall.y,
    shadowMedium: museBuddyShadows.dropMedium.y,
    borderBold: museBuddyBorders.bold,
    borderExtraBold: museBuddyBorders.extraBold,
  },
} as const;

const lightTheme = {
  ...defaultConfig.themes.light,
  background: museBuddyColors.background,
  backgroundHover: museBuddyColors.surface,
  backgroundPress: museBuddyColors.surfaceMuted,
  backgroundFocus: museBuddyColors.surface,
  color: museBuddyColors.ink,
  colorHover: museBuddyColors.ink,
  colorPress: museBuddyColors.ink,
  colorFocus: museBuddyColors.ink,
  borderColor: museBuddyColors.ink,
  borderColorHover: museBuddyColors.ink,
  borderColorPress: museBuddyColors.ink,
  borderColorFocus: museBuddyColors.ink,
  placeholderColor: '#6b5f52',
  shadowColor: museBuddyColors.ink,
  primary: museBuddyColors.primary,
  ink: museBuddyColors.ink,
  surface: museBuddyColors.surface,
  surfaceMuted: museBuddyColors.surfaceMuted,
  accentRed: museBuddyColors.accentRed,
  accentGreen: museBuddyColors.accentGreen,
  accentBlue: museBuddyColors.accentBlue,
  accentPurple: museBuddyColors.accentPurple,
} as const;

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: museBuddyTokens,
  themes: {
    ...defaultConfig.themes,
    light: lightTheme,
  },
});

export type MuseBuddyTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends MuseBuddyTamaguiConfig {}
}

export {
  museBuddyBorders,
  museBuddyColors,
  museBuddyRadii,
  museBuddyShadows,
} from './src/constants/design-tokens';

export default tamaguiConfig;
