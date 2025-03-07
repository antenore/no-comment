# no-comment

no-comment is a drop-in replacement for staticman in Jekyll:
* HTML Form ➡️ JSON file
* For Cloudflare Workers
* Creates pull requests against selected branch - you have to appove manually to eliminate comment spam.
* Supports both GitHub and GitLab repositories

## Status
* "works for me"
* Interested to help? Please open a ticket...

## Workstation setup

Install nodejs, git and text editor, then install `wrangler`.

```shell
npm install -g wrangler
wrangler login
```

## GitHub setup

**Create a fine-grained access token**

Settings ➡️ Developer Settings ➡️ Personal access tokens ➡️ Fine-grained tokens

### Access required:
#### Repository access

* `Only select repositories`: choose repository to write to

### Permissions
#### Repository permissions

* `contents`: read and write
* `metadata`: read (mandatory)
* `pull requests`: read and write

### Important

* Save the token somewhere safe after creating it as it will only be displayed once
* Max token validity is 1 year, so remember to come back and do this again in a year

## GitLab setup

**Create a personal access token**

Settings ➡️ Access Tokens

### Scopes required:

* `read_repository`: Necessary to read the Staticman site config
* `api`: Necessary to create and merge merge requests

### Important

* Save the token somewhere safe after creating it as it will only be displayed once
* Set an expiration date for your token (recommended: 1 year maximum)
* For self-hosted GitLab instances, make sure your instance is accessible from the internet

## Deploy Cloudflare Worker

1. Fork this repository
2. Clone to workstation
3. Edit `wrangler.toml`, set variables:
    * Common settings:
      * `GIT_AUTHOR`: Name for comments (ignored when using personal access token)
      * `GIT_EMAIL`: email for comments (ignored when using personal access token)
      * `GIT_BRANCH_TO_MERGE_INTO`: git branch to create pull requests for
      * `COMMENT_DIR`: directory to save comments to in repository
      * `PROVIDER`: "github" or "gitlab" depending on which service you want to use
    * GitHub specific settings (when using `PROVIDER = "github"`):
      * `GITHUB_OWNER`: GitHub account containing the repository to update
      * `GITHUB_REPO`: GitHub repository to update
    * GitLab specific settings (when using `PROVIDER = "gitlab"`):
      * `GITLAB_URL`: GitLab instance URL (e.g., "https://gitlab.com/" - include trailing slash)
      * `GITLAB_PROJECT_ID`: GitLab project ID or path with namespace (e.g., "username/repo")
4. `npm install`
5. `wrangler login`
6. `npm run deploy` - note the deployment URL from this command, its needed to setup Jekyll
7. Set your token as a secret:
   * For GitHub: `npx wrangler secret put GITHUB_TOKEN` - when prompted enter the GitHub token created earlier
   * For GitLab: `npx wrangler secret put GITLAB_TOKEN` - when prompted enter the GitLab token created earlier

## Test locally (optional)

1. create `.dev.vars` with content based on your provider:
   * For GitHub: `GITHUB_TOKEN = "XXX"`, replace `XXX` with your GitHub token
   * For GitLab: `GITLAB_TOKEN = "XXX"`, replace `XXX` with your GitLab token
2. `npm run start`

## Setup Jekyll

Add a comments section to `_layouts/post.html`:

* Adds a comment form
* Displays saved comments
* On successfully adding a comment, user is redirected

Configs needed:
* form `action`: This is the URL the Cloudflare Worker was deployed to
* `options[redirect]` URL to redirect to after successfully adding a comment. Must be fully-qualified URL
* Configure directly in HTML or add to `config.yml`

### Basic Form Example

```html
<h2>Post comment</h2>
<form method="POST" action="{{ site.no_comment_url }}">
  <em><a href="https://www.markdownguide.org/">Markdown</a> is allowed, HTML is not. All comments are moderated.</em>
  <br />
  <input name="options[redirect]" type="hidden" value="{{ site.no_comment_redirect }}">
  <input name="options[slug]" type="hidden" value="{{ page.slug }}">

  <!-- e.g. "2016-01-02-this-is-a-post" -->
  <label style="width: 20px; display: inline-block">Name <input name="fields[name]" type="text"></label>
  <br/>

  <label style="width: 20px; display: inline-block">Email<input name="fields[email]" type="email"></label>
  <br/>

  <label style="width: 20px; display: inline-block">Message<textarea rows="40" cols="80" name="fields[message]"></textarea></label>
  <br/>

  <button type="submit">Post</button>
</form>

{% if site.data.comments[page.slug] %}
  <h2>Comments</h2>
  <div>
    {% for comment_entry in site.data.comments[page.slug] %}
    {% assign comment = comment_entry[1] %}
      <div>
        {{comment.date | date: "%Y-%m-%d"}} {{comment.name | strip_html}}
        <br />
        {{comment.message | strip_html | markdownify }}
      </div>
      <hr>
    {% endfor %}
  </div>
{% endif %}
```

### Advanced Form with Additional Parameters

You can add additional parameters to the redirect URL, such as the original page URL to redirect back after submission:

```html
<h2>Post comment</h2>
<form method="POST" action="{{ site.no_comment_url }}" id="comment-form" autocomplete="off">
  <em><a href="https://www.markdownguide.org/">Markdown</a> is allowed, HTML is not. All comments are moderated.</em>
  <br />
  <input name="options[redirect]" type="hidden" value="{{ site.no_comment_redirect }}?from={{ page.url | url_encode }}">
  <input name="options[slug]" type="hidden" value="{{ page.slug }}">
  <input name="fields[name]" type="text" autocomplete="off" placeholder="Name">
  <br/>
  <input name="fields[email]" type="email" autocomplete="off" placeholder="Email">
  <br/>
  <textarea rows="40" cols="80" name="fields[message]" autocomplete="off" placeholder="Message"></textarea>
  <br/>
  <button type="submit">Post</button>
</form>
```

With this setup, after submitting a comment, users will be redirected to the thanks page with a `from` parameter containing the original page URL. You can then use JavaScript on your thanks page to redirect users back to the original page after a delay:

```html
---
layout: default
title: Thanks for your comment
permalink: /thanks/
---

<h1>Thanks for your comment!</h1>
<p>Your comment has been submitted and is awaiting moderation.</p>
<p>Redirecting you back...</p>

<script>
  // Get the 'from' parameter from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const fromPath = urlParams.get('from');
  
  // Redirect after a short delay
  setTimeout(function() {
    if (fromPath) {
      window.location.href = decodeURIComponent(fromPath);
    } else {
      window.location.href = '/'; // Fallback to homepage
    }
  }, 3000); // 3 second delay
</script>
```

## Supported fields

Just what I use:
* name
* email
* comment

## Acknowledgements

* Original concept: [staticman](https://github.com/eduardoboucas/staticman/)
* Inspiration: [comment-worker](https://github.com/zanechua/comment-worker)
