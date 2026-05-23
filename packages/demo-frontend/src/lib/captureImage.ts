/**
 * Demo image source. For the hackathon we either:
 *   - try to grab a frame from getUserMedia (real camera on dev laptops), or
 *   - fall back to a deterministic synthetic PNG so the demo never blocks
 *     on permissions in front of judges.
 */

export async function captureDemoImage(): Promise<Blob> {
  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: true});
      const track = stream.getVideoTracks()[0];
      if (track && "ImageCapture" in window) {
        const ImageCaptureCtor = (window as unknown as {ImageCapture: new (track: MediaStreamTrack) => {takePhoto: () => Promise<Blob>}}).ImageCapture;
        const capture = new ImageCaptureCtor(track);
        const blob = await capture.takePhoto();
        track.stop();
        return blob;
      }
      track?.stop();
    } catch (err) {
      console.warn("[capture] getUserMedia failed, using synthetic image", err);
    }
  }
  return synthesizePng();
}

/**
 * Generate a tiny PNG (1x1 cyan pixel) as a Blob. This is deterministic across
 * runs so the demo always succeeds on the L2 confidence stub.
 */
async function synthesizePng(): Promise<Blob> {
  // 1x1 cyan PNG (encoded by hand to avoid pulling in canvas).
  const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVQIW2NkYGD4z8AAxAAEAAH/AeMTBNMAAAAASUVORK5CYII=";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], {type: "image/png"});
}
