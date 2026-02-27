import playdl from 'play-dl';
import youtubedl from 'youtube-dl-exec';

async function test() {
    const videoId = 's0jqcw9HgWU';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log('--- Testing play-dl ---');
    try {
        const info = await playdl.video_info(videoUrl);
        const audioFormats = info.format?.filter(f => f.mimeType?.includes('audio')) || [];
        console.log('play-dl found audio formats:', audioFormats.length);
    } catch (err) {
        console.log('play-dl error:', err.message);
    }

    console.log('\n--- Testing yt-dlp fallback ---');
    try {
        const raw = await youtubedl(videoUrl, {
            dumpSingleJson: true,
            noPlaylist: true,
            format: 'bestaudio',
            noCheckCertificates: true,
            noWarnings: true,
            skipDownload: true,
        });
        console.log('yt-dlp found URL:', !!raw.url);
        if (raw.url) {
            console.log('yt-dlp URL starts with:', raw.url.substring(0, 50));
        }
    } catch (err) {
        console.log('yt-dlp error:', err.message);
    }
}

test();
