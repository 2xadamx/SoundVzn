import { FileCheck, AlertCircle, PlayCircle, Scale, ChevronLeft } from 'lucide-react';

interface TermsViewProps {
    onBack: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onBack }) => {
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
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
                <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase mb-2">Términos de Servicio</h1>
                <p className="text-amber-400 font-bold tracking-[0.3em] text-[10px] uppercase">Contrato de Licencia de Usuario Final (Beta)</p>
            </header>

            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[40px] space-y-12">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                        <PlayCircle size={22} className="text-amber-500" />
                        <h2 className="text-xl font-bold uppercase tracking-tight font-inter">1. Uso del Servicio</h2>
                    </div>
                    <p className="text-white/40 text-sm leading-8">
                        SoundVizion es una plataforma de reproducción de audio. Al utilizar esta aplicación, declaras tener al menos 13 años. El servicio se proporciona "tal cual" durante la fase beta, pudiendo experimentar cambios sin previo aviso.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                        <Scale size={22} className="text-amber-500" />
                        <h2 className="text-xl font-bold uppercase tracking-tight font-inter">2. Propiedad Intelectual</h2>
                    </div>
                    <p className="text-white/40 text-sm leading-8">
                        SoundVizion no aloja contenido protegido por derechos de autor en sus servidores. La aplicación actúa como un motor de búsqueda y agregador de flujos multimedia públicos (YouTube, Deezer, etc.). Eres responsable de asegurar que el uso del contenido cumpla con las leyes de tu jurisdicción.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                        <AlertCircle size={22} className="text-amber-500" />
                        <h2 className="text-xl font-bold uppercase tracking-tight font-inter">3. Limitación de Responsabilidad</h2>
                    </div>
                    <p className="text-white/40 text-sm leading-8">
                        No nos hacemos responsables de pérdidas de datos, fallos en la reproducción o cualquier daño indirecto derivado del uso de la aplicación. Al ser una versión beta, se recomienda realizar copias de seguridad de tus colecciones locales.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                        <FileCheck size={22} className="text-amber-500" />
                        <h2 className="text-xl font-bold uppercase tracking-tight font-inter">4. Suscripciones Pro</h2>
                    </div>
                    <p className="text-white/40 text-sm leading-8">
                        Las suscripciones Pro activadas durante la beta pueden estar sujetas a términos específicos de facturación a través de Stripe. La cancelación puede gestionarse desde el perfil de usuario.
                    </p>
                </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-3xl flex items-start gap-4">
                <AlertCircle className="text-amber-500 mt-1 flex-shrink-0" size={18} />
                <p className="text-[11px] text-amber-200/50 leading-relaxed font-inter">
                    <b>IMPORTANTE (Solo Beta):</b> La estructura de la base de datos podría reiniciarse antes del lanzamiento estable. Se notificará a los usuarios con antelación vía correo electrónico.
                </p>
            </div>

            <footer className="text-center py-10 opacity-20">
                <p className="text-[9px] uppercase tracking-[0.5em] font-black text-white">SoundVizion Legal Foundation · 2026</p>
            </footer>
        </div>
    );
};
