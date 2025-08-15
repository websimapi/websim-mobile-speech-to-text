import { SpeechCapture } from "./speech.js";
import { countWords } from "./utils.js";

const els = {
  toggle: document.getElementById("toggleBtn"),
  lang: document.getElementById("langSelect"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  finalText: document.getElementById("finalText"),
  interimText: document.getElementById("interimText"),
  copyBtn: document.getElementById("copyBtn"),
  clearBtn: document.getElementById("clearBtn"),
  saveBtn: document.getElementById("saveBtn"),
  wordCount: document.getElementById("wordCount"),
  supportNotice: document.getElementById("supportNotice")
};

const capture = new SpeechCapture();
if (!capture.supported) {
  els.supportNotice.classList.remove("hidden");
  els.toggle.disabled = true;
}

function setUIRunning(running) {
  els.toggle.textContent = running ? "Stop Listening" : "Start Listening";
  els.statusDot.classList.toggle("listening", running);
  els.statusDot.classList.toggle("idle", !running);
  els.statusText.textContent = running ? "Listening" : "Idle";
}

capture.on("status", (s) => {
  if (s === "listening") setUIRunning(true);
  if (s === "idle") setUIRunning(false);
});
capture.on("state", ({ running }) => setUIRunning(running));
capture.on("final", (text) => {
  els.finalText.value = text;
  els.wordCount.textContent = `${countWords(text)} words`;
});
capture.on("interim", (text) => {
  els.interimText.value = text;
});
capture.on("error", (err) => {
  // Surface non-fatal errors unobtrusively
  els.statusText.textContent = `Error: ${err}`;
});

els.toggle.addEventListener("click", async () => {
  if (!capture.supported) return;
  if (capture.running) {
    capture.stop();
  } else {
    // Prompt mic permission without awaiting, so start() remains in the user gesture
    navigator.mediaDevices?.getUserMedia?.({ audio: true }).catch(() => {});
    capture.setLanguage(els.lang.value);
    capture.start();
  }
});

els.lang.addEventListener("change", () => {
  capture.setLanguage(els.lang.value);
});

els.copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(els.finalText.value);
    els.statusText.textContent = "Copied";
    setTimeout(() => setUIRunning(capture.running), 1000);
  } catch {}
});

els.clearBtn.addEventListener("click", () => {
  els.finalText.value = "";
  els.interimText.value = "";
  els.wordCount.textContent = "0 words";
});

els.saveBtn.addEventListener("click", () => {
  const blob = new Blob([els.finalText.value], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `transcript-${new Date().toISOString().replace(/[:.]/g,"-")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
});

// Pause capture when the page is hidden; resume if it was running
let wasRunning = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    wasRunning = capture.running;
    if (capture.running) capture.stop();
  } else {
    if (wasRunning) {
      capture.setLanguage(els.lang.value);
      capture.start();
    }
  }
});