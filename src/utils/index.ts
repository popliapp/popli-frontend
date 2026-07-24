// Formats numbers into currency format (INR)
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Formats big numbers into social scales like 24.5K, 1.2M
export function formatSocialCount(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return value.toString();
}

// Relates past ISO date to e.g. "5m ago", "2d ago"
export function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString.replace(' ', 'T')); // Convert space to T for standard parsing
    const diffMs = now.getTime() - date.getTime();
    
    if (isNaN(diffMs)) return dateString;

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateString;
  }
}

// Simple unique ID generator
export function generateUUID(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Fallback avatar generator
export function getDefaultAvatar(username?: string): string {
  if (username) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1D1037&color=fff&size=200`;
  }
  return 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200';
}
