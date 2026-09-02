import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  FastForward, 
  Rewind, 
  Sparkles, 
  Camera, 
  FlipHorizontal, 
  FlipVertical, 
  Repeat, 
  ChevronLeft, 
  Activity, 
  SlidersHorizontal,
  X,
  Volume1,
  Mic
} from 'lucide-react';
import { 
  VideoItem, 
  VideoFilterPreset, 
  CustomFilterAdjustments, 
  AspectRatio, 
  AudioEqualizerPreset,
} from '../types/video';
import { formatDuration, formatFileSize } from '../utils/formatters';

interface VideoPlayerModalProps {
  video: VideoItem;
  onClose: () => void;
}

const defaultAdjustments: CustomFilterAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hueRotate: 0,
  blur: 0,
  sepia: 0,
  invert: 0,
  sharpness: 0,
};

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);

  // Audio Context Refs for live reactive analysis & EQ & Volume Normalizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
  const [isNormalizerActive, setIsNormalizerActive] = useState(true);

  // Flip States (Horizontal & Vertical)
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Filters & Processing
  const [activeFilterPreset, setActiveFilterPreset] = useState<VideoFilterPreset>('normal');
  const [adjustments, setAdjustments] = useState<CustomFilterAdjustments>(defaultAdjustments);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [equalizerPreset, setEqualizerPreset] = useState<AudioEqualizerPreset>('flat');

  // A-B Repeat Loop State
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);

  // Dynamic Audio Metrics for breathing visualizer & hue shift
  const [audioHue, setAudioHue] = useState(210);
  const [audioAmplitude, setAudioAmplitude] = useState(0.35);

  // Controls Visibility Idle Timer
  const [showControls, setShowControls] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Snapshot Toast
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // 1. Initialize Web Audio API with DynamicsCompressor Volume Normalizer
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    let hasAudioNode = false;

    const resumeAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    };

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const bass = audioCtx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 250;
        bassFilterRef.current = bass;

        const treble = audioCtx.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 4000;
        trebleFilterRef.current = treble;

        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        compressorRef.current = compressor;

        try {
          const source = audioCtx.createMediaElementSource(vid);
          source.connect(bass);
          bass.connect(treble);
          treble.connect(compressor);
          compressor.connect(analyser);
          analyser.connect(audioCtx.destination);
          hasAudioNode = true;
        } catch (mediaNodeErr) {
          console.warn('[WebAudio] MediaElementSource fallback to direct audio:', mediaNodeErr);
        }

        resumeAudio();
      }
    } catch (e) {
      console.warn('[WebAudio] Init exception:', e);
    }

    // Live Render Loop for Audio Spectrum Canvas
    const dataArray = new Uint8Array(64);
    let simPhase = 0;

    const renderVisualizer = () => {
      let currentAmp = 0;
      let targetHue = 210;

      if (hasAudioNode && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        currentAmp = (sum / dataArray.length) / 255;
      } else {
        simPhase += 0.05;
        if (!vid.paused) {
          currentAmp = 0.25 + Math.sin(simPhase * 1.5) * 0.15 + Math.cos(simPhase * 3) * 0.1;
          for (let i = 0; i < 64; i++) {
            dataArray[i] = Math.max(10, Math.floor((Math.sin(simPhase + i * 0.2) * 0.5 + 0.5) * 200 * currentAmp));
          }
        } else {
          currentAmp = 0.05;
          dataArray.fill(5);
        }
      }

      setAudioAmplitude(currentAmp);
      targetHue = Math.floor((190 + (currentAmp * 160) + (simPhase * 15)) % 360);
      setAudioHue(targetHue);

      // Draw Visualizer HUD Canvas
      const canvas = visualizerCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barCount = 28;
          const barWidth = canvas.width / barCount;

          for (let i = 0; i < barCount; i++) {
            const val = dataArray[i * 2] || 0;
            const barHeight = (val / 255) * canvas.height * 0.95;
            const x = i * barWidth;
            const y = canvas.height - barHeight;

            ctx.fillStyle = `hsla(${targetHue + i * 2}, 90%, 60%, 0.85)`;
            ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
          }
        }
      }

      requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  // Update Dynamic Compressor Normalizer
  useEffect(() => {
    if (compressorRef.current) {
      compressorRef.current.threshold.value = isNormalizerActive ? -24 : 0;
      compressorRef.current.ratio.value = isNormalizerActive ? 12 : 1;
    }
  }, [isNormalizerActive]);

  // Update Equalizer DSP
  useEffect(() => {
    if (!bassFilterRef.current || !trebleFilterRef.current) return;
    switch (equalizerPreset) {
      case 'bass-boost':
        bassFilterRef.current.gain.value = 8;
        trebleFilterRef.current.gain.value = -2;
        break;
      case 'vocal-boost':
        bassFilterRef.current.gain.value = -3;
        trebleFilterRef.current.gain.value = 4;
        break;
      case 'treble-boost':
        bassFilterRef.current.gain.value = -4;
        trebleFilterRef.current.gain.value = 8;
        break;
      case 'cinema':
        bassFilterRef.current.gain.value = 6;
        trebleFilterRef.current.gain.value = 5;
        break;
      case 'flat':
      default:
        bassFilterRef.current.gain.value = 0;
        trebleFilterRef.current.gain.value = 0;
        break;
    }
  }, [equalizerPreset]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Silent Mouse Wheel Scrubbing (No intrusive text HUD)
  const handleWheelSeek = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    e.preventDefault();

    const seekStep = 2.0; // 2 seconds per notch
    const isForward = e.deltaY < 0;
    const newTime = Math.max(0, Math.min(duration || 1000, videoRef.current.currentTime + (isForward ? seekStep : -seekStep)));

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Handle Time Update & A-B Looping
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (isLoopActive && loopA !== null && loopB !== null) {
      if (t >= loopB || t < loopA) {
        videoRef.current.currentTime = loopA;
      }
    }
  };

  // Step Frame
  const stepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const frameTime = 1 / (video.fps || 24);
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + (forward ? frameTime : -frameTime)));
  };

  // Build Dynamic CSS Filter String
  const computeFilterStyle = (): string => {
    let base = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) hue-rotate(${adjustments.hueRotate}deg) blur(${adjustments.blur}px) sepia(${adjustments.sepia}%) invert(${adjustments.invert}%)`;

    switch (activeFilterPreset) {
      case 'cyberpunk':
        return `${base} contrast(140%) saturate(160%) hue-rotate(295deg)`;
      case 'nightvision':
        return `${base} saturate(200%) brightness(125%) hue-rotate(90deg) contrast(140%)`;
      case 'matrix':
        return `${base} hue-rotate(85deg) saturate(200%) contrast(135%) brightness(90%)`;
      case 'celshade':
        return `${base} contrast(180%) saturate(160%) brightness(110%)`;
      case 'hdr':
        return `${base} contrast(120%) saturate(130%) brightness(105%)`;
      case 'vhs':
        return `${base} sepia(30%) saturate(130%) contrast(115%)`;
      case 'noir':
        return `${base} grayscale(100%) contrast(160%) brightness(95%)`;
      case 'grain':
      case 'normal':
      default:
        return base;
    }
  };

  // Capture High-Res Snapshot
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const vid = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth || 1920;
    canvas.height = vid.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const filterStr = computeFilterStyle();
    if (filterStr) {
      ctx.filter = filterStr;
    }

    if (flipH || flipV) {
      ctx.translate(flipH ? canvas.width : 0, flipV ? canvas.height : 0);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    }

    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    const defaultFilename = `WatchThis_${video.cleanTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.floor(currentTime)}s.png`;

    if (window.electronAPI?.saveSnapshot) {
      const savedPath = await window.electronAPI.saveSnapshot(dataUrl, defaultFilename);
      if (savedPath) {
        setSnapshotToast(`Snapshot saved: ${savedPath}`);
      }
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = defaultFilename;
      a.click();
      setSnapshotToast(`Snapshot captured (${canvas.width}x${canvas.height})`);
    }

    setTimeout(() => setSnapshotToast(null), 3000);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'escape':
          if (isFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;
        case 'h':
          setFlipH(prev => !prev);
          break;
        case 'v':
          setFlipV(prev => !prev);
          break;
        case 'm':
          setIsMuted(prev => !prev);
          break;
        case 'n':
          setIsNormalizerActive(prev => !prev);
          break;
        case 's':
          captureSnapshot();
          break;
        case '2':
          setPlaybackRate(prev => {
            const next = prev === 2.0 ? 1.0 : 2.0;
            if (videoRef.current) videoRef.current.playbackRate = next;
            return next;
          });
          break;
        case 'arrowleft':
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'arrowright':
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
          }
          break;
        case 'arrowup':
          setVolume(prev => Math.min(1, prev + 0.05));
          break;
        case 'arrowdown':
          setVolume(prev => Math.max(0, prev - 0.05));
          break;
        case ',':
          stepFrame(false);
          break;
        case '.':
          stepFrame(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, isFullscreen, onClose, duration, flipH, flipV]);

  // Handle Controls Fade on Mouse Idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setIsFilterPanelOpen(false);
        setIsToolsPanelOpen(false);
      }
    }, 3500);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onWheel={handleWheelSeek}
      className="fixed inset-0 z-[160] bg-black overflow-hidden select-none font-sans"
    >
      {/* 1. Main Full-Screen Video Canvas Layer (Occupies 100% of the screen like VLC) */}
      <div 
        className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden z-0"
        onDoubleClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={video.streamUrl}
          autoPlay
          playsInline
          muted={isMuted}
          onPlay={() => {
            setIsPlaying(true);
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
              audioCtxRef.current.resume().catch(() => {});
            }
          }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              videoRef.current.volume = volume;
              videoRef.current.playbackRate = playbackRate;
              videoRef.current.play().catch(() => {});
            }
          }}
          onEnded={() => setIsPlaying(false)}
          style={{
            transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            filter: computeFilterStyle(),
            objectFit: aspectRatio === 'fill' ? 'fill' : aspectRatio === 'original' ? 'contain' : undefined,
            aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '21:9' ? '21/9' : aspectRatio === '4:3' ? '4/3' : undefined,
          }}
          className="w-full h-full object-contain transition-transform duration-300"
        />

        {/* Video Overlay Filters */}
        {activeFilterPreset === 'matrix' && <div className="absolute inset-0 filter-crt-overlay pointer-events-none" />}
        {activeFilterPreset === 'nightvision' && <div className="absolute inset-0 filter-nightvision-overlay pointer-events-none" />}
        {activeFilterPreset === 'grain' && <div className="absolute inset-0 filter-grain-overlay pointer-events-none" />}

        {/* Snapshot Notification Toast */}
        {snapshotToast && (
          <div className="absolute bottom-28 z-40 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-mono font-light shadow-md flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span>{snapshotToast}</span>
          </div>
        )}

        {/* Filter Adjustment Floating HUD Panel */}
        {isFilterPanelOpen && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute right-6 bottom-28 w-80 p-4 rounded-2xl glass-panel-elevated border border-white/15 z-50 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono uppercase tracking-wider text-accent-neon flex items-center gap-1.5 font-light">
                <Sparkles className="w-3.5 h-3.5" /> Creative Filters
              </span>
              <button 
                onClick={() => setIsFilterPanelOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'normal', name: 'Clean' },
                { id: 'cyberpunk', name: 'Cyberpunk' },
                { id: 'grain', name: '35mm Film' },
                { id: 'nightvision', name: 'Night Vis' },
                { id: 'matrix', name: 'Matrix CRT' },
                { id: 'celshade', name: 'Cel-Shade' },
                { id: 'hdr', name: 'HDR Boost' },
                { id: 'vhs', name: '80s VHS' },
                { id: 'noir', name: 'Noir B&W' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setActiveFilterPreset(p.id as VideoFilterPreset)}
                  className={`p-2 rounded-xl text-[10px] font-mono font-light transition-all ${
                    activeFilterPreset === p.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-light">
                <span>Brightness ({adjustments.brightness}%)</span>
                <input
                  type="range"
                  min="50"
                  max="180"
                  value={adjustments.brightness}
                  onChange={(e) => setAdjustments(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="w-32 accent-accent cursor-pointer"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-light">
                <span>Contrast ({adjustments.contrast}%)</span>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={adjustments.contrast}
                  onChange={(e) => setAdjustments(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                  className="w-32 accent-accent cursor-pointer"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-light">
                <span>Saturation ({adjustments.saturation}%)</span>
                <input
                  type="range"
                  min="0"
                  max="250"
                  value={adjustments.saturation}
                  onChange={(e) => setAdjustments(prev => ({ ...prev, saturation: Number(e.target.value) }))}
                  className="w-32 accent-accent cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setActiveFilterPreset('normal');
                setAdjustments(defaultAdjustments);
              }}
              className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-mono transition-colors font-light"
            >
              Reset to Defaults
            </button>
          </div>
        )}

        {/* Pro Tools Floating Panel */}
        {isToolsPanelOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-6 bottom-28 w-84 p-4 rounded-2xl glass-panel-elevated border border-white/15 z-50 space-y-3.5 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono uppercase tracking-wider text-accent-cyan flex items-center gap-1.5 font-light">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Audio & Aspect Tools
              </span>
              <button 
                onClick={() => setIsToolsPanelOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Audio Equalizer */}
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5 font-light">
                Audio Equalizer DSP
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(['flat', 'bass-boost', 'vocal-boost', 'treble-boost', 'cinema'] as AudioEqualizerPreset[]).map(eq => (
                  <button
                    key={eq}
                    onClick={() => setEqualizerPreset(eq)}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-mono capitalize transition-all ${
                      equalizerPreset === eq
                        ? 'bg-accent-cyan text-slate-950 font-light'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 font-light'
                    }`}
                  >
                    {eq.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Switcher */}
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5 font-light">
                Aspect Ratio Fit
              </span>
              <div className="grid grid-cols-5 gap-1 text-[10px] font-mono">
                {(['original', '16:9', '21:9', '4:3', 'fill'] as AspectRatio[]).map(ar => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`py-1 rounded-lg capitalize transition-all ${
                      aspectRatio === ar
                        ? 'bg-accent text-white font-light'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 font-light'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            {/* A-B Loop Controls */}
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5 font-light">
                A-B Repeat Looper
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLoopA(currentTime)}
                  className={`flex-1 py-1 px-2 rounded-lg font-mono text-[10px] border transition-all ${
                    loopA !== null ? 'bg-accent/20 border-accent text-accent-neon font-light' : 'bg-white/5 border-white/10 text-slate-400 font-light'
                  }`}
                >
                  Set Point A {loopA !== null ? `(${formatDuration(loopA)})` : ''}
                </button>
                <button
                  onClick={() => setLoopB(currentTime)}
                  className={`flex-1 py-1 px-2 rounded-lg font-mono text-[10px] border transition-all ${
                    loopB !== null ? 'bg-accent/20 border-accent text-accent-magenta font-light' : 'bg-white/5 border-white/10 text-slate-400 font-light'
                  }`}
                >
                  Set Point B {loopB !== null ? `(${formatDuration(loopB)})` : ''}
                </button>
                <button
                  onClick={() => setIsLoopActive(prev => !prev)}
                  disabled={loopA === null || loopB === null}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-mono disabled:opacity-40 transition-all ${
                    isLoopActive ? 'bg-accent text-white font-light' : 'bg-white/10 text-slate-300 font-light'
                  }`}
                >
                  Loop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top HUD Header Bar (Overlapping Video Floating Bar) */}
      <div 
        className={`absolute top-0 left-0 right-0 z-40 h-16 pl-6 pr-[165px] bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between transition-opacity duration-300 app-drag-region ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 app-no-drag min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-light backdrop-blur-md transition-all active:scale-95 flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Explorer</span>
          </button>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-light text-white tracking-wide truncate max-w-md lg:max-w-xl">
              {video.name}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 font-light">
              <span className="text-accent-neon font-light">{video.resolution}</span>
              {video.codec && <span>&bull; {video.codec}</span>}
              <span>&bull; {formatFileSize(video.size)}</span>
            </div>
          </div>
        </div>

        {/* Top Right Live Audio Spectrum & Normalizer HUD */}
        <div className="flex items-center gap-3 app-no-drag flex-shrink-0">
          {/* Volume Normalizer Toggle Pill */}
          <button
            onClick={() => setIsNormalizerActive(prev => !prev)}
            title="Auto Volume Normalizer [Key N]"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-light transition-all ${
              isNormalizerActive
                ? 'bg-accent-neon text-slate-950 shadow-glow-cyan'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span className="hidden sm:inline">Normalizer: {isNormalizerActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Mini Real-Time Audio Visualizer Canvas */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
            <Activity className="w-3.5 h-3.5 text-accent-cyan" />
            <canvas
              ref={visualizerCanvasRef}
              width={90}
              height={16}
              className="h-4 w-[90px]"
            />
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Bottom Floating Control Bar (Overlapping Video) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-40 p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrubber Bar */}
        <div className="relative mb-3 group/scrub">
          <div className="relative h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden transition-all group-hover/scrub:h-2.5">
            <div 
              className="h-full bg-gradient-to-r from-accent via-accent-cyan to-accent-neon rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              setCurrentTime(t);
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left Play/Pause, Skip, Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-2xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 5);
              }}
              title="Rewind 5s [←]"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.min(duration, currentTime + 5);
              }}
              title="Forward 5s [→]"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 ml-1">
              <button
                onClick={() => setIsMuted(prev => !prev)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  setIsMuted(false);
                  if (videoRef.current) videoRef.current.volume = v;
                }}
                className="w-20 h-1 accent-accent bg-white/20 rounded-lg cursor-pointer"
              />
            </div>

            <span className="text-xs font-mono text-slate-300 font-light ml-2">
              <span className="text-white font-light">{formatDuration(currentTime)}</span> / {formatDuration(duration)}
            </span>
          </div>

          {/* Right Tools, Filters, Transforms, Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              onClick={captureSnapshot}
              title="Capture Snapshot [S]"
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={() => setFlipH(prev => !prev)}
              title="Flip Horizontally [H]"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-light transition-all ${
                flipH
                  ? 'bg-accent-neon text-slate-950 font-light'
                  : 'bg-surface-elevated border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Flip X</span>
            </button>

            <button
              onClick={() => setFlipV(prev => !prev)}
              title="Flip Vertically [V]"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-light transition-all ${
                flipV
                  ? 'bg-accent-neon text-slate-950 font-light'
                  : 'bg-surface-elevated border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <FlipVertical className="w-3.5 h-3.5" />
              <span>Flip Y</span>
            </button>

            {/* Quick 2.0x Preview Speed Toggle */}
            <button
              onClick={() => {
                const nextRate = playbackRate === 2.0 ? 1.0 : 2.0;
                setPlaybackRate(nextRate);
                if (videoRef.current) videoRef.current.playbackRate = nextRate;
              }}
              title="Toggle 2.0x Preview Speed [Key 2]"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-light transition-all ${
                playbackRate === 2.0
                  ? 'bg-accent-magenta text-white shadow-glow-magenta'
                  : 'bg-surface-elevated border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <FastForward className="w-3.5 h-3.5 fill-current" />
              <span>2.0x</span>
            </button>

            {/* Playback Speed Selector */}
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = Number(e.target.value);
                setPlaybackRate(rate);
                if (videoRef.current) {
                  videoRef.current.playbackRate = rate;
                  videoRef.current.defaultPlaybackRate = rate;
                }
              }}
              className="bg-surface-elevated border border-white/10 text-slate-200 text-xs font-mono font-light rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer hover:border-white/25"
            >
              {[0.1, 0.2, 0.3, 0.5, 0.6, 0.75, 0.8, 1, 1.25, 1.5, 2, 3, 4, 5].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}x
                </option>
              ))}
            </select>

            {/* Filters Rack Button */}
            <button
              onClick={() => {
                setIsFilterPanelOpen(prev => !prev);
                setIsToolsPanelOpen(false);
              }}
              title="Video Filter Presets & Sliders"
              className={`p-2 rounded-xl border transition-all ${
                isFilterPanelOpen || activeFilterPreset !== 'normal'
                  ? 'bg-accent-magenta text-white border-accent-magenta'
                  : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Tools Rack Button */}
            <button
              onClick={() => {
                setIsToolsPanelOpen(prev => !prev);
                setIsFilterPanelOpen(false);
              }}
              title="DSP Audio Equalizer & Aspect Ratio"
              className={`p-2 rounded-xl border transition-all ${
                isToolsPanelOpen
                  ? 'bg-accent-cyan text-slate-950 border-accent-cyan font-light'
                  : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white font-light'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen [F]"
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
