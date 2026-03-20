"""Generate 3D spatial positions for patents based on CPC codes.

Maps CPC classification codes to positions in 3D space suitable for a
galaxy-style visualization. Each CPC section gets a distinct region of the
space, with classes and subclasses creating subclusters within those regions.
"""

import argparse
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# -------------------------------------------------------------------------
# CPC section centroids placed on a sphere for aesthetic spacing.
# Eight major sections (A through H) plus a fallback for unknown (Z).
# Positions are chosen to spread sections roughly evenly across a sphere
# of radius ~40 units, with slight vertical (y-axis) variation to avoid
# a flat ring.
# -------------------------------------------------------------------------
SECTION_CENTROIDS = {
    "A": {"x": 40.0, "y": 10.0, "z": 0.0},       # Human Necessities
    "B": {"x": 28.3, "y": -8.0, "z": 28.3},       # Operations; Transport
    "C": {"x": 0.0, "y": 12.0, "z": 40.0},        # Chemistry; Metallurgy
    "D": {"x": -28.3, "y": -5.0, "z": 28.3},      # Textiles; Paper
    "E": {"x": -40.0, "y": 8.0, "z": 0.0},        # Fixed Constructions
    "F": {"x": -28.3, "y": -10.0, "z": -28.3},    # Mechanical Eng; Lighting
    "G": {"x": 0.0, "y": 15.0, "z": -40.0},       # Physics
    "H": {"x": 28.3, "y": -12.0, "z": -28.3},     # Electricity
    "Z": {"x": 0.0, "y": -20.0, "z": 0.0},        # Unknown/unclassified
}

SECTION_COLORS = {
    "A": "#ff6b6b",   # red
    "B": "#ffa94d",   # orange
    "C": "#ffd43b",   # yellow
    "D": "#69db7c",   # green
    "E": "#38d9a9",   # teal
    "F": "#4dabf7",   # blue
    "G": "#748ffc",   # indigo
    "H": "#da77f2",   # purple
    "Z": "#868e96",   # grey
}

SECTION_LABELS = {
    "A": "Human Necessities",
    "B": "Operations & Transport",
    "C": "Chemistry & Metallurgy",
    "D": "Textiles & Paper",
    "E": "Fixed Constructions",
    "F": "Mechanical Engineering",
    "G": "Physics",
    "H": "Electricity",
    "Z": "Unclassified",
}


def cpc_class_offset(cpc_class):
    """Compute a deterministic offset vector from a CPC class string.

    Uses a simple hash of the class string to generate angular offsets so that
    different classes within a section are spread around the centroid.

    Parameters
    ----------
    cpc_class : str
        The CPC class code, e.g. "A01", "H04".

    Returns
    -------
    tuple of float
        (dx, dy, dz) offset to add to the section centroid.
    """
    h = hash(cpc_class) & 0xFFFFFFFF
    theta = (h % 360) * math.pi / 180.0
    phi = ((h >> 8) % 180) * math.pi / 180.0
    r = 5.0 + (h % 1000) / 1000.0 * 10.0  # radius between 5 and 15

    dx = r * math.sin(phi) * math.cos(theta)
    dy = r * math.cos(phi)
    dz = r * math.sin(phi) * math.sin(theta)
    return dx, dy, dz


def compute_positions(df, seed=42):
    """Compute 3D positions for all patents.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain columns: patent_id, cpc_section, cpc_class.
    seed : int
        Random seed for gaussian noise.

    Returns
    -------
    pd.DataFrame
        The input DataFrame with added columns: x, y, z.
    """
    rng = np.random.default_rng(seed)
    n = len(df)

    x = np.zeros(n, dtype=np.float32)
    y = np.zeros(n, dtype=np.float32)
    z = np.zeros(n, dtype=np.float32)

    # Cache class offsets to avoid recomputation.
    class_offset_cache = {}

    sections = df["cpc_section"].values
    classes = df["cpc_class"].values

    for i in range(n):
        section = str(sections[i])
        cpc_cls = str(classes[i])

        centroid = SECTION_CENTROIDS.get(section, SECTION_CENTROIDS["Z"])

        if cpc_cls not in class_offset_cache:
            class_offset_cache[cpc_cls] = cpc_class_offset(cpc_cls)
        dx, dy, dz = class_offset_cache[cpc_cls]

        x[i] = centroid["x"] + dx
        y[i] = centroid["y"] + dy
        z[i] = centroid["z"] + dz

    # Add gaussian noise for visual density.
    noise_scale = 2.5
    x += rng.normal(0, noise_scale, n).astype(np.float32)
    y += rng.normal(0, noise_scale, n).astype(np.float32)
    z += rng.normal(0, noise_scale, n).astype(np.float32)

    df = df.copy()
    df["x"] = x
    df["y"] = y
    df["z"] = z

    return df


def compute_colors(df):
    """Assign hex color strings based on CPC section.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain column: cpc_section.

    Returns
    -------
    pd.DataFrame
        The input DataFrame with an added 'color' column.
    """
    df = df.copy()
    df["color"] = df["cpc_section"].map(SECTION_COLORS).fillna(SECTION_COLORS["Z"])
    return df


def compute_sizes(df, min_size=1.0, max_size=8.0):
    """Assign node sizes based on citation count using a log scale.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain column: citation_count.
    min_size : float
        Minimum node size.
    max_size : float
        Maximum node size.

    Returns
    -------
    pd.DataFrame
        The input DataFrame with an added 'size' column.
    """
    df = df.copy()
    log_counts = np.log1p(df["citation_count"].values.astype(np.float64))
    max_log = log_counts.max() if log_counts.max() > 0 else 1.0
    normalized = log_counts / max_log
    df["size"] = (min_size + normalized * (max_size - min_size)).astype(np.float32)
    return df


def build_cluster_summary(df):
    """Build a summary table of cluster centroids for the frontend legend.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain columns: cpc_section, x, y, z, color.

    Returns
    -------
    pd.DataFrame
        One row per CPC section with columns: label, shortLabel, x, y, z,
        color, count.
    """
    rows = []
    for section in sorted(SECTION_CENTROIDS.keys()):
        subset = df[df["cpc_section"] == section]
        if subset.empty:
            continue
        rows.append({
            "label": SECTION_LABELS.get(section, "Unknown"),
            "shortLabel": section,
            "x": float(subset["x"].mean()),
            "y": float(subset["y"].mean()),
            "z": float(subset["z"].mean()),
            "color": SECTION_COLORS.get(section, "#868e96"),
            "count": len(subset),
        })
    return pd.DataFrame(rows)


def main():
    """Entry point for the cluster script."""
    parser = argparse.ArgumentParser(
        description="Generate 3D positions for patents from CPC codes."
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        default=None,
        help="Directory with processed parquet files. Default: data-pipeline/processed/",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Output directory for clustered parquet. Default: data-pipeline/processed/",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible noise. Default: 42",
    )

    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    input_dir = Path(args.input_dir) if args.input_dir else base / "processed"
    output_dir = Path(args.output_dir) if args.output_dir else base / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Patent Galaxy Data Pipeline - Cluster")
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {output_dir}")
    print()

    # Load patents.
    patents_path = input_dir / "patents.parquet"
    if not patents_path.exists():
        print(f"Missing {patents_path}. Run parse.py first.")
        sys.exit(1)

    print("Loading patents ...", end=" ", flush=True)
    df = pd.read_parquet(patents_path)
    print(f"{len(df):,} patents")

    # Compute positions.
    print("Computing 3D positions ...", end=" ", flush=True)
    df = compute_positions(df, seed=args.seed)
    print("done")

    # Assign colors.
    print("Assigning colors ...", end=" ", flush=True)
    df = compute_colors(df)
    print("done")

    # Assign sizes.
    print("Computing sizes ...", end=" ", flush=True)
    df = compute_sizes(df)
    print("done")

    # Build cluster summary.
    print("Building cluster summary ...", end=" ", flush=True)
    clusters = build_cluster_summary(df)
    print(f"{len(clusters)} clusters")

    # Write outputs.
    clustered_path = output_dir / "patents_clustered.parquet"
    df.to_parquet(clustered_path, index=False, engine="pyarrow")
    print(f"\nWrote {clustered_path.name}: {len(df):,} rows")

    clusters_path = output_dir / "clusters.parquet"
    clusters.to_parquet(clusters_path, index=False, engine="pyarrow")
    print(f"Wrote {clusters_path.name}: {len(clusters)} rows")

    # Print position statistics.
    print(f"\nPosition ranges:")
    print(f"  x: [{df['x'].min():.1f}, {df['x'].max():.1f}]")
    print(f"  y: [{df['y'].min():.1f}, {df['y'].max():.1f}]")
    print(f"  z: [{df['z'].min():.1f}, {df['z'].max():.1f}]")

    print(f"\nSize range: [{df['size'].min():.2f}, {df['size'].max():.2f}]")
    print("\nCluster complete.")


if __name__ == "__main__":
    main()
