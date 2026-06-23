#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly MODEL_PATH="${APP_DIR}/modules/basic-pitch/ios/Resources/nmp.mlpackage"
readonly MODULE_CONFIG="${APP_DIR}/modules/basic-pitch/expo-module.config.json"
readonly SWIFT_DIAGNOSTIC="${SCRIPT_DIR}/diagnose-basic-pitch.swift"
readonly SPOTIFY_BASIC_PITCH_COMMIT="fa5997af0a8210982619003269994a1be25eddf3"
readonly EXPECTED_MANIFEST_SHA256="c1fa5ef8acc34703edcd4e90e9a8640bd4673d9f3a68753c3b9d1ca0365e2928"
readonly EXPECTED_MODEL_SHA256="af7bf7d49bc167e0bf0c30aa2ca6b432c3e10df048d2dd4173ff3a738c020858"
readonly EXPECTED_WEIGHTS_SHA256="691a6b63c7ddcdde0ee131ff3986dcb1250df47cd738612efde966ba9b4c99cd"
readonly SWIFT_CACHE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/musebuddy-basic-pitch.XXXXXX")"

trap 'rm -rf "${SWIFT_CACHE_DIR}"' EXIT

pass() {
  printf 'PASS: %s\n' "$1"
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

check_hash() {
  local relative_path="$1"
  local expected_hash="$2"
  local actual_hash

  actual_hash="$(shasum -a 256 "${MODEL_PATH}/${relative_path}" | awk '{print $1}')"
  if [[ "${actual_hash}" != "${expected_hash}" ]]; then
    fail "${relative_path} differs from Spotify basic-pitch ${SPOTIFY_BASIC_PITCH_COMMIT} (${actual_hash})"
  fi
  pass "${relative_path} matches Spotify basic-pitch ${SPOTIFY_BASIC_PITCH_COMMIT}"
}

command -v pnpm >/dev/null || fail "pnpm is not installed"
command -v xcrun >/dev/null || fail "Xcode command-line tools are not installed"
command -v swift >/dev/null || fail "Swift is not installed"
[[ -d "${MODEL_PATH}" ]] || fail "Missing model package at ${MODEL_PATH}"
[[ -f "${MODULE_CONFIG}" ]] || fail "Missing Expo module configuration"

cd "${APP_DIR}"

printf 'Basic Pitch host diagnostic\n'
printf 'App: %s\n' "${APP_DIR}"
printf 'Model: %s\n\n' "${MODEL_PATH}"

check_hash "Manifest.json" "${EXPECTED_MANIFEST_SHA256}"
check_hash "Data/com.apple.CoreML/model.mlmodel" "${EXPECTED_MODEL_SHA256}"
check_hash "Data/com.apple.CoreML/weights/weight.bin" "${EXPECTED_WEIGHTS_SHA256}"

metadata="$(xcrun coremlcompiler metadata "${MODEL_PATH}")"
grep -q '"name" : "input_2"' <<<"${metadata}" || fail "Core ML input input_2 is missing"
grep -q 'Float32 1 × 43844 × 1' <<<"${metadata}" || fail "input_2 shape is not [1, 43844, 1]"
grep -q '"name" : "Identity_1"' <<<"${metadata}" || fail "Identity_1 note output is missing"
grep -q '"name" : "Identity_2"' <<<"${metadata}" || fail "Identity_2 onset output is missing"
pass "Core ML metadata has the expected Basic Pitch interface"

autolinking_json="$(pnpm exec expo-modules-autolinking resolve --platform apple --json)"
if ! grep -Eq '"packageName"[[:space:]]*:[[:space:]]*"basic-pitch"' <<<"${autolinking_json}"; then
  fail "Expo autolinking does not resolve basic-pitch; check apple.podspecPath"
fi
if ! grep -Eq '"class"[[:space:]]*:[[:space:]]*"BasicPitchModule"' <<<"${autolinking_json}"; then
  fail "Expo autolinking does not register BasicPitchModule"
fi
pass "Expo autolinking resolves BasicPitchModule"

if [[ -f "ios/Pods/Target Support Files/Pods-MuseBuddy/ExpoModulesProvider.swift" ]]; then
  if grep -q 'BasicPitchModule.self' \
    "ios/Pods/Target Support Files/Pods-MuseBuddy/ExpoModulesProvider.swift"; then
    pass "Generated iOS provider includes BasicPitchModule"
  else
    printf '%s\n' \
      "STALE: Generated iOS provider does not include BasicPitchModule." \
      "       Run pnpm build before the next simulator/device test."
  fi
else
  printf '%s\n' \
    "INFO: No generated iOS provider exists yet." \
    "      Run pnpm build before the next simulator/device test."
fi

xcrun coremlcompiler compile \
  "${MODEL_PATH}" \
  "${SWIFT_CACHE_DIR}" \
  --platform macOS \
  --deployment-target 12.0 >/dev/null
readonly COMPILED_MODEL_PATH="${SWIFT_CACHE_DIR}/nmp.mlmodelc"
[[ -d "${COMPILED_MODEL_PATH}" ]] || fail "Core ML compiler did not produce nmp.mlmodelc"
pass "Core ML compiled the package for macOS"

HOME="${SWIFT_CACHE_DIR}" XDG_CACHE_HOME="${SWIFT_CACHE_DIR}" \
  swift -module-cache-path "${SWIFT_CACHE_DIR}" "${SWIFT_DIAGNOSTIC}" "${COMPILED_MODEL_PATH}"

printf '\nSpotify helper constants checked by this diagnostic:\n'
printf '  sample rate: 22050 Hz\n'
printf '  input samples: 43844\n'
printf '  overlap: 30 frames / 7680 samples\n'
printf '  hop: 36164 samples\n'
printf '  retained output: 142 frames per window\n'
printf '\nHost diagnosis completed successfully.\n'
