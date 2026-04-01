/**
 * In-worker frame batch registry.
 *
 * The main thread extracts video frames as ImageBitmap objects (using a
 * <video> + <canvas> pipeline) and transfers them to the worker.  The worker
 * stores each batch here under a caller-assigned batchId so that subsequent
 * PARSE_* messages can look them up by that id.
 *
 * Lifecycle
 * ─────────
 * • registerFrameBatch() must be called before dispatching a PARSE_* message.
 * • releaseFrameBatch() must be called once a batch has been fully consumed
 *   so that each ImageBitmap's GPU/CPU memory is returned to the system.
 * • clearAllBatches() should be called when the worker is about to terminate.
 */

export interface FrameBatch {
  batchId: string
  sourceVideoId: string
  /** Extracted video frames in display order. */
  frames: ImageBitmap[]
}

const registry = new Map<string, FrameBatch>()

/** Store a frame batch in the worker-local registry. */
export function registerFrameBatch(batch: FrameBatch): void {
  registry.set(batch.batchId, batch)
}

/** Retrieve a previously registered batch, or undefined if not found. */
export function getFrameBatch(batchId: string): FrameBatch | undefined {
  return registry.get(batchId)
}

/**
 * Close and remove a batch from the registry.
 * Calling close() on each ImageBitmap releases the associated resources.
 */
export function releaseFrameBatch(batchId: string): void {
  const batch = registry.get(batchId)
  if (!batch) return
  for (const frame of batch.frames) {
    frame.close()
  }
  registry.delete(batchId)
}

/** Release all registered batches (e.g. when the worker is being terminated). */
export function clearAllBatches(): void {
  for (const batchId of [...registry.keys()]) {
    releaseFrameBatch(batchId)
  }
}

/** Returns the number of batches currently held in the registry. */
export function batchCount(): number {
  return registry.size
}
