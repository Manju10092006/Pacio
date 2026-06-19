"""CareerOS Intelligence Engine.

Computes placement readiness from real student signals instead of seeded or
hardcoded profile scores.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

READINESS_WEIGHTS = {
    "dsa": 0.30,
    "aptitude": 0.20,
    "ats": 0.15,
    "interview": 0.15,
    "cgpa": 0.10,
    "consistency": 0.10,
}


def _clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def _avg(values: list[float]) -> float:
    clean = [v for v in values if v is not None]
    return sum(clean) / len(clean) if clean else 0


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def _component_status(score: float) -> str:
    if score >= 80:
        return "strong"
    if score >= 65:
        return "on_track"
    if score >= 50:
        return "watch"
    return "critical"


def _band(score: float) -> dict[str, str]:
    if score >= 85:
        return {"code": "placement_ready", "label": "Placement ready"}
    if score >= 72:
        return {"code": "nearly_ready", "label": "Nearly ready"}
    if score >= 58:
        return {"code": "developing", "label": "Developing"}
    return {"code": "needs_intervention", "label": "Needs intervention"}


def _recency_score(dates: list[datetime], now: datetime) -> float:
    if not dates:
        return 0
    latest = max(dates)
    days = max(0, (now - latest).days)
    if days <= 7:
        return 100
    if days <= 30:
        return 82
    if days <= 60:
        return 62
    if days <= 90:
        return 42
    return 20


def _recommendations(component_scores: dict[str, float], risks: list[dict[str, Any]]) -> list[dict[str, str]]:
    labels = {
        "dsa": "Solve 12-15 question-level DSA problems this week, prioritizing weak topics.",
        "aptitude": "Run two timed aptitude sets and review speed plus accuracy by section.",
        "ats": "Upload a role-specific resume version and close missing keyword gaps.",
        "interview": "Schedule a mock interview and review communication, confidence, and technical rubric scores.",
        "cgpa": "Keep eligibility protected; target roles where current CGPA clears the cutoff.",
        "consistency": "Restart a weekly cadence: DSA, aptitude, resume, and applications should all show fresh activity.",
    }
    ordered = sorted(component_scores.items(), key=lambda item: item[1])
    focus_keys = [key for key, _ in ordered[:3]]
    recommendations = [
        {"area": key, "action": labels[key]}
        for key in focus_keys
        if key in labels
    ]
    if risks and not recommendations:
        recommendations.append({"area": "readiness", "action": risks[0]["message"]})
    return recommendations[:3]


async def build_student_readiness(db: Any, student: dict, *, now: Optional[datetime] = None) -> dict:
    """Return a decision-ready readiness assessment for one student."""
    now = now or datetime.now(timezone.utc)
    student_id = student["student_id"]

    dsa_question_rows = await db.dsa_question_progress.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    dsa_catalog_total = await db.dsa_questions.count_documents({})
    dsa_rows = await db.dsa_progress.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    aptitude_question_rows = await db.aptitude_question_progress.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    aptitude_rows = await db.aptitude_scores.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    ats_rows = await db.ats_reports.find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    resume_versions = await db.resume_versions.find({"student_id": student_id}, {"_id": 0}).sort("version", -1).limit(5).to_list(5)
    interview_rows = await db.interview_reports.find({"student_id": student_id}, {"_id": 0}).sort("conducted_at", -1).limit(20).to_list(20)
    application_rows = await db.applications.find({"student_id": student_id}, {"_id": 0}).sort("applied_at", -1).limit(50).to_list(50)

    if dsa_question_rows and dsa_catalog_total:
        dsa_total = dsa_catalog_total
        dsa_solved = sum(1 for row in dsa_question_rows if row.get("solved"))
        dsa_attempted = sum(1 for row in dsa_question_rows if row.get("attempted") or row.get("solved"))
        dsa_activity_rows = dsa_question_rows
    else:
        dsa_total = sum(row.get("total", 0) or 0 for row in dsa_rows)
        dsa_solved = sum(row.get("solved", 0) or 0 for row in dsa_rows)
        dsa_attempted = sum(row.get("attempted", 0) or row.get("solved", 0) or 0 for row in dsa_rows)
        dsa_activity_rows = dsa_rows
    dsa_score = (dsa_solved / dsa_total * 100) if dsa_total else 0
    dsa_dates = [_parse_dt(row.get("last_solved_at")) or _parse_dt(row.get("updated_at")) for row in dsa_activity_rows]
    dsa_dates = [date for date in dsa_dates if date]

    if aptitude_question_rows:
        aptitude_score_avg = _avg([row.get("mastery_score", 0) or 0 for row in aptitude_question_rows])
        aptitude_accuracy = _avg([row.get("accuracy", 0) or 0 for row in aptitude_question_rows])
        aptitude_time = _avg([row.get("average_time", 0) or 0 for row in aptitude_question_rows])
        speed_score = _avg([row.get("speed", 0) or 0 for row in aptitude_question_rows])
        solved_questions = sum(1 for row in aptitude_question_rows if row.get("solved"))
        attempted_questions = sum(1 for row in aptitude_question_rows if row.get("attempted"))
        aptitude_score = (aptitude_score_avg * 0.55) + (aptitude_accuracy * 0.25) + (speed_score * 0.15) + (min(100, solved_questions / max(1, attempted_questions) * 100) * 0.05)
        aptitude_dates = [_parse_dt(row.get("last_attempted")) for row in aptitude_question_rows]
    else:
        aptitude_score_avg = _avg([row.get("score_pct", 0) or 0 for row in aptitude_rows])
        aptitude_accuracy = _avg([row.get("accuracy_pct", 0) or 0 for row in aptitude_rows])
        aptitude_time = _avg([row.get("avg_time_sec", 0) or 0 for row in aptitude_rows])
        speed_score = _clamp(100 - max(0, aptitude_time - 45) * 1.15) if aptitude_rows else 0
        aptitude_score = (aptitude_score_avg * 0.65) + (aptitude_accuracy * 0.25) + (speed_score * 0.10)
        aptitude_dates = [_parse_dt(row.get("attempted_at")) for row in aptitude_rows]
    aptitude_dates = [date for date in aptitude_dates if date]

    latest_resume = resume_versions[0] if resume_versions else None
    latest_ats = ats_rows[0] if ats_rows else None
    ats_score = latest_resume.get("ats_score", 0) if latest_resume else latest_ats.get("score", 0) if latest_ats else student.get("ats_score", 0)
    ats_dates = [_parse_dt(row.get("upload_date")) for row in resume_versions] + [_parse_dt(row.get("created_at")) for row in ats_rows]
    ats_dates = [date for date in ats_dates if date]

    interview_scores: list[float] = []
    for row in interview_rows:
        if row.get("overall_score") is not None:
            interview_scores.append(row.get("overall_score") or 0)
        else:
            interview_scores.append(_avg([
                row.get("confidence_score", 0) or 0,
                row.get("communication_score", 0) or 0,
                row.get("technical_score", 0) or 0,
            ]))
    interview_score = _avg(interview_scores)
    interview_dates = [_parse_dt(row.get("conducted_at")) for row in interview_rows]
    interview_dates = [date for date in interview_dates if date]

    cgpa = float(student.get("cgpa") or 0)
    cgpa_score = _clamp(((cgpa - 5.0) / 5.0) * 100)

    application_dates = [_parse_dt(row.get("applied_at")) for row in application_rows]
    application_dates = [date for date in application_dates if date]
    all_activity_dates = dsa_dates + aptitude_dates + ats_dates + interview_dates + application_dates
    active_pillars = sum([
        bool(dsa_question_rows or dsa_rows),
        bool(aptitude_question_rows or aptitude_rows),
        bool(resume_versions or ats_rows),
        bool(interview_rows),
        bool(application_rows),
    ])
    active_applications = [
        row for row in application_rows
        if row.get("stage") not in {"Rejected", "Selected"}
    ]
    recency = _recency_score(all_activity_dates, now)
    breadth = active_pillars / 5 * 100
    cadence = _clamp((len(active_applications) * 18) + (len(application_rows) * 4))
    consistency_score = (recency * 0.45) + (breadth * 0.35) + (cadence * 0.20)

    component_scores = {
        "dsa": _clamp(dsa_score),
        "aptitude": _clamp(aptitude_score),
        "ats": _clamp(ats_score),
        "interview": _clamp(interview_score),
        "cgpa": _clamp(cgpa_score),
        "consistency": _clamp(consistency_score),
    }
    overall = sum(component_scores[key] * READINESS_WEIGHTS[key] for key in READINESS_WEIGHTS)
    overall = round(_clamp(overall), 1)

    risks: list[dict[str, Any]] = []
    risk_messages = {
        "dsa": "DSA depth is below placement benchmark.",
        "aptitude": "Aptitude performance needs speed or accuracy improvement.",
        "ats": "Resume ATS signal is below recruiter screening comfort.",
        "interview": "Interview performance is not yet consistently strong.",
        "cgpa": "CGPA may restrict eligibility for some drives.",
        "consistency": "Recent preparation activity is not consistent enough.",
    }
    for key, score in component_scores.items():
        threshold = 60 if key != "cgpa" else 55
        if score < threshold:
            risks.append({
                "area": key,
                "severity": "high" if score < 45 else "medium",
                "score": round(score, 1),
                "message": risk_messages[key],
            })
    risks.sort(key=lambda row: (0 if row["severity"] == "high" else 1, row["score"]))

    components = {
        key: {
            "score": round(score, 1),
            "weight": READINESS_WEIGHTS[key],
            "status": _component_status(score),
        }
        for key, score in component_scores.items()
    }
    readiness_band = _band(overall)

    return {
        "student_id": student_id,
        "score": overall,
        "readiness_score": overall,
        "band": readiness_band["code"],
        "label": readiness_band["label"],
        "components": components,
        "weights": READINESS_WEIGHTS,
        "signals": {
            "dsa": {
                "solved": dsa_solved,
                "attempted": dsa_attempted,
                "total": dsa_total,
                "completion_pct": round(dsa_score, 1),
                "topics": len({row.get("topic_code") for row in dsa_activity_rows if row.get("topic_code")}),
                "last_activity_at": max(dsa_dates).isoformat() if dsa_dates else None,
            },
            "aptitude": {
                "sections": len(aptitude_rows),
                "avg_score": round(aptitude_score_avg, 1),
                "avg_accuracy": round(aptitude_accuracy, 1),
                "avg_time_sec": round(aptitude_time, 1),
                "speed_score": round(speed_score, 1),
                "question_rows": len(aptitude_question_rows),
                "revision_due": sum(1 for row in aptitude_question_rows if row.get("revision_due")),
                "last_activity_at": max(aptitude_dates).isoformat() if aptitude_dates else None,
            },
            "ats": {
                "score": round(ats_score or 0, 1),
                "source": "resume_version" if latest_resume else "latest_report" if latest_ats else "profile_fallback",
                "resume_id": latest_resume.get("resume_id") if latest_resume else None,
                "version": latest_resume.get("version") if latest_resume else None,
                "keyword_score": latest_resume.get("keyword_score") if latest_resume else latest_ats.get("keyword_match_pct") if latest_ats else None,
                "recruiter_match_score": latest_resume.get("recruiter_match_score") if latest_resume else None,
                "latest_report_id": latest_ats.get("ats_id") if latest_ats else None,
                "missing_keywords": latest_resume.get("missing_keywords", []) if latest_resume else latest_ats.get("missing_keywords", []) if latest_ats else [],
                "last_activity_at": max(ats_dates).isoformat() if ats_dates else None,
            },
            "interview": {
                "reports": len(interview_rows),
                "avg_score": round(interview_score, 1),
                "last_activity_at": max(interview_dates).isoformat() if interview_dates else None,
            },
            "cgpa": {
                "value": cgpa,
                "normalized_score": round(cgpa_score, 1),
            },
            "consistency": {
                "score": round(consistency_score, 1),
                "active_pillars": active_pillars,
                "active_applications": len(active_applications),
                "latest_activity_at": max(all_activity_dates).isoformat() if all_activity_dates else None,
            },
        },
        "risks": risks,
        "recommendations": _recommendations(component_scores, risks),
        "computed_at": now.isoformat(),
        "formula": "DSA 30%, Aptitude 20%, ATS 15%, Interview 15%, CGPA 10%, Consistency 10%",
    }


async def build_readiness_roster(
    db: Any,
    *,
    institution_id: str,
    department: Optional[str] = None,
    limit: int = 200,
) -> dict:
    query: dict[str, Any] = {"institution_id": institution_id}
    if department:
        query["department"] = department
    safe_limit = max(1, min(limit, 1000))
    students = await db.students.find(query, {"_id": 0}).limit(safe_limit).to_list(safe_limit)
    rows = []
    for student in students:
        readiness = await build_student_readiness(db, student)
        rows.append({
            "student_id": student["student_id"],
            "name": student.get("name"),
            "roll_number": student.get("roll_number"),
            "department": student.get("department"),
            "cgpa": student.get("cgpa"),
            "placement": student.get("placement", {}),
            "readiness_score": readiness["score"],
            "readiness_band": readiness["band"],
            "readiness_label": readiness["label"],
            "components": readiness["components"],
            "risks": readiness["risks"],
            "top_recommendations": readiness["recommendations"],
        })
    rows.sort(key=lambda row: row["readiness_score"], reverse=True)

    scores = [row["readiness_score"] for row in rows]
    component_keys = list(READINESS_WEIGHTS.keys())
    component_avgs = {
        key: round(_avg([row["components"][key]["score"] for row in rows]), 1)
        for key in component_keys
    }
    by_band: dict[str, int] = {}
    for row in rows:
        by_band[row["readiness_band"]] = by_band.get(row["readiness_band"], 0) + 1

    weak_students = sorted(rows, key=lambda row: row["readiness_score"])[:10]
    return {
        "institution_id": institution_id,
        "department": department,
        "count": len(rows),
        "avg_readiness": round(_avg(scores), 1),
        "placement_ready": by_band.get("placement_ready", 0),
        "needs_intervention": by_band.get("needs_intervention", 0),
        "by_band": by_band,
        "component_avgs": component_avgs,
        "weak_students": weak_students,
        "rows": rows,
    }
