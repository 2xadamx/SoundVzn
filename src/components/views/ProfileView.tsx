import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, Crown, Music, Clock, Heart, BarChart3, Camera, Edit2, Check, X, Image as ImageIcon, Settings } from 'lucide-react';
import clsx from 'clsx';
import { getProfile, updateProfile } from '@utils/database';
import { BACKEND_URL } from '@utils/apiConfig';
import StripeEmbeddedCheckout from '../StripeEmbeddedCheckout';
import axios from 'axios';

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; color?: string }> = ({ icon: Icon, label, value, color = "primary" }) => (
    <motion.div
        whileHover={{ scale: 1.05, y: -4 }}
        className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[28px] p-6 flex flex-col items-center text-center shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-white/20 transition-all duration-500 group"
    >
        <div className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-inner transition-all duration-500 group-hover:scale-110",
            color === "primary" ? "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" : "bg-secondary/20 text-secondary shadow-[0_0_20px_rgba(var(--secondary-rgb),0.3)]"
        )}>
            <Icon size={24} strokeWidth={2.5} />
        </div>
        <p className="text-3xl font-black text-white tracking-tighter mb-1 italic">{value}</p>
        <p className="text-[11px] font-bold text-white/40 tracking-wide">{label}</p>
    </motion.div>
);

export const ProfileView: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [storageSize, setStorageSize] = useState<number>(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [securityData, setSecurityData] = useState<any>(null);

    const refreshAccessToken = async (): Promise<string | null> => {
        const refreshToken = localStorage.getItem('auth_refresh_token');
        if (!refreshToken) return null;
        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/refresh`, { refresh_token: refreshToken });
            const newToken = res.data?.access_token;
            if (newToken) {
                localStorage.setItem('auth_access_token', newToken);
                return newToken;
            }
        } catch {
            // If refresh fails, clear all to force login
            localStorage.removeItem('auth_access_token');
            localStorage.removeItem('auth_refresh_token');
            console.warn('[Auth] Refresh failed, session cleared');
        }
        return null;
    };

    const loadProfile = async () => {
        const data = await getProfile();
        setProfile(data);
        setEditData(data);

        if (window.electron?.getStorageSize) {
            const size = await window.electron.getStorageSize();
            setStorageSize(size);
        }

        try {
            const token = localStorage.getItem('auth_access_token');
            if (token) {
                try {
                    const res = await axios.get(`${BACKEND_URL}/api/auth/security-dashboard`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSecurityData(res.data);
                } catch (err: any) {
                    const status = err?.response?.status;
                    if (status === 401 || status === 403) {
                        const newToken = await refreshAccessToken();
                        if (newToken) {
                            const retry = await axios.get(`${BACKEND_URL}/api/auth/security-dashboard`, {
                                headers: { Authorization: `Bearer ${newToken}` }
                            });
                            setSecurityData(retry.data);
                            return;
                        }
                    }
                    setSecurityData(null);
                }
            }
        } catch (e) {
            console.error('Failed to load security dashboard', e);
        }
    };

    useEffect(() => {
        loadProfile();

        const handleSuccessCheck = () => {
            const hash = window.location.hash;
            if (!hash.includes('?')) return;

            const params = new URLSearchParams(hash.split('?')[1]);
            const sessionId = params.get('session_id');
            const success = params.get('success');

            if (success === 'true' && sessionId) {
                confirmUpgrade(sessionId);
            }
        };

        handleSuccessCheck();
        window.addEventListener('hashchange', handleSuccessCheck);
        return () => window.removeEventListener('hashchange', handleSuccessCheck);
    }, []);

    const confirmUpgrade = async (sessionId: string) => {
        try {
            const res = await fetch('http://localhost:3000/api/payments/confirm-success', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    email: editData.email || profile?.email,
                    name: editData.name || profile?.name
                })
            });
            const data = await res.json();
            if (data.success) {
                await updateProfile({
                    tier: 'pro',
                    stripeCustomerId: data.customerId,
                    stripeSubscriptionId: data.subscriptionId
                });
                await loadProfile();

                // Redirigir automáticamente al panel de gestión
                setTimeout(async () => {
                    const portalRes = await fetch('http://localhost:3000/api/payments/create-portal-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: editData.email || profile?.email,
                            customerId: data.customerId
                        })
                    });
                    const portalData = await portalRes.json();
                    if (portalData.url) {
                        window.location.href = portalData.url;
                    }
                }, 1500);

                // Clean URL
                window.history.replaceState({}, document.title, window.location.hash.split('?')[0]);
            }
        } catch (e) {
            console.error('Error confirming upgrade:', e);
        }
    };

    const handleSave = async () => {
        try {
            // First, sync with backend to check name availability and update auth DB
            const token = localStorage.getItem('auth_access_token');
            if (token) {
                await axios.post(`${BACKEND_URL}/api/auth/update-profile`,
                    { name: editData.name },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            // Then update local data
            await updateProfile(editData);
            await loadProfile();
            setIsEditing(false);
            // Dispatch event for other components (Header)
            window.dispatchEvent(new CustomEvent('profile-updated'));
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Error al guardar el perfil';
            alert(msg);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditData({ ...editData, [field]: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    if (!profile) return (
        <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto pb-40">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Profile Header Card - Ultra Premium Glass */}
                <div className="bg-white/5 backdrop-blur-[60px] border border-white/10 rounded-[48px] p-10 mt-10 text-center relative overflow-hidden shadow-2xl">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

                    {/* Edit Toggle - High Depth Buttons */}
                    <div className="absolute top-8 right-10 z-20">
                        {isEditing ? (
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditing(false)} className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center hover:bg-red-500/20 transition-all active:scale-90">
                                    <X size={24} />
                                </button>
                                <button onClick={handleSave} className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 border border-green-500/30 flex items-center justify-center hover:bg-green-500/20 transition-all active:scale-90">
                                    <Check size={24} />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center justify-center transition-all group active:scale-90">
                                <Edit2 size={24} className="group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                    </div>

                    <div className="relative z-10 pt-4">
                        <div className="relative inline-block mb-10 group">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="w-40 h-40 rounded-full bg-gradient-to-br from-primary via-secondary to-primary p-1.5 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/10 relative z-10"
                            >
                                <div className="w-full h-full rounded-full bg-dark-800 flex items-center justify-center overflow-hidden">
                                    {editData.avatar ? (
                                        <img src={editData.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Profile" />
                                    ) : (
                                        <User size={60} className="text-white/20" />
                                    )}
                                </div>
                            </motion.div>

                            {/* Inner Glow for Avatar */}
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-[20px] scale-90 group-hover:scale-110 transition-transform animate-pulse" />

                            {isEditing && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-2 right-2 w-12 h-12 rounded-2xl bg-white text-dark-950 shadow-2xl hover:scale-110 transition-all flex items-center justify-center z-20"
                                >
                                    <Camera size={24} />
                                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="max-w-xs mx-auto">
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-4xl font-light text-white focus:border-primary/40 outline-none transition-all shadow-xl tracking-tighter"
                                    placeholder="Tu nombre"
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-5xl font-light text-white mb-2 tracking-tighter">{profile.name}</h1>
                                <div className="flex items-center justify-center gap-3 mb-8">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                                    <p className="text-[11px] font-medium text-white/30 tracking-widest">{profile.email}</p>
                                </div>
                            </>
                        )}

                        {profile.tier === 'pro' ? (
                            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 px-10 py-4 rounded-full shadow-[0_20px_40px_rgba(245,158,11,0.4)] border border-amber-300/30 animate-pulse-slow">
                                <Crown size={24} className="text-dark-950 fill-current" />
                                <span className="text-xs font-bold text-dark-950 tracking-wide">SoundVzn Pro</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-3 bg-white/5 px-8 py-3 rounded-full border border-white/10">
                                <span className="text-[11px] font-bold text-white/50 tracking-wide">SoundVzn Standard</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Storage Quota - Only for Standard */}
                {profile.tier === 'standard' && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 mb-10 shadow-xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ImageIcon size={80} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h3 className="text-xl font-light text-white tracking-tight">Capacidad offline</h3>
                                    <p className="text-[10px] font-medium text-white/20 tracking-widest uppercase">Límite estándar: 6GB</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-white italic tracking-tighter">
                                        {(storageSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                                    </p>
                                    <p className="text-[11px] font-bold text-white/40 mb-1 tracking-wide">
                                        Capacidad Almacenamiento Offline (6GB)
                                    </p>
                                </div>
                            </div>
                            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((storageSize / (6 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                                    className={clsx(
                                        "h-full rounded-full transition-colors",
                                        (storageSize / (6 * 1024 * 1024 * 1024)) > 0.9 ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-primary-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                    )}
                                />
                            </div>
                            {(storageSize / (6 * 1024 * 1024 * 1024)) > 0.9 && (
                                <p className="mt-4 text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                                    <X size={12} strokeWidth={3} />
                                    Espacio casi lleno. Mejora a Pro para ilimitado.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* MODERN TECH PRICING SECTION - Hidden if PRO */}
                {(profile && profile.tier !== 'pro') && (
                    <div className="mb-24 px-4 overflow-hidden">
                        <div className="text-center mb-12">
                            <h3 className="text-3xl font-light text-white tracking-tight mb-2">Evoluciona tu sonido</h3>
                            <p className="text-white/20 text-[10px] font-medium uppercase tracking-[0.2em]">Elige tu nivel de fidelidad</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                            {/* Standard Plan - Sleek Minimalist */}
                            <div className={clsx(
                                "bg-[#050508]/40 backdrop-blur-3xl border rounded-[32px] p-10 flex flex-col relative transition-all duration-700",
                                profile.tier === 'standard' ? "border-primary/20 shadow-[0_0_80px_rgba(14,165,233,0.05)] scale-100" : "border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                            )}>
                                <div className="mb-8">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-4">Membresía Base</span>
                                    <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">SV Standard</h4>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-5xl font-black text-white italic">0€</span>
                                        <span className="text-white/20 text-xs font-bold uppercase">/Always</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-12 flex-1">
                                    <div className="flex items-center gap-3 py-2 border-b border-white/5">
                                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/40"><Check size={12} /></div>
                                        <span className="text-xs font-bold text-white/40 italic uppercase tracking-wider">Hi-Res Flow (Lossless)</span>
                                    </div>
                                    <div className="flex items-center gap-3 py-2 border-b border-white/5">
                                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/40"><Check size={12} /></div>
                                        <span className="text-xs font-bold text-white/40 italic uppercase tracking-wider">Storage: 6GB Offline</span>
                                    </div>
                                    <div className="flex items-center gap-3 py-2 opacity-30">
                                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/20"><X size={12} /></div>
                                        <span className="text-xs font-bold text-white/20 italic uppercase tracking-wider line-through">Pro Audio Engine</span>
                                    </div>
                                </div>

                                <button disabled className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/20 text-[10px] font-black uppercase tracking-[0.2em] italic">
                                    {profile.tier === 'standard' ? 'Nivel Actual' : 'No disponible'}
                                </button>
                            </div>

                            {/* Pro Plan - Neon Tech Accents (Blue/Indigo) */}
                            <div className={clsx(
                                "bg-gradient-to-b from-[#0a0a0f] to-[#050508] border rounded-[32px] p-10 flex flex-col relative overflow-hidden transition-all duration-700 group",
                                profile.tier === 'pro' ? "border-primary/50 shadow-[0_0_100px_rgba(14,165,233,0.15)]" : "border-primary/30 hover:border-primary/60 shadow-2xl"
                            )}>
                                {/* Accent Glow */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary blur-[10px] opacity-50" />

                                <div className="mb-8">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Premium Membership</span>
                                        {profile.tier !== 'pro' && (
                                            <span className="px-3 py-1 bg-primary text-dark-950 text-[9px] font-black uppercase rounded-full tracking-widest shadow-[0_0_20px_rgba(14,165,233,0.4)] animate-pulse">
                                                30 Días Gratis
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                                        SV <span className="text-primary italic">Pro</span>
                                    </h4>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-5xl font-black text-white italic">3.99€</span>
                                        <span className="text-white/40 text-xs font-bold uppercase">/Mes</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-12 flex-1">
                                    <div className="flex items-center gap-3 py-2 border-b border-white/5 group-hover:border-primary/20 transition-colors">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Crown size={12} className="fill-current" /></div>
                                        <span className="text-xs font-bold text-white/80 italic uppercase tracking-wider">Ilimitado (Sin Cuotas)</span>
                                    </div>
                                    <div className="flex items-center gap-3 py-2 border-b border-white/5 group-hover:border-primary/20 transition-colors">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Crown size={12} className="fill-current" /></div>
                                        <span className="text-xs font-bold text-white/80 italic uppercase tracking-wider">Crossfade Studio Engine</span>
                                    </div>
                                    <div className="flex items-center gap-3 py-2 border-b border-white/5 group-hover:border-primary/20 transition-colors">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Crown size={12} className="fill-current" /></div>
                                        <span className="text-xs font-bold text-white/80 italic uppercase tracking-wider">Ilimitado Cloud Storage</span>
                                    </div>
                                    <div className="flex items-center gap-3 py-2">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Crown size={12} className="fill-current" /></div>
                                        <span className="text-xs font-bold text-white/80 italic uppercase tracking-wider">Soporte Prioritario</span>
                                    </div>
                                </div>

                                {profile.tier === 'pro' ? (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch('http://localhost:3000/api/payments/create-portal-session', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        email: profile.email,
                                                        customerId: profile.stripeCustomerId
                                                    })
                                                });
                                                const data = await res.json();
                                                if (res.ok && data.url) {
                                                    window.location.href = data.url;
                                                } else {
                                                    alert('Error del portal: ' + (data.error || 'No se pudo generar la sesión.'));
                                                }
                                            } catch (e: any) {
                                                console.error('Portal Error:', e);
                                                alert('Servicio no disponible: ' + e.message);
                                            }
                                        }}
                                        className="w-full py-5 rounded-2xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/50 text-white font-black text-xs uppercase tracking-[0.2em] italic shadow-inner transition-all"
                                    >
                                        Panel de Gestión
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            setShowStripeModal(true);
                                        }}
                                        className="w-full py-5 rounded-2xl bg-primary hover:bg-primary/90 text-dark-950 font-black text-xs uppercase tracking-[0.2em] italic shadow-[0_20px_40px_rgba(14,165,233,0.3)] transition-all active:scale-95 group-hover:scale-[1.02]"
                                    >
                                        Iniciar Prueba Gratuita
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* PRO User Membership - Integrated Premium Experience */}
                {profile.tier === 'pro' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-16 relative"
                    >
                        <div className="bg-[#050508] backdrop-blur-[60px] border border-white/5 rounded-[38px] p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />

                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="mb-8 p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                                    <img src="logo.png" alt="SoundVizion" className="h-10 w-auto brightness-110" />
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest mb-4">
                                        Suscripción Activa
                                    </div>
                                    <h2 className="text-5xl font-light text-white tracking-tighter leading-tight">
                                        SoundVizion <span className="font-black italic text-primary">Pro</span>
                                    </h2>
                                    <p className="mt-6 text-white/40 text-lg font-medium max-w-md leading-relaxed">
                                        Tu cuenta está optimizada con la máxima fidelidad y acceso total a nuestro ecosistema sonoro.
                                    </p>
                                </div>

                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('http://localhost:3000/api/payments/create-portal-session', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    email: profile.email,
                                                    customerId: profile.stripeCustomerId
                                                })
                                            });
                                            const data = await res.json();
                                            if (res.ok && data.url) {
                                                window.location.href = data.url;
                                            }
                                        } catch (e) {
                                            console.error('Portal error');
                                        }
                                    }}
                                    className="px-10 py-5 rounded-2xl bg-white text-dark-950 font-black text-[11px] uppercase tracking-[0.2em] italic transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95"
                                >
                                    Gestionar Membresía
                                </button>
                            </div>

                            {/* Status Indicators */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-12 border-t border-white/5">
                                {[
                                    { label: 'Calidad', value: 'Lossless Hi-Res (Std)' },
                                    { label: 'Almacenamiento', value: 'Ilimitado Cloud' },
                                    { label: 'Audio Engine', value: 'Studio Pro' },
                                    { label: 'Soporte', value: 'VIP Direct' }
                                ].map((item, idx) => (
                                    <div key={idx} className="group cursor-default">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 group-hover:text-primary transition-colors">{item.label}</p>
                                        <p className="text-sm font-bold text-white/80 italic tracking-tight">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Stats Grid - High Depth */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatCard icon={Music} label="PISTAS" value={profile.stats.songs} />
                    <StatCard icon={Clock} label="HORAS" value={profile.stats.hours} color="secondary" />
                    <StatCard icon={Heart} label="FAVORITOS" value={profile.stats.favorites} color="primary" />
                    <StatCard icon={BarChart3} label="PLAYLISTS" value={profile.stats.playlists} color="secondary" />
                </div>

                {/* Security Status - Advanced Dashboard */}
                {securityData && (
                    <div className="bg-[#050508] border border-white/10 rounded-[32px] p-8 mb-8 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h3 className="text-sm font-black text-white/50 tracking-[0.2em] uppercase">Security Dashboard</h3>
                            <div className={clsx(
                                "px-4 py-1.5 border rounded-full font-black uppercase tracking-widest text-[10px]",
                                securityData.securityScore >= 75 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" :
                                    securityData.securityScore >= 50 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                                        "bg-red-500/10 border-red-500/30 text-red-500"
                            )}>
                                {securityData.securityScore >= 75 ? 'Excelente' : securityData.securityScore >= 50 ? 'Estable' : 'Vulnerable'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                            <div className="col-span-1 md:col-span-2 flex flex-col justify-center p-6 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-2">Índice Global</p>
                                <div className="flex items-end gap-3 mb-4">
                                    <span className={clsx(
                                        "text-6xl font-black tracking-tighter italic leading-none",
                                        securityData.securityScore >= 75 ? "text-emerald-400" :
                                            securityData.securityScore >= 50 ? "text-amber-400" : "text-red-400"
                                    )}>{securityData.securityScore}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${securityData.securityScore}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className={clsx("h-full rounded-full shadow-[0_0_10px_currentColor]", securityData.securityScore >= 75 ? "bg-emerald-500 text-emerald-500" : securityData.securityScore >= 50 ? "bg-amber-500 text-amber-500" : "bg-red-500 text-red-500")} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex-1 flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", securityData.verified ? "bg-primary/10 text-primary" : "bg-white/5 text-white/20")}>
                                        <Check size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white/80">{securityData.verified ? 'Verificado' : 'No verificado'}</p>
                                        <p className="text-[10px] text-white/20 font-medium tracking-[0.2em] uppercase">Status</p>
                                    </div>
                                </div>

                                <div className="flex-1 flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400">
                                        <Crown size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white/80 tracking-widest uppercase">{profile.tier}</p>
                                        <p className="text-[10px] text-white/20 font-medium tracking-[0.2em] uppercase">Access</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* System Controls - Minimalist Small */}
                <div className="flex items-center justify-between gap-4 mt-12">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/60 hover:text-white text-[11px] font-medium flex items-center justify-center gap-2 transition-all tracking-wider"
                    >
                        <Settings size={14} />
                        Configuración
                    </motion.button>

                    <motion.button
                        whileHover={!isLoggingOut ? { scale: 1.02 } : {}}
                        whileTap={!isLoggingOut ? { scale: 0.98 } : {}}
                        disabled={isLoggingOut}
                        onClick={async () => {
                            if (isLoggingOut) return;
                            setIsLoggingOut(true);
                            try {
                                const { clearAuthSession } = await import('../../utils/database');
                                await clearAuthSession();
                                setTimeout(() => {
                                    window.location.href = window.location.origin;
                                }, 800);
                            } catch (e) {
                                setIsLoggingOut(false);
                            }
                        }}
                        className={clsx(
                            "py-3 px-6 border rounded-2xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all tracking-wider",
                            isLoggingOut
                                ? "bg-white/5 border-white/5 text-white/20"
                                : "bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-500/60 hover:text-red-500"
                        )}
                    >
                        {isLoggingOut ? (
                            <div className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                        ) : (
                            <LogOut size={14} />
                        )}
                        {isLoggingOut ? 'Saliendo' : 'Abandonar'}
                    </motion.button>
                </div>
            </motion.div>
            {showStripeModal && (
                <StripeEmbeddedCheckout
                    email={profile?.email}
                    onClose={() => setShowStripeModal(false)}
                />
            )}
        </div>
    );
};
