import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Lock, User, Loader2, AlertCircle,
    Eye, EyeOff, CheckCircle2, XCircle, ArrowRight, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../store/auth';

interface LoginScreenProps {
    clientId: string;
    onLoginSuccess: (session: any) => void;
}

type Mode = 'login' | 'register' | 'verify' | 'reset' | 'onboarding';

const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { score, label: 'Muy débil', color: '#ef4444' };
    if (score === 2) return { score, label: 'Débil', color: '#f97316' };
    if (score === 3) return { score, label: 'Aceptable', color: '#eab308' };
    if (score === 4) return { score, label: 'Fuerte', color: '#22c55e' };
    return { score, label: 'Excelente', color: '#10b981' };
};

const pwRules = [
    { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
    { label: 'Una letra mayúscula',    test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Un número',              test: (p: string) => /[0-9]/.test(p) },
    { label: 'Un símbolo (!@#$...)',   test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const InputField = ({ icon: Icon, ...props }: any) => (
    <div className="relative group">
        <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/50 transition-all pointer-events-none" size={16} strokeWidth={1.5} />
        <input {...props} className="w-full bg-white/[0.04] border border-white/[0.07] rounded-2xl py-3.5 pl-12 pr-5 text-[13.5px] font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all" />
    </div>
);

const Blob: React.FC<{ style: React.CSSProperties; color: string }> = ({ style, color }) => (
    <div className="absolute rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, filter: 'blur(80px)', ...style }} />
);

const GENRES = ['Pop', 'Rock', 'Hip Hop', 'Electrónica', 'Reggaeton', 'R&B', 'Jazz', 'Metal', 'K-Pop', 'Trap', 'Indie', 'Clásica'];

export const LoginScreen: React.FC<LoginScreenProps> = ({ clientId, onLoginSuccess }) => {
    const { setUser } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    const [regUsername, setRegUsername] = useState('');
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [showReg, setShowReg] = useState(false);
    const [showConf, setShowConf] = useState(false);
    const [termsOk, setTermsOk] = useState(false);
    const [regUsernameOk, setRegUsernameOk] = useState<boolean | null>(null);
    const [checkingRegUser, setCheckingRegUser] = useState(false);

    const [verifyEmail, setVerifyEmail] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    const [resetEmail, setResetEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');

    const [tempSession, setTempSession] = useState<any>(null);
    const [obName, setObName] = useState('');
    const [obUsername, setObUsername] = useState('');
    const [obUsernameOk, setObUsernameOk] = useState<boolean | null>(null);
    const [checkingObUser, setCheckingObUser] = useState(false);
    const [obGenres, setObGenres] = useState<string[]>([]);

    const pwStrength = getPasswordStrength(regPassword);
    const pwMatch = regPassword === regConfirm && regConfirm.length > 0;
    const pwMismatch = regConfirm.length > 0 && regPassword !== regConfirm;
    const clear = () => { setErrorMsg(''); setSuccessMsg(''); };

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // OAuth callback handler — runs on page load if redirected back
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const oauthToken = hashParams.get('access_token');
        const oauthState = hashParams.get('state');
        if (!code && !oauthToken) return;
        window.history.replaceState({}, document.title, '/');
        if (code) {
            void finishGoogleLogin({ code, redirect_uri: window.location.origin });
        } else if (oauthToken && oauthState === 'soundvzn_google') {
            void finishGoogleLogin({ access_token: oauthToken });
        } else if (oauthToken) {
            setIsLoading(true); clear();
            api.post('/api/auth/discord/login', { access_token: oauthToken })
                .then((r: any) => handleAuthSuccess(r.data))
                .catch(() => setErrorMsg('Error al autenticar con Discord.'))
                .finally(() => setIsLoading(false));
        }
    }, []);

    const handleAuthSuccess = async (tokenData: any) => {
        localStorage.setItem('svzn_token', tokenData.access_token);
        if (tokenData.refresh_token) localStorage.setItem('svzn_refresh', tokenData.refresh_token);
        const session = {
            id: tokenData.user.id, svzn_id: tokenData.user.svzn_id || 0,
            email: tokenData.user.email, name: tokenData.user.name,
            avatar: tokenData.user.avatar, username: tokenData.user.username,
            bio: tokenData.user.bio || '', tier: tokenData.user.tier,
            isNewUser: !!tokenData.user.isNewUser,
        };
        localStorage.setItem('svzn_user', JSON.stringify(session));
        setUser(session);
        if (session.isNewUser || !session.username) {
            setTempSession(session);
            setObName(session.name || '');
            setObUsername(session.username || '');
            setMode('onboarding');
            return;
        }
        onLoginSuccess(session);
    };

    const finishGoogleLogin = async (payload: { code?: string; access_token?: string; redirect_uri?: string }) => {
        setIsLoading(true); clear();
        try {
            const r = await api.post('/api/auth/google/login', payload);
            await handleAuthSuccess((r as any).data);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al iniciar sesión con Google.');
        } finally { setIsLoading(false); }
    };

    // ── Popup OAuth helper ────────────────────────────────────────
    const openOAuthPopup = (url: string, onToken: (params: URLSearchParams, hash: URLSearchParams) => void) => {
        const w = 520, h = 640;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top  = window.screenY + (window.outerHeight - h) / 2;
        const popup = window.open(url, 'svzn_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
        if (!popup) {
            // Popup blocked — fallback: same-tab, useEffect handles the return
            window.location.assign(url);
            return;
        }
        setIsLoading(true); clear();

        // Listen for postMessage from the popup (sent by our own page when it loads back)
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (e.data?.type !== 'svzn_oauth_callback') return;
            window.removeEventListener('message', onMessage);
            clearTimeout(timeout);
            const params = new URLSearchParams(e.data.search || '');
            const hash   = new URLSearchParams((e.data.hash || '').replace(/^#/, ''));
            onToken(params, hash);
        };
        window.addEventListener('message', onMessage);

        const timeout = window.setTimeout(() => {
            window.removeEventListener('message', onMessage);
            setIsLoading(false);
            setErrorMsg('No se pudo completar la autenticación. Inténtalo de nuevo.');
        }, 120000);
    };

    const loginWithGoogle = () => {
        // Use the same WEB client ID configured at App level.
        const gClientId = clientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
        if (!gClientId) {
            setErrorMsg('Falta configurar VITE_GOOGLE_CLIENT_ID.');
            return;
        }
        // Token flow avoids backend code exchange and keeps Google login stable in dev/Electron.
        const redirectUri = window.location.origin;
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${gClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('openid profile email')}&prompt=select_account&state=soundvzn_google`;
        openOAuthPopup(url, (_params, hash) => {
            const token = hash.get('access_token');
            if (token) void finishGoogleLogin({ access_token: token });
            else { setErrorMsg('No se recibió token de Google.'); setIsLoading(false); }
        });
    };

    const loginWithDiscord = () => {
        const discordClientId = '1484558840715284593';
        const redirectUri = `${window.location.origin}/`;
        const url = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('identify email')}&state=soundvzn_discord`;
        openOAuthPopup(url, (_, hash) => {
            const token = hash.get('access_token');
            if (token) {
                api.post('/api/auth/discord/login', { access_token: token })
                    .then((r: any) => handleAuthSuccess(r.data))
                    .catch(() => { setErrorMsg('Error al autenticar con Discord.'); setIsLoading(false); });
            } else { setErrorMsg('No se recibió token de Discord.'); setIsLoading(false); }
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { setErrorMsg('Completa todos los campos.'); return; }
        setIsLoading(true); clear();
        try {
            const r = await api.post('/api/auth/login', { email, password });
            if ((r as any).data.access_token) await handleAuthSuccess((r as any).data);
        } catch (err: any) {
            const serverError = err.response?.data?.error || '';
            if (serverError === 'ACCOUNT_NOT_VERIFIED' || serverError.toLowerCase().includes('verif')) {
                setVerifyEmail(email); setMode('verify');
                setSuccessMsg('Tu cuenta no está verificada. Introduce el código que recibiste por email.');
            } else if (err.code === 'ERR_NETWORK' || !err.response) {
                setErrorMsg('No se pudo conectar con el servidor.');
            } else {
                setErrorMsg(serverError || 'Email o contraseña incorrectos.');
            }
        } finally { setIsLoading(false); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault(); clear();
        if (!regUsername.trim()) { setErrorMsg('Define tu @usuario.'); return; }
        if (regUsernameOk === false) { setErrorMsg('El usuario ya está en uso.'); return; }
        if (!regName.trim()) { setErrorMsg('Introduce tu nombre.'); return; }
        if (!regEmail.trim()) { setErrorMsg('Introduce un email válido.'); return; }
        if (pwStrength.score < 2) { setErrorMsg('La contraseña debe tener al menos 8 caracteres.'); return; }
        if (regPassword !== regConfirm) { setErrorMsg('Las contraseñas no coinciden.'); return; }
        if (!termsOk) { setErrorMsg('Acepta los términos para continuar.'); return; }
        setIsLoading(true);
        try {
            await api.post('/api/auth/signup', {
                email: regEmail.trim().toLowerCase(), password: regPassword,
                name: regName.trim(), username: regUsername.trim().toLowerCase(),
            });
            setVerifyEmail(regEmail.trim().toLowerCase());
            setMode('verify');
            setSuccessMsg('¡Cuenta creada! Revisa tu email e introduce el código de verificación.');
            setResendCooldown(60);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al crear la cuenta.');
        } finally { setIsLoading(false); }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault(); clear();
        setIsLoading(true);
        try {
            await api.post('/api/auth/verify', { email: verifyEmail, code: verifyCode.trim() });
            setSuccessMsg('¡Email verificado! Ahora inicia sesión.');
            setTimeout(() => { setMode('login'); setEmail(verifyEmail); setSuccessMsg(''); setVerifyCode(''); }, 2000);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Código incorrecto o expirado.');
        } finally { setIsLoading(false); }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0) return;
        setIsLoading(true); clear();
        try {
            await api.post('/api/auth/resend-verification', { email: verifyEmail });
            setSuccessMsg('Código reenviado. Revisa tu email.');
            setResendCooldown(60);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al reenviar el código.');
        } finally { setIsLoading(false); }
    };

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault(); clear();
        setIsLoading(true);
        try {
            await api.post('/api/auth/reset-request', { email: resetEmail });
            setSuccessMsg('Código enviado. Revisa tu email.'); setResetStep('verify');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al solicitar recuperación.');
        } finally { setIsLoading(false); }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault(); clear();
        setIsLoading(true);
        try {
            await api.post('/api/auth/reset-password', { email: resetEmail, code: resetCode, newPassword: newPwd });
            setSuccessMsg('Contraseña actualizada. Inicia sesión.');
            setTimeout(() => { setMode('login'); setEmail(resetEmail); setSuccessMsg(''); }, 2500);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Código incorrecto o expirado.');
        } finally { setIsLoading(false); }
    };

    const handleOnboarding = async (e: React.FormEvent) => {
        e.preventDefault(); clear();
        if (!obUsername.trim()) { setErrorMsg('Define tu @usuario.'); return; }
        if (obUsernameOk === false) { setErrorMsg('El usuario ya está en uso.'); return; }
        if (!obName.trim()) { setErrorMsg('Introduce tu nombre.'); return; }
        if (obGenres.length < 2) { setErrorMsg('Selecciona al menos 2 géneros.'); return; }
        setIsLoading(true);
        try {
            const r = await api.post('/api/auth/update-profile', {
                name: obName.trim(),
                username: obUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
                bio: '', genres: obGenres,
            });
            const finalUser = { ...tempSession, name: obName.trim(), username: obUsername.trim().toLowerCase(), ...((r as any).data.user || {}) };
            localStorage.setItem('svzn_user', JSON.stringify(finalUser));
            setUser(finalUser); onLoginSuccess(finalUser);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al guardar el perfil.');
        } finally { setIsLoading(false); }
    };

    const checkUsername = async (val: string, setter: (v: boolean | null) => void, loadingSetter: (v: boolean) => void) => {
        if (val.length < 3) { setter(null); return; }
        loadingSetter(true);
        try {
            const r = await api.get(`/api/auth/check-username?u=${encodeURIComponent(val)}`);
            setter((r as any).data.available);
        } catch { setter(null); } finally { loadingSetter(false); }
    };

    const titles: Record<Mode, { title: string; sub: string }> = {
        login:      { title: 'Iniciar sesión',  sub: 'Tu música, donde tus oídos mandan' },
        register:   { title: 'Crear cuenta',     sub: 'Únete a SoundVzn gratis — siempre' },
        verify:     { title: 'Verificar email',  sub: 'Introduce el código que te enviamos' },
        reset:      { title: 'Recuperar acceso', sub: 'Restablece tu contraseña vía email' },
        onboarding: { title: 'Bienvenido 🎵',    sub: 'Configura tu perfil para empezar' },
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center"
            style={{ background: '#020205', backgroundImage: 'url("/auth-bg.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <Blob color="rgba(14,165,233,0.11)"  style={{ width: '55vw', height: '55vh', top: '-15%', left: '-10%' }} />
                <Blob color="rgba(79,70,229,0.09)"   style={{ width: '50vw', height: '50vh', bottom: '-15%', right: '-10%' }} />
                <Blob color="rgba(244,63,94,0.05)"   style={{ width: '28vw', height: '28vh', top: '50%', left: '45%' }} />
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="relative w-full px-4 sm:px-6 flex flex-col items-center"
                style={{ maxWidth: mode === 'register' ? 460 : 430 }}>

                {/* Logo */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                    <img src="/logo.png" alt="SoundVzn" className="h-10 object-contain mx-auto"
                        style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.12)) brightness(1.1)' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </motion.div>

                {/* Card */}
                <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(100px)', WebkitBackdropFilter: 'blur(100px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 36, padding: '36px 40px', boxShadow: '0 50px 100px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.05)', maxHeight: 'min(90vh, 820px)', display: 'flex', flexDirection: 'column' }}>
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.035) 0%, transparent 55%)', borderRadius: 'inherit' }} />

                    <div className="overflow-y-auto custom-scrollbar pr-1 -mr-1 flex-1">
                        {/* Header */}
                        <AnimatePresence mode="wait">
                            <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="text-center mb-7 relative z-10">
                                <h1 className="text-2xl font-black text-white mb-1.5" style={{ letterSpacing: '-0.04em' }}>{titles[mode].title}</h1>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{titles[mode].sub}</p>
                            </motion.div>
                        </AnimatePresence>

                        {/* Alerts */}
                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-5 relative z-10"
                                    style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.22)' }}>
                                    <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                    <p style={{ fontSize: 12, color: 'rgba(254,202,202,0.9)', fontWeight: 500 }}>{errorMsg}</p>
                                </motion.div>
                            )}
                            {successMsg && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-5 relative z-10"
                                    style={{ background: 'rgba(34,197,94,0.09)', border: '1px solid rgba(34,197,94,0.22)' }}>
                                    <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
                                    <p style={{ fontSize: 12, color: 'rgba(187,247,208,0.9)', fontWeight: 500 }}>{successMsg}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Forms */}
                        <AnimatePresence mode="wait">
                            {mode === 'login' && (
                                <motion.form key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleLogin} className="space-y-4 relative z-10">
                                    <InputField icon={Mail} type="email" placeholder="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} disabled={isLoading} />
                                    <div className="relative">
                                        <InputField icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Contraseña" value={password} onChange={(e: any) => setPassword(e.target.value)} disabled={isLoading} />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <button type="submit" disabled={isLoading || !email || !password}
                                        className="w-full py-3.5 bg-white text-black font-black rounded-2xl hover:bg-white/90 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Iniciar sesión <ArrowRight size={14} /></>}
                                    </button>
                                    <button type="button" onClick={() => { setMode('reset'); setResetStep('request'); clear(); }} className="w-full text-xs font-bold text-white/40 hover:text-white/70 transition-colors py-2">
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </motion.form>
                            )}

                            {mode === 'register' && (
                                <motion.form key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleRegister} className="space-y-4 relative z-10">
                                    <div className="relative">
                                        <InputField icon={User} type="text" placeholder="@usuario" value={regUsername} onChange={(e: any) => { setRegUsername(e.target.value); checkUsername(e.target.value, setRegUsernameOk, setCheckingRegUser); }} disabled={isLoading} />
                                        {checkingRegUser && <Loader2 size={14} className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-white/30" />}
                                        {regUsernameOk === true && <CheckCircle2 size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-green-400" />}
                                        {regUsernameOk === false && <XCircle size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-red-400" />}
                                    </div>
                                    <InputField icon={User} type="text" placeholder="Tu nombre" value={regName} onChange={(e: any) => setRegName(e.target.value)} disabled={isLoading} />
                                    <InputField icon={Mail} type="email" placeholder="Email" value={regEmail} onChange={(e: any) => setRegEmail(e.target.value)} disabled={isLoading} />
                                    <div className="relative">
                                        <InputField icon={Lock} type={showReg ? 'text' : 'password'} placeholder="Contraseña" value={regPassword} onChange={(e: any) => setRegPassword(e.target.value)} disabled={isLoading} />
                                        <button type="button" onClick={() => setShowReg(!showReg)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                            {showReg ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {regPassword && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full transition-all" style={{ width: `${(pwStrength.score / 5) * 100}%`, background: pwStrength.color }} />
                                                </div>
                                                <span style={{ fontSize: 10, color: pwStrength.color, fontWeight: 600 }}>{pwStrength.label}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {pwRules.map((r, i) => {
                                                    const ok = r.test(regPassword);
                                                    return (
                                                        <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: ok ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.2)' }}>
                                                            {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {r.label}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <InputField icon={Lock} type={showConf ? 'text' : 'password'} placeholder="Confirmar contraseña" value={regConfirm} onChange={(e: any) => setRegConfirm(e.target.value)} disabled={isLoading} />
                                        <button type="button" onClick={() => setShowConf(!showConf)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                            {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        {regConfirm && (pwMatch ? <CheckCircle2 size={14} className="absolute right-14 top-1/2 -translate-y-1/2 text-green-400" /> : pwMismatch && <XCircle size={14} className="absolute right-14 top-1/2 -translate-y-1/2 text-red-400" />)}
                                    </div>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={termsOk} onChange={(e: any) => setTermsOk(e.target.checked)} className="mt-1 w-4 h-4 rounded accent-white" />
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                            Acepto los <a href="#" className="underline">términos de servicio</a> y la <a href="#" className="underline">política de privacidad</a>
                                        </span>
                                    </label>
                                    <button type="submit" disabled={isLoading || !regUsername || regUsernameOk === false || !regName || !regEmail || pwStrength.score < 2 || !pwMatch || !termsOk}
                                        className="w-full py-3.5 bg-white text-black font-black rounded-2xl hover:bg-white/90 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Crear cuenta <ArrowRight size={14} /></>}
                                    </button>
                                </motion.form>
                            )}

                            {mode === 'verify' && (
                                <motion.form key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleVerify} className="space-y-4 relative z-10">
                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 16 }}>
                                        Enviamos un código a <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{verifyEmail}</strong>
                                    </p>
                                    <InputField icon={ShieldCheck} type="text" placeholder="000000" value={verifyCode} onChange={(e: any) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} disabled={isLoading} />
                                    <button type="submit" disabled={isLoading || verifyCode.length !== 6}
                                        className="w-full py-3.5 bg-white text-black font-black rounded-2xl hover:bg-white/90 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Verificar <ArrowRight size={14} /></>}
                                    </button>
                                    <button type="button" onClick={handleResendCode} disabled={resendCooldown > 0 || isLoading}
                                        className="w-full text-xs font-bold text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors py-2">
                                        {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                                    </button>
                                </motion.form>
                            )}

                            {mode === 'reset' && resetStep === 'request' && (
                                <motion.form key="reset-req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleResetRequest} className="space-y-4 relative z-10">
                                    <InputField icon={Mail} type="email" placeholder="Tu email" value={resetEmail} onChange={(e: any) => setResetEmail(e.target.value)} disabled={isLoading} />
                                    <button type="submit" disabled={isLoading || !resetEmail}
                                        className="w-full py-3.5 bg-white text-black font-black rounded-2xl hover:bg-white/90 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Enviar código <ArrowRight size={14} /></>}
                                    </button>
                                </motion.form>
                            )}

                            {mode === 'reset' && resetStep === 'verify' && (
                                <motion.form key="reset-ver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleResetPassword} className="space-y-4 relative z-10">
                                    <InputField icon={ShieldCheck} type="text" placeholder="Código (6 dígitos)" value={resetCode} onChange={(e: any) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} disabled={isLoading} />
                                    <InputField icon={Lock} type="password" placeholder="Nueva contraseña" value={newPwd} onChange={(e: any) => setNewPwd(e.target.value)} disabled={isLoading} />
                                    <button type="submit" disabled={isLoading || resetCode.length !== 6 || !newPwd}
                                        className="w-full py-3.5 bg-white text-black font-black rounded-2xl hover:bg-white/90 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Actualizar contraseña <ArrowRight size={14} /></>}
                                    </button>
                                </motion.form>
                            )}

                            {mode === 'onboarding' && (
                                <motion.form key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleOnboarding} className="space-y-4 relative z-10">
                                    <InputField icon={User} type="text" placeholder="Tu nombre" value={obName} onChange={(e: any) => setObName(e.target.value)} disabled={isLoading} />
                                    <div className="relative">
                                        <InputField icon={User} type="text" placeholder="@usuario" value={obUsername} onChange={(e: any) => { setObUsername(e.target.value); checkUsername(e.target.value, setObUsernameOk, setCheckingObUser); }} disabled={isLoading} />
                                        {checkingObUser && <Loader2 size={14} className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-white/30" />}
                                        {obUsernameOk === true && <CheckCircle2 size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-green-400" />}
                                        {obUsernameOk === false && <XCircle size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-red-400" />}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tus géneros favoritos</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {GENRES.map(g => (
                                                <button key={g} type="button"
                                                    onClick={() => setObGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                                                    className={`py-2 px-3 rounded-xl text-[11px] font-bold transition-all border ${obGenres.includes(g) ? 'bg-white text-black border-white' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="submit" disabled={isLoading || !obUsername || obUsernameOk === false || !obName || obGenres.length < 2}
                                        className="w-full py-3.5 bg-white text-black font-black rounded-2xl hover:bg-white/90 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Empezar <ArrowRight size={14} /></>}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer — OAuth + switch mode */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="mt-6 pt-6 border-t border-white/[0.06] space-y-3 relative z-10">
                            {/* Google + Discord buttons con logos SVG */}
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={loginWithGoogle} disabled={isLoading}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-bold text-white/70 hover:text-white transition-all disabled:opacity-40">
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='%234285F4'/%3E%3Cpath d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='%2334A853'/%3E%3Cpath d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='%23FBBC05'/%3E%3Cpath d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='%23EA4335'/%3E%3C/svg%3E" width="16" height="16" alt="Google" />
                                    Google
                                </button>
                                <button type="button" onClick={loginWithDiscord} disabled={isLoading}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-bold text-white/70 hover:text-white transition-all disabled:opacity-40">
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' fill='%235865F2'/%3E%3C/svg%3E" width="16" height="16" alt="Discord" />
                                    Discord
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-white/30">
                                <div className="flex-1 h-px bg-white/10" />
                                <span>o</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>
                            {mode === 'login' ? (
                                <button type="button" onClick={() => { setMode('register'); clear(); }}
                                    className="w-full py-2.5 text-[11px] font-bold text-white/50 hover:text-white transition-colors">
                                    ¿No tienes cuenta? <span className="text-white">Crear una</span>
                                </button>
                            ) : (
                                <button type="button" onClick={() => { setMode('login'); clear(); }}
                                    className="w-full py-2.5 text-[11px] font-bold text-white/50 hover:text-white transition-colors">
                                    ¿Ya tienes cuenta? <span className="text-white">Inicia sesión</span>
                                </button>
                            )}
                        </div>
                    )}

                    {(mode === 'verify' || mode === 'reset') && (
                        <div className="mt-6 pt-6 border-t border-white/[0.06] relative z-10">
                            <button type="button" onClick={() => { setMode('login'); clear(); setResetStep('request'); }}
                                className="w-full py-2.5 text-[11px] font-bold text-white/50 hover:text-white transition-colors flex items-center justify-center gap-1">
                                <ArrowLeft size={12} /> Volver al inicio
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};
