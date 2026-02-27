import React, { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { X } from 'lucide-react';

const stripePromise = loadStripe('pk_test_51T3fngB6j8MK6V9XdZnlaU13czfsHbwPzllFrEEFNZvcMXcI1TIqI5vXSjQYuXBlDZWeX1gmZi8dy8KJ97fcQojL00zZTHf3k9');

interface StripeEmbeddedCheckoutProps {
    email: string;
    onClose: () => void;
}

const StripeEmbeddedCheckout: React.FC<StripeEmbeddedCheckoutProps> = ({ email, onClose }) => {
    const fetchClientSecret = useCallback(() => {
        return fetch('http://localhost:3000/api/payments/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
            .then((res) => res.json())
            .then((data) => data.clientSecret);
    }, [email]);

    const options = { fetchClientSecret };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-dark-950/80 backdrop-blur-xl"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-[#050508] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header con Logo */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
                    <div className="flex items-center gap-3">
                        <img src="logo.png" alt="SoundVzn Logo" className="h-8 w-auto" />
                        <div className="h-6 w-px bg-white/10 mx-2" />
                        <span className="text-sm font-black uppercase tracking-[0.2em] italic text-primary">Suscripción Pro</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Info Banner */}
                <div className="bg-primary/5 p-4 flex items-center justify-center gap-4 text-xs font-bold text-primary border-b border-primary/10">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        PRUEBA GRATUITA DE 30 DÍAS ACTIVA
                    </div>
                </div>

                {/* Embedded Checkout */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-white/1">
                    <div id="checkout">
                        <EmbeddedCheckoutProvider
                            stripe={stripePromise}
                            options={options}
                        >
                            <EmbeddedCheckout />
                        </EmbeddedCheckoutProvider>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/40 text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                        Pago procesado de forma segura por Stripe. Cifrado de grado militar.
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .StripeElement {
          background: transparent !important;
        }
        #checkout iframe {
          border-radius: 1rem !important;
        }
        /* Personalización del scrollbar del modal */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(14, 165, 233, 0.2);
          border-radius: 10px;
        }
      `}} />
        </div>
    );
};

export default StripeEmbeddedCheckout;
