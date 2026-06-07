import React, { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type Container, type ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { usePlayerStore } from "../../store/player";
import clsx from 'clsx';

export const ParticleVisualizer: React.FC<{ isZen?: boolean }> = ({ isZen }) => {
    const [init, setInit] = useState(false);
    const { analyser, isPlaying } = usePlayerStore();

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const options: ISourceOptions = useMemo(
        () => ({
            background: {
                color: {
                    value: "transparent",
                },
            },
            fpsLimit: 120,
            interactivity: {
                events: {
                    onHover: {
                        enable: true,
                        mode: "repulse",
                    },
                },
                modes: {
                    repulse: {
                        distance: 100,
                        duration: 0.4,
                    },
                },
            },
            particles: {
                color: {
                    value: isZen ? ["#ffffff", "#94a3b8"] : ["#3b82f6", "#8b5cf6", "#ec4899"], // Monochrome in Zen
                },
                links: {
                    color: "#ffffff",
                    distance: 150,
                    enable: true,
                    opacity: 0.2,
                    width: 1,
                },
                move: {
                    direction: "none",
                    enable: true,
                    outModes: {
                        default: "bounce",
                    },
                    random: false,
                    speed: isZen ? 0.4 : 1, // Slow speed in Zen
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        width: 1920,
                        height: 1080
                    },
                    value: 150,
                },
                opacity: {
                    value: 0.6,
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 4 },
                },
            },
            detectRetina: true,
        }),
        [isZen],
    );

    const particlesLoaded = async (container?: Container) => {
        if (!container) return;

        let frameId: number;
        const updateParticles = () => {
            if (analyser && isPlaying) {
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                // Analyze Bass frequencies
                let bassSum = 0;
                for (let i = 2; i < 10; i++) bassSum += dataArray[i];
                const bassAvg = (bassSum / 8) / 255; // Normalized 0-1

                // Enhance speed and connection distance based on bass drops
                if (container.options.particles.move) {
                    const baseSpeed = isZen ? 0.4 : 1;
                    const peakSpeed = isZen ? 2 : 15;
                    const targetSpeed = baseSpeed + (bassAvg * peakSpeed);

                    // Modify particles interactively
                    const particles = (container as any).particles.array || [];
                    for (const particle of particles) {
                        if (particle.velocity) {
                            particle.velocity.factor = targetSpeed;
                        }
                        if (particle.options.size.value > 0) {
                            // Dynamic size pulsing
                            particle.size.value = particle.initialSize * (1 + bassAvg * 2);
                        }
                    }
                }
            } else {
                // Reset if paused
                const particles = (container as any).particles.array || [];
                for (const particle of particles) {
                    if (particle.velocity) particle.velocity.factor = 1;
                    particle.size.value = particle.initialSize;
                }
            }

            frameId = requestAnimationFrame(updateParticles);
        };

        frameId = requestAnimationFrame(updateParticles);
        const engine = container as any;
        if (engine.setLifecycle) {
            engine.setLifecycle({ destroyed: () => cancelAnimationFrame(frameId) });
        }
    };

    if (!init) return null;

    return (
        <Particles
            id="tsparticles-visualizer"
            particlesLoaded={particlesLoaded}
            options={options}
            className={clsx(
                "absolute inset-0 z-0 pointer-events-auto mix-blend-screen transition-opacity duration-1000",
                isZen ? "opacity-30" : "opacity-60"
            )}
        />
    );
};
