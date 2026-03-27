"""Build citation graph edge list from processed patent and citation data.

Reads the clustered patent data and citation pairs, maps patent IDs to
integer indices, and outputs an edge list where each edge is a pair of
indices [source_index, target_index] representing a citation from source
to target.
"""

import argparse
import sys
from pathlib import Path

import pandas as pd


def build_edges(patents_df, citations_df):
    """Build index-based edge list from patent and citation DataFrames.

    Parameters
    ----------
    patents_df : pd.DataFrame
        Must contain a 'patent_id' column. The row index position is used
        as the integer node index.
    citations_df : pd.DataFrame
        Must contain 'citing_patent_id' and 'cited_patent_id' columns.

    Returns
    -------
    pd.DataFrame
        Edge list with columns: source, target (both integer indices).
    int
        Number of citation rows that could not be mapped (filtered out).
    """
    # Build patent_id to index mapping.
    patent_ids = patents_df["patent_id"].values
    id_to_idx = {pid: idx for idx, pid in enumerate(patent_ids)}

    # Map citing and cited IDs to indices.
    source_indices = citations_df["citing_patent_id"].map(id_to_idx)
    target_indices = citations_df["cited_patent_id"].map(id_to_idx)

    # Drop rows where either side is missing (patent not in clustered set).
    valid = source_indices.notna() & target_indices.notna()
    dropped = (~valid).sum()

    edges = pd.DataFrame({
        "source": source_indices[valid].astype(int),
        "target": target_indices[valid].astype(int),
    })

    # Remove self-citations.
    self_cite_mask = edges["source"] == edges["target"]
    self_cite_count = self_cite_mask.sum()
    if self_cite_count > 0:
        edges = edges[~self_cite_mask]
        print(f"  Removed {self_cite_count:,} self-citations")

    # Remove duplicate edges.
    before = len(edges)
    edges = edges.drop_duplicates()
    dupes = before - len(edges)
    if dupes > 0:
        print(f"  Removed {dupes:,} duplicate edges")

    return edges, int(dropped)


def main():
    """Entry point for the build_graph script."""
    parser = argparse.ArgumentParser(
        description="Build citation graph edge list."
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
        help="Output directory for edge list. Default: data-pipeline/processed/",
    )

    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    input_dir = Path(args.input_dir) if args.input_dir else base / "processed"
    output_dir = Path(args.output_dir) if args.output_dir else base / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("NodeVerse Data Pipeline - Build Graph")
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {output_dir}")
    print()

    # Load clustered patents.
    patents_path = input_dir / "patents_clustered.parquet"
    if not patents_path.exists():
        print(f"Missing {patents_path}. Run cluster.py first.")
        sys.exit(1)

    print("Loading clustered patents ...", end=" ", flush=True)
    patents = pd.read_parquet(patents_path, columns=["patent_id"])
    print(f"{len(patents):,} patents")

    # Load citations.
    citations_path = input_dir / "citations.parquet"
    if not citations_path.exists():
        print(f"Missing {citations_path}. Run parse.py first.")
        sys.exit(1)

    print("Loading citations ...", end=" ", flush=True)
    citations = pd.read_parquet(citations_path)
    print(f"{len(citations):,} citation pairs")

    # Build edges.
    print("\nBuilding edge list ...")
    edges, dropped = build_edges(patents, citations)

    if dropped > 0:
        print(f"  Dropped {dropped:,} citations with unmapped patent IDs")

    print(f"  Final edge count: {len(edges):,}")

    # Write output.
    edges_path = output_dir / "edges.parquet"
    edges.to_parquet(edges_path, index=False, engine="pyarrow")
    print(f"\nWrote {edges_path.name}: {len(edges):,} edges")

    # Print some statistics.
    if not edges.empty:
        unique_sources = edges["source"].nunique()
        unique_targets = edges["target"].nunique()
        total_patents = len(patents)
        connected = len(set(edges["source"]) | set(edges["target"]))
        print(f"\nGraph statistics:")
        print(f"  Nodes (patents): {total_patents:,}")
        print(f"  Edges (citations): {len(edges):,}")
        print(f"  Unique citing patents: {unique_sources:,}")
        print(f"  Unique cited patents: {unique_targets:,}")
        print(f"  Connected patents: {connected:,} ({connected/total_patents*100:.1f}%)")
        print(f"  Average citations per connected patent: {len(edges)/max(connected,1):.1f}")

    print("\nBuild graph complete.")


if __name__ == "__main__":
    main()
