import { LazySecrets } from '@battis/lazy-secrets';
import { Client } from '@groton/veracross-api';
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

export class TokenManager implements Client.TokenStore {
  private REFRESH_TOKEN = 'VERACROSS_REFRESH_TOKEN';
  private tokens: Tokens | undefined = undefined;
  private state: string | undefined = undefined;
  private code_verifier: string | undefined = undefined;

  private _config: Configuration | undefined = undefined;
  private config = async () => {
    if (!this._config) {
      const { school_route, client_id, client_secret } = await credentials();
      this._config = await discovery(
        new URL(school_route, 'https://accounts.veracross.com'),
        client_id,
        client_secret
      );
    }
    return this._config;
  };

  public async authorizationURL() {
    const { redirect_uri, scope } = await credentials();
    this.code_verifier = randomPKCECodeVerifier();
    const code_challenge = await calculatePKCECodeChallenge(this.code_verifier);

    this.state = randomState();
    return buildAuthorizationUrl(await this.config(), {
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method: 'S256',
      state: this.state
    });
  }

  public async handleOAuth2Redirect(url: URL) {
    if (this.state) {
      const checks = {
        pkceCodeVerifier: this.code_verifier,
        expectedState: this.state
      };
      this.code_verifier = undefined;
      this.state = undefined;
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
      this.tokens = await authorizationCodeGrant(
        await this.config(),
        url,
        checks,
        {
          scope
        }
      );
      this.store(this.tokens);
      return;
    }
    throw new Error('No state available to verify authorization');
  }

  public async refresh(refresh_token?: string) {
    if (refresh_token) {
      this.tokens = await refreshTokenGrant(
        await this.config(),
        refresh_token,
        {
          scope: (await credentials()).scope
        }
      );
      this.store(this.tokens);
      return this.tokens;
    }
    return undefined;
  }

  private async store(tokens?: Tokens) {
    if (tokens?.refresh_token) {
      LazySecrets.init({ fallback: true });
      await LazySecrets.set(this.REFRESH_TOKEN, tokens.refresh_token);
    }
    return tokens;
  }

  public async getTokens() {
    if (!this.tokens) {
      LazySecrets.init({ fallback: true });
      this.tokens = await this.refresh(
        await LazySecrets.get<string>(this.REFRESH_TOKEN)
      );
    }
    if (!this.tokens) {
      throw new Error('No refresh token received');
    } else {
      return this.tokens;
    }
  }

  public async getAccessToken(): Promise<string> {
    return (await this.getTokens()).access_token;
  }
}
