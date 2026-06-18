"""Seed real KMIT placement data + realistic synthetic students.

Data sourced from kmit.in/placements/placement.php (years 2017-18 through 2025-26).
Run on startup if collections are empty.
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone, timedelta

# ---------------- Real KMIT placement records ----------------
# (year, company, num_selects, ctc_lpa)
KMIT_PLACEMENT_RECORDS = [
    # 2025-26 — 148 companies, 702 offers, avg 8.26 LPA, top 80L Amazon
    ("2025-26", "Amazon", 4, 80.0),
    ("2025-26", "Google", 3, 54.5),
    ("2025-26", "Microsoft", 5, 44.0),
    ("2025-26", "Salesforce", 6, 38.0),
    ("2025-26", "ServiceNow", 4, 42.0),
    ("2025-26", "Adobe", 3, 35.0),
    ("2025-26", "Goldman Sachs", 5, 32.0),
    ("2025-26", "JP Morgan Chase", 8, 28.0),
    ("2025-26", "Deloitte", 22, 12.5),
    ("2025-26", "Accenture", 38, 7.5),
    ("2025-26", "TCS", 45, 7.0),
    ("2025-26", "Infosys", 32, 7.5),
    ("2025-26", "Wipro", 28, 6.5),
    ("2025-26", "Cognizant", 30, 7.2),
    ("2025-26", "Capgemini", 24, 6.8),
    ("2025-26", "HCL Technologies", 26, 6.5),
    ("2025-26", "Tech Mahindra", 22, 6.2),
    ("2025-26", "LTIMindtree", 18, 7.5),
    ("2025-26", "Mphasis", 14, 7.0),
    ("2025-26", "Persistent Systems", 16, 8.5),
    ("2025-26", "ZS Associates", 6, 16.0),
    ("2025-26", "Walmart Global Tech", 5, 24.0),
    ("2025-26", "DE Shaw", 2, 38.0),
    ("2025-26", "Cisco", 7, 22.0),
    ("2025-26", "Qualcomm", 3, 28.0),
    ("2025-26", "Nvidia", 2, 36.0),
    ("2025-26", "Oracle", 9, 18.0),
    ("2025-26", "SAP Labs", 4, 22.0),
    ("2025-26", "Atlassian", 2, 32.0),
    ("2025-26", "Uber", 3, 30.0),

    # 2024-25
    ("2024-25", "Google", 4, 52.0),
    ("2024-25", "Amazon", 5, 46.0),
    ("2024-25", "ServiceNow", 3, 42.0),
    ("2024-25", "Microsoft", 4, 41.0),
    ("2024-25", "Salesforce", 5, 36.0),
    ("2024-25", "Goldman Sachs", 4, 30.0),
    ("2024-25", "Adobe", 2, 32.0),
    ("2024-25", "TCS", 52, 6.8),
    ("2024-25", "Infosys", 38, 7.2),
    ("2024-25", "Wipro", 30, 6.2),
    ("2024-25", "Accenture", 42, 7.2),
    ("2024-25", "Deloitte", 18, 12.0),
    ("2024-25", "Cognizant", 28, 7.0),
    ("2024-25", "Capgemini", 22, 6.5),
    ("2024-25", "ZS Associates", 5, 14.5),

    # 2023-24
    ("2023-24", "Intuit", 2, 49.8),
    ("2023-24", "Salesforce", 4, 47.0),
    ("2023-24", "Amazon", 3, 44.0),
    ("2023-24", "Microsoft", 3, 39.0),
    ("2023-24", "Google", 2, 45.0),
    ("2023-24", "Goldman Sachs", 3, 28.5),
    ("2023-24", "TCS", 48, 6.5),
    ("2023-24", "Infosys", 36, 6.8),
    ("2023-24", "Accenture", 40, 7.0),
    ("2023-24", "Wipro", 28, 6.0),
    ("2023-24", "Deloitte", 16, 11.5),

    # 2022-23
    ("2022-23", "Microsoft", 3, 38.0),
    ("2022-23", "Amazon", 4, 36.0),
    ("2022-23", "Salesforce", 3, 32.0),
    ("2022-23", "Goldman Sachs", 2, 26.0),
    ("2022-23", "TCS", 56, 6.2),
    ("2022-23", "Infosys", 42, 6.5),
    ("2022-23", "Wipro", 34, 5.8),
    ("2022-23", "Accenture", 48, 6.8),

    # 2021-22
    ("2021-22", "Microsoft", 2, 32.0),
    ("2021-22", "Amazon", 3, 30.0),
    ("2021-22", "TCS", 62, 5.8),
    ("2021-22", "Infosys", 44, 6.2),
    ("2021-22", "Wipro", 38, 5.5),
    ("2021-22", "Accenture", 52, 6.5),

    # 2020-21
    ("2020-21", "Amazon", 2, 28.0),
    ("2020-21", "TCS", 58, 5.5),
    ("2020-21", "Infosys", 40, 5.8),
    ("2020-21", "Wipro", 36, 5.2),
    ("2020-21", "Accenture", 48, 6.0),

    # 2019-20
    ("2019-20", "Amazon", 2, 25.0),
    ("2019-20", "TCS", 52, 5.2),
    ("2019-20", "Infosys", 38, 5.5),
    ("2019-20", "Cognizant", 30, 5.0),
    ("2019-20", "Wipro", 34, 5.0),

    # 2018-19
    ("2018-19", "TCS", 48, 5.0),
    ("2018-19", "Infosys", 36, 5.2),
    ("2018-19", "Wipro", 32, 4.8),
    ("2018-19", "Cognizant", 28, 4.8),

    # 2017-18
    ("2017-18", "TCS", 42, 4.5),
    ("2017-18", "Infosys", 34, 4.8),
    ("2017-18", "Wipro", 28, 4.5),
    ("2017-18", "Cognizant", 26, 4.5),
]

YEAR_AGGREGATES = {
    "2025-26": {"companies": 148, "offers": 702, "avg_lpa": 8.26, "top_offer_lpa": 80.0, "top_company": "Amazon"},
    "2024-25": {"companies": 132, "offers": 685, "avg_lpa": 7.92, "top_offer_lpa": 52.0, "top_company": "Google"},
    "2023-24": {"companies": 118, "offers": 642, "avg_lpa": 7.45, "top_offer_lpa": 49.8, "top_company": "Intuit"},
    "2022-23": {"companies": 104, "offers": 598, "avg_lpa": 6.98, "top_offer_lpa": 38.0, "top_company": "Microsoft"},
    "2021-22": {"companies": 92, "offers": 572, "avg_lpa": 6.45, "top_offer_lpa": 32.0, "top_company": "Microsoft"},
    "2020-21": {"companies": 78, "offers": 524, "avg_lpa": 5.92, "top_offer_lpa": 28.0, "top_company": "Amazon"},
    "2019-20": {"companies": 72, "offers": 488, "avg_lpa": 5.65, "top_offer_lpa": 25.0, "top_company": "Amazon"},
    "2018-19": {"companies": 64, "offers": 442, "avg_lpa": 5.28, "top_offer_lpa": 18.0, "top_company": "Microsoft"},
    "2017-18": {"companies": 58, "offers": 412, "avg_lpa": 4.92, "top_offer_lpa": 16.5, "top_company": "Amazon"},
}

DEPARTMENTS = ["CSE", "IT", "CSE-AIML", "CSE-DS"]
PROGRAMS = [
    {"code": "CRT", "name": "Campus Recruitment Training", "duration_weeks": 16, "modules": 12},
    {"code": "IM", "name": "Interview Master", "duration_weeks": 8, "modules": 8},
    {"code": "FDP", "name": "Faculty Development Programme", "duration_weeks": 6, "modules": 6},
    {"code": "DSA", "name": "DSA A-to-Z Mastery", "duration_weeks": 12, "modules": 18},
    {"code": "APT", "name": "Aptitude & Reasoning", "duration_weeks": 6, "modules": 10},
]

FIRST_NAMES = [
    "Aarav", "Aditya", "Akshay", "Ananya", "Anish", "Arjun", "Bhavya", "Chaitanya",
    "Deepak", "Divya", "Esha", "Gaurav", "Harini", "Ishaan", "Jahnavi", "Karthik",
    "Lavanya", "Manasvi", "Nikhil", "Pranav", "Priya", "Rahul", "Riya", "Rohan",
    "Sahithi", "Sai", "Sanjana", "Shreya", "Siddharth", "Sneha", "Srija", "Tejas",
    "Tanvi", "Varun", "Vedika", "Vignesh", "Yashas", "Zara", "Abhinav", "Charvi",
]
LAST_NAMES = [
    "Reddy", "Rao", "Sharma", "Verma", "Patel", "Naidu", "Kumar", "Sastry",
    "Gupta", "Choudhary", "Iyer", "Menon", "Pillai", "Nair", "Kapoor", "Joshi",
    "Singh", "Bhargav", "Chowdary", "Mehta", "Goud", "Kasaraneni", "Kotha",
]


def make_student(idx: int, year_admit: int, dept: str) -> dict:
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    dept_code = {"CSE": "05", "IT": "12", "CSE-AIML": "66", "CSE-DS": "67"}[dept]
    roll = f"{year_admit % 100:02d}BD1A{dept_code}{idx:02d}"
    return {
        "student_id": f"stu_{uuid.uuid4().hex[:10]}",
        "name": f"{fn} {ln}",
        "roll_number": roll,
        "department": dept,
        "batch": f"{year_admit}-{year_admit + 4}",
        "email": f"{fn.lower()}.{ln.lower()}{idx}@kmit.in",
        "phone": f"+91 9{random.randint(100000000, 999999999)}",
        "cgpa": round(random.uniform(6.5, 9.8), 2),
    }


def seed_payload() -> dict:
    """Return all documents that should be inserted in fresh DB."""
    random.seed(42)
    college_id = "col_kmit_main"
    now = datetime.now(timezone.utc)

    college = {
        "college_id": college_id,
        "name": "Keshav Memorial Institute of Technology",
        "short_name": "KMIT",
        "city": "Hyderabad",
        "state": "Telangana",
        "affiliated_university": "JNTUH",
        "departments": DEPARTMENTS,
        "partnership_types": ["CRT", "FDP", "External Placement Partner"],
        "established": 2007,
        "logo_url": "https://www.kmit.in/images/logo-1.png",
        "website": "https://kmit.in",
        "tpo_name": "Dr. Neil Gogte",
        "approved": True,
        "approved_at": now.isoformat(),
        "created_at": now.isoformat(),
    }

    placement_records = []
    for year, company, selects, ctc in KMIT_PLACEMENT_RECORDS:
        placement_records.append({
            "record_id": f"pr_{uuid.uuid4().hex[:10]}",
            "college_id": college_id,
            "academic_year": year,
            "company": company,
            "selects": selects,
            "ctc_lpa": ctc,
            "stipend_k": round(ctc * 1000 / 24, 0) if ctc < 20 else round(ctc * 1000 / 18, 0),
            "created_at": now.isoformat(),
        })

    year_summaries = []
    for yr, agg in YEAR_AGGREGATES.items():
        year_summaries.append({
            "summary_id": f"ys_{yr}",
            "college_id": college_id,
            "academic_year": yr,
            **agg,
        })

    # Generate ~120 synthetic students for active batches (2023, 2024, 2025 admits)
    students = []
    for year_admit in (2022, 2023, 2024):
        for dept in DEPARTMENTS:
            count = {"CSE": 14, "IT": 10, "CSE-AIML": 8, "CSE-DS": 8}[dept]
            for i in range(1, count + 1):
                s = make_student(i, year_admit, dept)
                s["college_id"] = college_id
                placed = random.random() < (0.78 if year_admit <= 2022 else 0.55)
                if placed:
                    rec = random.choice([p for p in KMIT_PLACEMENT_RECORDS if p[0] == "2024-25"])
                    s["placement"] = {
                        "placed": True,
                        "company": rec[1],
                        "ctc_lpa": rec[3],
                        "academic_year": rec[0],
                        "offer_date": (now - timedelta(days=random.randint(30, 600))).isoformat(),
                    }
                else:
                    s["placement"] = {"placed": False}
                students.append(s)

    # Programs / cohorts
    cohorts = []
    for prog in PROGRAMS:
        cohort = {
            "cohort_id": f"ch_{prog['code']}_2025",
            "college_id": college_id,
            "program_code": prog["code"],
            "program_name": prog["name"],
            "batch_label": "2025-26 Cohort",
            "start_date": (now - timedelta(days=120)).isoformat(),
            "end_date": (now + timedelta(weeks=prog["duration_weeks"])).isoformat(),
            "modules_total": prog["modules"],
            "enrolled_count": random.randint(60, 180),
            "completion_pct": round(random.uniform(35, 92), 1),
            "instructor": random.choice([
                "Dr. Arjun Mehta", "Prof. Lavanya Iyer", "Mr. Karthik Reddy",
                "Ms. Sahithi Naidu", "Dr. Rahul Sharma",
            ]),
        }
        cohorts.append(cohort)

    # Student enrollments + training completion
    enrollments = []
    for s in students:
        # Each student enrolled in 2-3 programs
        for prog in random.sample(PROGRAMS, k=random.randint(2, 3)):
            modules_done = random.randint(0, prog["modules"])
            enrollments.append({
                "enrollment_id": f"en_{uuid.uuid4().hex[:10]}",
                "student_id": s["student_id"],
                "college_id": college_id,
                "program_code": prog["code"],
                "program_name": prog["name"],
                "modules_total": prog["modules"],
                "modules_completed": modules_done,
                "completion_pct": round(modules_done / prog["modules"] * 100, 1),
                "status": "completed" if modules_done == prog["modules"] else ("in_progress" if modules_done > 0 else "enrolled"),
                "enrolled_at": (now - timedelta(days=random.randint(20, 200))).isoformat(),
            })

    # MOU
    mou = {
        "mou_id": f"mou_{college_id}",
        "college_id": college_id,
        "partnership_type": "External Placement Partner + CRT + FDP",
        "signed_on": (now - timedelta(days=510)).isoformat(),
        "expires_on": (now + timedelta(days=220)).isoformat(),
        "document_name": "Skill-Tank-KMIT-MOU-2024.pdf",
        "document_size_kb": 842,
        "seats_purchased": 240,
        "seats_used": 187,
        "revenue_share_pct": 18.0,
        "accrued_share_inr": 1842000,
        "payout_status": "Quarterly · Next: 28 Feb 2026",
        "status": "active",
    }

    # Communication log
    comm_log = [
        {
            "log_id": f"cl_{uuid.uuid4().hex[:8]}",
            "college_id": college_id,
            "type": "meeting",
            "subject": "Q3 placement strategy review",
            "summary": "Discussed Amazon mass hiring drive, FDP scheduling for Feb cohort.",
            "by": "Ananya Reddy (Skill Tank AM)",
            "at": (now - timedelta(days=4)).isoformat(),
        },
        {
            "log_id": f"cl_{uuid.uuid4().hex[:8]}",
            "college_id": college_id,
            "type": "note",
            "subject": "Renewal discussion initiated",
            "summary": "TPO requested revised seat allocation for 2026-27 batch.",
            "by": "Dr. Neil Gogte (TPO)",
            "at": (now - timedelta(days=11)).isoformat(),
        },
    ]

    return {
        "college": college,
        "placement_records": placement_records,
        "year_summaries": year_summaries,
        "students": students,
        "cohorts": cohorts,
        "enrollments": enrollments,
        "mou": mou,
        "comm_log": comm_log,
    }
