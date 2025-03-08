# Akismet Setup

[Akismet](https://akismet.com/) provides a [comment check](https://akismet.com/developers/detailed-docs/comment-check/) that is perfect for no-comment to to use. There is donation/free pricing for personal blogs.

To setup:
1. Go to [Akismet](https://akismet.com/) and sign up for an account
2. Login, click `Get started`, choose a plan
3. Go to `My account`, copy the API KEY value

## Run locally to test

**If your happy this code works you can skip this step*

Add the following to `.dev.vars` and start the [dev server](../README.md#test-locally-optional):

```
AKISMET_ENABLED = "true"
AKISMET_API_KEY = "YOURTOKENHERE"
AKISMET_BLOG_URL = "https://YOURBLOG.com"

# for testing - to avoid flagging yourself as a spammer, etc
AKISMET_TEST_MODE = "true"
```

With your test worker running, try to post a comment local blog instance is good since it lets you test end-to-end but curl would work too.

To [force a spam detection](https://akismet.com/developers/detailed-docs/comment-check/):
> ...send `akismet‑guaranteed‑spam` as the author or `akismet-guaranteed-spam@example.com` as the author email. Either value will always trigger a `true` response.

You can monitor detections in the local terminal and the _My account_ section of the Akismet web site.


## Deploy as Cloudflare Worker
1. In your forked copy of this repository, update `wrangler.toml`:
    * `AKISMET_ENABLED = "true"`
    * `AKISMET_BLOG_URL = "https://YOURBLOG.com"`
2. [Deploy cloudflare worker as usual](../README.md#deploy-cloudflare-worker)
3. Create secret for AKISMET API Key: `npx wrangler secret put AKISMET_API_KEY`
4. Test comments are working and spam is detected
