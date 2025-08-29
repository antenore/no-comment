import axios, { Axios } from "axios";
import { EnvironmentVariables, JsonComment } from "./types";
import { getFromEnvironmentOrDefault, getFromEnvironmentOrFail } from "./environment";
import { decryptEmail } from "./rsa-decrypt";
import { version } from '../package.json';

const noCommentUserAgent = `no-comment/${version}`

// https://akismet.com/developers/detailed-docs/comment-check/
// Seems to be a pretty old API...
// * parameters are sent in the POST body as url encoded strings - no JSON!!!
// * response is the string `true` or `false`, with some interesting headers

export const isCommentSpam = async (env: any, request: Request, json: JsonComment): Promise<boolean> => {
    const akismetEndpoint = 'https://rest.akismet.com/1.1/comment-check';

    // see https://developers.cloudflare.com/workers/examples/conditional-response/
    const userAgent = request.headers.get("User-Agent") || "";
    const userIp = request.headers.get("CF-Connecting-IP") || "error";
    const referrer = request.headers.get("Referer") || "";

    const apiKey = getFromEnvironmentOrFail(env, EnvironmentVariables.AKISMET_API_KEY);
    const blogUrl = getFromEnvironmentOrFail(env, EnvironmentVariables.AKISMET_BLOG_URL);
    const isTest = getFromEnvironmentOrDefault(env, EnvironmentVariables.AKISMET_TEST_MODE, "false");
    
    // Optionally decrypt email if it's encrypted (for Akismet check only)
    // This feature is useful when using client-side email encryption
    // Set RSA_PRIVATE_KEY secret in Cloudflare to enable this feature
    let emailForAkismet = json.email;
    try {
        const privateKey = env.RSA_PRIVATE_KEY;
        if (privateKey) {
            // Attempt to decrypt if private key is configured
            emailForAkismet = await decryptEmail(json.email, privateKey);
            if (emailForAkismet !== json.email) {
                console.debug('Email decrypted for Akismet check');
            }
        }
    } catch (error) {
        // If decryption fails, continue with the original value
        // This allows the system to work with both encrypted and plain emails
        console.warn('Could not decrypt email for Akismet, using as-is:', error);
    }
    
    // need to URL encode all components, but since the items in JSON are already encoded
    // as they came from a form, we only encode _other_ parameters, to avoid double encoding
    const postBody = new URLSearchParams({
        api_key: encodeURIComponent(apiKey),
        blog: encodeURIComponent(blogUrl),
        user_ip: encodeURIComponent(userIp),
        user_agent: encodeURIComponent(userAgent),
        referrer: encodeURIComponent(referrer),
        comment_type: encodeURIComponent("comment"),
        is_test: encodeURIComponent(isTest),
        
        comment_author: json.name,
        comment_author_email: emailForAkismet,  // Use decrypted email for Akismet
        comment_content: json.message,
    }).toString();

    console.info(`akismet spam check request: ${postBody}`)
    
    try {
        const {data, status} = await axios.post(
            akismetEndpoint,
            postBody,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": noCommentUserAgent,
                },
            }
        );
        console.debug(`akismet done: status=${status} data=${data}`);
        console.info(`akismet result: spam=${data} author=${json.name} email=${json.email} message=${json.message}`);
        
        // axios helpfully turns literal string `true` into boolean true
        return data
    } catch (error) {
        console.error("Error checking comment, flagging HAM to avoid losing comments:", error);
        
        return false;
    }
}