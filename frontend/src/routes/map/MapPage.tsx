import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  Drop,
} from 'phosphor-react';
import { fetchDefects } from '@/lib/api';
import { DefectDrawer } from '@/components/defect/DefectDrawer';
import { useAppStore } from '@/lib/store';

const PERUNDURAI_CENTER: [number, number] = [77.5828, 11.2742];

export function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { theme } = useAppStore();

  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [onlyWaterlogged, setOnlyWaterlogged] = useState(false);

  const { data: defects = [] } = useQuery({
    queryKey: ['defects'],
    queryFn: () => fetchDefects(),
  });

  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      if (severityFilter !== 'all' && d.severity_band !== severityFilter) return false;
      if (classFilter !== 'all' && d.class_name !== classFilter) return false;
      if (onlyWaterlogged && !d.is_waterlogged) return false;
      return true;
    });
  }, [defects, severityFilter, classFilter, onlyWaterlogged]);

  // Initialise MapLibre
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Use OpenFreeMap vector tile style (free, no API key needed)
    const styleUrl = theme === 'dark'
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/positron';

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: PERUNDURAI_CENTER,
      zoom: 13.2,
      pitch: 25,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current) return;
    const styleUrl = theme === 'dark'
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/positron';
    map.current.setStyle(styleUrl);
  }, [theme]);

  // Render dual-channel severity markers
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredDefects.forEach((d) => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform';

      // Dual-channel geometric shapes
      const color =
        d.severity_band === 'critical' ? '#B3202A' :
        d.severity_band === 'high' ? '#D9531E' :
        d.severity_band === 'medium' ? '#D9A21B' : '#5E8C61';

      const shapeSvg =
        d.severity_band === 'critical'
          ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2">
               <polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/>
               <text x="12" y="16" font-size="10" font-family="monospace" font-weight="bold" fill="#ffffff" text-anchor="middle">!</text>
             </svg>`
          : d.severity_band === 'high'
          ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2">
               <polygon points="12,3 22,21 2,21"/>
             </svg>`
          : d.severity_band === 'medium'
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2">
               <polygon points="12,2 22,12 12,22 2,12"/>
             </svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2">
               <circle cx="12" cy="12" r="9"/>
             </svg>`;

      el.innerHTML = shapeSvg;
      el.addEventListener('click', () => setSelectedDefectId(d.id));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([d.lon, d.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [filteredDefects]);

  const recenter = () => {
    map.current?.flyTo({ center: PERUNDURAI_CENTER, zoom: 13.5 });
  };

  return (
    <div className="relative w-full h-[calc(100vh-var(--top-strip-height))] flex overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Toolbar on Top */}
      <div className="absolute top-4 left-4 right-4 md:right-auto z-10 flex flex-wrap items-center gap-2 bg-[var(--surface)] p-2.5 rounded border border-[var(--rule)] shadow-md">
        <span className="text-xs font-mono font-semibold px-2 text-[var(--ink)]">
          {filteredDefects.length} Hazards
        </span>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs font-mono p-1 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical (⬢)</option>
          <option value="high">High (▲)</option>
          <option value="medium">Medium (◆)</option>
          <option value="low">Low (●)</option>
        </select>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="text-xs font-mono p-1 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">All Classes</option>
          <option value="pothole">Potholes</option>
          <option value="longitudinal_crack">Longitudinal Cracks</option>
          <option value="transverse_crack">Transverse Cracks</option>
          <option value="surface_damage">Surface Damage</option>
        </select>

        <button
          onClick={() => setOnlyWaterlogged(!onlyWaterlogged)}
          className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 border transition-all ${
            onlyWaterlogged ? 'bg-[var(--info)] text-white border-[var(--info)]' : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-muted)]'
          }`}
        >
          <Drop size={12} /> Wet Only
        </button>

        <button
          onClick={recenter}
          className="p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] hover:text-[var(--accent)]"
          title="Recenter on Perundurai"
        >
          <Compass size={16} />
        </button>
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-10 bg-[var(--surface)] p-3 rounded border border-[var(--rule)] shadow-md text-xs font-mono space-y-1.5 hidden sm:block">
        <div className="text-[10px] font-bold uppercase text-[var(--ink-muted)] tracking-wider mb-1">
          Dual-Channel Legend
        </div>
        <div className="flex items-center gap-2 text-[var(--sev-critical)] font-semibold">
          <span>⬢</span> Critical (S ≥ 75)
        </div>
        <div className="flex items-center gap-2 text-[var(--sev-high)]">
          <span>▲</span> High (S ≥ 50)
        </div>
        <div className="flex items-center gap-2 text-[var(--sev-medium)]">
          <span>◆</span> Medium (S ≥ 25)
        </div>
        <div className="flex items-center gap-2 text-[var(--sev-low)]">
          <span>●</span> Low (S &lt; 25)
        </div>
      </div>

      {/* Defect Detail Drawer */}
      <DefectDrawer
        defectId={selectedDefectId}
        onClose={() => setSelectedDefectId(null)}
      />
    </div>
  );
}
