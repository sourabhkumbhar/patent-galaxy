"""Export processed patent data to optimized JSON for the Three.js frontend.

Reads the clustered patent data, edge list, and cluster summary, then
writes compact JSON files to public/data/ for consumption by the
Patent Galaxy web application.
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd


def compact_float(val, decimals=2):
    """Round a float and strip trailing zeros for compact JSON output.

    Parameters
    ----------
    val : float
        The value to format.
    decimals : int
        Number of decimal places to keep.

    Returns
    -------
    float
        The rounded value.
    """
    return round(float(val), decimals)


def build_nodes(df):
    """Convert the patent DataFrame to a list of node dictionaries.

    Parameters
    ----------
    df : pd.DataFrame
        Clustered patent data with all required columns.

    Returns
    -------
    list of dict
        Node records for JSON export.
    """
    nodes = []
    for _, row in df.iterrows():
        node = {
            "id": str(row["patent_id"]),
            "title": str(row.get("patent_title", "Untitled")),
            "year": int(row.get("patent_year", 0)),
            "month": int(row.get("patent_month", 0)),
            "cpcSection": str(row.get("cpc_section", "Z")),
            "cpcClass": str(row.get("cpc_class", "Z99")),
            "cpcSubclass": str(row.get("cpc_subclass", "Z99Z")),
            "assignee": str(row.get("assignee_organization", "Unknown")),
            "citationCount": int(row.get("citation_count", 0)),
            "x": compact_float(row["x"]),
            "y": compact_float(row["y"]),
            "z": compact_float(row["z"]),
            "color": str(row["color"]),
            "size": compact_float(row["size"], 2),
        }
        nodes.append(node)
    return nodes


def build_nodes_fast(df):
    """Convert the patent DataFrame to a list of node dicts using vectorized ops.

    This is significantly faster than iterrows for large datasets.

    Parameters
    ----------
    df : pd.DataFrame
        Clustered patent data with all required columns.

    Returns
    -------
    list of dict
        Node records for JSON export.
    """
    # Pre-convert columns to lists for fast access.
    patent_ids = df["patent_id"].astype(str).tolist()
    titles = df["patent_title"].fillna("Untitled").astype(str).tolist()
    years = df["patent_year"].fillna(0).astype(int).tolist()
    months = df["patent_month"].fillna(0).astype(int).tolist()
    sections = df["cpc_section"].fillna("Z").astype(str).tolist()
    classes = df["cpc_class"].fillna("Z99").astype(str).tolist()
    subclasses = df["cpc_subclass"].fillna("Z99Z").astype(str).tolist()
    assignees = df["assignee_organization"].fillna("Unknown").astype(str).tolist()
    cite_counts = df["citation_count"].fillna(0).astype(int).tolist()
    xs = df["x"].round(2).tolist()
    ys = df["y"].round(2).tolist()
    zs = df["z"].round(2).tolist()
    colors = df["color"].astype(str).tolist()
    sizes = df["size"].round(2).tolist()

    nodes = []
    for i in range(len(df)):
        nodes.append({
            "id": patent_ids[i],
            "title": titles[i],
            "year": years[i],
            "month": months[i],
            "cpcSection": sections[i],
            "cpcClass": classes[i],
            "cpcSubclass": subclasses[i],
            "assignee": assignees[i],
            "citationCount": cite_counts[i],
            "x": xs[i],
            "y": ys[i],
            "z": zs[i],
            "color": colors[i],
            "size": sizes[i],
        })
    return nodes


def build_edges_list(df):
    """Convert the edge DataFrame to a list of [source, target] pairs.

    Parameters
    ----------
    df : pd.DataFrame
        Edge list with 'source' and 'target' columns.

    Returns
    -------
    list of list
        Edge pairs as [source_index, target_index].
    """
    sources = df["source"].astype(int).tolist()
    targets = df["target"].astype(int).tolist()
    return [[s, t] for s, t in zip(sources, targets)]


def build_clusters_list(df):
    """Convert the cluster summary DataFrame to a list of dicts.

    Parameters
    ----------
    df : pd.DataFrame
        Cluster summary data.

    Returns
    -------
    list of dict
        Cluster records for JSON export.
    """
    clusters = []
    for _, row in df.iterrows():
        clusters.append({
            "label": str(row["label"]),
            "shortLabel": str(row["shortLabel"]),
            "x": compact_float(row["x"]),
            "y": compact_float(row["y"]),
            "z": compact_float(row["z"]),
            "color": str(row["color"]),
            "count": int(row["count"]),
        })
    return clusters


def write_json(data, path, compact=True):
    """Write data to a JSON file with optional compact formatting.

    Parameters
    ----------
    data : any
        JSON-serializable data.
    path : Path
        Output file path.
    compact : bool
        If True, use minimal whitespace. If False, use pretty-printing.
    """
    with open(path, "w", encoding="utf-8") as fh:
        if compact:
            json.dump(data, fh, separators=(",", ":"), ensure_ascii=False)
        else:
            json.dump(data, fh, indent=2, ensure_ascii=False)


def format_size(num_bytes):
    """Return a human-readable file size string.

    Parameters
    ----------
    num_bytes : int
        File size in bytes.

    Returns
    -------
    str
        Formatted size string.
    """
    for unit in ("B", "KB", "MB", "GB"):
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"


def main():
    """Entry point for the export script."""
    parser = argparse.ArgumentParser(
        description="Export processed data to JSON for the Three.js frontend."
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
        help="Output directory for JSON files. Default: public/data/",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Use pretty-printed JSON instead of compact format.",
    )

    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    project_root = base.parent
    input_dir = Path(args.input_dir) if args.input_dir else base / "processed"
    output_dir = Path(args.output_dir) if args.output_dir else project_root / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    compact = not args.pretty

    print("Patent Galaxy Data Pipeline - Export")
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Format: {'compact' if compact else 'pretty-printed'}")
    print()

    # Load clustered patents.
    patents_path = input_dir / "patents_clustered.parquet"
    if not patents_path.exists():
        print(f"Missing {patents_path}. Run cluster.py first.")
        sys.exit(1)

    print("Loading clustered patents ...", end=" ", flush=True)
    patents = pd.read_parquet(patents_path)
    print(f"{len(patents):,} patents")

    # Load edges.
    edges_path = input_dir / "edges.parquet"
    if not edges_path.exists():
        print(f"Missing {edges_path}. Run build_graph.py first.")
        sys.exit(1)

    print("Loading edges ...", end=" ", flush=True)
    edges = pd.read_parquet(edges_path)
    print(f"{len(edges):,} edges")

    # Load clusters.
    clusters_path = input_dir / "clusters.parquet"
    if not clusters_path.exists():
        print(f"Missing {clusters_path}. Run cluster.py first.")
        sys.exit(1)

    print("Loading clusters ...", end=" ", flush=True)
    clusters = pd.read_parquet(clusters_path)
    print(f"{len(clusters)} clusters")

    # Build JSON structures.
    print("\nBuilding nodes JSON ...", end=" ", flush=True)
    nodes_data = build_nodes_fast(patents)
    print(f"{len(nodes_data):,} nodes")

    print("Building edges JSON ...", end=" ", flush=True)
    edges_data = build_edges_list(edges)
    print(f"{len(edges_data):,} edges")

    print("Building clusters JSON ...", end=" ", flush=True)
    clusters_data = build_clusters_list(clusters)
    print(f"{len(clusters_data)} clusters")

    # Write JSON files.
    print("\nWriting JSON files ...")

    nodes_path = output_dir / "nodes.json"
    write_json(nodes_data, nodes_path, compact=compact)
    nodes_size = nodes_path.stat().st_size
    print(f"  {nodes_path.name}: {len(nodes_data):,} nodes ({format_size(nodes_size)})")

    edges_out_path = output_dir / "edges.json"
    write_json(edges_data, edges_out_path, compact=compact)
    edges_size = edges_out_path.stat().st_size
    print(f"  {edges_out_path.name}: {len(edges_data):,} edges ({format_size(edges_size)})")

    clusters_out_path = output_dir / "clusters.json"
    write_json(clusters_data, clusters_out_path, compact=compact)
    clusters_size = clusters_out_path.stat().st_size
    print(f"  {clusters_out_path.name}: {len(clusters_data)} clusters ({format_size(clusters_size)})")

    total_size = nodes_size + edges_size + clusters_size
    print(f"\nTotal JSON output: {format_size(total_size)}")
    print("\nExport complete.")


if __name__ == "__main__":
    main()
