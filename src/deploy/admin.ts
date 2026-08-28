import gcloud from '@battis/partly-gcloudy';
import { Colors } from '@qui-cli/colors';
import { Env } from '@qui-cli/env';
import { Log } from '@qui-cli/log';

export async function run() {
  // TODO store ADMIN_URL
  // TODO write ADMIN_SERVICE_NAME
  const { service } = await gcloud.batch.run.deployService({
    defaultName: 'Major Commitments',
    serviceName: (await Env.get({ key: 'ADMIN_SERVICE_NAME' })) || 'admin',
    serviceAccount: await Env.get({ key: 'SERVICE_ACCOUNT' }),
    env: true,
    args: {
      ...gcloud.batch.run.DEFAULT_ARGS,
      'allow-unauthenticated': false,
      iap: true,
      'set-env-vars': [
        ['GOOGLE_CLOUD_PROJECT', gcloud.projects.active.getIdentifier()],
        ['APP_MODE', 'admin']
      ]
        .map(([name, value]) => `${name}=${value}`)
        .join(',')
    },
    retainRevisions: 2
  });

  // TODO only needed on first run
  const region = service.metadata.labels['cloud.googleapis.com/location'];
  await gcloud.shell.gcloud(
    `run services add-iam-policy-binding ${service.metadata.name}`,
    {
      flags: {
        region,
        member: `serviceAccount:service-${gcloud.projects.active.get()?.projectNumber}@gcp-sa-iap.iam.gserviceaccount.com`,
        role: 'roles/run.invoker'
      }
    }
  );
  /** @see https://docs.cloud.google.com/run/docs/securing/identity-aware-proxy-cloud-run#manage-access */
  gcloud.shell.gcloud('iap web add-iam-policy-binding', {
    flags: {
      member: 'user:USER_EMAIL',
      role: gcloud.iam.Role.IAP.httpsResourceAccessor,
      region,
      'resource-type': 'cloud-run',
      service: service.metadata.name
    }
  });

  const urls = JSON.parse(
    service.metadata.annotations['run.googleapis.com/urls']
  ) as string[];
  Log.info(
    `Veracross API access can be authorized at ${Colors.url(`${urls[1]}/oauth2/veracross/authorize`)}`
  );
}
