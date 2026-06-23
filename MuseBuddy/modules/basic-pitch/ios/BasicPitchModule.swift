import ExpoModulesCore

public final class BasicPitchModule: Module {
  private let service = BasicPitchService()

  public func definition() -> ModuleDefinition {
    Name("BasicPitch")

    Events("onRecordingProgress", "onRecordingFinished")

    OnCreate {
      self.service.onProgress = { [weak self] progress in
        self?.sendEvent("onRecordingProgress", progress)
      }
      self.service.onRecordingFinished = { [weak self] recording in
        self?.sendEvent("onRecordingFinished", recording)
      }
    }

    OnDestroy {
      self.service.onProgress = nil
      self.service.onRecordingFinished = nil
    }

    AsyncFunction("initialize") { () async throws -> Void in
      do {
        try await self.service.initialize()
      } catch let error as BasicPitchError {
        throw BasicPitchException(error)
      }
    }

    AsyncFunction("startRecording") { () async throws -> Void in
      do {
        try await self.service.startRecording()
      } catch let error as BasicPitchError {
        throw BasicPitchException(error)
      }
    }

    AsyncFunction("stopRecording") { () async throws -> RecordingArtifactRecord in
      do {
        return try await self.service.stopRecording()
      } catch let error as BasicPitchError {
        throw BasicPitchException(error)
      }
    }

    AsyncFunction("transcribeRecording") { () async throws -> TranscriptionResultRecord in
      do {
        return try await self.service.transcribeRecording()
      } catch let error as BasicPitchError {
        throw BasicPitchException(error)
      }
    }

    AsyncFunction("cancelRecording") { () async throws -> Void in
      do {
        try await self.service.cancelRecording()
      } catch let error as BasicPitchError {
        throw BasicPitchException(error)
      }
    }
  }
}
