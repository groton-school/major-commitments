import { Core } from '@qui-cli/core';
import { register } from '@qui-cli/plugin';
import * as Deploy from './Deploy.js';

await register(Deploy);
await Core.run();
