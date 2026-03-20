"""Download PatentsView bulk data files.

Downloads TSV files from PatentsView's bulk data distribution. The download
URLs are placeholders that must be updated to match the current PatentsView
distribution links. Visit https://patentsview.org/download/data-download-tables
to find the latest URLs for each table.

Supports resuming interrupted downloads via HTTP Range headers.
"""

import argparse
import os
import sys
import time
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# IMPORTANT: These URLs are placeholders. PatentsView periodically changes
# their download links when new data vintages are released. Before running
# this script, visit https://patentsview.org/download/data-download-tables
# and replace the URLs below with the current links for each table.
# ---------------------------------------------------------------------------
DOWNLOAD_URLS = {
    "g_patent.tsv": (
        "https://s3.amazonaws.com/data.patentsview.org/download/g_patent.tsv.zip"
    ),
    "g_cpc_current.tsv": (
        "https://s3.amazonaws.com/data.patentsview.org/download/g_cpc_current.tsv.zip"
    ),
    "g_us_patent_citation.tsv": (
        "https://s3.amazonaws.com/data.patentsview.org/download/"
        "g_us_patent_citation.tsv.zip"
    ),
    "g_assignee_disambiguated.tsv": (
        "https://s3.amazonaws.com/data.patentsview.org/download/"
        "g_assignee_disambiguated.tsv.zip"
    ),
}

CHUNK_SIZE = 1024 * 1024  # 1 MB


def format_bytes(num_bytes):
    """Return a human-readable string for a byte count."""
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} PB"


def format_duration(seconds):
    """Return a human-readable duration string."""
    if seconds < 60:
        return f"{seconds:.0f}s"
    minutes = seconds / 60
    if minutes < 60:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    return f"{hours:.1f}h"


def download_file(url, dest_path, timeout=30):
    """Download a single file with progress reporting and resume support.

    Parameters
    ----------
    url : str
        The URL to download from.
    dest_path : Path
        Local path where the file will be saved.
    timeout : int
        Connection timeout in seconds.

    Returns
    -------
    bool
        True if the download succeeded, False otherwise.
    """
    headers = {}
    mode = "wb"
    downloaded = 0

    # Resume support: if a partial file exists, request the remainder.
    if dest_path.exists():
        downloaded = dest_path.stat().st_size
        headers["Range"] = f"bytes={downloaded}-"
        mode = "ab"
        print(f"  Resuming from {format_bytes(downloaded)}")

    try:
        response = requests.get(url, headers=headers, stream=True, timeout=timeout)

        # If the server does not support range requests and we already have
        # partial data, start over.
        if downloaded > 0 and response.status_code == 200:
            print("  Server does not support resume; restarting download")
            downloaded = 0
            mode = "wb"
        elif response.status_code not in (200, 206):
            print(f"  HTTP error {response.status_code} for {url}")
            return False

        total = response.headers.get("Content-Length")
        if total is not None:
            total = int(total) + downloaded
        else:
            total = None

        start_time = time.time()
        with open(dest_path, mode) as fh:
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                if not chunk:
                    continue
                fh.write(chunk)
                downloaded += len(chunk)

                elapsed = time.time() - start_time
                speed = downloaded / max(elapsed, 0.001)
                progress = ""
                if total:
                    pct = downloaded / total * 100
                    eta = (total - downloaded) / max(speed, 1)
                    progress = (
                        f"\r  {format_bytes(downloaded)} / {format_bytes(total)}"
                        f"  ({pct:.1f}%)  {format_bytes(speed)}/s"
                        f"  ETA {format_duration(eta)}"
                    )
                else:
                    progress = (
                        f"\r  {format_bytes(downloaded)}"
                        f"  {format_bytes(speed)}/s"
                    )
                sys.stdout.write(progress)
                sys.stdout.flush()

        print()  # newline after progress
        return True

    except requests.exceptions.ConnectionError as exc:
        print(f"\n  Connection error: {exc}")
        return False
    except requests.exceptions.Timeout:
        print("\n  Download timed out. Re-run to resume.")
        return False
    except requests.exceptions.RequestException as exc:
        print(f"\n  Request failed: {exc}")
        return False


def main():
    """Entry point for the download script."""
    parser = argparse.ArgumentParser(
        description="Download PatentsView bulk data files."
    )
    parser.add_argument(
        "--year",
        type=int,
        default=2023,
        help="Target patent year (used by downstream scripts, logged here). Default: 2023",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory to save raw files. Default: data-pipeline/raw/",
    )
    parser.add_argument(
        "--files",
        nargs="+",
        choices=list(DOWNLOAD_URLS.keys()),
        default=None,
        help="Specific files to download. Default: all files.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP connection timeout in seconds. Default: 30",
    )

    args = parser.parse_args()

    # Resolve output directory.
    if args.output_dir:
        raw_dir = Path(args.output_dir)
    else:
        raw_dir = Path(__file__).resolve().parent / "raw"

    raw_dir.mkdir(parents=True, exist_ok=True)

    files_to_download = args.files or list(DOWNLOAD_URLS.keys())

    print(f"Patent Galaxy Data Pipeline - Download")
    print(f"Target year: {args.year}")
    print(f"Output directory: {raw_dir}")
    print(f"Files to download: {len(files_to_download)}")
    print()

    successes = 0
    failures = 0

    for filename in files_to_download:
        url = DOWNLOAD_URLS[filename]
        dest = raw_dir / filename
        print(f"[{successes + failures + 1}/{len(files_to_download)}] {filename}")
        print(f"  URL: {url}")

        if download_file(url, dest, timeout=args.timeout):
            print(f"  Saved to {dest}")
            successes += 1
        else:
            print(f"  FAILED: {filename}")
            failures += 1
        print()

    print(f"Download complete: {successes} succeeded, {failures} failed")
    if failures > 0:
        print(
            "NOTE: Some downloads failed. You can re-run this script to "
            "resume interrupted downloads."
        )
        print(
            "NOTE: If downloads consistently fail, visit "
            "https://patentsview.org/download/data-download-tables "
            "and update the URLs in this script."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
