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
    const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
    const [isBugReportOpen, setIsBugReportOpen] = useState(false);
    const [currentView, setCurrentView] = useState<'settings' | 'privacy' | 'terms'>('settings');
    const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const {
        appearance, setAppearance,
        language, setLanguage,
        streamingQuality, setStreamingQuality,
        dataSaver, setDataSaver,
        offlineMode, setOfflineMode,
        setSleepTimer,
        setIsPlaying,
    } = usePlayerStore();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const p = await getProfile();
        setProfile(p);
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

    if (loading || !profile) return null;

    if (currentView === 'privacy') return <PrivacyView onBack={() => setCurrentView('settings')} />;
    if (currentView === 'terms') return <TermsView onBack={() => setCurrentView('settings')} />;

    return (
        <div className="max-w-2xl mx-auto pb-48 px-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card>
                    <SectionHeader icon={Palette} title="Apariencia" subtitle="Personalización visual" />
                    <SettingRow label="Tema del sistema" description="Cambia el estilo visual de la aplicación">
                        <SelectChip
                            value={appearance}
                            onChange={(v) => setAppearance(v as any)}
                            options={THEME_OPTIONS}
                        />
                    </SettingRow>
                </Card>
            </motion.div>

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

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                    <SectionHeader icon={Wifi} title="Reproducción" subtitle="Streaming y calidad de audio" />
                    <SettingRow label="Calidad de streaming (WiFi)" description="Calidad máxima para una experiencia pura">
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
                    <SettingRow label="Priorizar auto-preload" description="Acelera el cambio entre canciones">
                        <Toggle checked={offlineMode} onChange={setOfflineMode} />
                    </SettingRow>
                </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
                <Card>
                    <SectionHeader
                        icon={Timer}
                        title="Temporizador de sueño"
                        subtitle={sleepRemaining !== null ? `Pausando en ${formatSleepRemaining(sleepRemaining)}` : "Pausa la música automáticamente"}
                    />
                    <div className="grid grid-cols-3 gap-2">
                        {SLEEP_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleSleepTimer(opt.value)}
                                className={clsx(
                                    "py-3 rounded-2xl text-xs font-bold transition-all border",
                                    sleepRemaining !== null && opt.value !== 0 && opt.value === Math.ceil((sleepRemaining || 0) / 60)
                                        ? "bg-white text-black border-white shadow-lg"
                                        : opt.value === 0 && sleepRemaining === null
                                            ? "bg-white/10 text-white border-white/20"
                                            : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {opt.value === 0 && sleepRemaining !== null ? 'Cancelar' : opt.label}
                            </button>
                        ))}
                    </div>
                </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card>
                    <SectionHeader icon={HardDrive} title="Almacenamiento" subtitle="Gestión de caché (Límite: 1GB)" />
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <div>
                                <p className="text-xs font-bold text-white/80">Caché de sistema</p>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Limpieza cada 12h</p>
                            </div>
                            <span className="text-sm font-mono text-white/70">Calculando...</span>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={async () => {
                                    if (window.electron?.clearCache) {
                                        const ok = confirm("¿Estás seguro de que quieres limpiar la caché?");
                                        if (ok) {
                                            await window.electron.clearCache();
                                            alert("Caché limpiada correctamente.");
                                            loadData();
                                        }
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

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}>
                <Card className="border-primary-500/20 bg-primary-500/5">
                    <SectionHeader icon={Activity} title="Diagnóstico de Errores" subtitle="Herramientas para betatesters" />
                    <div className="space-y-3">
                        <button
                            onClick={() => setIsBugReportOpen(true)}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[13px] font-bold text-white transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            <Bug size={16} className="text-primary-500" />
                            Reportar un Error / Feedback
                        </button>
                    </div>
                </Card>
            </motion.div>

            <BugReportModal
                isOpen={isBugReportOpen}
                onClose={() => setIsBugReportOpen(false)}
                userEmail={profile.email}
            />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card>
                    <SectionHeader icon={ShieldCheck} title="Legal & Privacidad" />
                    <div className="grid grid-cols-1 gap-1">
                        {[
                            { label: 'Política de Privacidad', view: 'privacy' },
                            { label: 'Términos de Servicio', view: 'terms' },
                            { label: 'Licencias Open Source', href: 'https://soundvizion.app/licenses' },
                        ].map(link => (
                            <button
                                key={link.label}
                                onClick={() => link.view ? setCurrentView(link.view as any) : window.open(link.href, '_blank')}
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
        </div>
    );
};
