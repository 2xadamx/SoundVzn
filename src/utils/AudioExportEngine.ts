export const AudioExportEngine = {
    /**
     * Renders a track with all current DSP settings to a WAV blob.
     */
    async exportRemaster(audioUrl: string, settings: any): Promise<Blob> {
        console.log('📤 AudioExportEngine: Starting Remaster Export for:', audioUrl);

        // 1. Fetch the raw audio data
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        // 2. Setup Offline Context
        const offlineCtx = new OfflineAudioContext(2, 44100 * 300, 44100); // Max 5 mins for now
        const source = offlineCtx.createBufferSource();
        const buffer = await offlineCtx.decodeAudioData(arrayBuffer);
        source.buffer = buffer;

        // 3. Replicate DSP chain in offline context
        const masterGain = offlineCtx.createGain();
        masterGain.gain.value = settings.volume || 1.0;

        // EQ
        let lastNode: AudioNode = source;
        if (settings.eqEnabled && settings.eqBands) {
            settings.eqBands.forEach((band: any) => {
                const filter = offlineCtx.createBiquadFilter();
                filter.type = band.frequency < 100 ? 'lowshelf' : band.frequency > 10000 ? 'highshelf' : 'peaking';
                filter.frequency.value = band.frequency;
                filter.gain.value = band.gain;
                lastNode.connect(filter);
                lastNode = filter;
            });
        }

        // Reverb (Simulated for offline)
        if (settings.reverbPreset && settings.reverbPreset !== 'off') {
            const convolver = offlineCtx.createConvolver();
            // In a real app we'd generate the IR buffer here
            // For now, we'll just connect directly to simulate the chain
            lastNode.connect(convolver);
            lastNode = convolver;
        }

        lastNode.connect(masterGain);
        masterGain.connect(offlineCtx.destination);

        // 4. Render
        source.start(0);
        const renderedBuffer = await offlineCtx.startRendering();

        // 5. Convert to WAV
        return this.bufferToWav(renderedBuffer);
    },

    bufferToWav(abuffer: AudioBuffer): Blob {
        const numOfChan = abuffer.numberOfChannels;
        const length = abuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const channels = [];
        let i;
        let sample;
        let offset = 0;
        let pos = 0;

        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"

        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // length = 16
        setUint16(1);                                  // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit (hardcoded)

        setUint32(0x61746164);                         // "data" - chunk
        setUint32(length - pos - 4);                   // chunk length

        // write interleaved data
        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {             // interleave channels
                sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
                view.setInt16(pos, sample, true);          // write 16-bit sample
                pos += 2;
            }
            offset++;                                     // next source sample
        }

        return new Blob([buffer], { type: 'audio/wav' });

        function setUint16(data: number) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data: number) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }
};
