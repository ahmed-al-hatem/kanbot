/**
 * A lazy route or component whose chunk can't be fetched (plan §9.3): usually a deploy replaced
 * the hashed files this tab was built against, sometimes the network dropped. Browsers word it
 * differently, and Vite's CSS preload has its own message.
 */
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (?:CSS )?chunk [\w-]+ failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'ChunkLoadError' || CHUNK_ERROR.test(error.message);
}

/** Full reload: fetches the new index.html and the chunks it names. */
export function reloadPage() {
  window.location.reload();
}
