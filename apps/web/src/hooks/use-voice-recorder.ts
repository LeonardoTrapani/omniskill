"use client";

import { useCallback, useRef, useState } from "react";

interface UseVoiceRecorderOptions {
  onTranscript: (text: string) => void;
  language?: string;
}

export function useVoiceRecorder({ onTranscript, language = "it" }: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks to release the microphone
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          setError("No audio recorded");
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          formData.append("file", blob, `recording.${ext}`);
          formData.append("language", language);

          const response = await fetch("/api/audio/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || "Transcription failed");
            return;
          }

          if (data.text) {
            onTranscript(data.text);
          }
        } catch {
          setError("Failed to transcribe audio");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.onerror = () => {
        setError("Recording error");
        setIsRecording(false);
        for (const track of stream.getTracks()) {
          track.stop();
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Microphone access denied";
      setError(message);
    }
  }, [language, onTranscript]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
