import * as jose from 'jose';

export interface DPoPKeyPair {
  privateKey: string;
  publicKey: string;
}

export async function generateDPoPKeyPair(): Promise<DPoPKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
  
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  
  return {
    privateKey: JSON.stringify(privateKeyJwk),
    publicKey: JSON.stringify(publicKeyJwk),
  };
}

export async function generateDPoPProof(options: {
  privateKey: string;
  publicKey: string;
  method: string;
  url: string;
  accessToken?: string;
  nonce?: string;
}): Promise<string> {
  const privateKeyJwk = JSON.parse(options.privateKey);
  const publicKeyJwk = JSON.parse(options.publicKey);
  
  const header = {
    alg: 'ES256',
    typ: 'dpop+jwt',
    jwk: {
      kty: publicKeyJwk.kty,
      crv: publicKeyJwk.crv,
      x: publicKeyJwk.x,
      y: publicKeyJwk.y,
    },
  };
  
  const payload: any = {
    jti: crypto.randomUUID(),
    htm: options.method,
    htu: options.url,
    iat: Math.floor(Date.now() / 1000),
  };
  
  if (options.accessToken) {
    const encoder = new TextEncoder();
    const data = encoder.encode(options.accessToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    payload.ath = hashBase64;
  }
  
  if (options.nonce) {
    payload.nonce = options.nonce;
  }
  
  const privateKey = await jose.importJWK(privateKeyJwk, 'ES256');
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKey);
  
  return jwt;
}
