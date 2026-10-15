/**
 * frontend/src/lib/api.ts — Dual-Mode API Client for Marga
 * 
 * Communicates with the FastAPI backend (http://127.0.0.1:8000/api).
 * Automatically falls back to /demo-data/*.json if the backend is unreachable
 * or if VITE_STATIC_DEMO=1 is set, ensuring fail-safe live presentations.
 */

const BACKEND_BASE = 'http://127.0.0.1:8000/api';
const IS_STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === '1';

export interface DefectItem {
  id: number;
  survey_id: number;
  class_name: 'pothole' | 'longitudinal_crack' | 'transverse_crack' | 'surface_damage';
  severity_band: 'low' | 'medium' | 'high' | 'critical';
  severity_score: number;
  risk_score: number;
  lat: number;
  lon: number;
  est_area_m2: number;
  observation_count: number;
  status: 'detected' | 'verified' | 'scheduled' | 'in_progress' | 'repaired' | 'rejected';
  review_status: 'unreviewed' | 'approved' | 'rejected' | 'reclassified';
  is_waterlogged: boolean;
  thumbnail_url?: string;
  explanation?: string;
  created_at: string;
}

export interface SurveyItem {
  id: number;
  name: string;
  road_name: string;
  survey_date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_frames: number;
  processed_frames: number;
  defect_count?: number;
}

export interface SegmentItem {
  id: number;
  osm_way_id: string;
  road_name: string;
  highway_class: string;
  length_m: number;
  speed_limit_kmh: number;
  rhi_score: number;
  rhi_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  defect_count: number;
}

export interface DefectDetail extends DefectItem {
  first_seen_frame: number;
  last_seen_frame: number;
  breakdown: {
    area_contribution: number;
    class_contribution: number;
    position_contribution: number;
    depth_contribution: number;
    water_bonus: number;
  };
  overrides: string[];
}

// In-memory state store for static demo mutations (optimistic review)
const staticReviewOverrides: Record<number, { status: string; review_status: string; class_name?: string }> = {};

export async function fetchSurveys(): Promise<SurveyItem[]> {
  if (!IS_STATIC_DEMO) {
    try {
      const res = await fetch(`${BACKEND_BASE}/surveys`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return await res.json();
    } catch {
      // Fall through to static demo fallback
    }
  }
  const staticRes = await fetch('/demo-data/surveys.json');
  return await staticRes.json();
}

export async function fetchDefects(filters?: {
  survey_id?: number;
  severity?: string;
  class_name?: string;
  status?: string;
  min_risk?: number;
}): Promise<DefectItem[]> {
  if (!IS_STATIC_DEMO) {
    try {
      const params = new URLSearchParams();
      if (filters?.survey_id) params.set('survey_id', String(filters.survey_id));
      if (filters?.severity) params.set('severity', filters.severity);
      if (filters?.class_name) params.set('class_name', filters.class_name);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.min_risk) params.set('min_risk', String(filters.min_risk));

      const res = await fetch(`${BACKEND_BASE}/defects?${params.toString()}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return applyStaticOverrides(data);
      }
    } catch {
      // Fall through to static demo fallback
    }
  }

  const staticRes = await fetch('/demo-data/defects.json');
  let data: DefectItem[] = await staticRes.json();

  if (filters?.survey_id) data = data.filter((d) => d.survey_id === filters.survey_id);
  if (filters?.severity) data = data.filter((d) => d.severity_band === filters.severity?.toLowerCase());
  if (filters?.class_name) data = data.filter((d) => d.class_name === filters.class_name?.toLowerCase());
  if (filters?.status) data = data.filter((d) => d.status === filters.status?.toLowerCase());
  if (filters?.min_risk) data = data.filter((d) => d.risk_score >= (filters.min_risk || 0));

  return applyStaticOverrides(data);
}

export async function fetchDefectById(id: number): Promise<DefectDetail> {
  if (!IS_STATIC_DEMO) {
    try {
      const res = await fetch(`${BACKEND_BASE}/defects/${id}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const item = await res.json();
        return applyDetailOverrides(item);
      }
    } catch {
      // Fall through to static demo
    }
  }

  const staticRes = await fetch('/demo-data/defects.json');
  const all: DefectItem[] = await staticRes.json();
  const found = all.find((d) => d.id === id) || all[0];

  const detail: DefectDetail = {
    ...found,
    first_seen_frame: 4,
    last_seen_frame: 10,
    breakdown: {
      area_contribution: Math.round(found.severity_score * 0.35),
      class_contribution: Math.round(found.severity_score * 0.40),
      position_contribution: Math.round(found.severity_score * 0.20),
      depth_contribution: 0,
      water_bonus: found.is_waterlogged ? 8.0 : 0.0,
    },
    overrides: found.severity_score >= 50 && found.class_name === 'pothole'
      ? ['pothole_on_fast_road (enforced High threshold ≥50)']
      : [],
  };

  return applyDetailOverrides(detail);
}

export async function fetchSegments(): Promise<SegmentItem[]> {
  if (!IS_STATIC_DEMO) {
    try {
      const res = await fetch(`${BACKEND_BASE}/segments`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return await res.json();
    } catch {
      // Fall through
    }
  }
  const staticRes = await fetch('/demo-data/segments.json');
  return await staticRes.json();
}

export async function reviewDefect(
  defectId: number,
  action: 'approve' | 'reject' | 'reclassify',
  newClass?: string,
  comment?: string,
): Promise<{ status: string; review_status: string }> {
  // Save optimistic local override
  staticReviewOverrides[defectId] = {
    status: action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'detected',
    review_status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'reclassified',
    class_name: newClass,
  };

  if (!IS_STATIC_DEMO) {
    try {
      const res = await fetch(`${BACKEND_BASE}/defects/${defectId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          new_class: newClass,
          comment,
          reviewer_role: 'engineer',
        }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Return optimistic response
    }
  }

  return {
    status: staticReviewOverrides[defectId].status,
    review_status: staticReviewOverrides[defectId].review_status,
  };
}

export async function uploadSurvey(formData: FormData): Promise<{ id: number; message: string }> {
  try {
    const res = await fetch(`${BACKEND_BASE}/surveys`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) return await res.json();
  } catch {
    // Return simulated survey response
  }
  return {
    id: 99,
    message: 'Survey uploaded and processing (simulated)',
  };
}

function applyStaticOverrides(defects: DefectItem[]): DefectItem[] {
  return defects.map((d) => {
    if (staticReviewOverrides[d.id]) {
      const o = staticReviewOverrides[d.id];
      return {
        ...d,
        status: o.status as any,
        review_status: o.review_status as any,
        class_name: (o.class_name || d.class_name) as any,
      };
    }
    return d;
  });
}

function applyDetailOverrides(defect: DefectDetail): DefectDetail {
  if (staticReviewOverrides[defect.id]) {
    const o = staticReviewOverrides[defect.id];
    return {
      ...defect,
      status: o.status as any,
      review_status: o.review_status as any,
      class_name: (o.class_name || defect.class_name) as any,
    };
  }
  return defect;
}
