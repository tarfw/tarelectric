import { toByteArray, fromByteArray } from 'base64-js';
import '@formatjs/intl-segmenter/polyfill.js';


// Polyfill Uint8Array.fromBase64
if (!(Uint8Array as any).fromBase64) {
    (Uint8Array as any).fromBase64 = (base64: string) => {
        return toByteArray(base64);
    };
}

// Polyfill Uint8Array.prototype.toBase64
if (!(Uint8Array.prototype as any).toBase64) {
    (Uint8Array.prototype as any).toBase64 = function () {
        return fromByteArray(this);
    };
}
