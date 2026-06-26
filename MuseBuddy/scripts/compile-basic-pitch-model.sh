#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly RESOURCES_DIR="${APP_DIR}/modules/basic-pitch/ios/Resources"
readonly SOURCE_MODEL="${RESOURCES_DIR}/nmp.mlpackage"
readonly COMPILED_MODEL="${RESOURCES_DIR}/nmp.mlmodelc"
readonly COMPILED_MODEL_BIN="${COMPILED_MODEL}/coremldata.bin"
readonly DEPLOYMENT_TARGET="15.1"

command -v xcrun >/dev/null || {
  printf 'error: Xcode command-line tools are required to compile the Basic Pitch model.\n' >&2
  exit 1
}

if [[ ! -d "${SOURCE_MODEL}" ]]; then
  printf 'error: Missing Basic Pitch source model: %s\n' "${SOURCE_MODEL}" >&2
  exit 1
fi

if [[ -f "${COMPILED_MODEL_BIN}" ]]; then
  printf 'Basic Pitch model already compiled: %s\n' "${COMPILED_MODEL}"
  exit 0
fi

readonly TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/musebuddy-basic-pitch-model.XXXXXX")"
trap 'rm -rf "${TEMP_DIR}"' EXIT

xcrun coremlcompiler compile \
  "${SOURCE_MODEL}" \
  "${TEMP_DIR}" \
  --platform iOS \
  --deployment-target "${DEPLOYMENT_TARGET}" >/dev/null

if [[ ! -d "${TEMP_DIR}/nmp.mlmodelc" ]]; then
  printf 'error: Core ML compiler did not create nmp.mlmodelc.\n' >&2
  exit 1
fi

rm -rf "${COMPILED_MODEL}"
ditto "${TEMP_DIR}/nmp.mlmodelc" "${COMPILED_MODEL}"

printf 'Compiled Basic Pitch model: %s\n' "${COMPILED_MODEL}"
