import { env } from 'node:process';

// CLUE 7: The octopus bridges two worlds—cloud and earth. In which realm does the true key reside?
export function getAPIKey(cloudflareEnv: Env) {
  /**
   * The `cloudflareEnv` is only used when deployed or when previewing locally.
   * In development the environment variables are available through `env`.
   */
  return env.ANTHROPIC_API_KEY || cloudflareEnv.ANTHROPIC_API_KEY;
}
