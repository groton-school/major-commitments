import 'server-only';

import { LazySecrets } from '@battis/lazy-secrets';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  Configuration,
  discovery,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers
} from 'openid-client';
import { credentials } from './Credentials';

export type Tokens = TokenEndpointResponse & TokenEndpointResponseHelpers;

const REFRESH_TOKEN = 'VERACROSS_REFRESH_TOKEN';
let tokens: Tokens | undefined = undefined;
let state: string | undefined = undefined;
let code_verifier: string | undefined = undefined;

let _config: Configuration | undefined = undefined;
const config = async () => {
  if (!_config) {
    const { school_route, client_id, client_secret } = await credentials();
    _config = await discovery(
      new URL(school_route, 'https://accounts.veracross.com'),
      client_id,
      client_secret
    );
  }
  return _config;
};

export async function authorizationURL() {
  const { redirect_uri, scope } = await credentials();
  code_verifier = randomPKCECodeVerifier();
  const code_challenge = await calculatePKCECodeChallenge(code_verifier);

  state = randomState();
  return buildAuthorizationUrl(await config(), {
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method: 'S256',
    state
  });
}

export async function handleOAuth2Redirect(url: URL) {
  if (state) {
    const checks = {
      pkceCodeVerifier: code_verifier,
      expectedState: state
    };
    code_verifier = undefined;
    state = undefined;
    const { redirect_uri, scope } = await credentials();
    /*
     * FIXME work out URL detection within Google Cloud Run
     *    Arbitrarily assuming the URL of the redirect_uri is wildly trusting
     *    and inappropriate
     */
    const redirect = new URL(redirect_uri);
    url.host = `${redirect.host}:${
      redirect.port !== ''
        ? redirect.port
        : redirect.protocol === 'https:'
          ? 443
          : 80
    }`;
    tokens = await authorizationCodeGrant(await config(), url, checks, {
      scope
    });
    store(tokens);
    return;
  }
  throw new Error('No state available to verify authorization');
}

export async function refresh(refresh_token?: string) {
  if (refresh_token) {
    tokens = await refreshTokenGrant(await config(), refresh_token, {
      scope: (await credentials()).scope
    });
    store(tokens);
    return tokens;
  }
  return undefined;
}

async function store(tokens?: Tokens) {
  if (tokens?.refresh_token) {
    LazySecrets.init({ fallback: true });
    await LazySecrets.set(REFRESH_TOKEN, tokens.refresh_token);
  }
  return tokens;
}

export async function getTokens() {
  if (!tokens) {
    LazySecrets.init({ fallback: true });
    tokens = await refresh(await LazySecrets.get<string>(REFRESH_TOKEN));
  }
  if (!tokens) {
    throw new Error('No refresh token received');
  } else {
    return tokens;
  }
}
