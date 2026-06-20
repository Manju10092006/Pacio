import React, { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";
import { FileText, ChevronDown, ChevronUp, Plus, Trash2, Download, Sparkles } from "lucide-react";

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Traditional format, ATS-friendly." },
  { id: "modern", name: "Modern", desc: "Clean layout with visual accents." },
  { id: "technical", name: "Technical", desc: "Optimised for engineering roles." },
];

const emptyProject = { name: "", description: "", tech_stack: "" };
const emptyExperience = { company: "", role: "", duration: "", description: "" };

export default function StudentResume() {
  useAuth();
  const [template, setTemplate] = useState("classic");
  const [sections, setSections] = useState({
    summary: "",
    education: { institution: "", degree: "", year: "", cgpa: "" },
    skills: "",
    projects: [{ ...emptyProject }],
    experience: [{ ...emptyExperience }],
  });
  const [expanded, setExpanded] = useState({ summary: true, education: true, skills: true, projects: true, experience: true });
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [parsing, setParsing] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      await loadPdfJs();
      const fileUrl = URL.createObjectURL(file);
      const parsed = await parseResumeFromPdf(fileUrl);
      
      setSections({
        summary: parsed.profile.summary || "",
        education: {
          institution: parsed.educations[0]?.school || "",
          degree: parsed.educations[0]?.degree || "",
          year: parsed.educations[0]?.date || "",
          cgpa: parsed.educations[0]?.gpa || ""
        },
        skills: (parsed.skills || []).join(", "),
        projects: parsed.projects.length > 0 ? parsed.projects.map(p => ({
          name: p.project || "",
          description: p.descriptions?.join(" ") || "",
          tech_stack: ""
        })) : [{ ...emptyProject }],
        experience: parsed.workExperiences.length > 0 ? parsed.workExperiences.map(w => ({
          company: w.company || "",
          role: w.jobTitle || "",
          duration: w.date || "",
          description: w.descriptions?.join(" ") || ""
        })) : [{ ...emptyExperience }]
      });
      toast.success("Resume parsed and form pre-filled!");
    } catch (err) {
      toast.error(err.message || "Failed to parse PDF resume.");
    } finally {
      setParsing(false);
    }
  };

  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const setEdu = (key, value) => setSections((s) => ({ ...s, education: { ...s.education, [key]: value } }));

  const setProject = (idx, key, value) => {
    const updated = [...sections.projects];
    updated[idx] = { ...updated[idx], [key]: value };
    setSections((s) => ({ ...s, projects: updated }));
  };

  const addProject = () => setSections((s) => ({ ...s, projects: [...s.projects, { ...emptyProject }] }));
  const removeProject = (idx) => setSections((s) => ({ ...s, projects: s.projects.filter((_, i) => i !== idx) }));

  const setExp = (idx, key, value) => {
    const updated = [...sections.experience];
    updated[idx] = { ...updated[idx], [key]: value };
    setSections((s) => ({ ...s, experience: updated }));
  };

  const addExperience = () => setSections((s) => ({ ...s, experience: [...s.experience, { ...emptyExperience }] }));
  const removeExperience = (idx) => setSections((s) => ({ ...s, experience: s.experience.filter((_, i) => i !== idx) }));

  const generate = async () => {
    setGenerating(true);
    setDownloadUrl(null);
    try {
      const payload = {
        template,
        sections: {
          summary: sections.summary,
          education: sections.education,
          skills: sections.skills.split(",").map((s) => s.trim()).filter(Boolean),
          projects: sections.projects,
          experience: sections.experience,
        },
      };
      const { data } = await api.post("/me/resume/build", payload);
      setDownloadUrl(data.download_url || data.url);
      toast.success("Resume generated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const SectionHeader = ({ sectionKey, label, count }) => (
    <button
      onClick={() => toggle(sectionKey)}
      className="w-full flex items-center justify-between p-5 border-b border-line hover:bg-bone-100 transition-colors"
      data-testid={`resume-toggle-${sectionKey}`}
    >
      <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">
        {label} {count != null && <span className="tnum">({count})</span>}
      </div>
      {expanded[sectionKey] ? <ChevronUp size={14} className="text-ink-400" /> : <ChevronDown size={14} className="text-ink-400" />}
    </button>
  );

  const inputClass = "w-full px-3 py-2.5 border border-line bg-bone-50 text-sm focus:outline-none focus:border-accent";

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ RESUME BUILDER</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="resume-heading">
          Build Your <span className="text-accent">Resume</span>
        </h1>
        <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Craft a professional resume optimised for ATS and recruiter review.</p>
      </div>

      {/* AI Resume Importer */}
      <div className="border border-line bg-paper p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">AI AUTO-FILL</div>
          <h3 className="font-display text-2xl mt-2 tracking-tight">Import from Existing Resume</h3>
          <p className="font-serif text-sm text-ink-500 mt-1">
            Upload your current PDF resume. Our client-side parser will extract your profile, experience, projects, and skills to auto-fill the builder instantly.
          </p>
        </div>
        <label className={`w-full md:w-auto min-w-[240px] block border border-dashed border-line p-6 text-center cursor-pointer hover:border-accent hover:bg-bone-100 transition-all ${parsing ? "opacity-50 pointer-events-none" : ""}`}>
          <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={parsing} />
          <div className="font-mono text-xs uppercase tracking-wider text-ink-500">
            {parsing ? "PARSING RESUME..." : "SELECT RESUME PDF"}
          </div>
        </label>
      </div>

      {/* Template selector */}
      <div data-testid="resume-templates">
        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-4">SELECT TEMPLATE</div>
        <div className="grid grid-cols-12 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`col-span-12 md:col-span-4 p-6 text-left transition-colors ${template === t.id ? "border-2 border-ink-900 bg-bone-50" : "editorial hover:border-ink-900"}`}
              data-testid={`resume-template-${t.id}`}
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className={template === t.id ? "text-accent" : "text-ink-300"} />
                <div>
                  <div className="font-display text-xl tracking-tight">{t.name}</div>
                  <div className="font-serif text-sm text-ink-500 mt-1">{t.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Form sections */}
      <div className="border border-line bg-bone-50" data-testid="resume-form">
        {/* Personal Summary */}
        <SectionHeader sectionKey="summary" label="PERSONAL SUMMARY" />
        {expanded.summary && (
          <div className="p-5">
            <textarea
              value={sections.summary}
              onChange={(e) => setSections((s) => ({ ...s, summary: e.target.value }))}
              placeholder="A brief professional summary highlighting your strengths and goals…"
              rows={4} data-testid="resume-summary"
              className={`${inputClass} font-serif`}
            />
          </div>
        )}

        {/* Education */}
        <SectionHeader sectionKey="education" label="EDUCATION" />
        {expanded.education && (
          <div className="p-5 grid grid-cols-12 gap-3">
            <input
              value={sections.education.institution}
              onChange={(e) => setEdu("institution", e.target.value)}
              placeholder="Institution" data-testid="resume-edu-institution"
              className={`col-span-12 md:col-span-6 ${inputClass}`}
            />
            <input
              value={sections.education.degree}
              onChange={(e) => setEdu("degree", e.target.value)}
              placeholder="Degree / Program" data-testid="resume-edu-degree"
              className={`col-span-12 md:col-span-6 ${inputClass}`}
            />
            <input
              value={sections.education.year}
              onChange={(e) => setEdu("year", e.target.value)}
              placeholder="Graduation year" data-testid="resume-edu-year"
              className={`col-span-6 md:col-span-3 ${inputClass}`}
            />
            <input
              value={sections.education.cgpa}
              onChange={(e) => setEdu("cgpa", e.target.value)}
              placeholder="CGPA" data-testid="resume-edu-cgpa"
              className={`col-span-6 md:col-span-3 ${inputClass}`}
            />
          </div>
        )}

        {/* Skills */}
        <SectionHeader sectionKey="skills" label="SKILLS" />
        {expanded.skills && (
          <div className="p-5">
            <input
              value={sections.skills}
              onChange={(e) => setSections((s) => ({ ...s, skills: e.target.value }))}
              placeholder="React, Python, SQL, Docker… (comma-separated)" data-testid="resume-skills"
              className={inputClass}
            />
            {sections.skills && (
              <div className="flex flex-wrap gap-2 mt-3">
                {sections.skills.split(",").map((s) => s.trim()).filter(Boolean).map((skill, i) => (
                  <span key={i} className="font-mono text-[10px] tracking-[0.2em] px-2 py-0.5 border border-line bg-bone-100">
                    {skill.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Projects */}
        <SectionHeader sectionKey="projects" label="PROJECTS" count={sections.projects.length} />
        {expanded.projects && (
          <div className="p-5 space-y-4">
            {sections.projects.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 p-4 border border-line bg-bone-100" data-testid={`resume-project-${idx}`}>
                <input
                  value={p.name} onChange={(e) => setProject(idx, "name", e.target.value)}
                  placeholder="Project name" className={`col-span-12 md:col-span-4 ${inputClass}`}
                />
                <input
                  value={p.tech_stack} onChange={(e) => setProject(idx, "tech_stack", e.target.value)}
                  placeholder="Tech stack" className={`col-span-12 md:col-span-4 ${inputClass}`}
                />
                <div className="col-span-10 md:col-span-3">
                  <textarea
                    value={p.description} onChange={(e) => setProject(idx, "description", e.target.value)}
                    placeholder="Description" rows={1} className={`${inputClass} font-serif`}
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                  {sections.projects.length > 1 && (
                    <button onClick={() => removeProject(idx)} className="text-ink-400 hover:text-accent transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addProject} className="btn btn-ghost text-xs py-2 px-3" data-testid="resume-add-project">
              <Plus size={14} /> Add project
            </button>
          </div>
        )}

        {/* Experience */}
        <SectionHeader sectionKey="experience" label="EXPERIENCE" count={sections.experience.length} />
        {expanded.experience && (
          <div className="p-5 space-y-4">
            {sections.experience.map((exp, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 p-4 border border-line bg-bone-100" data-testid={`resume-experience-${idx}`}>
                <input
                  value={exp.company} onChange={(e) => setExp(idx, "company", e.target.value)}
                  placeholder="Company" className={`col-span-12 md:col-span-3 ${inputClass}`}
                />
                <input
                  value={exp.role} onChange={(e) => setExp(idx, "role", e.target.value)}
                  placeholder="Role / Title" className={`col-span-12 md:col-span-3 ${inputClass}`}
                />
                <input
                  value={exp.duration} onChange={(e) => setExp(idx, "duration", e.target.value)}
                  placeholder="Duration (e.g. 6 months)" className={`col-span-12 md:col-span-2 ${inputClass}`}
                />
                <div className="col-span-10 md:col-span-3">
                  <textarea
                    value={exp.description} onChange={(e) => setExp(idx, "description", e.target.value)}
                    placeholder="Key responsibilities" rows={1} className={`${inputClass} font-serif`}
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                  {sections.experience.length > 1 && (
                    <button onClick={() => removeExperience(idx)} className="text-ink-400 hover:text-accent transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addExperience} className="btn btn-ghost text-xs py-2 px-3" data-testid="resume-add-experience">
              <Plus size={14} /> Add experience
            </button>
          </div>
        )}
      </div>

      {/* Generate + Download */}
      <div className="flex flex-wrap items-center gap-4" data-testid="resume-actions">
        <button onClick={generate} disabled={generating} className="btn" data-testid="resume-generate-btn">
          <Sparkles size={14} /> {generating ? "Generating…" : "Generate Resume"}
        </button>
      </div>
    </div>
  );
}

// PDF.JS client-side parser helpers
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.body.appendChild(script);
  });
};

async function parseResumeFromPdf(fileUrl) {
  try {
    const textItems = await readPdf(fileUrl);
    const lines = groupTextItemsIntoLines(textItems);
    const sections = groupLinesIntoSections(lines);
    const resume = extractResumeFromSections(sections);
    return resume;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF. Please ensure it is a single-column resume.");
  }
}

async function readPdf(fileUrl) {
  const pdfjs = window.pdfjsLib || window.pdfjs;
  if (!pdfjs) {
    throw new Error("PDF.js library not loaded. Please try again.");
  }

  const pdfFile = await pdfjs.getDocument(fileUrl).promise;
  let textItems = [];

  for (let i = 1; i <= pdfFile.numPages; i++) {
    const page = await pdfFile.getPage(i);
    const textContent = await page.getTextContent();
    let commonObjs = null;
    try {
      await page.getOperatorList();
      commonObjs = page.commonObjs;
    } catch (e) {
      console.warn("Failed to get operator list", e);
    }

    const pageTextItems = textContent.items.map((item) => {
      const { str: text, transform, fontName: pdfFontName, ...otherProps } = item;
      const x = transform[4];
      const y = transform[5];
      const fontObj = commonObjs ? commonObjs.get(pdfFontName) : null;
      const fontName = fontObj ? fontObj.name : pdfFontName;
      const newText = text.replace(/-­‐/g, "-");

      return {
        ...otherProps,
        fontName,
        text: newText,
        x,
        y,
      };
    });

    textItems.push(...pageTextItems);
  }

  return textItems.filter(item => !(!item.hasEOL && item.text.trim() === ""));
}

function groupTextItemsIntoLines(textItems) {
  const lines = [];
  let line = [];

  for (let item of textItems) {
    if (item.hasEOL) {
      if (item.text.trim() !== "") {
        line.push({ ...item });
      }
      if (line.length > 0) {
        lines.push(line);
      }
      line = [];
    } else if (item.text.trim() !== "") {
      line.push({ ...item });
    }
  }
  if (line.length > 0) {
    lines.push(line);
  }

  const typicalCharWidth = getTypicalCharWidth(lines.flat());
  for (let line of lines) {
    for (let i = line.length - 1; i > 0; i--) {
      const currentItem = line[i];
      const leftItem = line[i - 1];
      const leftItemXEnd = leftItem.x + (leftItem.width || 0);
      const distance = currentItem.x - leftItemXEnd;
      if (distance <= typicalCharWidth) {
        if (shouldAddSpaceBetweenText(leftItem.text, currentItem.text)) {
          leftItem.text += " ";
        }
        leftItem.text += currentItem.text;
        const currentItemXEnd = currentItem.x + (currentItem.width || 0);
        leftItem.width = currentItemXEnd - leftItem.x;
        line.splice(i, 1);
      }
    }
  }

  return lines;
}

function getTypicalCharWidth(textItems) {
  textItems = textItems.filter(item => item.text.trim() !== "");
  if (textItems.length === 0) return 5;
  
  const heightToCount = {};
  let commonHeight = 0;
  let heightMaxCount = 0;
  
  const fontNameToCount = {};
  let commonFontName = "";
  let fontNameMaxCount = 0;

  for (let item of textItems) {
    const { text, height, fontName } = item;
    
    if (!heightToCount[height]) heightToCount[height] = 0;
    heightToCount[height]++;
    if (heightToCount[height] > heightMaxCount) {
      commonHeight = height;
      heightMaxCount = heightToCount[height];
    }

    if (!fontNameToCount[fontName]) fontNameToCount[fontName] = 0;
    fontNameToCount[fontName] += text.length;
    if (fontNameToCount[fontName] > fontNameMaxCount) {
      commonFontName = fontName;
      fontNameMaxCount = fontNameToCount[fontName];
    }
  }

  const commonTextItems = textItems.filter(
    item => item.fontName === commonFontName && item.height === commonHeight
  );
  
  const [totalWidth, numChars] = commonTextItems.reduce(
    (acc, cur) => [acc[0] + (cur.width || 0), acc[1] + cur.text.length],
    [0, 0]
  );
  
  return totalWidth / numChars || 5;
}

function shouldAddSpaceBetweenText(leftText, rightText) {
  const leftTextEnd = leftText[leftText.length - 1];
  const rightTextStart = rightText[0];
  return (
    ([":", ",", "|", "."].includes(leftTextEnd) && rightTextStart !== " ") ||
    (leftTextEnd !== " " && ["|"].includes(rightTextStart))
  );
}

function groupLinesIntoSections(lines) {
  const sections = {};
  let sectionName = "profile";
  let sectionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line[0]?.text.trim() || "";
    
    if (isSectionTitle(line, i)) {
      sections[sectionName] = [...sectionLines];
      sectionName = text.toLowerCase();
      sectionLines = [];
    } else {
      sectionLines.push(line);
    }
  }
  if (sectionLines.length > 0) {
    sections[sectionName] = [...sectionLines];
  }

  return sections;
}

function isSectionTitle(line, lineNumber) {
  if (lineNumber < 2 || line.length > 1 || line.length === 0) {
    return false;
  }

  const textItem = line[0];
  const text = textItem.text.trim();
  const isBold = textItem.fontName && textItem.fontName.toLowerCase().includes("bold");
  const isAllUpperCase = /^[A-Z\s&]+$/.test(text) && /[A-Z]/.test(text);
  const sectionKeywords = ["experience", "education", "project", "skill", "summary", "objective"];

  if (isBold && isAllUpperCase) {
    return true;
  }

  const textHasAtMost2Words = text.split(" ").filter(s => s !== "&").length <= 2;
  const startsWithCapital = /[A-Z]/.test(text.slice(0, 1));
  const hasOnlyLetters = /^[A-Za-z\s&]+$/.test(text);

  if (textHasAtMost2Words && hasOnlyLetters && startsWithCapital) {
    return sectionKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  return false;
}

function extractResumeFromSections(sections) {
  const profile = extractProfile(sections);
  const workExperiences = extractWorkExperience(sections);
  const educations = extractEducation(sections);
  const projects = extractProjects(sections);
  const skills = extractSkills(sections);

  return {
    profile,
    workExperiences,
    educations,
    projects,
    skills: skills.descriptions || []
  };
}

function extractProfile(sections) {
  const profileLines = sections.profile || [];
  const allText = profileLines.flat().map(item => item.text).join(" ");

  const emailMatch = allText.match(/\S+@\S+\.\S+/);
  const email = emailMatch ? emailMatch[0] : "";

  const phoneMatch = allText.match(/\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  const locationMatch = allText.match(/[A-Z][a-zA-Z\s]+, [A-Z]{2}/);
  const location = locationMatch ? locationMatch[0] : "";

  const urlMatch = allText.match(/(https?:\/\/|www\.)\S+\.\S+/);
  const website = urlMatch ? urlMatch[0] : "";

  let name = "";
  for (let line of profileLines) {
    if (line.length > 0) {
      const item = line[0];
      const isBold = item.fontName && item.fontName.toLowerCase().includes("bold");
      const isLarge = item.height > 10;
      if (isBold || isLarge) {
        name = item.text.trim();
        if (/^[A-Za-z\s\.]+$/.test(name) && name.split(" ").length <= 4) {
          break;
        }
      }
    }
  }

  let summary = "";
  for (let line of profileLines) {
    const text = line.map(item => item.text).join(" ").trim();
    if (text.split(" ").length >= 4 && !email && !phone && !location && !website) {
      summary = text;
      break;
    }
  }

  return {
    name: name || "",
    title: "",
    email: email || "",
    phone: phone || "",
    location: location || "",
    website: website || "",
    summary: summary || ""
  };
}

function extractWorkExperience(sections) {
  const experiences = [];
  const expSection = sections.experience || sections.work || sections["work experience"] || [];
  
  let currentExp = null;
  for (let line of expSection) {
    const text = line.map(item => item.text).join(" ").trim();
    if (text.length > 0) {
      if (/\d{4}/.test(text)) {
        if (currentExp) {
          currentExp.date = text;
        }
      } else if (text.length > 5 && !text.startsWith("•") && !text.startsWith("-")) {
        if (!currentExp) {
          currentExp = { company: "", jobTitle: "", date: "", descriptions: [] };
        } else if (!currentExp.jobTitle) {
          currentExp.jobTitle = text;
        } else if (!currentExp.company) {
          currentExp.company = text;
        }
      } else if (text.startsWith("•") || text.startsWith("-")) {
        if (currentExp) {
          currentExp.descriptions.push(text.replace(/^[•\-]\s*/, ""));
        }
      }
    }
  }
  
  if (currentExp && currentExp.company) {
    experiences.push(currentExp);
  }

  return experiences.length > 0 ? experiences : [{ company: "", jobTitle: "", date: "", descriptions: [""] }];
}

function extractEducation(sections) {
  const educations = [];
  const eduSection = sections.education || [];
  
  let currentEdu = null;
  for (let line of eduSection) {
    const text = line.map(item => item.text).join(" ").trim();
    if (text.length > 0) {
      if (/\d{4}/.test(text)) {
        if (currentEdu) {
          currentEdu.date = text;
        }
      } else if (text.length > 3) {
        if (!currentEdu) {
          currentEdu = { school: "", degree: "", date: "", gpa: "", descriptions: [] };
          currentEdu.degree = text;
        } else if (!currentEdu.school) {
          currentEdu.school = text;
        }
      }
    }
  }
  
  if (currentEdu && currentEdu.degree) {
    educations.push(currentEdu);
  }

  return educations.length > 0 ? educations : [{ school: "", degree: "", date: "", gpa: "", descriptions: [] }];
}

function extractProjects(sections) {
  const projects = [];
  const projSection = sections.project || sections.projects || [];
  
  let currentProj = null;
  for (let line of projSection) {
    const text = line.map(item => item.text).join(" ").trim();
    if (text.length > 0) {
      if (/\d{4}/.test(text)) {
        if (currentProj) {
          currentProj.date = text;
        }
      } else if (text.startsWith("•") || text.startsWith("-")) {
        if (currentProj) {
          currentProj.descriptions.push(text.replace(/^[•\-]\s*/, ""));
        }
      } else if (text.length > 3) {
        if (!currentProj) {
          currentProj = { project: text, date: '', descriptions: [] };
        }
      }
    }
  }
  
  if (currentProj && currentProj.project) {
    projects.push(currentProj);
  }

  return projects;
}

function extractSkills(sections) {
  const skills = [];
  const skillSection = sections.skill || sections.skills || [];
  
  for (let line of skillSection) {
    const text = line.map(item => item.text).join(" ").trim();
    if (text.length > 0 && !text.startsWith("•") && !text.startsWith("-")) {
      const skillList = text.split(/[,;|]/).map(s => s.trim()).filter(s => s.length > 0);
      skills.push(...skillList);
    }
  }

  return { descriptions: skills };
}
