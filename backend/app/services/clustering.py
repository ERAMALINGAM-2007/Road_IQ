"""
backend/app/services/clustering.py — Spatial Clustering & Recurrence Tracking

Implements Haversine DBSCAN spatial clustering to link defect observations
across multi-day survey passes into recurring hotspot entities.
"""

import math
from typing import List, Dict, Any, Tuple
from backend.app.services.geo import haversine_distance_m


def cluster_defects_spatial(
    defects: List[Dict[str, Any]],
    eps_m: float = 12.0,
    min_samples: int = 1,
) -> List[List[Dict[str, Any]]]:
    """
    Cluster defect records using density-based spatial proximity (eps in metres).
    Returns list of clusters (each cluster is a list of defect records).
    """
    visited = set()
    clusters = []

    for i, defect in enumerate(defects):
        if i in visited:
            continue

        visited.add(i)
        neighbors = find_neighbors(i, defects, eps_m)

        if len(neighbors) < min_samples:
            continue

        # Form a new cluster
        cluster = [defect]
        queue = list(neighbors)

        while queue:
            neighbor_idx = queue.pop(0)
            if neighbor_idx not in visited:
                visited.add(neighbor_idx)
                sub_neighbors = find_neighbors(neighbor_idx, defects, eps_m)
                if len(sub_neighbors) >= min_samples:
                    queue.extend([n for n in sub_neighbors if n not in visited])

            if all(d["id"] != defects[neighbor_idx]["id"] for d in cluster):
                cluster.append(defects[neighbor_idx])

        clusters.append(cluster)

    return clusters


def find_neighbors(target_idx: int, defects: List[Dict[str, Any]], eps_m: float) -> List[int]:
    """Find indices of all defects within eps_m of target defect (including self)."""
    target = defects[target_idx]
    neighbors = []
    t_lat = target.get("lat", 0.0)
    t_lon = target.get("lon", 0.0)

    for i, other in enumerate(defects):
        o_lat = other.get("lat", 0.0)
        o_lon = other.get("lon", 0.0)
        dist = haversine_distance_m(t_lat, t_lon, o_lat, o_lon)
        if dist <= eps_m:
            neighbors.append(i)

    return neighbors
