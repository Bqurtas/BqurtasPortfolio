// Optional macOS maintenance command; normal Node/CI builds use the committed
// posters. Run from the repository root after adding or replacing a video:
// swift -module-cache-path /tmp/bq-swift-cache scripts/generate-video-posters.swift
import Foundation
import AVFoundation
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let manifestURL = root.appendingPathComponent("preview_site/assets/gallery-manifest.json")
let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: manifestURL)) as! [String: Any]
let records = manifest["videos"] as! [[String: Any]]
let output = root.appendingPathComponent("preview_site/assets/video-posters")
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for record in records {
    guard let name = record["path"] as? String,
          name.range(of: "^Videos/Videos[1-9][0-9]*\\.mp4$", options: .regularExpression) != nil else {
        fatalError("Unexpected video path")
    }
    let asset = AVURLAsset(url: root.appendingPathComponent(name))
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: 960, height: 960)
    // Step past short fades and title lead-ins, using a real frame from this
    // clip rather than a generic cover. Keep short videos within their duration.
    let duration = CMTimeGetSeconds(asset.duration)
    let seconds = duration.isFinite && duration > 0 ? min(duration / 2, min(10, max(1, duration / 4))) : 1
    let image = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
    let stem = URL(fileURLWithPath: name).deletingPathExtension().lastPathComponent
    let destination = output.appendingPathComponent(stem + ".jpg")
    guard let writer = CGImageDestinationCreateWithURL(destination as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
        fatalError("Cannot write poster for \(name)")
    }
    CGImageDestinationAddImage(writer, image, [kCGImageDestinationLossyCompressionQuality: 0.84] as CFDictionary)
    guard CGImageDestinationFinalize(writer) else { fatalError("Cannot finish poster for \(name)") }
    print("\(name) → \(destination.lastPathComponent) (\(image.width)×\(image.height))")
}
