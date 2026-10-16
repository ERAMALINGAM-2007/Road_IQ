import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Drop,
  MagnifyingGlass,
  MapPin,
  ArrowsClockwise,
  Eye,
  SlidersHorizontal,
  VideoCamera,
  Calendar,
  X,
  CaretRight,
  NavigationArrow,
} from 'phosphor-react';
import { fetchDefects, fetchSegments, type DefectItem } from '@/lib/api';

import { DefectDrawer } from '@/components/defect/DefectDrawer';
import { useAppStore } from '@/lib/store';

const PERUNDURAI_CENTER: [number, number] = [77.5828, 11.2742];

// Preset landmarks for instant search and fly-to
const PRESET_LOCATIONS = [
  { name: 'NH-544 Salem-Kochi Highway', coords: [77.5828, 11.2742] as [number, number], zoom: 14.5, pitch: 40 },
  { name: 'SH-96 Perundurai - Erode Road', coords: [77.6000, 11.2790] as [number, number], zoom: 14.2, pitch: 35 },
  { name: 'KEC Campus Boulevard', coords: [77.6075, 11.2750] as [number, number], zoom: 15.0, pitch: 30 },
  { name: 'Perundurai Town Center', coords: [77.5840, 11.2760] as [number, number], zoom: 14.0, pitch: 20 },
  { name: 'Erode Junction Hub', coords: [77.7172, 11.3410] as [number, number], zoom: 13.5, pitch: 25 },
];

// Map Styles
const STYLES = {
  road: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  satellite: {
    version: 8 as const,
    sources: {
      'esri-satellite': {
        type: 'raster' as const,
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster' as const,
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
};

export function MapPage() {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { theme } = useAppStore();

  // Map state
  const [mapType, setMapType] = useState<'road' | 'satellite' | 'dark'>(theme === 'dark' ? 'dark' : 'road');
  const [showRoadHealth, setShowRoadHealth] = useState(true);
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [quickDefect, setQuickDefect] = useState<DefectItem | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [onlyWaterlogged, setOnlyWaterlogged] = useState(false);

  // Timeline Scrubber
  const [timelineRange, setTimelineRange] = useState<'all' | '7d' | '30d'>('all');

  // Live map telemetry
  const [mapCenter, setMapCenter] = useState<[number, number]>(PERUNDURAI_CENTER);
  const [mapZoom, setMapZoom] = useState(13.5);

  // Queries
  const { data: defects = [] } = useQuery({
    queryKey: ['defects'],
    queryFn: () => fetchDefects(),
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['segments'],
    queryFn: () => fetchSegments(),
  });

  // Filtered defects based on controls and timeline
  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      if (severityFilter !== 'all' && d.severity_band !== severityFilter) return false;
      if (classFilter !== 'all' && d.class_name !== classFilter) return false;
      if (onlyWaterlogged && !d.is_waterlogged) return false;

      // Timeline filtering
      if (timelineRange === '7d' && d.created_at) {
        const diffDays = (Date.now() - new Date(d.created_at).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (timelineRange === '30d' && d.created_at) {
        const diffDays = (Date.now() - new Date(d.created_at).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      return true;
    });
  }, [defects, severityFilter, classFilter, onlyWaterlogged, timelineRange]);

  // Convert filtered defects into GeoJSON FeatureCollection
  const defectGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: filteredDefects.map((d) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.lon, d.lat],
        },
        properties: {
          id: d.id,
          class_name: d.class_name,
          severity_band: d.severity_band,
          severity_score: d.severity_score,
          risk_score: d.risk_score,
          is_waterlogged: d.is_waterlogged ? 1 : 0,
          thumbnail_url: d.thumbnail_url,
          est_area_m2: d.est_area_m2,
        },
      })),
    };
  }, [filteredDefects]);

  // Convert segments into GeoJSON FeatureCollection
  const segmentGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: segments
        .filter((s) => s.coords && s.coords.length > 1)
        .map((s) => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: s.coords!,
          },
          properties: {
            id: s.id,
            road_name: s.road_name,
            highway_class: s.highway_class,
            rhi_score: s.rhi_score,
            rhi_grade: s.rhi_grade,
            speed_limit_kmh: s.speed_limit_kmh,
            defect_count: s.defect_count,
            color:
              s.rhi_grade === 'A'
                ? '#2F7D5B'
                : s.rhi_grade === 'B' || s.rhi_grade === 'C'
                ? '#D9A21B'
                : '#B3202A',
          },
        })),
    };
  }, [segments]);

  // Initialise MapLibre
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initialStyle = mapType === 'satellite' ? STYLES.satellite : STYLES[mapType];

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: PERUNDURAI_CENTER,
      zoom: 13.5,
      pitch: 35,
      attributionControl: false,
    });

    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    m.on('move', () => {
      const center = m.getCenter();
      setMapCenter([center.lng, center.lat]);
      setMapZoom(Math.round(m.getZoom() * 10) / 10);
    });

    m.on('load', () => {
      setupLayers(m);
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Set style when mapType changes
  useEffect(() => {
    if (!map.current) return;
    const newStyle = mapType === 'satellite' ? STYLES.satellite : STYLES[mapType];
    map.current.setStyle(newStyle);

    map.current.once('style.load', () => {
      if (map.current) {
        setupLayers(map.current);
      }
    });
  }, [mapType]);

  // Update GeoJSON sources when defects or segments change
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const defectSource = map.current.getSource('defects-source') as maplibregl.GeoJSONSource;
    if (defectSource) {
      defectSource.setData(defectGeoJSON);
    }

    const segmentSource = map.current.getSource('segments-source') as maplibregl.GeoJSONSource;
    if (segmentSource) {
      segmentSource.setData(segmentGeoJSON);
    }
  }, [defectGeoJSON, segmentGeoJSON]);

  // Toggle Road Health Corridor visibility
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const visibility = showRoadHealth ? 'visible' : 'none';
    if (map.current.getLayer('segments-layer')) {
      map.current.setLayoutProperty('segments-layer', 'visibility', visibility);
    }
    if (map.current.getLayer('segments-glow')) {
      map.current.setLayoutProperty('segments-glow', 'visibility', visibility);
    }
  }, [showRoadHealth]);

  // Setup GeoJSON layers with clustering and corridor polylines
  const setupLayers = (m: maplibregl.Map) => {
    // 1. Add Road Segments / Corridors Source & Layers
    if (!m.getSource('segments-source')) {
      m.addSource('segments-source', {
        type: 'geojson',
        data: segmentGeoJSON,
      });

      // Corridor glow
      m.addLayer({
        id: 'segments-glow',
        type: 'line',
        source: 'segments-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: showRoadHealth ? 'visible' : 'none',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 10,
          'line-opacity': 0.25,
        },
      });

      // Corridor main line
      m.addLayer({
        id: 'segments-layer',
        type: 'line',
        source: 'segments-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: showRoadHealth ? 'visible' : 'none',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });
    }

    // 2. Add Clustered Defects Source
    if (!m.getSource('defects-source')) {
      m.addSource('defects-source', {
        type: 'geojson',
        data: defectGeoJSON,
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 50,
      });

      // Cluster Circles
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'defects-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#D9A21B', // < 10: Medium amber
            10,
            '#D9531E', // 10-30: High orange
            30,
            '#B3202A', // > 30: Critical red
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18,
            10,
            24,
            30,
            30,
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.92,
        },
      });

      // Cluster Count Labels
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'defects-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Unclustered Individual Defect Points
      m.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'defects-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'severity_band'],
            'critical',
            '#B3202A',
            'high',
            '#D9531E',
            'medium',
            '#D9A21B',
            /* default */ '#5E8C61',
          ],
          'circle-radius': 9,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      // Handle Cluster Click -> Smooth zoom in
      m.on('click', 'clusters', async (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId === undefined) return;

        const source = m.getSource('defects-source') as maplibregl.GeoJSONSource;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          m.easeTo({ center: coords, zoom: zoom + 0.5 });
        } catch (err) {
          console.warn('Cluster zoom error:', err);
        }
      });

      // Handle Individual Point Click -> Show preview card
      m.on('click', 'unclustered-point', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        const defect = defects.find((d) => d.id === props.id);
        if (defect) {
          setQuickDefect(defect);
        }
      });

      // Pointer cursors
      m.on('mouseenter', 'clusters', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'clusters', () => (m.getCanvas().style.cursor = ''));
      m.on('mouseenter', 'unclustered-point', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'unclustered-point', () => (m.getCanvas().style.cursor = ''));
    }
  };

  const handleFlyTo = (coords: [number, number], zoom = 14.5, pitch = 35) => {
    map.current?.flyTo({
      center: coords,
      zoom,
      pitch,
      essential: true,
      duration: 1800,
    });
    setShowSearchDropdown(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if coordinates format: "11.2742, 77.5828"
    const coordMatch = searchQuery.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      handleFlyTo([lon, lat], 15.0);
      return;
    }

    // Match preset landmarks
    const match = PRESET_LOCATIONS.find((loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (match) {
      handleFlyTo(match.coords, match.zoom, match.pitch);
    } else {
      // Default to Perundurai center
      handleFlyTo(PERUNDURAI_CENTER, 14.0);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-var(--top-strip-height))] flex overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* ── Top Left: Location Search Bar (Inspired by iWatchRoad) ── */}
      <div className="absolute top-4 left-4 z-20 w-80 sm:w-96">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="flex items-center bg-[var(--surface)] border border-[var(--rule)] rounded-md shadow-lg overflow-hidden focus-within:border-[var(--accent)] transition-all">
            <MagnifyingGlass size={16} className="text-[var(--ink-muted)] ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Search highway, landmark, or lat, lon..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full text-xs font-mono py-2.5 px-3 bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 mr-2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Location Jump Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--rule)] rounded-md shadow-xl z-30 p-2 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase text-[var(--ink-muted)] px-2 py-1 flex items-center justify-between">
                <span>Real Highway Corridors</span>
                <span className="text-[var(--accent)]">GPS Locked</span>
              </div>
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  type="button"
                  key={loc.name}
                  onClick={() => {
                    setSearchQuery(loc.name);
                    handleFlyTo(loc.coords, loc.zoom, loc.pitch);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between hover:bg-[var(--paper)] text-[var(--ink)] transition-colors"
                >
                  <span className="flex items-center gap-2 truncate">
                    <MapPin size={12} className="text-[var(--accent)] shrink-0" />
                    {loc.name}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] shrink-0">
                    {loc.coords[1].toFixed(3)}°N, {loc.coords[0].toFixed(3)}°E
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* ── Right Panel: Map Controls & Telemetry (Inspired by iWatchRoad) ── */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-3 max-w-[280px] w-full">
        {/* Map Style & Mode Switcher */}
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-md shadow-lg p-3 space-y-2.5">
          <div className="text-[10px] font-mono font-bold uppercase text-[var(--ink-muted)] tracking-wider">
            Map View
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setMapType('road')}
              className={`text-xs font-mono py-1.5 rounded border transition-all flex items-center justify-center gap-1 ${
                mapType === 'road'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-bold shadow-sm'
                  : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink-muted)]'
              }`}
            >
              Road Map
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`text-xs font-mono py-1.5 rounded border transition-all flex items-center justify-center gap-1 ${
                mapType === 'satellite'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-bold shadow-sm'
                  : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink-muted)]'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType('dark')}
              className={`text-xs font-mono py-1.5 rounded border transition-all flex items-center justify-center gap-1 ${
                mapType === 'dark'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-bold shadow-sm'
                  : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink-muted)]'
              }`}
            >
              Dark
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--rule)] space-y-1.5">
            <button
              onClick={() => handleFlyTo(PERUNDURAI_CENTER, 13.5, 30)}
              className="w-full btn btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5"
            >
              <ArrowsClockwise size={13} /> Reset to Default
            </button>

            <button
              onClick={() => setShowRoadHealth(!showRoadHealth)}
              className={`w-full text-xs font-mono py-1.5 px-2.5 rounded border flex items-center justify-between transition-all ${
                showRoadHealth
                  ? 'bg-[rgba(47,125,91,0.12)] border-[var(--ok)] text-[var(--ok)] font-bold'
                  : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink-muted)]'
              }`}
            >
              <span>🛣️ Road Health (Corridors)</span>
              <span>{showRoadHealth ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setOnlyWaterlogged(!onlyWaterlogged)}
              className={`w-full text-xs font-mono py-1.5 px-2.5 rounded border flex items-center justify-between transition-all ${
                onlyWaterlogged
                  ? 'bg-[rgba(43,102,147,0.12)] border-[var(--info)] text-[var(--info)] font-bold'
                  : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink-muted)]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Drop size={12} /> Standing Water Only
              </span>
              <span>{onlyWaterlogged ? 'ACTIVE' : 'OFF'}</span>
            </button>

            <button
              onClick={() => navigate('/scan')}
              className="w-full btn btn-primary text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm font-bold"
            >
              <VideoCamera size={14} /> Upload Video / GPS
            </button>
          </div>
        </div>

        {/* Live GPS Telemetry Card (Inspired by iWatchRoad Current Location) */}
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-md shadow-lg p-3 space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between text-[10px] uppercase text-[var(--ink-muted)] font-bold">
            <span className="flex items-center gap-1">
              <NavigationArrow size={10} className="text-[var(--accent)]" /> GPS Telemetry
            </span>
            <span className="text-[var(--ok)] font-bold">● Active</span>
          </div>
          <div className="text-xs font-bold text-[var(--ink)]">
            Perundurai Highway Basin
          </div>
          <div className="text-[11px] text-[var(--ink-muted)] space-y-0.5">
            <div>Lat: <strong>{mapCenter[1].toFixed(5)}°N</strong></div>
            <div>Lon: <strong>{mapCenter[0].toFixed(5)}°E</strong></div>
            <div>Zoom: <strong>{mapZoom}x</strong> · Hazards: <strong>{filteredDefects.length}</strong></div>
          </div>
        </div>

        {/* Severity & Class Filters */}
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-md shadow-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[var(--ink-muted)]">
            <SlidersHorizontal size={12} /> Filter Defects
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
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
            className="w-full text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
          >
            <option value="all">All Defect Classes</option>
            <option value="pothole">Potholes</option>
            <option value="surface_damage">Surface Damage</option>
            <option value="longitudinal_crack">Longitudinal Cracks</option>
            <option value="transverse_crack">Transverse Cracks</option>
          </select>
        </div>
      </div>

      {/* ── Bottom Floating: Timeline Scrubber (Inspired by iWatchRoad) ── */}
      <div className="absolute bottom-6 left-4 right-4 md:right-80 z-20 bg-[var(--surface)] border border-[var(--rule)] rounded-md shadow-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[var(--accent)] shrink-0" />
          <div>
            <div className="font-bold text-[var(--ink)] flex items-center gap-2">
              <span>Inspection Timeline</span>
              <span className="text-[10px] text-[var(--ink-muted)] px-1.5 py-0.2 bg-[var(--paper)] rounded border border-[var(--rule)]">
                {filteredDefects.length} Hazards Visible
              </span>
            </div>
            <div className="text-[11px] text-[var(--ink-muted)]">
              Showing road surveys recorded across NH-544 & SH-96
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTimelineRange('all')}
            className={`px-2.5 py-1 rounded border text-xs font-bold transition-all ${
              timelineRange === 'all'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            Show All
          </button>
          <button
            onClick={() => setTimelineRange('30d')}
            className={`px-2.5 py-1 rounded border text-xs font-bold transition-all ${
              timelineRange === '30d'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimelineRange('7d')}
            className={`px-2.5 py-1 rounded border text-xs font-bold transition-all ${
              timelineRange === '7d'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            7 Days
          </button>
        </div>
      </div>

      {/* ── Defect Quick Preview Card (Pop-up upon clicking a marker) ── */}
      {quickDefect && (
        <div className="absolute bottom-24 left-4 z-30 max-w-sm w-full bg-[var(--surface)] border-2 border-[var(--accent)] rounded-lg shadow-2xl p-4 space-y-3 font-mono animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-[var(--rule)] pb-2">
            <div>
              <div className="text-[10px] text-[var(--ink-muted)] uppercase font-bold">
                DEF-{String(quickDefect.id).padStart(4, '0')} · {quickDefect.status}
              </div>
              <h3 className="text-sm font-bold text-[var(--ink)] mt-0.5">
                {quickDefect.class_name.replace(/_/g, ' ').toUpperCase()}
              </h3>
            </div>
            <button
              onClick={() => setQuickDefect(null)}
              className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-3">
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded bg-[var(--paper)] border border-[var(--rule)] overflow-hidden shrink-0 flex items-center justify-center relative">
              {quickDefect.thumbnail_url ? (
                <img
                  src={quickDefect.thumbnail_url}
                  alt={quickDefect.class_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[var(--ink-muted)] bg-[var(--paper)]">
                {quickDefect.class_name.slice(0, 4).toUpperCase()}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex-1 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={`chip chip-${quickDefect.severity_band}`}>
                  {quickDefect.severity_band.toUpperCase()}
                </span>
                {quickDefect.is_waterlogged && (
                  <span className="text-[10px] text-[var(--info)] border border-[var(--info)] px-1 rounded flex items-center gap-0.5">
                    <Drop size={10} /> WET
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--accent)] font-bold">
                Risk Score: {quickDefect.risk_score.toFixed(1)} / 100
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] truncate">
                {quickDefect.lat.toFixed(4)}°N, {quickDefect.lon.toFixed(4)}°E
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--rule)] flex gap-2">
            <button
              onClick={() => {
                setSelectedDefectId(quickDefect.id);
                setQuickDefect(null);
              }}
              className="btn btn-primary text-xs py-1.5 flex-1 flex items-center justify-center gap-1 shadow-sm font-bold"
            >
              <Eye size={14} /> Full Inspection Telemetry <CaretRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Defect Detail Drawer (Full audit and IRC scoring breakdown) ── */}
      <DefectDrawer
        defectId={selectedDefectId}
        onClose={() => setSelectedDefectId(null)}
      />
    </div>
  );
}
