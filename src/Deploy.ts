import path from 'node:path';
import gcloud from '@battis/partly-gcloudy';
import { Colors } from '@qui-cli/colors';
import { Positionals } from '@qui-cli/core';
import { Env } from '@qui-cli/env';
import * as Plugin from '@qui-cli/plugin';

export type Configuration = Plugin.Configuration & {
  serviceName?: string;
  concurrency?: number;
  maxInstances?: number;
  allowUnauthenticated?: boolean;
};

Positionals.require({
  serviceName: {
    description: 'Name of service to deploy'
  }
});
Positionals.allowOnlyNamedArgs();

const config: Configuration = {
  allowUnauthenticated: false
};

export const name = 'deploy';

export function configure(proposal: Partial<Configuration> = {}) {
  for (const key in proposal) {
    if (proposal[key] !== undefined) {
      config[key] = proposal[key];
    }
  }
}

export function options() {
  return {
    num: {
      concurrency: {
        description: 'Service concurrency limit',
        short: 'c',
        env: 'CONCURRENCY',
        default: config.concurrency
      },
      maxInstances: {
        description: 'Max number of service instances',
        short: 'i',
        env: 'MAX_INSTANCES',
        default: config.maxInstances
      }
    },
    flag: {
      allowUnauthenticated: {
        description: 'Allow unauthenticated web access to the service',
        short: 'u',
        env: 'ALLOW_UNAUTHENTICATED',
        default: config.allowUnauthenticated
      }
    }
  };
}

export async function init(args: Plugin.ExpectedArguments<typeof options>) {
  const serviceName = Positionals.get('serviceName');
  if (serviceName) {
    await Env.configure({
      path: path.join(import.meta.dirname, `../.env.${serviceName}`)
    });
    await Env.init(args);
  }
  configure({ serviceName, ...(args.values ? args.values : {}) });
}

export async function run() {
  const { serviceName, concurrency, maxInstances, allowUnauthenticated } =
    config;

  if (!serviceName) {
    throw new Error(`${Colors.positionalArg('serviceName')} is required`);
  }

  const vars = JSON.parse((await Env.get({ key: 'VARS' })) || '[]') as string[];

  await gcloud.batch.run.deployService({
    serviceName,
    serviceAccount: await Env.get({ key: 'SERVICE_ACCOUNT' }),
    args: {
      'base-image': 'nodejs24',
      'automatic-updates': true,
      source: './out',
      'max-instances': maxInstances,
      memory: '1Gi',
      concurrency,
      'set-env-vars': [
        ['GOOGLE_CLOUD_PROJECT', gcloud.projects.active.getIdentifier()],
        ...(await Promise.all(
          vars.map(async (key) => [key, await Env.get({ key })])
        ))
      ]
        .map(([name, value]) => `${name}=${value}`)
        .join(','),
      ...(allowUnauthenticated ? { 'allow-unauthenticated': true } : {})
    },
    retainRevisions: 2
  });
}
