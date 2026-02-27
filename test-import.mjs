import yts from 'yt-search';
console.log('yts type:', typeof yts);
if (typeof yts === 'function') {
    console.log('yts is a function (Good)');
} else {
    console.log('yts is not a function. Keys:', Object.keys(yts));
}
