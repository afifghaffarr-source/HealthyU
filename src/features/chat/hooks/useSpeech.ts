import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast-config";

type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionErrorLike = { error?: string };
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getSR = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function useSpeech(opts: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
}) {
  const { onInterim, onFinal } = opts;
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const lastSpokenRef = useRef<string | null>(null);
  const sttSupported = getSR() !== null;
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // Defensive: speechSynthesis may already be torn down (e.g. tab
        // closing race); cancellation is best-effort in cleanup.
      }
      try {
        recogRef.current?.stop?.();
      } catch {
        // Defensive: SpeechRecognition.stop() can throw if the recognizer
        // is already in an invalid state (already stopped, language unsupported,
        // or hardware released). Safe to ignore during unmount cleanup.
      }
    };
  }, []);

  const toggleTts = () => {
    if (!ttsSupported) {
      toast.error("Browser tidak mendukung text-to-speech");
      return;
    }
    setTtsOn((v) => {
      if (v) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Defensive: cancel() on an utterance that already finished is a
          // no-op in spec but some browsers throw. Safe to ignore — we are
          // about to flip ttsOn off anyway.
        }
      }
      return !v;
    });
  };

  const toggleMic = () => {
    if (!sttSupported) {
      toast.error("Browser tidak mendukung voice input");
      return;
    }
    if (listening) {
      try {
        recogRef.current?.stop?.();
      } catch {
        // Defensive: stop() can throw if the recognizer was already torn
        // down (component remounted, mic released). Safe to ignore — we
        // are about to set listening=false either way.
      }
      return;
    }
    const SR = getSR();
    if (!SR) return;
    const r: SpeechRecognitionLike = new SR();
    r.lang = "id-ID";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      onInterim((finalText + interim).trim());
    };
    r.onerror = (e) => {
      toast.error(`Voice error: ${e.error ?? "unknown"}`);
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      const txt = finalText.trim();
      if (txt) onFinal(txt);
    };
    recogRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };

  const speak = (id: string, text: string) => {
    if (!ttsOn || !ttsSupported) return;
    if (lastSpokenRef.current === id) return;
    lastSpokenRef.current = id;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>]/g, ""));
      u.lang = "id-ID";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch {
      // Defensive: speak() can throw if speechSynthesis is in an invalid
      // state (e.g. user disabled TTS mid-utterance, browser quota hit).
      // UI keeps working without audio.
    }
  };

  const cancelSpeak = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // Defensive: see toggleTts — cancel() is best-effort, failures are
      // non-actionable from the caller's perspective.
    }
    lastSpokenRef.current = null;
  };

  return {
    listening,
    ttsOn,
    ttsSupported,
    sttSupported,
    toggleTts,
    toggleMic,
    speak,
    cancelSpeak,
  };
}
