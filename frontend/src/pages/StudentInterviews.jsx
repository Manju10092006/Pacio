import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Badge, Progress, Select } from "../components/Primitives";
import { PageTransition, CounterAnimation, DashboardReveal } from "../components/Motion";
import { Camera, Mic, MicOff, MonitorUp, Play, Send, Square, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";

export default function StudentInterviews() {
  const [history, setHistory] = useState(null);
  const [mode, setMode] = useState("hr");
  const [session, setSession] = useState(null);
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState("");
  const [notes, setNotes] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordings, setRecordings] = useState({});
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const load = () => api.get("/interviews/history").then(({ data }) => setHistory(data)).catch(() => setHistory({ items: [] }));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!session || feedback) return undefined;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [session, feedback]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setMicOn(true);
    } catch {
      toast.error("Camera or microphone permission was not granted");
    }
  };

  const ensureMedia = async () => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setCameraOn(true);
    setMicOn(true);
    return stream;
  };

  const toggleMic = () => {
    const enabled = !micOn;
    streamRef.current?.getAudioTracks?.().forEach((track) => { track.enabled = enabled; });
    setMicOn(enabled);
  };

  const toggleCamera = () => {
    const enabled = !cameraOn;
    streamRef.current?.getVideoTracks?.().forEach((track) => { track.enabled = enabled; });
    setCameraOn(enabled);
  };

  const startInterview = async () => {
    const { data } = await api.post("/me/interviews/mock/start", { mode, camera_enabled: cameraOn, microphone_enabled: micOn, notes });
    setSession(data);
    setActive(0);
    setAnswer("");
    setSeconds(0);
    setFeedback(null);
    toast.success("Mock interview started");
  };

  const startRecording = async () => {
    if (!session || !activeQuestion) return;
    try {
      const stream = await ensureMedia();
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : undefined });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordings((current) => ({
          ...current,
          [activeQuestion.question_id]: {
            url,
            size: blob.size,
            recording_id: `browser_rec_${activeQuestion.question_id}_${Date.now()}`,
          },
        }));
      };
      recorder.start();

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i += 1) {
            transcript += `${event.results[i][0].transcript} `;
          }
          setAnswer(transcript.trim());
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
      setRecording(true);
      toast.success("Recording started. Speak your answer.");
    } catch {
      toast.error("Unable to start recording. Check camera and microphone permissions.");
    }
  };

  const stopRecording = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
    toast.success("Recording saved for this answer");
  };

  const saveAnswer = async () => {
    const question = session?.questions?.[active];
    if (!question) return;
    await api.post(`/me/interviews/mock/${session.session_id}/answer`, {
      question_id: question.question_id,
      prompt: question.prompt,
      transcript: answer,
      response_seconds: Math.max(20, seconds),
      recording_id: recordings[question.question_id]?.recording_id || null,
      recording_size: recordings[question.question_id]?.size || 0,
    });
    setAnswer("");
    setActive((index) => Math.min(index + 1, session.questions.length - 1));
    toast.success("Answer saved");
  };

  const completeInterview = async () => {
    if (recording) stopRecording();
    if (answer.trim()) await saveAnswer();
    const { data } = await api.post(`/me/interviews/mock/${session.session_id}/complete`, { notes, camera_enabled: cameraOn, microphone_enabled: micOn });
    setFeedback(data);
    await load();
    toast.success("Interview analysis generated");
  };

  const latest = history?.items?.[0]?.latest_score || feedback?.overall_score || 0;
  const reports = history?.items || [];
  const weakAreas = feedback?.weak_areas || history?.weak_area_detection?.[0]?.weak_areas || [];
  const activeQuestion = session?.questions?.[active];

  return (
    <PageTransition className="space-y-10">
      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 editorial p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">VIDEO MOCK INTERVIEW SYSTEM</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Practice the room.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Start HR, technical, or AI mock interviews with camera preview, notes, timed answers, and scored feedback.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink text-bone p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">INTERVIEW READINESS</div>
          <div className="font-display text-[8vw] md:text-[6vw] leading-[0.9] tnum text-accent">
            <CounterAnimation value={latest || 0} />
          </div>
          <div className="text-bone/60 text-sm mt-1">{reports.length} timeline record{reports.length !== 1 ? "s" : ""}</div>
          <div className="mt-6"><Progress value={latest || 0} /></div>
        </div>
      </DashboardReveal>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 editorial overflow-hidden" data-testid="mock-interview-room">
          <div className="grid grid-cols-12 min-h-[620px]">
            <div className="col-span-12 md:col-span-7 bg-ink text-bone p-6 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] tracking-[0.24em] text-bone/45">INTERVIEW ROOM</div>
                <div className="font-mono text-xs text-bone/60">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div>
              </div>
              <div className="mt-5 relative flex-1 min-h-[360px] border border-bone/10 bg-bone/5 grid place-items-center overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className={`absolute inset-0 h-full w-full object-cover ${cameraOn ? "opacity-100" : "opacity-0"}`} />
                {!cameraOn && <div className="text-center text-bone/45"><Camera className="mx-auto mb-3" />Camera preview disabled</div>}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <button className="btn justify-center py-2 text-[10px]" onClick={startCamera}><Video size={14} /> Enable</button>
                <button className="btn justify-center py-2 text-[10px]" onClick={toggleCamera}>{cameraOn ? <VideoOff size={14} /> : <Video size={14} />} Camera</button>
                <button className="btn justify-center py-2 text-[10px]" onClick={toggleMic}>{micOn ? <Mic size={14} /> : <MicOff size={14} />} Mic</button>
                <button className="btn justify-center py-2 text-[10px]" disabled><MonitorUp size={14} /> Share</button>
              </div>
            </div>
            <div className="col-span-12 md:col-span-5 p-6">
              {!session ? (
                <div>
                  <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">SETUP</div>
                  <Select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-4">
                    <option value="hr">HR Interview Mode</option>
                    <option value="technical">Technical Interview Mode</option>
                    <option value="ai">AI Mock Interview Mode</option>
                  </Select>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes for this interview..." className="mt-4 min-h-[140px] w-full border border-line bg-bone-50 p-3 text-sm" />
                  <button onClick={startInterview} className="btn mt-4 w-full justify-center py-3 text-xs"><Play size={14} /> Start Interview</button>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">QUESTION {active + 1}/{session.questions.length}</div>
                  <div className="font-display text-2xl mt-4">{activeQuestion?.prompt}</div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {!recording ? (
                      <button onClick={startRecording} className="btn justify-center py-3 text-xs"><Mic size={14} /> Start Recording</button>
                    ) : (
                      <button onClick={stopRecording} className="btn justify-center py-3 text-xs bg-accent text-bone"><Square size={14} /> Stop Recording</button>
                    )}
                    <button onClick={saveAnswer} className="btn justify-center py-3 text-xs"><Send size={14} /> Save Answer</button>
                  </div>
                  <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Transcript appears here while you speak. You can edit it before saving." className="mt-4 min-h-[180px] w-full border border-line bg-bone-50 p-4 text-sm" />
                  {recordings[activeQuestion?.question_id]?.url && (
                    <video controls src={recordings[activeQuestion.question_id].url} className="mt-3 w-full border border-line bg-ink" />
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <button onClick={completeInterview} className="btn justify-center py-3 text-xs">Complete</button>
                  </div>
                  {feedback && (
                    <div className="mt-6 border border-line bg-bone-50 p-4">
                      <div className="font-display text-4xl text-accent tnum">{feedback.overall_score}</div>
                      <div className="text-sm text-ink-500">Pace {feedback.speaking_pace} wpm / {feedback.response_length} words</div>
                      <div className="mt-3 text-sm font-serif">{feedback.feedback}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 grid gap-4">
          <div className="editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">FEEDBACK PANEL</div>
            <div className="mt-4 space-y-3">
              {["communication_score", "confidence_score", "technical_score", "hr_score"].map((key) => (
                <div key={key}>
                  <div className="flex justify-between text-sm"><span className="capitalize">{key.replace("_score", "").replace("_", " ")}</span><span className="font-display text-accent">{feedback?.[key] || 0}</span></div>
                  <Progress value={feedback?.[key] || 0} />
                </div>
              ))}
            </div>
          </div>
          <div className="editorial p-6 bg-bone-50">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK AREA DETECTION</div>
            <div className="mt-4 space-y-2">
              {weakAreas.map((area, i) => (
                <div key={`${area.area}-${i}`} className="border border-line bg-paper p-3 flex justify-between text-sm">
                  <span>{area.area}</span><Badge variant="warning">gap {area.gap || 0}</Badge>
                </div>
              ))}
              {weakAreas.length === 0 && <div className="text-sm text-ink-400">Complete a mock interview to generate feedback.</div>}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
