import mitt from "mitt";
import { mergeWithoutDupes } from "./utils.js";

const Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;

export class SpeechCapture {
  constructor() {
    this.supported = !!Rec;
    this.emitter = mitt();
    this.running = false;
    this._restartOnEnd = false;
    this._interim = "";
    this._final = "";
    this._recognition = null;
    this._lang = "en-US";
  }

  on(evt, cb) { this.emitter.on(evt, cb); }
  off(evt, cb) { this.emitter.off(evt, cb); }

  setLanguage(lang) {
    this._lang = lang || "en-US";
    if (this._recognition) this._recognition.lang = this._lang;
  }

  getFinal() { return this._final; }
  getInterim() { return this._interim; }

  start() {
    if (!this.supported) return;
    if (this.running) return;
    this._restartOnEnd = true;
    this._spinUp();
    this.running = true;
    this.emitter.emit("state", { running: true });
  }

  stop() {
    this._restartOnEnd = false;
    if (this._recognition) {
      try { this._recognition.stop(); } catch {}
      try { this._recognition.abort(); } catch {}
    }
    this.running = false;
    this.emitter.emit("state", { running: false });
  }

  _spinUp() {
    if (!Rec) return;
    const r = new Rec();
    r.lang = this._lang;
    r.interimResults = true;
    r.continuous = false; // more reliable across mobile (we auto-restart on end)
    r.maxAlternatives = 1;

    r.onstart = () => this.emitter.emit("status", "listening");

    r.onresult = (e) => {
      let interim = "";
      let newFinalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript || "";
        if (res.isFinal) {
          newFinalChunk = mergeWithoutDupes(newFinalChunk, txt);
        } else {
          interim = interim ? interim + " " + txt : txt;
        }
      }
      if (newFinalChunk) {
        this._final = mergeWithoutDupes(this._final, newFinalChunk);
        this.emitter.emit("final", this._final);
      }
      this._interim = interim;
      this.emitter.emit("interim", this._interim);
    };

    r.onerror = (e) => {
      const code = e.error || "unknown";
      this.emitter.emit("error", code);
      // Restart on transient errors or auto-end scenarios
      if (this._restartOnEnd && (code === "no-speech" || code === "audio-capture" || code === "network" || code === "aborted" || code === "not-allowed" || code === "service-not-allowed")) {
        try { r.stop(); } catch {}
        setTimeout(() => { if (this._restartOnEnd) this._spinUp(); }, 200);
      }
    };

    r.onend = () => {
      this.emitter.emit("status", "idle");
      // Restart if needed (mobile often ends sessions)
      if (this._restartOnEnd) {
        try { r.stop(); } catch {}
        this._recognition = null;
        // Avoid rapid restart loops
        setTimeout(() => {
          if (this._restartOnEnd) this._spinUp();
        }, 150);
      } else {
        this.running = false;
        this.emitter.emit("state", { running: false });
      }
    };

    this._recognition = r;
    try { r.start(); } catch (err) { this.emitter.emit("error", err?.message || "start-failed"); }
  }
}