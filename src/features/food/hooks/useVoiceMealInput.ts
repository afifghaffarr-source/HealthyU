import { useState } from "react";
import { toast } from "sonner";

type SR = {
  new (): {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
    onerror: (e: { error: string }) => void;
    onend: () => void;
  };
};

export function useVoiceMealInput(onTranscript: (transcript: string) => Promise<void> | void) {
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);

  const start = () => {
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const SRClass = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SRClass) {
      toast.error("Browser tidak mendukung voice. Gunakan Chrome.");
      return;
    }
    const rec = new SRClass();
    rec.lang = "id-ID";
    rec.continuous = false;
    rec.interimResults = false;
    setListening(true);
    rec.onresult = async (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setListening(false);
      if (!transcript) return;
      setParsing(true);
      try {
        await onTranscript(transcript);
      } finally {
        setParsing(false);
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      toast.error(`Voice error: ${e.error}`);
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  return { listening, parsing, start };
}
