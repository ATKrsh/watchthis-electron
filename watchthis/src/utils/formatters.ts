export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes >= 1000 * 1000 * 1000 * 1000) {
    const tb = bytes / (1000 * 1000 * 1000 * 1000);
    return `${tb >= 10 ? tb.toFixed(1) : tb.toFixed(2)} TB`;
  }
  if (bytes >= 1000 * 1000 * 1000) {
    return `${(bytes / (1000 * 1000 * 1000)).toFixed(1)} GB`;
  }
  if (bytes >= 1000 * 1000) {
    return `${(bytes / (1000 * 1000)).toFixed(1)} MB`;
  }
  if (bytes >= 1000) {
    return `${(bytes / 1000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatBitrate(bytes: number, durationSec: number): string {
  if (!bytes || !durationSec || durationSec <= 0) return 'N/A';
  const bitsPerSec = (bytes * 8) / durationSec;
  const mbps = bitsPerSec / (1000 * 1000);
  return `${mbps.toFixed(1)} Mbps`;
}
