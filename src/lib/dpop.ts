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

export async function hashAccessToken(accessToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(accessToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function generateDPoPProof(options: {
  privateKey: string | CryptoKey;
  publicKey: string | CryptoKey;
  method: string;
  url: string;
  accessToken?: string;
  nonce?: string;
}): Promise<string> {
  let privateKey: CryptoKey;
  let publicKeyJwk: jose.JWK;

  if (typeof options.privateKey === 'string') {
    const privateKeyJwk = JSON.parse(options.privateKey);
    privateKey = (await jose.importJWK(privateKeyJwk, 'ES256')) as CryptoKey;
  } else {
    privateKey = options.privateKey as CryptoKey;
  }

  if (typeof options.publicKey === 'string') {
    publicKeyJwk = JSON.parse(options.publicKey);
  } else {
    publicKeyJwk = (await jose.exportJWK(options.publicKey)) as jose.JWK;
  }
  
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
    htm: options.method.toUpperCase(),
    htu: options.url,
    iat: Math.floor(Date.now() / 1000),
  };
  
  if (options.accessToken) {
    payload.ath = await hashAccessToken(options.accessToken);
  }
  
  if (options.nonce) {
    payload.nonce = options.nonce;
  }
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKey);
  
  return jwt;
}