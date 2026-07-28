# Browser Monitor Feedback Worker

Cloudflare Worker endpoint for direct feedback delivery from the Browser Monitor extension.

## Provider

The Worker uses the Resend HTTP API. The API key is stored as a Cloudflare secret and is never shipped with the extension.

## Setup

1. Verify the `FROM_EMAIL` domain in Resend.
2. For test builds, `FROM_EMAIL` can use Resend's test sender: `Browser Monitor <onboarding@resend.dev>`. For production, update it to a verified sender/domain in `wrangler.jsonc`.
3. Log in to Cloudflare:

   ```bash
   npx wrangler login
   ```

4. Add the Resend key:

   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

5. Deploy:

   ```bash
   npx wrangler deploy
   ```

6. Put the deployed `/feedback` URL into `FEEDBACK_ENDPOINT_URL` in `Extension/feedback.js`.

Optional: after installing the extension, set `ALLOWED_EXTENSION_IDS` to a comma-separated list of Chrome extension IDs and redeploy.
