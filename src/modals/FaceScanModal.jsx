import React, { useState, useEffect, useRef } from 'react';
import { MOOD_EMOJI } from '../services/moods';

export function FaceScanModal({ onDetected, onClose, toast }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Loading AI models...');
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [detectedMood, setDetectedMood] = useState(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const FACE_EMOTION_MAP={happy:'happy',sad:'sad',angry:'angry',fearful:'anxious',disgusted:'stressed',surprised:'excited',neutral:'bored'};

  useEffect(() => {
    async function start() {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        setStatus('Loading AI models...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setStatus('Requesting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await new Promise(r => { videoRef.current.onloadedmetadata = r; }); videoRef.current.play(); }
        setStatus('Analyzing your expression...');
        let detected = false;
        intervalRef.current = setInterval(async () => {
          if (detected || !videoRef.current) return;
          try {
            const result = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: .5 })).withFaceExpressions();
            if (result?.expressions) {
              const top = Object.entries(result.expressions).sort((a, b) => b[1] - a[1])[0][0];
              const mood = FACE_EMOTION_MAP[top] || 'neutral';
              detected = true; clearInterval(intervalRef.current);
              setDetectedEmotion(top); setDetectedMood(mood);
              setStatus(`Detected: ${top}`);
            }
          } catch (e) { }
        }, 700);
      } catch (e) { setStatus('Camera access denied or error loading models.'); }
    }
    if (window.faceapi) start(); else { setStatus('face-api.js not loaded yet. Please wait...'); }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="face-scan-overlay" onClick={e => { if (e.target === e.currentTarget) { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); } }}>
      <div className="face-scan-content glass-deep">
        <h3>📷 Detecting Your Emotion</h3>
        <div className="face-ring-wrap">
          <div className="face-ring" />
          <div className="face-ring delay" />
          <video ref={videoRef} className="face-video" autoPlay muted playsInline />
          <div className="scan-line" />
        </div>
        <div className="face-status">{status}</div>
        {detectedEmotion && (
          <div className="face-emotion">
            {MOOD_EMOJI[detectedMood] || '😐'} <span style={{ fontSize: '1.2rem' }}>{detectedMood?.toUpperCase()}</span>
          </div>
        )}
        <div className="face-actions">
          {detectedMood && <button className="btn-glow" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onDetected(detectedMood); onClose(); }}>Use This Mood</button>}
          <button className="btn-ghost" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
