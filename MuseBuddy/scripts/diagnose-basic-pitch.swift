import CoreML
import Foundation

private enum DiagnosticError: LocalizedError {
  case invalidArguments
  case missingFeature(String)
  case unexpectedShape(name: String, actual: [Int], expected: [Int])
  case nonFiniteOutput(String)

  var errorDescription: String? {
    switch self {
    case .invalidArguments:
      return "Usage: swift diagnose-basic-pitch.swift /path/to/nmp.mlpackage"
    case .missingFeature(let name):
      return "The model feature '\(name)' is missing."
    case .unexpectedShape(let name, let actual, let expected):
      return "\(name) has shape \(actual), expected \(expected)."
    case .nonFiniteOutput(let name):
      return "\(name) contains a NaN or infinite value."
    }
  }
}

private struct TensorSummary {
  let minimum: Float
  let maximum: Float
  let mean: Float
}

private func shape(of array: MLMultiArray) -> [Int] {
  array.shape.map(\.intValue)
}

private func validateShape(
  _ array: MLMultiArray,
  name: String,
  expected: [Int]
) throws {
  let actual = shape(of: array)
  guard actual == expected else {
    throw DiagnosticError.unexpectedShape(name: name, actual: actual, expected: expected)
  }
}

private func summarize(_ array: MLMultiArray, name: String) throws -> TensorSummary {
  var minimum = Float.greatestFiniteMagnitude
  var maximum = -Float.greatestFiniteMagnitude
  var sum: Double = 0

  for index in 0..<array.count {
    let value = array[index].floatValue
    guard value.isFinite else {
      throw DiagnosticError.nonFiniteOutput(name)
    }
    minimum = min(minimum, value)
    maximum = max(maximum, value)
    sum += Double(value)
  }

  return TensorSummary(
    minimum: minimum,
    maximum: maximum,
    mean: Float(sum / Double(array.count))
  )
}

private func makeSineInput() throws -> MLMultiArray {
  let sampleRate: Float = 22_050
  let sampleCount = 43_844
  let frequency: Float = 440
  let input = try MLMultiArray(
    shape: [1, NSNumber(value: sampleCount), 1],
    dataType: .float32
  )
  let samples = input.dataPointer.bindMemory(to: Float.self, capacity: sampleCount)

  for index in 0..<sampleCount {
    let time = Float(index) / sampleRate
    samples[index] = 0.2 * sin(2 * .pi * frequency * time)
  }
  return input
}

private func run() throws {
  guard CommandLine.arguments.count == 2 else {
    throw DiagnosticError.invalidArguments
  }

  let compiledURL = URL(fileURLWithPath: CommandLine.arguments[1])

  let configuration = MLModelConfiguration()
  configuration.computeUnits = .cpuOnly
  let model = try MLModel(contentsOf: compiledURL, configuration: configuration)

  guard
    let inputDescription = model.modelDescription.inputDescriptionsByName["input_2"],
    let inputConstraint = inputDescription.multiArrayConstraint
  else {
    throw DiagnosticError.missingFeature("input_2")
  }
  let inputShape = inputConstraint.shape.map(\.intValue)
  guard inputShape == [1, 43_844, 1] else {
    throw DiagnosticError.unexpectedShape(
      name: "input_2",
      actual: inputShape,
      expected: [1, 43_844, 1]
    )
  }

  let provider = try MLDictionaryFeatureProvider(dictionary: [
    "input_2": MLFeatureValue(multiArray: try makeSineInput())
  ])
  let prediction = try model.prediction(from: provider)
  let expectedOutputs: [(String, [Int])] = [
    ("Identity", [1, 172, 264]),
    ("Identity_1", [1, 172, 88]),
    ("Identity_2", [1, 172, 88]),
  ]

  print("PASS: Core ML compiled and loaded the model on macOS")
  for (name, expectedShape) in expectedOutputs {
    guard let array = prediction.featureValue(for: name)?.multiArrayValue else {
      throw DiagnosticError.missingFeature(name)
    }
    try validateShape(array, name: name, expected: expectedShape)
    let summary = try summarize(array, name: name)
    print(
      "PASS: \(name) shape \(expectedShape), "
        + "range \(summary.minimum)...\(summary.maximum), mean \(summary.mean)"
    )
  }
}

do {
  try run()
} catch {
  let message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
  FileHandle.standardError.write(Data("FAIL: \(message)\n".utf8))
  exit(1)
}
