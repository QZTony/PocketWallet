import 'react-native-get-random-values';
import { Buffer } from 'buffer';

(global as any).Buffer = Buffer;

if (typeof global.process === 'undefined') {
  (global as any).process = { env: {}, version: 'v16.0.0', browser: false } as any;
}
if (!(global as any).process.version) {
  (global as any).process.version = 'v16.0.0';
}

if (typeof (global as any).TextEncoder === 'undefined') {
  class SimpleTextEncoder {
    encode(str: string): Uint8Array {
      const buf = Buffer.from(str, 'utf-8');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
  }
  (global as any).TextEncoder = SimpleTextEncoder;
}

if (typeof (global as any).TextDecoder === 'undefined') {
  class SimpleTextDecoder {
    decode(arr?: Uint8Array): string {
      if (!arr) return '';
      return Buffer.from(arr).toString('utf-8');
    }
  }
  (global as any).TextDecoder = SimpleTextDecoder;
}
