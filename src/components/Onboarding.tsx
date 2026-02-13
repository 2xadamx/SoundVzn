import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@store/player';

const onboardingSteps = [
  {
    id: 1,
    title: '¡Bienvenido a SoundVzn!',
    description: 'La experiencia de audio más increíble que jamás hayas experimentado',
    icon: '🎵',
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    id: 2,
    title: 'Audio de Alta Fidelidad',
    description: 'Disfruta de tus canciones favoritas en calidad 24-bit/192kHz sin pérdidas',
    icon: '🎧',
    gradient: 'from-purple-600 to-pink-600',
  },
  {
    id: 3,
    title: 'Visualizaciones Espectaculares',
    description: 'Observa tu música cobrar vida con efectos visuales impresionantes',
    icon: '✨',
    gradient: 'from-pink-600 to-red-600',
  },
  {
    id: 4,
    title: 'Personaliza Tu Experiencia',
    description: 'Ecualizador profesional, temas, y controles avanzados a tu medida',
    icon: '⚡',
    gradient: 'from-red-600 to-orange-600',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = onboardingSteps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-dark-900 flex items-center justify-center"
    >
      <div className="max-w-2xl w-full px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              className={`text-9xl mb-8 inline-block bg-gradient-to-br ${step.gradient} bg-clip-text text-transparent`}
            >
              {step.icon}
            </motion.div>

            <h1 className={`text-5xl font-bold mb-6 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
              {step.title}
            </h1>

            <p className="text-xl text-gray-400 mb-12 max-w-xl mx-auto">
              {step.description}
            </p>

            <div className="flex items-center justify-center space-x-2 mb-12">
              {onboardingSteps.map((_, index) => (
                <motion.div
                  key={index}
                  animate={{
                    width: index === currentStep ? 40 : 8,
                    backgroundColor: index === currentStep ? '#0ea5e9' : '#2e2e2e',
                  }}
                  className="h-2 rounded-full"
                />
              ))}
            </div>

            <div className="flex items-center justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSkip}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Saltar
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className={`px-8 py-4 rounded-full bg-gradient-to-r ${step.gradient} text-white font-semibold text-lg shadow-2xl`}
              >
                {currentStep === onboardingSteps.length - 1 ? '¡Comenzar!' : 'Siguiente'}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${(currentStep / onboardingSteps.length) * 100}% 50%, rgba(14, 165, 233, 0.1), transparent 50%)`,
        }}
      />
    </motion.div>
  );
};
