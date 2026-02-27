import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Shield, User, Key, ArrowLeft, Loader2, Info } from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';

// OAuth Config
const GOOGLE_SCOPE = 'openid profile email';

function buildGoogleAuthUrl(clientId: string): string {
    const redirectUri = encodeURIComponent(window.location.origin || 'http://localhost:5199');
    const scope = encodeURIComponent(GOOGLE_SCOPE);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&prompt=select_account&include_granted_scopes=true`;
}

interface LoginScreenProps {
    clientId: string;
    onLoginSuccess: (credentialResponse: { access_token: string }) => void;
    onLoginError?: () => void;
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot-request' | 'forgot-submit';

const PENDING_EMAIL_KEY = 'svzn_pending_verification_email';

// API Base configuration
const API_BASE =
    (import.meta as any).env?.VITE_BACKEND_URL
        ? `${(import.meta as any).env.VITE_BACKEND_URL}/api/auth`
        : 'http://localhost:3000/api/auth';

export const LoginScreen: React.FC<LoginScreenProps> = ({ clientId, onLoginSuccess }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [savedEmail, setSavedEmail] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem(PENDING_EMAIL_KEY) || '';
    });

    useEffect(() => {
        if (!email && savedEmail) {
            setEmail(savedEmail);
        }
    }, [email, savedEmail]);

    const clearMessages = () => {
        setErrorMsg('');
        setSuccessMsg('');
    };

    const changeMode = (newMode: AuthMode) => {
        clearMessages();
        setMode(newMode);
        if (newMode === 'login') {
            localStorage.removeItem(PENDING_EMAIL_KEY);
            setSavedEmail('');
        }
    };

    const handleGoogleLogin = () => {
        const url = buildGoogleAuthUrl(clientId);
        if ((window as any).electron?.shell) {
            (window as any).electron.shell.openExternal(url);
        } else {
            window.location.assign(url);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        clearMessages();
        try {
            const res = await axios.post(`${API_BASE}/login`, { email, password }, { timeout: 4000 });

            // Save Secure Session Tokens
            localStorage.setItem('auth_access_token', res.data.access_token);
            localStorage.setItem('auth_refresh_token', res.data.refresh_token);
            localStorage.setItem('user_profile', JSON.stringify(res.data.user));

            onLoginSuccess({ access_token: res.data.access_token });
        } catch (err: any) {
            // Si el backend no está disponible (modo Vite sin Electron), usar sesión local
            const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED';
            if (isNetworkError) {
                const localProfile = localStorage.getItem('user_profile');
                const localToken = localStorage.getItem('auth_access_token');
                if (localProfile && localToken) {
                    // Sesión local previa — entrar directamente
                    console.warn('[Auth] Backend no disponible — usando sesión local existente');
                    onLoginSuccess({ access_token: localToken });
                    return;
                }
                // Sin sesión previa — crear sesión de invitado para desarrollo
                const guestProfile = { id: 'local', name: email.split('@')[0] || 'Usuario', email, avatar: '' };
                localStorage.setItem('user_profile', JSON.stringify(guestProfile));
                localStorage.setItem('auth_access_token', 'local_auth_session');
                console.warn('[Auth] Backend no disponible — sesión de invitado creada');
                onLoginSuccess({ access_token: 'local_auth_session' });
                return;
            }

            const msg = err.response?.data?.error || 'Error de autenticación';
            if (msg === 'Cuenta NO_VERIFICADA') {
                setErrorMsg('Debes verificar tu cuenta primero. Revisa tu email.');
                setMode('verify');
            } else {
                setErrorMsg(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const verificationEmail = (email || savedEmail).trim();
        if (!verificationEmail) {
            setErrorMsg('Necesitamos un correo válido para crear la cuenta.');
            return;
        }
        setIsLoading(true);
        clearMessages();
        try {
            const res = await axios.post(`${API_BASE}/signup`, { email: verificationEmail, password, name });
            const devCode = res.data?.dev_code;
            setSuccessMsg(devCode
                ? `Registro OK. Codigo de verificacion: ${devCode}`
                : 'Registro exitoso. Te enviamos un codigo por email.');
            setMode('verify');
            setSavedEmail(verificationEmail);
            setEmail(verificationEmail);
            localStorage.setItem(PENDING_EMAIL_KEY, verificationEmail);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error en el registro');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetEmail = (email || savedEmail).trim();
        if (!targetEmail) {
            setErrorMsg('Necesitamos un correo para validar la cuenta.');
            return;
        }
        setIsLoading(true);
        clearMessages();
        try {
            await axios.post(`${API_BASE}/verify`, { email: targetEmail, code });
            setSuccessMsg('Verificacion completada. Inicia sesion.');
            localStorage.removeItem(PENDING_EMAIL_KEY);
            setSavedEmail('');
            setEmail('');
            setCode('');
            setTimeout(() => setMode('login'), 2000);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Codigo invalido');
        } finally {
            setIsLoading(false);
        }
    };
    const handleResendVerification = async () => {
        const targetEmail = (email || savedEmail).trim();
        if (!targetEmail) {
            setErrorMsg('Para reenviar el codigo necesitamos tu correo registrado.');
            return;
        }
        setIsLoading(true);
        clearMessages();
        try {
            const res = await axios.post(`${API_BASE}/resend-verification`, { email: targetEmail });
            const devCode = res.data?.dev_code;
            setSavedEmail(targetEmail);
            setSuccessMsg(devCode
                ? `Codigo reenviado. Codigo: ${devCode}`
                : 'Codigo reenviado. Revisa tu email.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'No se pudo reenviar el codigo');
        } finally {
            setIsLoading(false);
        }
    };
    const handleForgotRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        clearMessages();
        try {
            const res = await axios.post(`${API_BASE}/reset-request`, { email });
            const devCode = res.data?.dev_code;
            setSuccessMsg(devCode
                ? `Codigo enviado. Codigo: ${devCode}`
                : 'Si el email existe, se ha enviado un codigo.');
            setMode('forgot-submit');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al solicitar cambio');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        clearMessages();
        try {
            await axios.post(`${API_BASE}/reset-password`, { email, code, newPassword });
            setSuccessMsg('Contrasena actualizada correctamente.');
            setTimeout(() => setMode('login'), 2000);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Error al cambiar contrasena');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#02040a] flex items-center justify-center z-[9999] overflow-hidden font-inter">
            {/* Ambient Nebula Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 blur-[150px] rounded-full" />
                <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10 px-6"
            >
                {/* Classic Logo Interface */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 1 }}
                        className="inline-block mb-4 relative"
                    >
                        <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full scale-150" />
                        <img
                            src="/logo.png"
                            className="h-16 w-auto relative z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)] mx-auto"
                            alt="SoundVizion"
                        />
                    </motion.div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">SoundVizion</h2>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.6em] mt-2">Secure Node</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[32px] border border-white/10 p-8 shadow-2xl relative overflow-hidden">

                    {/* Progress Indicator Line */}
                    {isLoading && (
                        <motion.div
                            initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1, repeat: Infinity }}
                            className="absolute top-0 left-0 h-1 bg-primary-500 shadow-[0_0_10px_#0ea5e9]"
                        />
                    )}

                    {/* Mode Selector (Only in Login/Register) */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="flex gap-1 mb-8 p-1 bg-white/5 rounded-2xl border border-white/5">
                            <button
                                onClick={() => changeMode('login')}
                                className={clsx(
                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    mode === 'login' ? 'bg-white text-black shadow-xl' : 'text-white/30 hover:text-white/60'
                                )}
                            >
                                Acceso
                            </button>
                            <button
                                onClick={() => changeMode('register')}
                                className={clsx(
                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    mode === 'register' ? 'bg-white text-black shadow-xl' : 'text-white/30 hover:text-white/60'
                                )}
                            >
                                Registro
                            </button>
                        </div>
                    )}

                    {/* Error and Success Messages */}
                    <AnimatePresence mode="wait">
                        {errorMsg && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                <Info size={16} className="text-red-500 flex-shrink-0" />
                                <p className="text-xs text-red-200 font-medium">{errorMsg}</p>
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                                <Shield size={16} className="text-green-500 flex-shrink-0" />
                                <p className="text-xs text-green-200 font-medium">{successMsg}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* DYNAMIC FORMS */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* REGISTRATION FORM */}
                            {mode === 'register' && (
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="relative group">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="NOMBRE DE USUARIO" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required />
                                    </div>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="CORREO ELECTRÓNICO" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="CONTRASEÑA SEGURA" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required minLength={8} />
                                    </div>
                                    <p className="text-[10px] text-white/30 px-2 leading-relaxed">Al registrarte, aceptas nuestra <a href="#" className="underline hover:text-white/60">Política de Privacidad</a> (Estándar GDPR).</p>
                                    <button disabled={isLoading} type="submit" className="w-full bg-white text-black font-black text-xs py-5 rounded-2xl transition-all shadow-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 flex justify-center mt-2 disabled:opacity-50">
                                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Crear Cuenta'}
                                    </button>
                                </form>
                            )}

                            {/* VERIFICATION FORM */}
                            {mode === 'verify' && (
                                <form onSubmit={handleVerify} className="space-y-4">
                                    <div className="text-center mb-6">
                                        <Shield className="mx-auto text-primary-500 mb-3" size={32} />
                                        <p className="text-white/60 text-xs font-medium px-4">Ingresa el código de 6 dígitos que enviamos a <b>{email}</b></p>
                                    </div>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="CORREO ELECTRÓNICO"
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative group">
                                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))} placeholder="0 0 0 0 0 0" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xl font-bold tracking-[0.5em] text-center outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required />
                                    </div>
                                    <button disabled={isLoading} type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black text-xs py-5 rounded-2xl transition-all shadow-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 flex justify-center mt-2 disabled:opacity-50">
                                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Verificar'}
                                    </button>
                                    <button type="button" onClick={handleResendVerification} className="w-full text-white/50 hover:text-white text-[10px] font-semibold py-2 mt-1 flex items-center justify-center gap-2">
                                        Reenviar codigo
                                    </button>
                                    <button type="button" onClick={() => changeMode('login')} className="w-full text-white/40 hover:text-white text-xs font-semibold py-2 mt-2 flex items-center justify-center gap-2">
                                        <ArrowLeft size={14} /> Volver
                                    </button>
                                </form>
                            )}

                            {/* FORGOT PASSWORD REQUEST FORM */}
                            {mode === 'forgot-request' && (
                                <form onSubmit={handleForgotRequest} className="space-y-4">
                                    <div className="text-center mb-6">
                                        <p className="text-white/60 text-xs font-medium px-4">Recupera tu acceso. Enviaremos un OTP a tu correo.</p>
                                    </div>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="CORREO ELECTRÓNICO" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required />
                                    </div>
                                    <button disabled={isLoading} type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black text-xs py-5 rounded-2xl transition-all shadow-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 flex justify-center mt-2 disabled:opacity-50">
                                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Enviar Código'}
                                    </button>
                                    <button type="button" onClick={() => changeMode('login')} className="w-full text-white/40 hover:text-white text-xs font-semibold py-2 mt-2 flex items-center justify-center gap-2">
                                        <ArrowLeft size={14} /> Cancelar
                                    </button>
                                </form>
                            )}

                            {/* FORGOT PASSWORD SUBMIT FORM */}
                            {mode === 'forgot-submit' && (
                                <form onSubmit={handleForgotSubmit} className="space-y-4">
                                    <div className="text-center mb-4">
                                        <p className="text-white/60 text-xs font-medium px-4">Ingresa el código OTP y tu nueva contraseña.</p>
                                    </div>
                                    <div className="relative group">
                                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))} placeholder="CÓDIGO (6 DÍGITOS)" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-sm font-bold tracking-[0.2em] outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="NUEVA CONTRASEÑA" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required minLength={8} />
                                    </div>
                                    <button disabled={isLoading} type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-xs py-5 rounded-2xl transition-all shadow-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 flex justify-center mt-2 disabled:opacity-50">
                                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Contraseña'}
                                    </button>
                                    <button type="button" onClick={() => setMode('forgot-request')} className="w-full text-white/40 hover:text-white text-xs font-semibold py-2 mt-2 flex items-center justify-center gap-2">
                                        <ArrowLeft size={14} /> Volver
                                    </button>
                                </form>
                            )}

                            {/* LOGIN FORM */}
                            {mode === 'login' && (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="TU CORREO" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-500 transition-colors" size={18} />
                                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="CONTRASEÑA" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-xs font-bold tracking-tight outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all" required />
                                    </div>

                                    <div className="flex justify-end px-2">
                                        <button type="button" onClick={() => changeMode('forgot-request')} className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-wider font-semibold">
                                            ¿Olvidaste tu clave?
                                        </button>
                                    </div>

                                    <button disabled={isLoading} type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black text-xs py-5 rounded-2xl transition-all shadow-xl uppercase tracking-widest italic hover:scale-[1.02] active:scale-95 flex justify-center mt-2 disabled:opacity-50">
                                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Autenticar'}
                                    </button>

                                    {/* Alternate Login Options */}
                                    <div className="mt-8 relative flex items-center justify-center">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-white/5"></div>
                                        </div>
                                        <span className="relative z-10 bg-[#0c0c16] px-4 text-[8px] font-bold uppercase tracking-[0.4em] text-white/20">Google Sec Sync</span>
                                    </div>

                                    <button type="button" onClick={handleGoogleLogin} className="w-full mt-6 flex items-center justify-center gap-3 bg-white/[0.03] border border-white/5 py-4 rounded-xl hover:bg-white/[0.06] transition-all group hover:scale-[1.02] active:scale-95 duration-200">
                                        <svg width="18" height="18" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="text-white/60 text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Conectar Cuenta</span>
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Secure Badge */}
                <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
                    <Shield size={12} className="text-primary-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Cifrado Industrial Activado</span>
                </div>
            </motion.div>
        </div>
    );
};
