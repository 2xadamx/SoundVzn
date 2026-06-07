import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ArtistMapEngine, MapNode } from '../../utils/ArtistMapEngine';

interface NodeProps {
    node: MapNode;
    onClick: (name: string) => void;
}

const GraphNode: React.FC<NodeProps> = ({ node, onClick }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
            meshRef.current.rotation.x += 0.005;
            // Float effect
            meshRef.current.position.y = node.y + Math.sin(state.clock.elapsedTime * 2 + node.x) * 0.5;
        }
    });

    const scale = node.isPrimary ? 2 : (hovered ? 1.5 : 1);
    const color = node.isPrimary ? '#3b82f6' : (hovered ? '#60a5fa' : '#ffffff');

    return (
        <group position={[node.x, node.y, node.z]}>
            <Sphere
                ref={meshRef}
                args={[scale, 32, 32]}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(node.name);
                }}
            >
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.8}
                    roughness={0.2}
                    metalness={0.8}
                    emissive={color}
                    emissiveIntensity={hovered ? 0.8 : 0.2}
                />
            </Sphere>

            {/* Label */}
            <Text
                position={[0, scale + 1.2, 0]}
                fontSize={hovered || node.isPrimary ? 1.2 : 0.8}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="#000000"
            >
                {node.name}
            </Text>
        </group>
    );
};

interface GraphProps {
    nodes: MapNode[];
    onNodeClick: (name: string) => void;
}

const Graph: React.FC<GraphProps> = ({ nodes, onNodeClick }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.001; // Slow rotation of entire graph
        }
    });

    const lines = useMemo(() => {
        const result: { start: THREE.Vector3, end: THREE.Vector3 }[] = [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        nodes.forEach(node => {
            node.connections.forEach(targetId => {
                const target = nodeMap.get(targetId);
                if (target) {
                    result.push({
                        start: new THREE.Vector3(node.x, node.y, node.z),
                        end: new THREE.Vector3(target.x, target.y, target.z)
                    });
                }
            });
        });
        return result;
    }, [nodes]);

    return (
        <group ref={groupRef}>
            {/* Draw connections */}
            {lines.map((line, i) => (
                <Line
                    key={i}
                    points={[line.start, line.end]}
                    color="#ffffff"
                    lineWidth={1}
                    transparent
                    opacity={0.2}
                />
            ))}

            {/* Draw nodes */}
            {nodes.map(node => (
                <GraphNode key={node.id} node={node} onClick={onNodeClick} />
            ))}
        </group>
    );
};

interface ArtistDiscoveryMapProps {
    rootArtist: string;
    onNavigateArtist: (name: string) => void;
}

export const ArtistDiscoveryMap: React.FC<ArtistDiscoveryMapProps> = ({ rootArtist, onNavigateArtist }) => {
    const [nodes, setNodes] = useState<MapNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        ArtistMapEngine.generateArtistGraph(rootArtist).then(data => {
            if (mounted) {
                setNodes(data);
                setLoading(false);
            }
        });

        return () => { mounted = false; };
    }, [rootArtist]);

    if (loading) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center bg-black/40 rounded-[40px] border border-white/5">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest animate-pulse">
                        Mapeando Constelación...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[500px] rounded-[40px] overflow-hidden border border-white/10 relative bg-[#050510]">
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <h3 className="text-white font-black text-2xl uppercase italic tracking-widest drop-shadow-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                    Constelación de {rootArtist}
                </h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Arrastra para orbitar • Scroll para zoom • Click en astro para viajar
                </p>
            </div>

            <Canvas camera={{ position: [0, 0, 35], fov: 60 }}>
                <color attach="background" args={['#020205']} />
                <fog attach="fog" args={['#020205', 20, 80]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <Graph nodes={nodes} onNodeClick={onNavigateArtist} />

                <OrbitControls
                    enablePan={false}
                    minDistance={10}
                    maxDistance={60}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                />
            </Canvas>
        </div>
    );
};
