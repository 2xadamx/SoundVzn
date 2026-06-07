import play from 'play-dl';
import youtubedl from 'youtube-dl-exec';

async function test(videoId) {
    console.log('Testing play-dl...');
    try {
        const info = await play.video_info(`https://www.youtube.com/watch?v=${videoId}`);
        const formats = info.format.filter(f => f.hasAudio && !f.hasVideo);
        if (formats.length > 0) {
            console.log('play-dl SUCCESS:', formats[0].url.substring(0, 80) + '...');
        } else {
            console.log('play-dl found no audio formats');
        }
    } catch (e) {
        console.error('play-dl ERROR:', e.message);
    }

    console.log('\nTesting youtube-dl-exec...');
    try {
        const raw = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
            listFormats: true,
            noCheckCertificates: true,
            noWarnings: true,
        });
        console.log('youtube-dl-exec SUCCESS:', raw);
    } catch (e) {
        console.error('youtube-dl-exec ERROR:', e.message);
    }
}

test('dQw4w9WgXcQ');
