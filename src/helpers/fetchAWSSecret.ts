// eslint-disable-next-line import/no-extraneous-dependencies
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const SecretManagerClient = new SecretsManagerClient({ region: process.env.AWS_DEFAULT_REGION });

// Create an in-memory cache object
const cache: any = {};

/**
 * Fetch secret from AWS Secret Manager with caching using in-memory cache
 * @param secretName
 */
const getSecret = async (secretName: string) => {
  try {
    // Check if the secret is already in the cache
    if (cache[secretName]) {
      return cache[secretName];
    }

    const isProduction = process.env.IsProduction === 'true';
    const response = await SecretManagerClient.send(
      new GetSecretValueCommand({
        SecretId: `UGU/${secretName}/${isProduction ? 'LIVE' : 'DEV'}`,
        VersionStage: 'AWSCURRENT',
      }),
    );

    const secretValue = response.SecretString;
    // Cache the secret in memory
    cache[secretName] = secretValue;
    return secretValue;
  } catch (err) {
    throw err;
  }
};

export default getSecret;
