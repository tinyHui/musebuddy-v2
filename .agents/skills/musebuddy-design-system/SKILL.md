---
name: musebuddy-design-system
description: Use when changing MuseBuddy UI styling, theme tokens, Tamagui configuration, component visuals, interaction states, or design-system documentation. Defines the game-like bold vivid design direction, color system, typography, shadows, component feel, and visual review process.
license: MIT
---

# MuseBuddy Design System

## When to Use

Use this skill before changing MuseBuddy UI styling, layout density, Tamagui config,
theme tokens, component visuals, or interaction states. Pair it with the engineering guide
in `AGENTS.md`; this skill owns design direction, while `AGENTS.md` owns app constraints
and command policy.

## Product Mood

MuseBuddy should feel like a playful piano-learning game: bold, vivid, tactile, cheerful,
and focused. The UI should make practice feel rewarding without turning transcription data
into a toy. Use the current `src/components/piano-keyboard/piano-keyboard.tsx` as the
visual anchor: thick dark outlines, cream keys, vivid markers, chunky rounded corners, and
strong dropped shadows.

The target feeling is:

- game-like and friendly, closer to Duolingo-style practice than a productivity dashboard;
- bold and high-contrast, with clear readable music data;
- vivid and warm, using saturated accents against a rice-yellow background;
- tactile, where important controls look pressable and physical;
- simple and focused, never decorative at the expense of recording/transcription clarity.

Avoid delicate gray UI, faint dividers, thin borders, low-contrast panels, glassy surfaces,
marketing-page composition, and muted enterprise dashboard styling.

## Color

Use these core colors as the source of truth:

| Role | Hex | Use |
| --- | --- | --- |
| Rice yellow background | `#FFF3C7` | App background and large empty areas |
| Light orange primary | `#FFB347` | Primary actions, active states, warm emphasis |
| Ink | `#201B22` | Text, thick borders, icon strokes, shadows |
| Cream surface | `#FFF8E8` | Cards, panels, keys, raised surfaces |
| Muted cream | `#F4EAD5` | Secondary fills, separators, key highlights |
| Vivid red | `#FF5A5F` | Root notes, destructive/stop/error states |
| Vivid green | `#2ECC71` | Success, ready, detected, positive confidence |
| Vivid blue | `#2F80ED` | Secondary selected notes, links, informational focus |
| Vivid purple | `#9B5DE5` | Musical accents, alternate highlights, special states |

Use the rice-yellow background broadly, then layer cream surfaces and vivid accents. Do not
let the screen become a single orange/yellow palette: every major screen should have at
least one purposeful vivid accent when interaction or state calls for it.

Text and borders should usually be ink. White text is allowed on vivid filled buttons only
when contrast is strong. Red/green/blue/purple should communicate state or musical grouping,
not random decoration.

## Typography

Use rounded system typography. Prefer the platform rounded/system family over bundling fonts
unless the task explicitly asks for custom font assets.

- Headings: bold, confident, compact, and readable.
- Body: clear, medium weight where useful, never tiny for primary workflows.
- Labels: short and direct; use bold labels for controls and state badges.
- Musical timing, duration, confidence, counts, and metronome values: use tabular numerals.
- Avoid thin weights and oversized hero text inside app workflows.

## Shape, Borders, and Shadows

The design language is chunky and physical.

- Borders: use thick ink borders, usually 4px; use 5px for highly visual objects like piano
  keys or primary game surfaces.
- Radius: prefer 6-10px rounded corners. Use capsules only for pills, badges, and compact
  controls that naturally need them.
- Shadows: dropped shadows must fall on the bottom side only. Use zero horizontal offset and
  positive vertical offset. Do not create shadows that extend to the right.
- Shadow color: ink. Keep shadows crisp and graphic rather than soft, blurred, or realistic.
- Pressed state: reduce or remove the downward shadow and move the surface down slightly.

Good shadow direction:

```tsx
boxShadow: '0 6px 0 #201B22'
```

Avoid:

```tsx
boxShadow: '6px 6px 0 #201B22'
```

## Components

Buttons should look tappable: filled light orange or vivid accent, thick ink border, bold
label, and bottom-only drop shadow. Disabled buttons should keep structure but reduce fill
contrast, not disappear into pale gray.

Panels and cards should be cream surfaces with thick ink borders. Use cards for actual
grouped content, repeated items, or framed tools; avoid nesting cards inside cards.

Badges and status chips should use vivid fills and ink borders. Keep text short enough to
fit on small iPhone widths.

Music-specific visuals such as keyboards, note markers, meters, and timing rows should feel
like game pieces: clear silhouettes, strong outlines, readable values, and state colors that
map consistently to musical meaning.

## Layout

MuseBuddy is an iOS transcription app, not a landing page. Keep screens focused around the
active workflow: load model, record, finish, transcribe, inspect notes.

- Use generous touch targets for recording controls.
- Use vertical rhythm and clear grouping so note data stays scannable.
- Prefer direct controls over explanatory in-app text.
- Keep route files thin and put screen composition in `src/pages/` when adding pages.
- Do not add accounts, cloud features, history, export flows, or elaborate decorative UI
  unless the user explicitly asks.

## Tamagui Implementation

Use Tamagui tokens and themes for new UI. Reuse shared MuseBuddy tokens from
`src/constants/design-tokens.ts` when code cannot consume Tamagui props directly, such as
SVG components.

Before implementing UI:

1. Inspect existing nearby components and `piano-keyboard.tsx`.
2. Choose or add tokens first.
3. Build with the mood, colors, type, borders, and shadow rules above.
4. Verify text fit, contrast, touch target size, pressed/disabled states, and bottom-only
   shadow direction.

Do not migrate unrelated components to Tamagui during a narrow task. Keep changes scoped to
the requested component or workflow.

## Review Checklist

Before calling UI work complete, check:

- The screen feels game-like, bold, vivid, and tactile.
- Primary surfaces use thick ink borders and bottom-only shadows.
- Shadows have no rightward offset.
- Rice yellow, cream, light orange, and vivid accents are balanced.
- Text is readable and fits on small iPhone widths.
- Important note/timing/confidence data uses clear hierarchy and tabular numerals.
- UI states are explicit for loading, permission denial, recording, transcription failure,
  disabled controls, and success where applicable.
- The work respects MuseBuddy's iOS-only Expo development-client constraints.
