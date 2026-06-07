import { lastfmService } from './lastfm';

export interface MapNode {
    id: string;
    name: string;
    image?: string;
    x: number;
    y: number;
    z: number;
    connections: string[];
    isPrimary?: boolean;
}

export const ArtistMapEngine = {
    /**
     * Fetches similar artists and generates a 3D graph layout.
     * @param artistName The name of the seed artist.
     * @param depth How many levels of similarity to fetch (default 1 for performance).
     */
    async generateArtistGraph(artistName: string): Promise<MapNode[]> {
        const nodes: MapNode[] = [];
        const seen = new Set<string>();

        // 1. Seed node
        const seedInfo = await lastfmService.getArtistInfo(artistName);
        const seedNode: MapNode = {
            id: artistName.toLowerCase(),
            name: artistName,
            image: seedInfo?.image,
            x: 0,
            y: 0,
            z: 0,
            connections: [],
            isPrimary: true
        };
        nodes.push(seedNode);
        seen.add(seedNode.id);

        // 2. Fetch similar artists (Level 1)
        const similar = await lastfmService.getArtistInfo(artistName);
        if (similar?.similar) {
            const artists = similar.similar.slice(0, 12); // Limit for performance and visual clarity

            artists.forEach((name, index) => {
                const id = name.toLowerCase();
                if (!seen.has(id)) {
                    // Position nodes in a sphere around the seed
                    const phi = Math.acos(-1 + (2 * index) / artists.length);
                    const theta = Math.sqrt(artists.length * Math.PI) * phi;
                    const radius = 15;

                    const x = radius * Math.sin(phi) * Math.cos(theta);
                    const y = radius * Math.sin(phi) * Math.sin(theta);
                    const z = radius * Math.cos(phi);

                    nodes.push({
                        id,
                        name,
                        x,
                        y,
                        z,
                        connections: [seedNode.id]
                    });
                    seedNode.connections.push(id);
                    seen.add(id);
                }
            });
        }

        return nodes;
    }
};
