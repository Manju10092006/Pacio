import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { Progress, Select } from "../components/Primitives";
import { PageTransition, CounterAnimation, DashboardReveal } from "../components/Motion";
import { Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, Play, Send, Award, BookOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const AI_FALLBACK = {
  Frontend: [
    { question: "What is the primary difference between '==' and '===' in JavaScript?", options: ["'===' checks both value and type, while '==' only checks value with type coercion.", "'==' checks both value and type, while '===' only checks value.", "There is no difference in modern JavaScript.", "'===' is only used for objects, while '==' is used for primitives."], correct_answer: "'===' checks both value and type, while '==' only checks value with type coercion." },
    { question: "What does the cleanup function in React's 'useEffect' hook do?", options: ["It runs before the component unmounts or before the effect runs again to clean up subscriptions/listeners.", "It deletes the state variables.", "It forces a component re-render.", "It resets the DOM to its initial state."], correct_answer: "It runs before the component unmounts or before the effect runs again to clean up subscriptions/listeners." },
    { question: "What is the main purpose of the 'useMemo' hook in React?", options: ["To cache the value of a computationally expensive function between renders.", "To perform side effects on state change.", "To store mutable references that don't trigger re-renders.", "To manage local state variables."], correct_answer: "To cache the value of a computationally expensive function between renders." },
    { question: "What does the CSS property 'box-sizing: border-box' accomplish?", options: ["It includes padding and border in the element's total declared width and height.", "It removes all borders from the element.", "It forces the element to display as an inline block.", "It adds margins to the element's container automatically."], correct_answer: "It includes padding and border in the element's total declared width and height." },
    { question: "What is the React Virtual DOM?", options: ["A lightweight in-memory representation of the real DOM used to optimize updates.", "A server-side rendering framework.", "An external library for CSS transitions.", "A tool to direct style properties from variables."], correct_answer: "A lightweight in-memory representation of the real DOM used to optimize updates." },
    { question: "What is a closure in JavaScript?", options: ["A function that remembers and accesses variables from its outer scope even when executed outside that scope.", "A function that has no parameters.", "A built-in method to close database connections.", "A way of terminating a loop early."], correct_answer: "A function that remembers and accesses variables from its outer scope even when executed outside that scope." },
    { question: "How do you center a child element both vertically and horizontally inside a parent using Flexbox?", options: ["justify-content: center; align-items: center;", "text-align: center; vertical-align: middle;", "margin: auto center;", "display: block; margin: 0 auto;"], correct_answer: "justify-content: center; align-items: center;" },
    { question: "Which React hook returns a mutable ref object whose '.current' property persists across renders?", options: ["useRef", "useState", "useMemo", "useContext"], correct_answer: "useRef" },
    { question: "What is the effect of the 'defer' attribute in HTML script tags?", options: ["It downloads the script in parallel and executes it only after the HTML document is fully parsed.", "It downloads the script and pauses HTML parsing to execute it immediately.", "It runs the script only on user interaction.", "It executes the script multiple times."], correct_answer: "It downloads the script in parallel and executes it only after the HTML document is fully parsed." },
    { question: "What is the purpose of the 'key' prop in React lists?", options: ["It helps React identify which items have changed, been added, or been removed.", "It styles individual list items.", "It secures the list elements from external scripts.", "It binds click events automatically."], correct_answer: "It helps React identify which items have changed, been added, or been removed." }
  ],
  Backend: [
    { question: "What is middleware in Express.js?", options: ["Functions that have access to request, response, and the next function in request-response cycle.", "A package manager for backend dependencies.", "A database schema compiler.", "A template engine for rendering HTML."], correct_answer: "Functions that have access to request, response, and the next function in request-response cycle." },
    { question: "Which of the following HTTP methods is idempotent?", options: ["PUT", "POST", "None of the above", "All of the above"], correct_answer: "PUT" },
    { question: "What is a major difference between SQL and NoSQL databases?", options: ["SQL databases are relational with structured schemas; NoSQL databases are usually non-relational and dynamic.", "NoSQL databases do not support queries.", "SQL databases are only stored in-memory.", "NoSQL databases do not allow data replication."], correct_answer: "SQL databases are relational with structured schemas; NoSQL databases are usually non-relational and dynamic." },
    { question: "What are the three parts of a JSON Web Token (JWT)?", options: ["Header, Payload, Signature", "Username, Password, Secret Key", "Token ID, Expiry, User Info", "Access Key, Refresh Key, Scope"], correct_answer: "Header, Payload, Signature" },
    { question: "What is the primary goal of database normalization?", options: ["To reduce data redundancy and improve data integrity.", "To speed up write performance at the cost of duplicate data.", "To encrypt all database tables.", "To merge all tables into a single collection."], correct_answer: "To reduce data redundancy and improve data integrity." },
    { question: "What is the purpose of an index in a database?", options: ["To speed up data retrieval operations on a table.", "To encrypt sensitive table columns.", "To limit user access roles.", "To count database records automatically."], correct_answer: "To speed up data retrieval operations on a table." },
    { question: "Which HTTP status code represents an Internal Server Error?", options: ["500", "400", "401", "403"], correct_answer: "500" },
    { question: "In REST API design, which HTTP method is typically used to update a resource partially?", options: ["PATCH", "PUT", "POST", "GET"], correct_answer: "PATCH" },
    { question: "What does CORS stand for?", options: ["Cross-Origin Resource Sharing", "Centralized Object Routing System", "Common Object Registry Server", "Client-Side Origin Request Security"], correct_answer: "Cross-Origin Resource Sharing" },
    { question: "What is the primary difference between a process and a thread?", options: ["A process is an executing program with its own memory space; a thread is a subset of a process sharing its memory.", "A process runs on the frontend; a thread runs on the backend.", "A thread has its own dedicated OS memory space; a process does not.", "There is no difference; they are synonymous."], correct_answer: "A process is an executing program with its own memory space; a thread is a subset of a process sharing its memory." }
  ],
  "AI/ML": [
    { question: "What is overfitting in machine learning?", options: ["A model performs well on training data but poorly on unseen test data.", "A model is too simple to capture patterns.", "A model takes too long to train.", "A model is trained with too few parameters."], correct_answer: "A model performs well on training data but poorly on unseen test data." },
    { question: "Which activation function is most commonly used in the output layer for binary classification?", options: ["Sigmoid", "ReLU", "Softmax", "Tanh"], correct_answer: "Sigmoid" },
    { question: "What is supervised learning?", options: ["Training a model using a labeled dataset with input-output pairs.", "Training a model without any target labels.", "Letting a model learn by trial and error using rewards.", "A human manually writing code rules for classification."], correct_answer: "Training a model using a labeled dataset with input-output pairs." },
    { question: "What is a loss function in machine learning?", options: ["A function that measures the discrepancy between predicted and actual values.", "A function to drop variables from training.", "A method to compress the model file size.", "A formula to calculate CPU usage."], correct_answer: "A function that measures the discrepancy between predicted and actual values." },
    { question: "What is the purpose of backpropagation in neural networks?", options: ["To calculate gradients of the loss function with respect to weights to update them.", "To feed input data forward to calculate outputs.", "To initialize weights randomly.", "To validate the data distribution."], correct_answer: "To calculate gradients of the loss function with respect to weights to update them." },
    { question: "What is gradient descent?", options: ["An optimization algorithm used to minimize a loss function by updating weights iteratively.", "A classification algorithm based on tree structures.", "A method to normalize data inputs.", "A technique for dimensionality reduction."], correct_answer: "An optimization algorithm used to minimize a loss function by updating weights iteratively." },
    { question: "What is a word embedding in Natural Language Processing (NLP)?", options: ["A vector representation where semantically similar words have similar vectors.", "A regex pattern matching method.", "A dictionary mapping words to index integers.", "An HTML tag to display formatted text."], correct_answer: "A vector representation where semantically similar words have similar vectors." },
    { question: "Which classification metric is the ratio of true positives to the sum of true positives and false positives?", options: ["Precision", "Recall", "F1-Score", "Accuracy"], correct_answer: "Precision" },
    { question: "What type of learning task is K-Means clustering?", options: ["Unsupervised learning", "Supervised learning", "Reinforcement learning", "Regression"], correct_answer: "Unsupervised learning" },
    { question: "What is the bias-variance tradeoff in machine learning?", options: ["The balance between model underfitting (high bias) and overfitting (high variance).", "The tradeoff between model file size and inference speed.", "The compromise between CPU and GPU usage.", "The balance between security and open accessibility."], correct_answer: "The balance between model underfitting (high bias) and overfitting (high variance)." }
  ],
  DevOps: [
    { question: "What is Docker containerization primarily used for?", options: ["Packaging an application and its dependencies into a standardized unit that runs anywhere.", "Designing mobile-friendly UI layouts.", "Managing SQL database relationships.", "Automating email notification templates."], correct_answer: "Packaging an application and its dependencies into a standardized unit that runs anywhere." },
    { question: "What is Kubernetes (K8s)?", options: ["An open-source system for automating deployment, scaling, and management of containerized apps.", "A lightweight Linux distribution.", "A Javascript compiler for React applications.", "A testing framework for Node.js APIs."], correct_answer: "An open-source system for automating deployment, scaling, and management of containerized apps." },
    { question: "What does CI/CD stand for?", options: ["Continuous Integration and Continuous Deployment", "Code Inspection and Component Design", "Client Interface and Cloud Deployment", "Computer Infrastructure and Cache Distribution"], correct_answer: "Continuous Integration and Continuous Deployment" },
    { question: "Which of the following tools is commonly used for Infrastructure as Code (IaC)?", options: ["Terraform", "React", "PostgreSQL", "Webpack"], correct_answer: "Terraform" },
    { question: "What is the primary difference between Git merge and Git rebase?", options: ["Merge preserves the historical timeline of branches, while rebase rewrites project history by putting commits on top.", "Rebase deletes branches; merge does not.", "Merge is only used for local commits; rebase is used for remote.", "There is no difference in their outcomes."], correct_answer: "Merge preserves the historical timeline of branches, while rebase rewrites project history by putting commits on top." },
    { question: "What is Prometheus primarily used for in a DevOps ecosystem?", options: ["Metrics collection and system monitoring.", "Compiling frontend code assets.", "Securing credentials in vault storage.", "Executing database migrations."], correct_answer: "Metrics collection and system monitoring." },
    { question: "What is Nginx primarily used for?", options: ["A reverse proxy, load balancer, mail proxy, and HTTP cache.", "Writing server-side business logic in Python.", "Managing Kubernetes clusters.", "Storing user profiles in MongoDB."], correct_answer: "A reverse proxy, load balancer, mail proxy, and HTTP cache." },
    { question: "What permissions are granted by the command 'chmod 755 file.sh' in Linux?", options: ["Read, write, execute for owner; read and execute for group and others.", "Full access to everyone.", "Read and write to owner; read only to group; no access to others.", "Read and execute to owner; write to group and others."], correct_answer: "Read, write, execute for owner; read and execute for group and others." },
    { question: "What is the purpose of a load balancer?", options: ["To distribute incoming network traffic across multiple servers to ensure high availability.", "To test server request limits under artificial stress.", "To cache media assets for faster loading.", "To block malicious IP ranges from accessing the network."], correct_answer: "To distribute incoming network traffic across multiple servers to ensure high availability." },
    { question: "What is a blue-green deployment?", options: ["A deployment strategy that uses two identical production environments to ensure zero-downtime updates.", "A staging server styling standard.", "A method of testing accessibility criteria.", "A database backup duplication system."], correct_answer: "A deployment strategy that uses two identical production environments to ensure zero-downtime updates." }
  ]
};

const ensurePuterScript = () => {
  return new Promise((resolve) => {
    if (window.puter && window.puter.ai) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.head.appendChild(script);
  });
};

async function generateWithPuter(domain, company) {
  try {
    await ensurePuterScript();
    if (!window.puter || !window.puter.ai) {
      return null;
    }
    const cs = company && company !== "General" ? `Style questions for ${company}-level interviews.` : "Standard professional level.";
    const prompt = `You are an expert technical interviewer.
Generate exactly 10 MCQs strictly from "${domain}" domain. ${cs}
Each question: 4 options, 1 correct answer. Intermediate to advanced difficulty.
Return ONLY valid JSON:
{
  "questions": [
    { "id": 1, "domain": "${domain}", "question": "...", "options": ["A","B","C","D"], "correct_answer": "A" }
  ]
}`;
    const resp = await window.puter.ai.chat(prompt, { model: 'gpt-5-nano', temperature: 0.2, max_tokens: 2200 });
    let text = typeof resp === "string" ? resp : resp?.message?.content || resp?.text || resp?.content || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
      return parsed.questions;
    }
    return null;
  } catch (e) {
    console.warn("Puter generation failed, using fallback:", e);
    return null;
  }
}

export default function StudentAptitude() {
  const [prep, setPrep] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [config, setConfig] = useState({ mode: "sectional", section_code: "QUANT", question_count: 12, duration_minutes: 20 });
  const [session, setSession] = useState(null);
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewLater, setReviewLater] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  // AI assessment states
  const [tab, setTab] = useState("aptitude"); // "aptitude" | "ai_assessments"
  const [aiMode, setAiMode] = useState(null); // null | "running" | "completed"
  const [aiConfig, setAiConfig] = useState({ domain: "Frontend", company: "General" });
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiActive, setAiActive] = useState(0);
  const [aiAnswers, setAiAnswers] = useState({});
  const [aiRemaining, setAiRemaining] = useState(0);
  const [aiResults, setAiResults] = useState(null);
  const [aiSubmitting, setAiSubmitting] = useState(false);
  const aiTimerRef = useRef(null);

  const load = async () => {
    const [prepRes, attemptsRes] = await Promise.all([
      api.get("/me/aptitude/questions"),
      api.get("/me/aptitude/attempts"),
    ]);
    setPrep(prepRes.data);
    setAttempts(attemptsRes.data.items || []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!session || analysis) return undefined;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          submitTest(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, analysis]);

  useEffect(() => {
    if (aiMode !== "running" || aiResults) return undefined;
    if (aiTimerRef.current) clearInterval(aiTimerRef.current);
    aiTimerRef.current = setInterval(() => {
      setAiRemaining((value) => {
        if (value <= 1) {
          clearInterval(aiTimerRef.current);
          aiTimerRef.current = null;
          submitAiTest(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      if (aiTimerRef.current) clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    };
  }, [aiMode, aiResults]);

  const startAiTest = async () => {
    setAiSubmitting(true);
    try {
      let questions = await generateWithPuter(aiConfig.domain, aiConfig.company);
      if (!questions || questions.length === 0) {
        questions = AI_FALLBACK[aiConfig.domain] || AI_FALLBACK.Frontend;
      }
      setAiQuestions(questions.map((q, idx) => ({ ...q, id: idx + 1 })));
      setAiMode("running");
      setAiActive(0);
      setAiAnswers({});
      setAiResults(null);
      setAiRemaining(10 * 60);
      toast.success("AI Technical Assessment started!");
    } catch (e) {
      toast.error("Failed to generate test.");
    } finally {
      setAiSubmitting(false);
    }
  };

  const submitAiTest = (auto = false) => {
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    let correctCount = 0;
    const review = [];
    aiQuestions.forEach((q, idx) => {
      const selectedAns = aiAnswers[idx];
      const isCorrect = selectedAns === q.correct_answer;
      if (isCorrect) correctCount++;
      review.push({
        question: q.question,
        selected: selectedAns || "Not answered",
        correct: q.correct_answer,
        isCorrect
      });
    });
    const scorePct = Math.round((correctCount / aiQuestions.length) * 100);
    
    const gapRecommendations = {
      Frontend: [
        "Revise DOM manipulation, CSS Flexbox/Grid, and React state hooks.",
        "Practice building responsive components and optimizing asset delivery."
      ],
      Backend: [
        "Study Node.js event loop, Express middleware chains, and JWT sessions.",
        "Learn database optimization techniques like indexing and query performance."
      ],
      "AI/ML": [
        "Focus on cost functions, gradients, model evaluation, and dimensionality reduction.",
        "Implement basic NLP tasks using transformers or embedding layers."
      ],
      DevOps: [
        "Review Docker layering, multi-stage builds, and basic port forwarding.",
        "Practice writing Github Actions CI/CD workflows and monitoring services."
      ]
    };
    
    const results = {
      score: scorePct,
      correct: correctCount,
      total: aiQuestions.length,
      domain: aiConfig.domain,
      status: scorePct >= 80 ? "EXCELLENT" : scorePct >= 50 ? "DEVELOPING" : "NEEDS WORK",
      recommendations: gapRecommendations[aiConfig.domain] || [],
      review
    };
    setAiResults(results);
    setAiMode("completed");
    toast.success(auto ? "Time is up. Test auto-submitted." : "AI Skill Assessment evaluated!");
  };

  const activeQuestion = session?.questions?.[active];
  const sections = prep?.sections || [];
  const overall = prep?.overall || {};
  const answered = useMemo(() => Object.keys(answers).filter((key) => answers[key] !== "").length, [answers]);

  const startTest = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const { data } = await api.post("/me/aptitude/tests/start", config);
    setSession(data);
    setActive(0);
    setAnswers({});
    setReviewLater([]);
    setBookmarks([]);
    setAnalysis(null);
    setRemaining((data.duration_minutes || config.duration_minutes) * 60);
    toast.success("Assessment started");
  };

  const submitTest = async (auto = false) => {
    if (!session || analysis || submitting) return;
    setSubmitting(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Math.max(1, (session.duration_minutes * 60) - remaining);
    try {
      const { data } = await api.post(`/me/aptitude/tests/${session.test_id}/submit`, {
        answers,
        review_later: reviewLater,
        bookmarks,
        elapsed_seconds: auto ? session.duration_minutes * 60 : elapsed,
      });
      setAnalysis(data);
      setRemaining(0);
      await load();
      toast.success(auto ? "Time is up. Test auto-submitted." : "Test submitted");
    } finally {
      setSubmitting(false);
    }
  };

  if (!prep) return <div className="font-mono text-xs text-ink-400 p-8">LOADING APTITUDE...</div>;

  return (
    <PageTransition className="space-y-10">
      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 editorial p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">APTITUDE PREPARATION SYSTEM</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Practice. Test. Improve.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Take timed sectional or full mock tests across quant, reasoning, verbal, DI, and technical MCQs.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink text-bone p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">APTITUDE READINESS</div>
          <div className="font-display text-[8vw] md:text-[6vw] leading-[0.9] tnum text-accent">
            <CounterAnimation value={overall.score || 0} />%
          </div>
          <div className="text-bone/60 text-sm mt-1">{overall.solved || 0}/{overall.total || 0} questions solved</div>
          <div className="mt-6"><Progress value={overall.score || 0} /></div>
        </div>
      </DashboardReveal>

      {/* Tab Selector */}
      <div className="flex border-b border-line" data-testid="aptitude-tabs">
        <button
          onClick={() => {
            if (!session && aiMode !== "running") setTab("aptitude");
          }}
          disabled={!!session || aiMode === "running"}
          className={`px-6 py-3 font-mono text-[10px] tracking-[0.24em] border-r border-line transition-all ${
            tab === "aptitude"
              ? "bg-bone-100 border-t-2 border-t-accent text-accent font-bold"
              : "text-ink-400 hover:text-ink-900 disabled:opacity-50"
          }`}
        >
          APTITUDE PRACTICE
        </button>
        <button
          onClick={() => {
            if (!session && aiMode !== "running") setTab("ai_assessments");
          }}
          disabled={!!session || aiMode === "running"}
          className={`px-6 py-3 font-mono text-[10px] tracking-[0.24em] border-r border-line transition-all ${
            tab === "ai_assessments"
              ? "bg-bone-100 border-t-2 border-t-accent text-accent font-bold"
              : "text-ink-400 hover:text-ink-900 disabled:opacity-50"
          }`}
        >
          AI SKILL ASSESSMENTS
        </button>
      </div>

      {tab === "aptitude" ? (
        <>
          {!session && (
            <DashboardReveal className="grid grid-cols-12 gap-4">
              {sections.map((sec) => (
                <div key={sec.section_code} className="col-span-12 md:col-span-6 lg:col-span-3 editorial p-6 dash-reveal">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">{sec.section_code}</div>
                  <div className="font-display text-xl mt-1">{sec.section_name}</div>
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div>
                      <div className="font-mono text-[9px] text-ink-400">ACC</div>
                      <div className="font-display text-2xl tnum text-accent">{sec.accuracy || 0}%</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] text-ink-400">TIME</div>
                      <div className="font-display text-2xl tnum">{sec.avg_time || 0}s</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] text-ink-400">MASTERY</div>
                      <div className="font-display text-2xl tnum">{sec.mastery || 0}</div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <Progress value={sec.total ? Math.round((sec.solved / sec.total) * 100) : 0} />
                  </div>
                </div>
              ))}
            </DashboardReveal>
          )}

          <div className="grid grid-cols-12 gap-4">
            <div className={`${session ? "hidden" : "col-span-12 lg:col-span-4"} editorial p-8`}>
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">START ASSESSMENT</div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <label className="text-xs font-mono text-ink-500">MODE
                  <Select value={config.mode} onChange={(e) => setConfig({ ...config, mode: e.target.value })} className="mt-1">
                    <option value="sectional">Sectional Test</option>
                    <option value="mock">Full Mock Test</option>
                  </Select>
                </label>
                <label className="text-xs font-mono text-ink-500">SECTION
                  <Select value={config.section_code} onChange={(e) => setConfig({ ...config, section_code: e.target.value })} disabled={config.mode === "mock"} className="mt-1">
                    {sections.map((sec) => <option key={sec.section_code} value={sec.section_code}>{sec.section_name}</option>)}
                  </Select>
                </label>
                <label className="text-xs font-mono text-ink-500">QUESTIONS
                  <input className="mt-1 w-full border border-line bg-bone-50 px-3 py-2" type="number" value={config.question_count} onChange={(e) => setConfig({ ...config, question_count: Number(e.target.value) })} />
                </label>
                <label className="text-xs font-mono text-ink-500">MINUTES
                  <input className="mt-1 w-full border border-line bg-bone-50 px-3 py-2" type="number" value={config.duration_minutes} onChange={(e) => setConfig({ ...config, duration_minutes: Number(e.target.value) })} />
                </label>
              </div>
              <button onClick={startTest} className="btn mt-5 w-full justify-center py-3 text-xs"><Play size={14} /> Start Test</button>
              <div className="mt-8">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RECENT ATTEMPTS</div>
                <div className="mt-3 space-y-2">
                  {attempts.slice(0, 5).map((a) => (
                    <div key={a.attempt_id} className="border border-line bg-bone-50 p-3 text-sm flex justify-between">
                      <span>{a.mode}</span><span className="font-display text-accent tnum">{a.score_pct}%</span>
                    </div>
                  ))}
                  {attempts.length === 0 && <div className="text-xs text-ink-400">No tests taken yet.</div>}
                </div>
              </div>
            </div>

            <div className={`${session ? "col-span-12" : "col-span-12 lg:col-span-8"} editorial p-0 overflow-hidden`} data-testid="aptitude-test-engine">
              {!session ? (
                <div className="p-10 text-center text-ink-400 font-serif">Start a test to open the timed assessment room.</div>
              ) : (
                <div className="grid grid-cols-12 min-h-[620px]">
                  <div className="col-span-12 md:col-span-8 p-8">
                    <div className="flex items-center justify-between border-b border-line pb-4">
                      <div>
                        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{session.mode.toUpperCase()} / Q{active + 1}</div>
                        <div className="font-display text-2xl mt-1">{activeQuestion?.title}</div>
                      </div>
                      <div className={`flex items-center gap-2 font-mono text-sm ${analysis ? "text-accent" : ""}`}><Clock size={15} /> {analysis ? "SUBMITTED" : fmt(remaining)}</div>
                    </div>
                    <div className="mt-8 font-serif text-xl text-ink-700">{activeQuestion?.prompt}</div>
                    <div className="mt-8 space-y-3">
                      {(activeQuestion?.options || []).map((option, index) => (
                        <button
                          type="button"
                          key={option}
                          disabled={!!analysis}
                          onClick={() => setAnswers((current) => ({ ...current, [activeQuestion.question_id]: index }))}
                          className={`w-full border-2 px-5 py-4 text-left transition-colors grid grid-cols-[28px_1fr_auto] items-center gap-3 ${answers[activeQuestion.question_id] === index ? "border-accent bg-accent text-bone shadow-[inset_0_0_0_1px_rgba(255,255,255,.25)]" : "border-line bg-bone-50 hover:border-ink"}`}
                        >
                          <span className="font-mono text-xs">{String.fromCharCode(65 + index)}</span>
                          <span>{option}</span>
                          {answers[activeQuestion.question_id] === index && <CheckCircle2 size={17} />}
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className="btn justify-center py-3 text-xs"
                        disabled={active === 0}
                        onClick={() => setActive((index) => Math.max(0, index - 1))}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        type="button"
                        className="btn justify-center py-3 text-xs"
                        disabled={active >= session.questions.length - 1}
                        onClick={() => setActive((index) => Math.min(session.questions.length - 1, index + 1))}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                    {analysis && (
                      <div className="mt-8 border border-line bg-bone-50 p-5">
                        <div className="font-display text-3xl tnum text-accent">{analysis.score_pct}%</div>
                        <div className="text-sm text-ink-500">Accuracy {analysis.accuracy_pct}% / Avg time {analysis.avg_time_sec}s</div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {(analysis.weak_areas || []).map((w) => (
                            <div key={w.name} className="border border-line bg-paper p-3 text-sm">
                              <div className="font-medium">{w.name}</div>
                              <div className="font-mono text-xs text-ink-400">accuracy {w.accuracy}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-4 bg-bone-100/60 border-l border-line p-6">
                    <div className="grid grid-cols-5 gap-2">
                      {session.questions.map((q, index) => (
                        <button type="button" key={q.question_id} onClick={() => setActive(index)} className={`h-10 border text-xs font-mono ${active === index ? "bg-ink text-bone" : answers[q.question_id] !== undefined ? "bg-accent text-bone border-accent" : "bg-paper border-line"}`}>
                          {index + 1}
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      <button type="button" className="btn justify-center py-2 text-[10px]" disabled={!!analysis} onClick={() => setReviewLater((list) => list.includes(activeQuestion.question_id) ? list.filter((id) => id !== activeQuestion.question_id) : [...list, activeQuestion.question_id])}><Flag size={13} /> Review</button>
                      <button type="button" className="btn justify-center py-2 text-[10px]" disabled={!!analysis} onClick={() => setBookmarks((list) => list.includes(activeQuestion.question_id) ? list.filter((id) => id !== activeQuestion.question_id) : [...list, activeQuestion.question_id])}><Bookmark size={13} /> Bookmark</button>
                    </div>
                    <div className="mt-6 text-sm text-ink-500">{answered}/{session.questions.length} answered / {reviewLater.length} review / {bookmarks.length} bookmarks</div>
                    <button type="button" disabled={!!analysis || submitting} onClick={() => submitTest(false)} className="btn mt-6 w-full justify-center py-3 text-xs"><Send size={14} /> {submitting ? "Submitting..." : analysis ? "Submitted" : "Submit Test"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* AI SKILL ASSESSMENTS TAB */
        <div className="space-y-6">
          {aiMode === null && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5 border border-line bg-paper p-8">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-6">CONFIG AI QUIZ</div>
                <div className="space-y-4">
                  <label className="block text-xs font-mono text-ink-500">
                    CORE DOMAIN
                    <Select
                      value={aiConfig.domain}
                      onChange={(e) => setAiConfig({ ...aiConfig, domain: e.target.value })}
                      className="mt-1"
                    >
                      <option value="Frontend">Frontend Developer</option>
                      <option value="Backend">Backend Developer</option>
                      <option value="AI/ML">AI/ML Engineer</option>
                      <option value="DevOps">Cloud/DevOps Engineer</option>
                    </Select>
                  </label>
                  
                  <label className="block text-xs font-mono text-ink-500">
                    TARGET COMPANY INTERVIEW STYLE
                    <Select
                      value={aiConfig.company}
                      onChange={(e) => setAiConfig({ ...aiConfig, company: e.target.value })}
                      className="mt-1"
                    >
                      <option value="General">General / Standard</option>
                      <option value="Google">Google Style (Algorithmic)</option>
                      <option value="Amazon">Amazon Style (Systems & Scale)</option>
                      <option value="Startup">Early Stage Startup (Product & Speed)</option>
                    </Select>
                  </label>
                </div>
                
                <button
                  onClick={startAiTest}
                  disabled={aiSubmitting}
                  className="btn mt-6 w-full justify-center py-3 text-xs"
                >
                  <Play size={14} /> {aiSubmitting ? "Generating timed test..." : "Start Timed Assessment"}
                </button>
              </div>
              
              <div className="col-span-12 lg:col-span-7 border border-line bg-bone-50 p-8 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.24em] text-accent mb-4">INSTRUCTIONS</div>
                  <h3 className="font-display text-2xl tracking-tight mb-3">Timed Technical Assessments</h3>
                  <p className="font-serif text-sm text-ink-600 leading-relaxed mb-4">
                    This module utilizes Puter.js in-browser LLM chat endpoint to generate 10 domain-specific multiple-choice questions dynamically. 
                    If the AI connection times out, CareerOS automatically loads high-quality static benchmark questions.
                  </p>
                  <ul className="space-y-2 text-xs font-serif text-ink-500 list-disc list-inside">
                    <li>10 Minutes total duration.</li>
                    <li>Automatic submission when time runs out.</li>
                    <li>Comprehensive scoring and custom learning roadmap provided after completion.</li>
                  </ul>
                </div>
                
                <div className="mt-8 p-4 border border-dashed border-line bg-paper flex items-center gap-3">
                  <Award size={18} className="text-accent" />
                  <span className="font-mono text-[10px] tracking-wider text-ink-400">
                    AI ASSESSMENT ENGINE READY
                  </span>
                </div>
              </div>
            </div>
          )}

          {aiMode === "running" && (
            <div className="border border-line bg-paper overflow-hidden">
              <div className="grid grid-cols-12 min-h-[580px]">
                {/* Quiz body */}
                <div className="col-span-12 md:col-span-8 p-8">
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <div>
                      <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">
                        {aiConfig.domain.toUpperCase()} QUIZ / Q{aiActive + 1}
                      </div>
                      <div className="font-display text-2xl mt-1">Question {aiActive + 1}</div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-sm text-accent">
                      <Clock size={15} /> {fmt(aiRemaining)}
                    </div>
                  </div>
                  
                  <div className="mt-8 font-serif text-xl text-ink-700">
                    {aiQuestions[aiActive]?.question}
                  </div>
                  
                  <div className="mt-8 space-y-3">
                    {aiQuestions[aiActive]?.options.map((option, idx) => {
                      const letters = ["A", "B", "C", "D"];
                      const isSelected = aiAnswers[aiActive] === option;
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setAiAnswers({ ...aiAnswers, [aiActive]: option })}
                          className={`w-full border-2 px-5 py-4 text-left transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "border-accent bg-accent text-bone shadow-[inset_0_0_0_1px_rgba(255,255,255,.25)]"
                              : "border-line bg-bone-50 hover:border-ink"
                          }`}
                        >
                          <span className="font-mono text-xs font-bold mr-2">{letters[idx]}.</span>
                          <span className="flex-1">{option}</span>
                          {isSelected && <CheckCircle2 size={16} />}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={aiActive === 0}
                      onClick={() => setAiActive(aiActive - 1)}
                      className="btn justify-center py-3 text-xs"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <button
                      type="button"
                      disabled={aiActive === aiQuestions.length - 1}
                      onClick={() => setAiActive(aiActive + 1)}
                      className="btn justify-center py-3 text-xs"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Navigator Sidebar */}
                <div className="col-span-12 md:col-span-4 bg-bone-100/60 border-l border-line p-6 flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-4">QUESTION NAVIGATOR</div>
                    <div className="grid grid-cols-5 gap-2">
                      {aiQuestions.map((_, index) => {
                        const isCurrent = aiActive === index;
                        const isAnswered = aiAnswers[index] !== undefined;
                        return (
                          <button
                            type="button"
                            key={index}
                            onClick={() => setAiActive(index)}
                            className={`h-10 border text-xs font-mono transition-all ${
                              isCurrent
                                ? "bg-ink text-bone border-ink"
                                : isAnswered
                                ? "bg-accent text-bone border-accent"
                                : "bg-paper border-line"
                            }`}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 text-xs font-mono text-ink-500">
                      Answered: {Object.keys(aiAnswers).length} / {aiQuestions.length}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to submit your AI technical assessment?")) submitAiTest();
                    }}
                    className="btn w-full justify-center py-3 text-xs"
                  >
                    <Send size={14} /> Submit Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {aiMode === "completed" && aiResults && (
            <div className="space-y-6">
              <div className="grid grid-cols-12 gap-4">
                {/* Accuracy circle */}
                <div className="col-span-12 md:col-span-4 border border-line bg-ink text-bone p-8 flex flex-col items-center justify-center text-center">
                  <div className="font-mono text-[10px] tracking-[0.24em] text-bone/60 mb-4">ACCURACY REPORT</div>
                  
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="64" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        stroke="var(--accent)"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${(aiResults.score / 100) * 2 * Math.PI * 64} ${2 * Math.PI * 64}`}
                      />
                    </svg>
                    <span className="font-display text-4xl text-accent">{aiResults.score}%</span>
                  </div>
                  
                  <div className="font-mono text-xs mt-4">
                    {aiResults.correct} / {aiResults.total} Correct Answers
                  </div>
                  
                  <div className="mt-3 font-mono text-[10px] tracking-widest bg-accent px-3 py-1 text-bone-100">
                    {aiResults.status}
                  </div>
                </div>
                
                {/* Feedback plan */}
                <div className="col-span-12 md:col-span-8 border border-line bg-paper p-8 flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-2">DOMAIN ROADMAP</div>
                    <h3 className="font-display text-2xl tracking-tight mb-4">Recommended Actions for {aiResults.domain}</h3>
                    
                    <ul className="space-y-3">
                      {aiResults.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle2 size={16} className="text-accent mt-0.5" />
                          <span className="font-serif text-sm text-ink-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-6 flex flex-wrap gap-4">
                    <button
                      onClick={() => setAiMode(null)}
                      className="btn text-xs py-2 px-4"
                    >
                      Take Another Assessment
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Answer review list */}
              <div className="border border-line bg-paper p-8">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-6">DETAILED REVIEW</div>
                <div className="space-y-4">
                  {aiResults.review.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-5 border-l-4 ${
                        item.isCorrect ? "border-l-accent bg-bone-50" : "border-l-[#c1440e] bg-bone-100/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] tracking-wider text-ink-400">
                          QUESTION {idx + 1}
                        </span>
                        <span
                          className={`font-mono text-[10px] tracking-widest ${
                            item.isCorrect ? "text-accent" : "text-[#c1440e]"
                          }`}
                        >
                          {item.isCorrect ? "CORRECT" : "INCORRECT"}
                        </span>
                      </div>
                      <p className="font-serif text-sm text-ink-800 font-bold mb-3">{item.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-ink-400">YOUR CHOICE: </span>
                          <span className={item.isCorrect ? "text-accent font-bold" : "text-[#c1440e] font-bold"}>
                            {item.selected}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-400">CORRECT ANSWER: </span>
                          <span className="text-accent font-bold">{item.correct}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}
