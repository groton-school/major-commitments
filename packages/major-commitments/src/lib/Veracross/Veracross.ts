import { Client } from '@groton/veracross-api';
import { credentials } from './Credentials';
import { TokenManager } from './TokenManager';

const OAuth = new TokenManager();

Client.register({
  config: await credentials(),
  tokenStore: OAuth
});

export { Authorization, Data, Files } from '@groton/veracross-api';
export { OAuth };
