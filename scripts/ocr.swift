// OCR the mockup with Apple's Vision framework.
// Prints recognised text with bounding boxes so the page structure can be rebuilt.
import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: path),
      let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let cgImage = rep.cgImage else {
    FileHandle.standardError.write("could not load image\n".data(using: .utf8)!)
    exit(1)
}

let W = Double(cgImage.width)
let H = Double(cgImage.height)

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-US"]
request.minimumTextHeight = 0.004

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

guard let observations = request.results else { exit(0) }

struct Line {
    let text: String
    let confidence: Float
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let top: Double
}

var lines: [Line] = []
for obs in observations {
    guard let best = obs.topCandidates(1).first else { continue }
    let b = obs.boundingBox
    lines.append(Line(
        text: best.string,
        confidence: best.confidence,
        x: b.origin.x * W,
        y: b.origin.y * H,
        w: b.size.width * W,
        h: b.size.height * H,
        top: (1 - b.origin.y - b.size.height) * H
    ))
}

lines.sort { $0.top < $1.top }

// Group into visual rows (overlapping vertical bands), then sort left-to-right.
var rows: [[Line]] = []
for line in lines {
    var placed = false
    for i in rows.indices {
        let rowTop = rows[i].map(\.top).min() ?? 0
        let rowBottom = rows[i].map { $0.top + $0.h }.max() ?? 0
        if line.top < rowBottom + 6 && line.top + line.h > rowTop - 6 {
            rows[i].append(line)
            placed = true
            break
        }
    }
    if !placed { rows.append([line]) }
}

for row in rows.sorted(by: { ($0.map(\.top).min() ?? 0) < ($1.map(\.top).min() ?? 0) }) {
    let sorted = row.sorted { $0.x < $1.x }
    let top = sorted.map(\.top).min() ?? 0
    let left = sorted.map(\.x).min() ?? 0
    let parts = sorted.map { "\"\($0.text)\"" }.joined(separator: " | ")
    print(String(format: "y=%6.0f (%.1f%%)  x=%5.0f (%.1f%%)  h=%3.0f  %@",
                 top, 100 * top / H, left, 100 * left / W, sorted.map(\.h).max() ?? 0, parts))
}
