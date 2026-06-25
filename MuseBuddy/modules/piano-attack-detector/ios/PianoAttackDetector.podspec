Pod::Spec.new do |s|
  s.name           = 'PianoAttackDetector'
  s.version        = '1.0.0'
  s.summary        = 'Real-time piano attack detection for MuseBuddy.'
  s.description    = 'An iOS-only local Expo module for detecting sudden piano attacks from microphone input.'
  s.author         = 'MuseBuddy'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
