"""Parse raw PatentsView TSV files into clean parquet datasets.

Loads the raw TSV files downloaded by download.py, filters to the target
year, joins patent data with CPC codes, citations, and assignees, then
writes cleaned parquet files to the processed/ directory.
"""

import argparse
import sys
from pathlib import Path

import pandas as pd


def load_tsv(path, usecols=None, dtype=None):
    """Load a TSV file into a DataFrame with progress info.

    Parameters
    ----------
    path : Path
        Path to the TSV file.
    usecols : list or None
        Columns to load.
    dtype : dict or None
        Column dtype overrides.

    Returns
    -------
    pd.DataFrame
        The loaded data.
    """
    print(f"  Loading {path.name} ...", end=" ", flush=True)
    if not path.exists():
        print(f"NOT FOUND")
        raise FileNotFoundError(f"Missing file: {path}")
    df = pd.read_csv(
        path,
        sep="\t",
        usecols=usecols,
        dtype=dtype,
        low_memory=False,
        on_bad_lines="skip",
    )
    print(f"{len(df):,} rows")
    return df


def parse_patents(raw_dir, year):
    """Load and filter the patent table to the target year.

    Parameters
    ----------
    raw_dir : Path
        Directory containing raw TSV files.
    year : int
        The year to filter patents to.

    Returns
    -------
    pd.DataFrame
        Filtered patent data with columns: patent_id, patent_title,
        patent_date, patent_year, patent_month.
    """
    patent_cols = ["patent_id", "patent_title", "patent_date"]
    dtype = {"patent_id": str}

    df = load_tsv(raw_dir / "g_patent.tsv", usecols=patent_cols, dtype=dtype)

    # Parse date and extract year/month.
    df["patent_date"] = pd.to_datetime(df["patent_date"], errors="coerce")
    df = df.dropna(subset=["patent_date"])
    df["patent_year"] = df["patent_date"].dt.year.astype(int)
    df["patent_month"] = df["patent_date"].dt.month.astype(int)

    # Filter to target year.
    df = df[df["patent_year"] == year].copy()
    print(f"  Filtered to year {year}: {len(df):,} patents")

    # Drop rows with missing patent_id.
    df = df.dropna(subset=["patent_id"])
    df["patent_id"] = df["patent_id"].astype(str)

    return df


def parse_cpc(raw_dir, patent_ids):
    """Load CPC codes and select the primary code for each patent.

    Uses the first CPC code per patent (typically the primary classification).

    Parameters
    ----------
    raw_dir : Path
        Directory containing raw TSV files.
    patent_ids : set
        Set of patent IDs to retain.

    Returns
    -------
    pd.DataFrame
        CPC data with columns: patent_id, cpc_section, cpc_class,
        cpc_subclass, cpc_group.
    """
    cpc_cols = [
        "patent_id",
        "cpc_section",
        "cpc_class",
        "cpc_subclass",
        "cpc_group",
        "cpc_sequence",
    ]
    dtype = {"patent_id": str, "cpc_sequence": "Int64"}

    df = load_tsv(raw_dir / "g_cpc_current.tsv", usecols=cpc_cols, dtype=dtype)

    # Filter to patents in our set.
    df = df[df["patent_id"].isin(patent_ids)].copy()
    print(f"  CPC rows for target patents: {len(df):,}")

    # Take the primary (first-sequence) CPC per patent.
    df = df.sort_values(["patent_id", "cpc_sequence"])
    df = df.drop_duplicates(subset=["patent_id"], keep="first")
    df = df.drop(columns=["cpc_sequence"])

    print(f"  Unique patents with CPC: {len(df):,}")
    return df


def parse_citations(raw_dir, patent_ids):
    """Load citation pairs where both patents are in the dataset.

    Parameters
    ----------
    raw_dir : Path
        Directory containing raw TSV files.
    patent_ids : set
        Set of patent IDs to retain.

    Returns
    -------
    pd.DataFrame
        Citation pairs with columns: citing_patent_id, cited_patent_id.
    """
    cite_cols = ["patent_id", "citation_patent_id"]
    dtype = {"patent_id": str, "citation_patent_id": str}

    df = load_tsv(
        raw_dir / "g_us_patent_citation.tsv", usecols=cite_cols, dtype=dtype
    )

    # Rename for clarity.
    df = df.rename(columns={
        "patent_id": "citing_patent_id",
        "citation_patent_id": "cited_patent_id",
    })

    # Keep only citations where both ends are in the dataset.
    df = df[
        df["citing_patent_id"].isin(patent_ids)
        & df["cited_patent_id"].isin(patent_ids)
    ].copy()

    # Drop duplicates.
    df = df.drop_duplicates()

    print(f"  Internal citation pairs: {len(df):,}")
    return df


def parse_assignees(raw_dir, patent_ids):
    """Load assignee data and pick one assignee per patent.

    Parameters
    ----------
    raw_dir : Path
        Directory containing raw TSV files.
    patent_ids : set
        Set of patent IDs to retain.

    Returns
    -------
    pd.DataFrame
        Assignee data with columns: patent_id, assignee_organization,
        assignee_individual.
    """
    assignee_cols = [
        "patent_id",
        "assignee_organization",
        "assignee_sequence",
    ]
    dtype = {"patent_id": str, "assignee_sequence": "Int64"}

    df = load_tsv(
        raw_dir / "g_assignee_disambiguated.tsv",
        usecols=assignee_cols,
        dtype=dtype,
    )

    # Filter to our patents.
    df = df[df["patent_id"].isin(patent_ids)].copy()

    # Take the first assignee per patent.
    df = df.sort_values(["patent_id", "assignee_sequence"])
    df = df.drop_duplicates(subset=["patent_id"], keep="first")
    df = df.drop(columns=["assignee_sequence"])

    # Fill missing organization names.
    df["assignee_organization"] = df["assignee_organization"].fillna("Unknown")

    print(f"  Patents with assignee data: {len(df):,}")
    return df


def main():
    """Entry point for the parse script."""
    parser = argparse.ArgumentParser(
        description="Parse raw PatentsView TSV files into clean parquet."
    )
    parser.add_argument(
        "--year",
        type=int,
        default=2023,
        help="Target patent year. Default: 2023",
    )
    parser.add_argument(
        "--raw-dir",
        type=str,
        default=None,
        help="Directory with raw TSV files. Default: data-pipeline/raw/",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory for processed parquet files. Default: data-pipeline/processed/",
    )

    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    raw_dir = Path(args.raw_dir) if args.raw_dir else base / "raw"
    output_dir = Path(args.output_dir) if args.output_dir else base / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"NodeVerse Data Pipeline - Parse")
    print(f"Target year: {args.year}")
    print(f"Raw directory: {raw_dir}")
    print(f"Output directory: {output_dir}")
    print()

    # Step 1: Load and filter patents.
    print("[1/4] Loading patents")
    patents = parse_patents(raw_dir, args.year)
    if patents.empty:
        print(f"No patents found for year {args.year}. Exiting.")
        sys.exit(1)

    patent_ids = set(patents["patent_id"])

    # Step 2: Load CPC codes.
    print("\n[2/4] Loading CPC codes")
    cpc = parse_cpc(raw_dir, patent_ids)

    # Step 3: Load citations.
    print("\n[3/4] Loading citations")
    citations = parse_citations(raw_dir, patent_ids)

    # Step 4: Load assignees.
    print("\n[4/4] Loading assignees")
    assignees = parse_assignees(raw_dir, patent_ids)

    # Join patents with CPC data.
    print("\nJoining tables ...")
    merged = patents.merge(cpc, on="patent_id", how="left")
    merged = merged.merge(assignees, on="patent_id", how="left")

    # Fill missing CPC and assignee values.
    merged["cpc_section"] = merged["cpc_section"].fillna("Z")
    merged["cpc_class"] = merged["cpc_class"].fillna("Z99")
    merged["cpc_subclass"] = merged["cpc_subclass"].fillna("Z99Z")
    merged["assignee_organization"] = merged["assignee_organization"].fillna("Unknown")
    merged["patent_title"] = merged["patent_title"].fillna("Untitled")

    # Calculate citation counts.
    cited_counts = citations["cited_patent_id"].value_counts().reset_index()
    cited_counts.columns = ["patent_id", "citation_count"]
    merged = merged.merge(cited_counts, on="patent_id", how="left")
    merged["citation_count"] = merged["citation_count"].fillna(0).astype(int)

    print(f"Final merged dataset: {len(merged):,} patents")

    # Section distribution.
    section_dist = merged["cpc_section"].value_counts().sort_index()
    print("\nCPC section distribution:")
    for section, count in section_dist.items():
        print(f"  {section}: {count:,}")

    # Write output files.
    print(f"\nWriting parquet files to {output_dir} ...")

    patents_out = output_dir / "patents.parquet"
    merged.to_parquet(patents_out, index=False, engine="pyarrow")
    print(f"  {patents_out.name}: {len(merged):,} rows")

    citations_out = output_dir / "citations.parquet"
    citations.to_parquet(citations_out, index=False, engine="pyarrow")
    print(f"  {citations_out.name}: {len(citations):,} rows")

    print("\nParse complete.")


if __name__ == "__main__":
    main()
