import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, Square, Camera, MapPin, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const CATEGORIES = ['POTHOLE','GARBAGE','WATER','STREETLIGHT','SAFETY','TREE','OTHER'];
const CAT_EMOJI  = { POTHOLE:'🕳️', GARBAGE:'🗑️', WATER:'💧', STREETLIGHT:'💡', SAFETY:'⚠️', TREE:'🌳', OTHER:'📋' };

export default function CreateIssuePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fileRef = useRef();
  const mediaRecorderRef = useRef();
  const audioChunksRef = useRef([]);

  const [form, setForm] = useState({ title: '', description: '', category: '', is_anonymous: false });
  const [location, setLocation] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Voice state
  const [voiceMode, setVoiceMode] = useState(params.get('voice') === '1');
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceStep, setVoiceStep] = useState('idle'); // idle|recording|processing|review

  // Get location on mount
  useEffect(() => {
    getLocation();
    if (voiceMode) setVoiceStep('recording'), startRecording();
  }, []);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { toast.error('Location access denied. Please enable GPS.'); setLocating(false); }
    );
  };

  // ── Voice Recording ──────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = () => handleAudioReady(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setVoiceStep('recording');
    } catch {
      toast.error('Microphone access denied');
      setVoiceMode(false);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
    setVoiceStep('processing');
  };

  const handleAudioReady = async (blob) => {
    setProcessing(true);
    try {
      // Step 1: Transcribe
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      const { data: sttData } = await api.post('/api/voice/transcribe', fd);
      setTranscript(sttData.transcript);

      // Step 2: Extract fields
      const { data: nlpData } = await api.post('/api/voice/extract', { transcript: sttData.transcript });
      const { title, category, description } = nlpData.extracted;
      setForm(p => ({ ...p, title: title || p.title, description: description || p.description, category: category || p.category }));
      setVoiceStep('review');
      toast.success('Issue details extracted from your voice!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Voice processing failed. Please type manually.');
      setVoiceMode(false);
      setVoiceStep('idle');
    } finally {
      setProcessing(false);
    }
  };

  // ── Media ─────────────────────────────────────────────────────
  const handleMediaAdd = (e) => {
    const files = Array.from(e.target.files);
    if (media.length + files.length > 4) { toast.error('Max 4 media files'); return; }
    setMedia(p => [...p, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category) { toast.error('Title and category are required'); return; }
    if (!location) { toast.error('Location required'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('lat', location.lat);
      fd.append('lng', location.lng);
      fd.append('source', voiceMode ? 'VOICE' : 'TYPED');
      media.forEach(m => fd.append('media', m.file));

      const { data } = await api.post('/api/issues', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Issue raised successfully!');
      navigate(`/issues/${data.issue.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  // ── Voice Recording UI ────────────────────────────────────────
  if (voiceMode && (voiceStep === 'recording' || voiceStep === 'processing')) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '52px 20px 20px', background: 'var(--bg)'
      }}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <button onClick={() => { stopRecording(); setVoiceMode(false); }} style={{ color: 'var(--text2)' }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>Voice Submission</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text2)'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            Auto-detect
          </div>
        </div>

        {/* Mic orb */}
        <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {[200, 160, 120].map((s, i) => (
            <div key={s} style={{
              position: 'absolute', width: s, height: s, borderRadius: '50%',
              border: `1px solid rgba(59,130,246,${0.08 + i * 0.06})`,
              animation: `pulse ${1.5 + i * 0.3}s ease-in-out infinite`,
            }} />
          ))}
          <button
            onClick={voiceStep === 'recording' ? stopRecording : undefined}
            style={{
              width: 88, height: 88, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(59,130,246,0.5)',
              animation: 'micPulse 2s ease-in-out infinite'
            }}
          >
            {voiceStep === 'processing' ? <Loader size={32} color="white" /> : <Mic size={32} color="white" />}
          </button>
        </div>

        <style>{`
          @keyframes pulse { 0%,100%{transform:scale(0.95);opacity:.5} 50%{transform:scale(1.05);opacity:1} }
          @keyframes micPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        `}</style>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600 }}>
            {voiceStep === 'processing' ? 'Processing your voice…' : 'Listening…'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
            {voiceStep === 'processing' ? 'AI is extracting issue details' : 'Speak clearly in English, Hindi or Marathi'}
          </div>
        </div>

        {recording && (
          <button onClick={stopRecording} style={{
            marginTop: 32, padding: '12px 28px',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--red2)',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Square size={12} fill="currentColor" /> Stop Recording
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 18px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text2)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>
          {voiceStep === 'review' ? '📋 Review Issue' : 'Raise an Issue'}
        </h1>
        <button onClick={() => { setVoiceMode(true); setVoiceStep('recording'); startRecording(); }}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
            fontSize: 12, fontWeight: 600, color: 'var(--accent2)'
          }}>
          <Mic size={13} /> Voice
        </button>
      </div>

      {/* Voice review notice */}
      {voiceStep === 'review' && (
        <div style={{
          margin: '0 14px 16px', padding: '10px 14px',
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 12, fontSize: 12, color: 'var(--purple2)'
        }}>
          <strong>AI filled this from your voice.</strong> Please review and edit before submitting.
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
            "{transcript.slice(0, 80)}…"
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Category */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            Category *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button type="button" key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))} style={{
                padding: '8px 4px', borderRadius: 10, border: '1px solid',
                borderColor: form.category === cat ? 'var(--accent)' : 'var(--border)',
                background: form.category === cat ? 'rgba(59,130,246,0.15)' : 'var(--surface2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer'
              }}>
                <span style={{ fontSize: 18 }}>{CAT_EMOJI[cat]}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: form.category === cat ? 'var(--accent2)' : 'var(--text3)' }}>
                  {cat}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Issue Title *
          </label>
          <input
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Large pothole near Andheri Station Exit 2"
            maxLength={80} required
          />
          <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right', marginTop: 4 }}>{form.title.length}/80</div>
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Description
          </label>
          <textarea
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Add more details about the issue…"
            rows={3} maxLength={500}
            style={{ resize: 'none' }}
          />
        </div>

        {/* Location */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Location *
          </label>
          <div style={{
            padding: '10px 14px', background: 'var(--surface2)',
            border: `1px solid ${location ? 'var(--green)' : 'var(--border)'}`,
            borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10
          }}>
            <MapPin size={16} color={location ? 'var(--green2)' : 'var(--text3)'} />
            <span style={{ fontSize: 13, color: location ? 'var(--text)' : 'var(--text3)', flex: 1 }}>
              {locating ? 'Detecting location…'
                : location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                : 'Location not detected'}
            </span>
            <button type="button" onClick={getLocation} style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600 }}>
              {locating ? <Loader size={14} /> : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Media */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Photos / Video (max 4)
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {media.map((m, i) => (
              <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                <img src={m.preview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} alt="" />
                <button type="button" onClick={() => setMedia(p => p.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                    background: 'var(--red)', border: 'none', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                  <X size={11} color="white" />
                </button>
              </div>
            ))}
            {media.length < 4 && (
              <button type="button" onClick={() => fileRef.current.click()} style={{
                width: 72, height: 72,
                background: 'var(--surface2)', border: '1px dashed var(--border2)',
                borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 4, cursor: 'pointer'
              }}>
                <Camera size={18} color="var(--text3)" />
                <span style={{ fontSize: 9, color: 'var(--text3)' }}>Add</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleMediaAdd} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Anonymous */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_anonymous}
            onChange={e => setForm(p => ({ ...p, is_anonymous: e.target.checked }))}
            style={{ width: 'auto', accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Submit anonymously</span>
        </label>

        {/* Submit */}
        <button type="submit" disabled={loading || !location} style={{
          padding: 16, background: loading || !location ? 'var(--surface3)' : 'var(--accent)',
          border: 'none', borderRadius: 14, fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: loading || !location ? 'not-allowed' : 'pointer'
        }}>
          {loading ? <><Loader size={16} /> Submitting…</> : '🚨 Submit Issue'}
        </button>
      </form>
    </div>
  );
}
