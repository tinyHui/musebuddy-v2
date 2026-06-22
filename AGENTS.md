# MuseBuddy Engineering Guide

## What We Are Building

MuseBuddy is an Expo/React Native iOS app for piano transcription. The initial product:

- loads Spotify's Basic Pitch Core ML model when the app starts;
- records microphone input after the user presses Start;
- transcribes the recording on-device after the user presses Finish; and
- displays detected notes with timing, duration, pitch, and confidence.

Keep the first version focused. Do not add accounts, cloud processing, recording history, MIDI export, or elaborate visual design unless the task explicitly requires them.

The app currently targets Expo SDK 56. Check the matching versioned Expo documentation before changing Expo APIs or native integration:
https://docs.expo.dev/versions/v56.0.0/

## Development Client Requirement

Do not run MuseBuddy in Expo Go. The app targets Expo SDK 56 and uses a local Swift/Core ML
module, which Expo Go cannot load regardless of the Expo Go version. In particular, Expo Go
54.0.2 is incompatible with this SDK 56 project. Do not downgrade the project to SDK 54 to
work around this; doing so still would not provide the custom native module.

Use the installed `expo-dev-client` package and an iOS development build:

```sh
cd MuseBuddy

# Prebuild, then build and install on the default iOS simulator.
pnpm build

# Prebuild, then choose a connected physical device.
pnpm build --device

# Target a specific physical device or simulator by name or UDID.
pnpm build --device "iPhone 17 Pro"

# After the development client is installed, start Metro for it.
pnpm start
```

Expo's iOS command does not provide a `--emulator` flag. Omit `--device` to use the
default simulator, or pass a simulator name to `--device`.

`pnpm start` intentionally runs `expo start --dev-client`. Do not replace it with plain
`expo start`, `expo start --go`, or an `npx` command.

When native dependencies, Swift code, Core ML resources, config plugins, or `app.json`
native settings change, rebuild the client with `pnpm build` and the appropriate device
argument. A Metro reload is sufficient only for JavaScript/TypeScript changes.

## Project Structure

- `MuseBuddy/`: the Expo application and package-management root.
- `MuseBuddy/src/app/`: Expo Router routes and layouts only.
- `MuseBuddy/src/components/`: reusable React Native UI components.
- `MuseBuddy/src/hooks/`: shared React hooks.
- `MuseBuddy/src/constants/`: themes, configuration, and shared constants.
- `MuseBuddy/assets/`: images and other app assets.
- `MuseBuddy/modules/`: local Expo native modules, including Swift/Core ML code.

Keep business logic, types, and utilities outside `MuseBuddy/src/app/`. Inside the app,
use the `@/` TypeScript alias for imports from `MuseBuddy/src/`.

Do not edit generated native projects as the source of truth. Native configuration should
live in `MuseBuddy/app.json`, config plugins, or local Expo modules so it survives
`expo prebuild`.

## Package and Command Policy

Use pnpm exclusively:

- Run package-management and app commands from `MuseBuddy/`, not the repository root.
- Install dependencies with `pnpm add <package>`.
- Install development dependencies with `pnpm add -D <package>`.
- Remove dependencies with `pnpm remove <package>`.
- Run package scripts with `pnpm <script>`.
- Run one-off package CLIs with `pnpm dlx <package> ...`; do not use `npx`.
- Keep `pnpm-lock.yaml` updated and commit it with dependency changes.
- Do not introduce npm or Yarn lockfiles.

Use Expo-compatible versions when adding Expo or React Native packages. Prefer
`pnpm dlx expo install <package>` when Expo must select the compatible version.

From the repository root, either change directory first:

```sh
cd MuseBuddy
pnpm <script>
```

or target the app explicitly for package scripts:

```sh
pnpm --dir MuseBuddy <script>
```

## Code Standards

- Use strict TypeScript and avoid `any`.
- Use functional React components and hooks.
- Use kebab-case filenames.
- Keep platform-specific native behavior in the local Expo module behind typed TypeScript interfaces.
- Keep UI simple, accessible, and responsive.
- Handle permission denial, model-loading failures, recording failures, and transcription failures explicitly.
- Never perform Core ML inference or heavy audio processing on the main thread.

## Required Checks

After every code change, run:

```sh
cd MuseBuddy
pnpm format:check
pnpm lint
pnpm typecheck
```

Use `pnpm --dir MuseBuddy check` from the repository root, or `pnpm check` from
`MuseBuddy/`, to run all required checks together. Run `pnpm format` from `MuseBuddy/`
first when formatting needs correction.

For changes to Swift, Core ML resources, app configuration, or local Expo modules, also
regenerate/build the iOS development project from `MuseBuddy/` using `pnpm build` and
verify it compiles.

Do not consider work complete while an applicable check is failing. If a check cannot run, report the exact blocker and the checks that remain unverified.
