require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "..", "package.json")))

Pod::Spec.new do |s|
  s.name           = "BasicPitch"
  s.version        = package["version"]
  s.summary        = "On-device piano transcription using Spotify Basic Pitch."
  s.description    = "An iOS-only local Expo module for recording audio and running Basic Pitch with Core ML."
  s.license        = { :type => "Apache-2.0", :file => "LICENSE" }
  s.author         = "MuseBuddy"
  s.homepage       = "https://github.com/spotify/basic-pitch"
  s.platforms      = { :ios => "15.1" }
  s.swift_version  = "5.9"
  s.source         = { :path => "." }
  s.static_framework = true

  s.dependency "ExpoModulesCore"

  s.source_files = "ios/**/*.swift"

  source_model = "ios/Resources/nmp.mlpackage"
  compiled_model = "ios/Resources/nmp.mlmodelc"
  compiled_model_bin = "#{compiled_model}/coremldata.bin"

  s.prepare_command = <<-CMD
    set -eu

    if [ ! -d "#{source_model}" ]; then
      echo "error: Missing Basic Pitch source model at #{source_model}" >&2
      exit 1
    fi

    if [ -f "#{compiled_model_bin}" ]; then
      echo "Basic Pitch model already compiled at #{compiled_model}"
      exit 0
    fi

    rm -rf "#{compiled_model}"
    xcrun coremlcompiler compile "#{source_model}" "ios/Resources" --platform iOS --deployment-target 15.1 >/dev/null
  CMD

  s.resources = [
    compiled_model,
    "LICENSE",
    "NOTICE"
  ]
end
