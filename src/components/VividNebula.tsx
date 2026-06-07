import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerStore } from '../store/player';

/**
 * Professional 3D Neural Mesh Visualizer
 * Reacts to audio frequencies in real-time.
 */
const NeuralMesh: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);
    const analyser = usePlayerStore((state) => state.analyser);
    const isPlaying = usePlayerStore((state) => state.isPlaying);
    
    const bufferLength = analyser?.frequencyBinCount || 1024;
    const dataArray = useMemo(() => new Uint8Array(bufferLength), [bufferLength]);

    useFrame((state) => {
        const { clock } = state;
        const time = clock.getElapsedTime();

        if (analyser && isPlaying) {
            analyser.getByteFrequencyData(dataArray);
        } else {
            dataArray.fill(0);
        }

        // Frequencies Extraction
        const bass = dataArray[2] / 255;
        const mid = dataArray[Math.floor(bufferLength * 0.1)] / 255;
        const high = dataArray[Math.floor(bufferLength * 0.3)] / 255;

        if (meshRef.current) {
            meshRef.current.rotation.x = time * 0.1;
            meshRef.current.rotation.y = time * 0.15;
            
            // Subtle pulse based on bass
            const scale = 1 + bass * 0.2;
            meshRef.current.scale.set(scale, scale, scale);
        }

        if (materialRef.current) {
            materialRef.current.distort = 0.4 + bass * 0.6;
            materialRef.current.speed = 2 + high * 10;
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <Sphere ref={meshRef} args={[1, 64, 64]}>
                <MeshDistortMaterial
                    ref={materialRef}
                    color="#0ea5e9"
                    attach="material"
                    distort={0.5}
                    speed={2}
                    roughness={0}
                    metalness={1}
                />
            </Sphere>
        </Float>
    );
};

export const VividNebula: React.FC = () => {
    return (
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ background: '#020205' }}>
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#0ea5e9" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
                <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={2} castShadow />
                
                <NeuralMesh />
                
                {/* Background Stars/Particles */}
                <StarsBackground />
                
                <fog attach="fog" args={['#020205', 5, 15]} />
            </Canvas>
        </div>
    );
};

const StarsBackground: React.FC = () => {
    const pointsRef = useRef<THREE.Points>(null);
    const count = 2000;
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        return pos;
    }, []);

    useFrame((state) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y += 0.0005;
            pointsRef.current.rotation.x += 0.0002;
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.015} color="#ffffff" transparent opacity={0.4} sizeAttenuation />
        </points>
    );
};
