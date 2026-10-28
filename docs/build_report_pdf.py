"""Turn docs/Development_Report.md into docs/Development_Report.pdf.

Uses the `markdown` package and headless Chrome (print to PDF).
    python docs/build_report_pdf.py
Set CHROME to the browser path if Chrome is installed somewhere else.
"""

import os
import re
import subprocess
import tempfile
from pathlib import Path

import markdown

DOCS = Path(__file__).resolve().parent
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")

CSS = """
@page { size: Letter; margin: 0.55in; }
body { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.32; color: #111; }
h1 { font-size: 17pt; margin: 0 0 4px; }
h2 { font-size: 11.5pt; margin: 10px 0 3px; border-bottom: 1px solid #bbb; padding-bottom: 1px; }
p, li { margin: 3px 0; }
ul, ol { margin: 3px 0; padding-left: 20px; }
blockquote { margin: 6px 0; padding: 4px 10px; background: #fff4cc; border-left: 4px solid #e0a800; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #f1f1f1; padding: 0 2px; }
"""


def main():
    source = (DOCS / "Development_Report.md").read_text(encoding="utf-8")
    body = markdown.markdown(source, extensions=["extra"])
    html = f"<!doctype html><meta charset='utf-8'><style>{CSS}</style>{body}"

    with tempfile.TemporaryDirectory() as tmp:
        html_path = Path(tmp) / "report.html"
        html_path.write_text(html, encoding="utf-8")
        pdf_path = DOCS / "Development_Report.pdf"
        subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
             f"--print-to-pdf={pdf_path}", html_path.as_uri()],
            check=True, capture_output=True,
        )
    pages = len(re.findall(rb"/Type\s*/Page[^s]", pdf_path.read_bytes()))
    print(f"wrote {pdf_path} ({pages} page(s))")


if __name__ == "__main__":
    main()
