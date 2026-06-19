import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { api } from "../lib/api";
import { Badge, Button, Progress, Select, Textarea } from "../components/Primitives";
import { ChevronLeft, ChevronRight, Play, Send } from "lucide-react";
import { toast } from "sonner";

const starter = {
  python: "def solve():\n    pass\n\nsolve()\n",
  javascript: "function solve() {\n  return null;\n}\n\nconsole.log(solve());\n",
  java: "public class Main {\n  public static void main(String[] args) {\n    // write code here\n  }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  return 0;\n}\n",
};

export default function StudentDSAProblem() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(starter.python);
  const [customInput, setCustomInput] = useState("");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get("/me/dsa/questions");
    setPayload(data);
    const studentId = data.student_id;
    const attemptsRes = await api.get(`/dsa/student/${studentId}/attempts?question_id=${questionId}`);
    setAttempts(attemptsRes.data.attempts || []);
  }, [questionId]);

  useEffect(() => { load(); }, [load]);

  const question = useMemo(() => (payload?.questions || []).find((row) => row.question_id === questionId), [payload, questionId]);
  const index = useMemo(() => (payload?.questions || []).findIndex((row) => row.question_id === questionId), [payload, questionId]);
  const prev = index > 0 ? payload.questions[index - 1] : null;
  const next = index >= 0 && index < (payload?.questions || []).length - 1 ? payload.questions[index + 1] : null;

  const changeLanguage = (value) => {
    setLanguage(value);
    setCode(starter[value] || starter.python);
  };

  const execute = async (kind) => {
    if (!question) return;
    setRunning(true);
    try {
      const endpoint = kind === "submit" ? "/me/dsa/submissions/submit" : "/me/dsa/submissions/run";
      const { data } = await api.post(endpoint, {
        question_id: question.question_id,
        language,
        code,
        custom_input: customInput,
      });
      setResult(data.result || data);
      await load();
      toast.success(kind === "submit" ? "Code submitted" : "Code executed");
    } catch (err) {
      setResult({ status: "Error", errors: err?.response?.data?.detail || "Execution failed" });
    } finally {
      setRunning(false);
    }
  };

  if (!payload || !question) return <div className="p-8 font-mono text-xs text-ink-400">LOADING PROBLEM...</div>;

  return (
    <div className="min-h-screen bg-bone text-ink">
      <div className="border-b border-line bg-paper px-6 py-4 flex items-center justify-between">
        <Link to="/student/dsa" className="btn px-4 py-2 text-xs"><ChevronLeft size={14} /> Back to sheet</Link>
        <div className="font-mono text-xs text-ink-400">{index + 1} / {payload.total}</div>
      </div>

      <div className="grid grid-cols-12 min-h-[calc(100vh-65px)]">
        <aside className="col-span-12 lg:col-span-3 border-r border-line bg-paper p-6 overflow-y-auto">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{question.topic_code}</div>
          <h1 className="font-display text-4xl tracking-tight mt-3">{question.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="solid">{question.difficulty}</Badge>
            <Badge variant={question.solved ? "success" : "warning"}>{question.solved ? "Solved" : "Unsolved"}</Badge>
            <Badge variant="outline">{question.subtopic_name}</Badge>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm">
              <span>Mastery</span><span className="font-display text-accent">{question.mastery || 0}</span>
            </div>
            <Progress value={question.mastery || 0} />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button disabled={!prev} onClick={() => navigate(`/student/dsa/${prev.question_id}`)} className="btn justify-center py-2 text-xs"><ChevronLeft size={14} /> Prev</button>
            <button disabled={!next} onClick={() => navigate(`/student/dsa/${next.question_id}`)} className="btn justify-center py-2 text-xs">Next <ChevronRight size={14} /></button>
          </div>
          <div className="mt-8">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">SUBMISSION HISTORY</div>
            <div className="mt-3 space-y-2">
              {attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.submission_id || attempt.attempt_id} className="border border-line bg-bone-50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{attempt.status}</span>
                    <span className="font-mono text-ink-400">{attempt.language}</span>
                  </div>
                  {attempt.runtime_ms && <div className="mt-1 font-mono text-ink-500">{attempt.runtime_ms}ms / {attempt.memory_kb}KB</div>}
                </div>
              ))}
              {attempts.length === 0 && <div className="text-xs text-ink-400">No submissions yet.</div>}
            </div>
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-9 grid grid-rows-[auto_1fr_auto] min-h-[calc(100vh-65px)]">
          <div className="border-b border-line bg-bone-50 p-5">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">PROBLEM STATEMENT</div>
            <p className="font-serif text-lg text-ink-600 mt-2">
              Solve {question.title}. Write a complete solution, run it against custom input, then submit to update your placement readiness.
            </p>
          </div>
          <div className="grid grid-cols-12 min-h-[540px]">
            <section className="col-span-12 xl:col-span-8 border-r border-line bg-ink">
              <div className="h-full">
                <Editor
                  height="100%"
                  language={language === "cpp" ? "cpp" : language}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{ minimap: { enabled: true }, fontSize: 14, wordWrap: "on", scrollBeyondLastLine: false }}
                />
              </div>
            </section>
            <section className="col-span-12 xl:col-span-4 bg-paper p-5 flex flex-col">
              <label className="font-mono text-[10px] tracking-[0.18em] text-ink-400">LANGUAGE
                <Select value={language} onChange={(e) => changeLanguage(e.target.value)} className="mt-2">
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </Select>
              </label>
              <label className="font-mono text-[10px] tracking-[0.18em] text-ink-400 mt-5">CUSTOM INPUT
                <Textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)} className="mt-2 min-h-[120px]" />
              </label>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <Button disabled={running} onClick={() => execute("run")}><Play size={14} /> Run</Button>
                <Button disabled={running} onClick={() => execute("submit")}><Send size={14} /> Submit</Button>
              </div>
              <div className="mt-6 border border-line bg-bone-50 p-4 flex-1">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RESULT</div>
                {result ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="font-display text-2xl text-accent">{result.status}</span><span className="font-mono">{result.passed || 0}/{result.total || 0}</span></div>
                    <div className="font-mono text-xs text-ink-500">{result.runtime_ms || 0}ms / {result.memory_kb || 0}KB</div>
                    {result.output && <div className="border border-line bg-paper p-3 font-mono text-xs">{result.output}</div>}
                    {result.errors && <div className="border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-700">{result.errors}</div>}
                    <div className="grid grid-cols-3 gap-2">
                      {(result.test_cases || []).map((tc) => <div key={tc.name} className={`border px-2 py-2 text-xs ${tc.passed ? "border-accent text-accent" : "border-line text-ink-400"}`}>{tc.name}</div>)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-ink-400">Run code to see execution output.</div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
