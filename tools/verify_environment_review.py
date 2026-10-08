#!/usr/bin/env python3
"""Require an independent GitHub protected-environment approval from this exact run."""
import argparse,json,os,subprocess
from datetime import datetime,timezone
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument("--manifest",required=True,type=Path);p.add_argument("--repo",required=True)
p.add_argument("--run-id",required=True,type=int);p.add_argument("--environment",default="visual-release-approval")
p.add_argument("--evidence-url",required=True)
a=p.parse_args()
# The token must be able to read actual reviewed deployment approvals.
query=f"repos/{a.repo}/actions/runs/{a.run_id}/approvals"
result=subprocess.run(["gh","api",query],capture_output=True,text=True)
if result.returncode: raise SystemExit("Cannot verify independent GitHub environment review: "+result.stderr)
try: approvals=json.loads(result.stdout)
except ValueError: raise SystemExit("GitHub returned invalid reviewer evidence")
if not isinstance(approvals,list): raise SystemExit("Invalid GitHub reviewer response")
matches=[]
for rv in approvals:
    user=rv.get("user") or {}
    names=[e.get("name") for e in rv.get("environments",[]) if isinstance(e,dict)]
    if rv.get("state")!="approved" or a.environment not in names: continue
    if user.get("type")=="Bot" or "[bot]" in str(user.get("login","")).lower():continue
    if user.get("login") and rv.get("submitted_at"):matches.append(rv)
if not matches: raise SystemExit("BLOCKED: no real independent approval for protected environment "+a.environment)
latest=matches[-1]
d=json.loads(a.manifest.read_text(encoding="utf-8"))
d["human_visual_review"]={"reviewer":latest["user"]["login"],"decision":"approved","source_commit":d["source_commit"],
    "reviewed_at":latest["submitted_at"],"evidence_url":a.evidence_url,"blocking_findings":[]}
a.manifest.write_text(json.dumps(d,indent=2)+"\n",encoding="utf-8")
print("Independent reviewer verified: "+latest["user"]["login"])
