require('@testing-library/jest-dom');

// Polyfill for TextEncoder/TextDecoder required by React Router
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}
