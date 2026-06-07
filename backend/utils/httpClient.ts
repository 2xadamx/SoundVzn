import https from 'https';

/** Dev: bypass corporate/AV TLS interception that breaks outbound API calls. */
export const externalHttpConfig = process.env.NODE_ENV === 'production'
    ? {}
    : { httpsAgent: new https.Agent({ rejectUnauthorized: false }) };
