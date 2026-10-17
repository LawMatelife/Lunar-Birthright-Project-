import { useEffect, useState, useCallback } from 'react';
import { registryAPI } from '@/utils/api';
import { Sparkles } from 'lucide-react';

const COUNTRY_FLAGS = {
  'United States': '🇺🇸', 'USA': '🇺🇸', 'India': '🇮🇳', 'Canada': '🇨🇦',
  'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Germany': '🇩🇪', 'France': '🇫🇷',
  'Japan': '🇯🇵', 'Australia': '🇦🇺', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
  'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'Singapore': '🇸🇬',
  'South Korea': '🇰🇷', 'China': '🇨🇳', 'Nigeria': '🇳🇬', 'South Africa': '🇿🇦',
  'Earth': '🌍'
};

function relativeTime(iso) {
  if (!iso) return 'just now';
  const then = new Date(iso).getTime();
  const seconds = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

const LiveCitizensTicker = ({ limit = 6, intervalMs = 12000 }) => {
  const [citizens, setCitizens] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await registryAPI.getRecentCitizens(limit);
      const list = res?.data?.citizens || [];
      if (list.length > 0) {
        setCitizens(list);
        setLoaded(true);
      }
    } catch (err) {
      // Non-critical social proof — never block UI on its absence
      if (process.env.NODE_ENV === 'development') {
        console.debug('Recent citizens load failed:', err?.response?.status);
      }
    }
  }, [limit]);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 60000); // refresh roster every minute
    return () => clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    if (citizens.length < 2) return;
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % citizens.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [citizens.length, intervalMs]);

  if (!loaded || citizens.length === 0) return null;

  const c = citizens[activeIdx];
  const flag = COUNTRY_FLAGS[c.country] || '🌙';

  return (
    <div
      className="mb-4 px-4 py-3 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl flex items-center gap-3 backdrop-blur-sm"
      data-testid="live-citizens-ticker"
    >
      <div className="relative flex-shrink-0">
        <span className="absolute inset-0 rounded-full bg-green-400 blur opacity-60 animate-ping" />
        <span className="relative block w-2.5 h-2.5 rounded-full bg-green-400" />
      </div>
      <Sparkles className="w-4 h-4 text-yellow-300 flex-shrink-0" />
      <p
        key={`${c.first_name}-${c.claimed_at}-${activeIdx}`}
        className="text-sm text-blue-100 truncate animate-fade-in"
      >
        <span className="text-white font-semibold">{c.first_name}</span>{' '}
        from <span className="text-white">{flag} {c.country}</span>{' '}
        just claimed{c.citizen_number ? ` plot #${c.citizen_number.toLocaleString()}` : ' a lunar plot'}{' '}
        <span className="text-blue-300/70">— {relativeTime(c.claimed_at)}</span>
      </p>
    </div>
  );
};

export default LiveCitizensTicker;
