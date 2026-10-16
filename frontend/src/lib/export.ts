/**
 * frontend/src/lib/export.ts — Client-Side CSV & GeoJSON Export Utility
 * 
 * Generates standards-compliant CSV spreadsheets and RFC 7946 GeoJSON
 * FeatureCollections directly in the browser, enabling seamless interoperability
 * with municipal spreadsheets, QGIS, ArcGIS, and OpenStreetMap editors.
 */

import type { DefectItem } from '@/lib/api';

/**
 * Downloads a text or JSON file in the browser
 */
function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports defect records as a CSV spreadsheet
 */
export function exportDefectsCSV(defects: DefectItem[], filename = 'marga_defects_export.csv') {
  const headers = [
    'id',
    'survey_id',
    'class_name',
    'severity_band',
    'severity_score',
    'risk_score',
    'latitude',
    'longitude',
    'est_area_m2',
    'observation_count',
    'status',
    'review_status',
    'is_waterlogged',
    'created_at',
  ];

  const rows = defects.map((d) => [
    d.id,
    d.survey_id,
    `"${d.class_name}"`,
    `"${d.severity_band}"`,
    d.severity_score.toFixed(1),
    d.risk_score.toFixed(1),
    d.lat.toFixed(6),
    d.lon.toFixed(6),
    d.est_area_m2.toFixed(3),
    d.observation_count,
    `"${d.status}"`,
    `"${d.review_status}"`,
    d.is_waterlogged ? 'true' : 'false',
    `"${d.created_at}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Exports defect records as RFC 7946 GeoJSON FeatureCollection
 */
export function exportDefectsGeoJSON(defects: DefectItem[], filename = 'marga_defects.geojson') {
  const features = defects.map((d) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [Number(d.lon.toFixed(6)), Number(d.lat.toFixed(6))],
    },
    properties: {
      id: d.id,
      survey_id: d.survey_id,
      class_name: d.class_name,
      severity_band: d.severity_band,
      severity_score: Number(d.severity_score.toFixed(1)),
      risk_score: Number(d.risk_score.toFixed(1)),
      est_area_m2: Number(d.est_area_m2.toFixed(3)),
      observation_count: d.observation_count,
      status: d.status,
      review_status: d.review_status,
      is_waterlogged: d.is_waterlogged,
      created_at: d.created_at,
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    name: 'Marga Road Condition Intelligence — Defect Survey',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  };

  triggerDownload(JSON.stringify(geojson, null, 2), filename, 'application/geo+json;charset=utf-8;');
}
