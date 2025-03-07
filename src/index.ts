/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { v4 as uuidv4 } from 'uuid';
import { pr as githubPr } from "./github.ts";
import { pr as gitlabPr } from "./gitlab.ts";
import { JsonComment, EnvironmentVariables } from './types.ts';

const getFormField = (value: File | string | null) : string => {
    if (typeof value === "string") {
        return value;
    } else if (value instanceof File) {
        return "uploaded file removed";
    }
    else {
        return "missing";
    }
}

const getHiddenFieldOrFail = (field: string, value: File | string | null ) : string => {
    if (value === null || value instanceof File ) {
        throw new Error(`missing or invalid ${field}`);
    }
    return value;
}

const formToJson = (formData: FormData): JsonComment => {
    return {
        _id: uuidv4(),
        name: getFormField(formData.get("fields[name]")),
        email: getFormField(formData.get("fields[email]")),
        message: getFormField(formData.get("fields[message]")),
        date: Math.floor(Date.now() / 1000),
    }
}

/**
 * Safely handles redirect URLs, preserving query parameters while ensuring security
 * @param redirectUrl The URL to redirect to
 * @param allowedDomains Optional list of allowed domains for redirection
 * @returns A safe URL for redirection
 */
const getSafeRedirectUrl = (redirectUrl: string, allowedDomains?: string[]): string => {
    try {
        // Try to parse the URL to handle query parameters
        const url = new URL(redirectUrl);
        
        // If allowedDomains is provided, validate the URL domain
        if (allowedDomains && allowedDomains.length > 0) {
            const isAllowed = allowedDomains.some(domain => 
                url.hostname === domain || 
                url.hostname.endsWith(`.${domain}`)
            );
            
            if (!isAllowed) {
                console.warn(`Redirect to non-allowed domain blocked: ${url.hostname}`);
                // Return the path portion only for security
                return url.pathname + url.search + url.hash;
            }
        }
        
        // Return the full URL if it's allowed or no domain restrictions
        return url.toString();
    } catch (e) {
        // If URL parsing fails, return the original URL (backward compatibility)
        console.warn(`Failed to parse redirect URL: ${e}`);
        return redirectUrl;
    }
}

export default {
    async fetch(request, env, ctx): Promise<Response> {
        const formData = await request.formData();
        const json = formToJson(formData);
        const pageSlug = getHiddenFieldOrFail("slug", formData.get("options[slug]"));
        const redirectPage = getHiddenFieldOrFail("redirect", formData.get("options[redirect]"));
        
        // Determine which provider to use (GitHub or GitLab)
        const provider = env[EnvironmentVariables.PROVIDER] || "github";
        
        let ok = false;
        if (provider.toLowerCase() === "gitlab") {
            ok = await gitlabPr(env, pageSlug, json);
        } else {
            // Default to GitHub
            ok = await githubPr(env, pageSlug, json);
        }
        
        if (ok) {
            // Get a safe redirect URL, preserving query parameters
            const safeRedirectUrl = getSafeRedirectUrl(redirectPage);
            return Response.redirect(safeRedirectUrl, 302);
        } else {
            return new Response("Sorry, there was an error");
        }
    },
} satisfies ExportedHandler<Env>;
