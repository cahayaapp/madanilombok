// Explicit isolated local origin; never switches a hosted production page.
export const minimartLocal = typeof location !== 'undefined' && ['localhost','127.0.0.1'].includes(location.hostname) && location.port === '4179';
export const minimartEmulatorConfig = {apiKey:'demo-key', authDomain:'demo-madani-minimart.firebaseapp.com', projectId:'demo-madani-minimart', databaseURL:'https://demo-madani-minimart-default-rtdb.firebaseio.com'};
