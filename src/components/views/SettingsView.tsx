import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wifi, Timer, Check, ChevronDown,
    Activity, Palette, Bug, ShieldCheck, HardDrive, ExternalLink, Globe
} from 'lucide-react';
import { getProfile } from '@utils/database';
import { usePlayerStore } from '@store/player';
import clsx from 'clsx';
import { BugReportModal } from '../modals/BugReportModal';
import { PrivacyView } from './PrivacyView';
import { TermsView } from './TermsView';

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle?: string }> = ({ icon: Icon, title, subtitle }) => (
    <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <Icon size={18} className="text-white/70" />
        </div>
        <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

const SettingRow: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
        <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-semibold text-white/80 leading-tight">{label}</p>
            {description && <p className="text-[10px] text-white/30 mt-0.5 tracking-wide">{description}</p>}
        </div>
        {children}
    </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={clsx(
            "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-300",
            checked ? "bg-white/90" : "bg-white/10 border border-white/10",
            disabled && "opacity-40 cursor-not-allowed"
        )}
    >
        <motion.div
            animate={{ x: checked ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={clsx("h-5 w-5 rounded-full shadow-md", checked ? "bg-black" : "bg-white/60")}
        />
    </button>
);

const SelectChip: React.FC<{ options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = options.find(o => o.value === value);
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all min-w-[120px] justify-between"
            >
                {selected?.label || value}
                <ChevronDown size={12} className={clsx("transition-transform", open && "rotate-180")} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden py-1"
                    >
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {opt.label}
                                {opt.value === value && <Check size={12} className="text-white" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={clsx("bg-white/[0.03] border border-white/[0.06] rounded-3xl p-6 mb-4", className)}>
        {children}
    </div>
);

const THEME_OPTIONS = [
    { value: 'stellar-dark', label: '✨ Stellar Dark' },
    { value: 'vivid-nebula', label: '🌌 Tokyo Night' },
    { value: 'radiant-light', label: '☀️ Radiant Light' },
];

const SLEEP_OPTIONS = [
    { value: 0, label: 'Apagado' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '90 min' },
];

// ─── Main Component ────────────────────────────────────────────────────────────

export const SettingsView: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [storageSize, setStorageSize] = useState<any>(null);
    const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
    const [isBugReportOpen, setIsBugReportOpen] = useState(false);
    const [currentView, setCurrentView] = useState<'settings' | 'privacy' | 'terms'>('settings');
    const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Reactive store values (proper hooks, not getState() in JSX) ──
    const {
        appearance, setAppearance,
        language, setLanguage,
        streamingQuality, setStreamingQuality,
        dataSaver, setDataSaver,
        offlineMode, setOfflineMode,
        enableInstantPreview, setEnableInstantPreview,
        setSleepTimer,
        setIsPlaying,
        audioSettings,
        updateAudioSettings,
    } = usePlayerStore();

    const crossfade = audioSettings.crossfade;
    const replayGain = audioSettings.replayGain;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const p = await getProfile();
        setProfile(p);
        if (typeof (window as any).electron?.getStorageSize === 'function') {
            const sizeData = await (window as any).electron.getStorageSize();
            // Normalize: electron returns number (bytes), web returns { formatted }
            if (typeof sizeData === 'number') {
                setStorageSize({ formatted: `${(sizeData / (1024 * 1024)).toFixed(1)} MB` });
            } else {
                setStorageSize(sizeData);
            }
        } else if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
                setStorageSize({ formatted: `${usageMB} MB` });
            } catch (e) {
                setStorageSize({ formatted: 'Desconocido' });
            }
        } else {
            setStorageSize({ formatted: 'Web Cache' });
        }
        setLoading(false);
    };

    const handleSleepTimer = (minutes: number) => {
        if (sleepIntervalRef.current) {
            clearInterval(sleepIntervalRef.current);
            sleepIntervalRef.current = null;
        }

        if (minutes === 0) {
            setSleepRemaining(null);
            setSleepTimer(null);
            return;
        }

        let remaining = minutes * 60;
        setSleepRemaining(remaining);
        setSleepTimer(minutes);

        sleepIntervalRef.current = setInterval(() => {
            remaining -= 1;
            setSleepRemaining(prev => {
                if (prev === null || prev <= 1) {
                    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
                    setSleepTimer(0);
                    setIsPlaying(false);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => () => {
        if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    }, []);

    const formatSleepRemaining = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (loading || !profile) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="w-8 h-8 border-t-2 border-white/20 rounded-full animate-spin" />
        </div>
    );

    if (currentView === 'privacy') return <PrivacyView onBack={() => setCurrentView('settings')} />;
    if (currentView === 'terms') return <TermsView onBack={() => setCurrentView('settings')} />;

    return (
        <div className="max-w-2xl mx-auto pb-48 px-4">

            {/* ── Apariencia ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
                <Card>
                    <SectionHeader icon={Palette} title="Apariencia" subtitle="Tema visual de la app" />
                    <div className="grid grid-cols-3 gap-3">
                        {THEME_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setAppearance(opt.value as any)}
                                className={clsx(
                                    "py-3 px-2 rounded-2xl text-xs font-bold transition-all border text-center",
                                    appearance === opt.value
                                        ? "bg-white text-black border-white shadow-lg"
                                        : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* ── Audio FX ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card>
                    <SectionHeader icon={Activity} title="Audio FX" subtitle="Procesamiento y transiciones" />
                    <SettingRow
                        label="Crossfade nativo"
                        description={`Transición suave entre pistas (${crossfade}s)`}
                    >
                        <div className="flex items-center gap-3 w-40">
                            <input
                                type="range" min="0" max="12" step="1"
                                value={crossfade}
                                onChange={(e) => updateAudioSettings({ crossfade: parseInt(e.target.value) })}
                                className="w-full accent-white h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-white/40 w-6 shrink-0">{crossfade}s</span>
                        </div>
                    </SettingRow>
                    <SettingRow label="Normalización de audio" description="Ajusta el volumen de las pistas para un nivel uniforme">
                        <Toggle
                            checked={replayGain}
                            onChange={(v) => updateAudioSettings({ replayGain: v })}
                        />
                    </SettingRow>
                </Card>
            </motion.div>

            {/* ── Idioma ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
                <Card>
                    <SectionHeader icon={Globe} title="Idioma" subtitle="Interfaz y contenido" />
                    <SettingRow label="Idioma de la aplicación" description="Afecta menús y mensajes del sistema">
                        <SelectChip
                            value={language}
                            onChange={(v) => setLanguage(v as any)}
                            options={[
                                { value: 'es', label: '🇪🇸 Español' },
                                { value: 'en', label: '🇬🇧 English' },
                            ]}
                        />
                    </SettingRow>
                </Card>
            </motion.div>

            {/* ── Reproducción ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                    <SectionHeader icon={Wifi} title="Reproducción" subtitle="Streaming y calidad de audio" />
                    <SettingRow label="Calidad de streaming" description="Calidad máxima para una experiencia pura">
                        <SelectChip
                            value={streamingQuality}
                            onChange={(v) => setStreamingQuality(v as any)}
                            options={[
                                { value: 'normal', label: 'Normal (128k)' },
                                { value: 'cd', label: 'CD (320k)' },
                                { value: 'hi-res', label: 'Hi-Res (FLAC)' },
                            ]}
                        />
                    </SettingRow>
                    <SettingRow label="Ahorro de datos" description="Reduce calidad de streaming en red móvil">
                        <Toggle checked={dataSaver} onChange={setDataSaver} />
                    </SettingRow>
                    <SettingRow label="Preload instantáneo" description="Precarga la siguiente canción para cambios sin cortes">
                        <Toggle checked={enableInstantPreview} onChange={setEnableInstantPreview} />
                    </SettingRow>
                    <SettingRow label="Modo sin conexión" description="Reproduce solo música descargada localmente">
                        <Toggle checked={offlineMode} onChange={setOfflineMode} />
                    </SettingRow>
                </Card>
            </motion.div>

            {/* ── Temporizador de sueño ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
                <Card>
                    <SectionHeader
                        icon={Timer}
                        title="Temporizador de sueño"
                        subtitle={sleepRemaining !== null ? `Pausando en ${formatSleepRemaining(sleepRemaining)}` : "Pausa la música automáticamente"}
                    />
                    <div className="grid grid-cols-3 gap-2">
                        {SLEEP_OPTIONS.map(opt => {
                            const isActive = sleepRemaining !== null && opt.value !== 0 &&
                                opt.value * 60 >= (sleepRemaining - 60) && opt.value * 60 <= (sleepRemaining + 60);
                            const isOff = opt.value === 0 && sleepRemaining === null;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => handleSleepTimer(opt.value)}
                                    className={clsx(
                                        "py-3 rounded-2xl text-xs font-bold transition-all border",
                                        isActive ? "bg-white text-black border-white shadow-lg"
                                            : isOff ? "bg-white/10 text-white border-white/20"
                                                : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {opt.value === 0 && sleepRemaining !== null ? 'Cancelar' : opt.label}
                                </button>
                            );
                        })}
                    </div>
                </Card>
            </motion.div>

            {/* ── Almacenamiento ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card>
                    <SectionHeader icon={HardDrive} title="Almacenamiento" subtitle="Gestión de caché" />
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <div>
                                <p className="text-xs font-bold text-white/80">Caché de sistema</p>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Limpieza automática cada 12h</p>
                            </div>
                            <span className="text-sm font-mono text-white/70">{storageSize?.formatted || '—'}</span>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={async () => {
                                    if (confirm("¿Limpiar la caché? Los datos de usuario no se borrarán.")) {
                                        if (window.electron?.clearCache) {
                                            await window.electron.clearCache();
                                        } else {
                                            try {
                                                if ('caches' in window) {
                                                    const names = await caches.keys();
                                                    await Promise.all(names.map(n => caches.delete(n)));
                                                }
                                            } catch (e) {
                                                console.error('Error clearing web caches', e);
                                            }
                                        }
                                        usePlayerStore.getState().addToast({ type: 'success', message: 'Caché limpiada', duration: 3000 });
                                        loadData();
                                    }
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white/50 hover:text-white transition-all active:scale-[0.98]"
                            >
                                Limpiar ahora
                            </button>
                            <button
                                onClick={() => window.electron?.openDownloadFolder?.()}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white/50 hover:text-white transition-all active:scale-[0.98]"
                            >
                                Carpeta local
                            </button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* ── Cuenta ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}>
                <Card className="border-rose-500/20 bg-rose-500/5">
                    <SectionHeader icon={ShieldCheck} title="Gestión de Cuenta" subtitle="Seguridad y privacidad" />
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-bold text-white/80">{profile.name}</p>
                                <p className="text-[10px] text-white/30 truncate">{profile.email}</p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-white/10 text-[9px] font-bold text-white/60 uppercase tracking-widest border border-white/5">
                                {profile.tier === 'pro' ? 'Supreme Pro' : 'Free Tier'}
                            </span>
                        </div>
                        <div className="h-px bg-white/5 my-2" />
                        <button
                            onClick={() => setIsBugReportOpen(true)}
                            className="w-full py-3 hover:bg-white/5 border border-white/5 rounded-2xl text-[11px] font-bold text-white/40 hover:text-white transition-all flex items-center justify-center gap-3"
                        >
                            <Bug size={14} /> Reportar un problema
                        </button>
                        <button
                            onClick={() => { if (confirm("¿Eliminar cuenta? Esta acción es irreversible.")) alert("Solicitud enviada al administrador."); }}
                            className="w-full py-3 hover:bg-rose-500/10 border border-white/5 rounded-2xl text-[11px] font-bold text-rose-500/50 hover:text-rose-500 transition-all flex items-center justify-center gap-3"
                        >
                            Eliminar mi cuenta definitivamente
                        </button>
                    </div>
                </Card>
            </motion.div>

            {/* ── Legal ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card>
                    <SectionHeader icon={ShieldCheck} title="Legal & Privacidad" />
                    <div className="grid grid-cols-1 gap-1">
                        {[
                            { label: 'Política de Privacidad', view: 'privacy' as const },
                            { label: 'Términos de Servicio', view: 'terms' as const },
                            { label: 'Licencias Open Source', href: 'https://soundvizion.app/licenses' },
                        ].map(link => (
                            <button
                                key={link.label}
                                onClick={() => link.view ? setCurrentView(link.view) : window.open(link.href, '_blank')}
                                className="w-full flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-white/5 text-sm text-white/50 hover:text-white transition-all group"
                            >
                                {link.label}
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30" />
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/[0.04] text-center">
                        <p className="text-[9px] text-white/15 uppercase tracking-[0.3em] font-bold leading-relaxed">
                            SoundVizion · Beta Privada<br />
                            v1.0.0-beta · Build 2026
                        </p>
                    </div>
                </Card>
            </motion.div>

            <BugReportModal
                isOpen={isBugReportOpen}
                onClose={() => setIsBugReportOpen(false)}
                userEmail={profile.email}
            />
        </div>
    );
};
