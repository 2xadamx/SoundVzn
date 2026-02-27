import http from 'http';

http.get('http://localhost:3000/api/youtube/stream/kJQP7kiw5Fk/proxy', (res) => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', res.headers);
    res.on('data', () => { }); // Consumir los datos para que el socket se cierre limpio
    res.on('end', () => console.log('Finalizado la lectura.'));
}).on('error', (e) => {
    console.error('ERROR:', e.message);
});
