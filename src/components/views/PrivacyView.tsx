import { Shield, Lock, Eye, FileText, ChevronLeft } from 'lucide-react';

interface PrivacyViewProps {
    onBack: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 max-w-4xl mx-auto">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors group mb-4"
            >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Volver a Ajustes
            </button>

            <header className="relative">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full pointer-events-none" />
                <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase mb-2">Política de Privacidad</h1>
                <p className="text-primary-400 font-bold tracking-[0.3em] text-[10px] uppercase">Última actualización: Febrero 2026 · Versión Beta</p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: Shield, title: "Seguridad Bancaria", desc: "Tus datos están protegidos con cifrado AES-256 de grado industrial." },
                    { icon: Lock, title: "Zero Knowledge", desc: "No vendemos tus datos ni compartimos tus hábitos de escucha con terceros." },
                    { icon: Eye, title: "Transparencia", desc: "Solo recolectamos lo necesario para que SoundVizion funcione." }
                ].map((item, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl">
                        <item.icon className="text-primary-500 mb-4" size={24} />
                        <h3 className="text-white font-bold mb-2">{item.title}</h3>
                        <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </section>

            <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-10 space-y-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                        <FileText size={20} className="text-primary-500" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">1. Datos que Recolectamos</h2>
                    </div>
                    <div className="text-white/40 text-sm leading-8">
                        Para proporcionarte la mejor experiencia de audio, SoundVizion recolecta información básica:
                        <ul className="list-disc pl-5 mt-4 space-y-2">
                            <li><b>Cuenta:</b> Email, nombre de usuario y avatar.</li>
                            <li><b>Uso:</b> Playlists creadas, canciones favoritas e historial de búsqueda local (para optimizar la caché).</li>
                            <li><b>Técnicos:</b> Dirección IP (solo para rate limiting y seguridad) e información del sistema para resolución de errores.</li>
                        </ul>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                        <Lock size={20} className="text-primary-500" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">2. Almacenamiento Local</h2>
                    </div>
                    <p className="text-white/40 text-sm leading-8">
                        SoundVizion es una aplicación enfocada en el rendimiento. Gran parte de tus datos (incluyendo la caché de audio y descargas) se almacenan localmente en tu dispositivo. Puedes limpiar estos datos en cualquier momento desde el panel de ajustes.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                        <Shield size={20} className="text-primary-500" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">3. Derechos del Usuario</h2>
                    </div>
                    <p className="text-white/40 text-sm leading-8">
                        Cumplimos con los estándares internacionales (GDPR/LGPD). Tienes derecho a acceder, rectificar o eliminar tus datos de nuestros servidores enviando un correo a soporte@soundvizion.app.
                    </p>
                </div>
            </div>

            <footer className="text-center py-10 opacity-20">
                <p className="text-[9px] uppercase tracking-[0.5em] font-black text-white">SoundVizion · Private Node · 2026</p>
            </footer>
        </div>
    );
};
