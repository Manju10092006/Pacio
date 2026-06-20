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
        {downloadUrl && (
          <a
            href={downloadUrl} download className="inline-flex items-center gap-2 border border-accent text-accent px-4 py-2 text-xs hover:bg-accent hover:text-bone-100 transition-colors"
            data-testid="resume-download-link"
          >
            <Download size={12} /> Download PDF
          </a>
        )}
      </div>
    </div>
  );
}
