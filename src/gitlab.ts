import { JsonComment, EnvironmentVariables } from './types';
import { getFromEnvironmentOrFail } from './environment';

export const pr = async (env: Env, pageSlug: string, json: JsonComment) => {
    console.log(`create GitLab MR: ${JSON.stringify(json)}`);
    let ok = false;
    try {
        // vital settings
        const gitlabToken = getFromEnvironmentOrFail(env, EnvironmentVariables.GITLAB_TOKEN);
        const gitlabUrl = getFromEnvironmentOrFail(env, EnvironmentVariables.GITLAB_URL);
        const projectId = getFromEnvironmentOrFail(env, EnvironmentVariables.GITLAB_PROJECT_ID);
        const gitAuthor = getFromEnvironmentOrFail(env, EnvironmentVariables.GIT_AUTHOR);
        const gitEmail = getFromEnvironmentOrFail(env, EnvironmentVariables.GIT_EMAIL);
        const branchToMergeInto = getFromEnvironmentOrFail(env, EnvironmentVariables.GIT_BRANCH_TO_MERGE_INTO);
        const commentDir = getFromEnvironmentOrFail(env, EnvironmentVariables.COMMENT_DIR);

        // computed
        const newBranch = `no-comment_${json._id}`;
        const message = "no-comment - comment";
        const path = `${commentDir}/${pageSlug}/comment_${json._id}.json`;
        const apiBaseUrl = gitlabUrl.endsWith('/') ? `${gitlabUrl}api/v4` : `${gitlabUrl}/api/v4`;

        // Step 1: Get the current commit SHA of the target branch
        console.log("lookup source ref");
        const branchResponse = await fetch(
            `${apiBaseUrl}/projects/${encodeURIComponent(projectId)}/repository/branches/${branchToMergeInto}`,
            {
                headers: {
                    'PRIVATE-TOKEN': gitlabToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!branchResponse.ok) {
            throw new Error(`Failed to get branch information: ${branchResponse.statusText}`);
        }

        // stop typescript complaining
        const branchData = await branchResponse.json() as any;
        const shaOfBranchToMergeInto = branchData.commit.id;

        if (!shaOfBranchToMergeInto) {
            throw new Error(`no SHA available for branch to merge into: ${branchToMergeInto}`);
        }
        console.log(`create branch from: ${shaOfBranchToMergeInto}`);

        // Step 2: Create a new branch
        const createBranchResponse = await fetch(
            `${apiBaseUrl}/projects/${encodeURIComponent(projectId)}/repository/branches`,
            {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': gitlabToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    branch: newBranch,
                    ref: branchToMergeInto,
                }),
            }
        );

        if (!createBranchResponse.ok) {
            throw new Error(`Failed to create branch: ${createBranchResponse.statusText}`);
        }

        // Step 3: Create a file with the comment data
        console.log("create data file");
        const fileContent = Buffer.from(JSON.stringify(json)).toString('base64');
        const createFileResponse = await fetch(
            `${apiBaseUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(path)}`,
            {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': gitlabToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    branch: newBranch,
                    content: fileContent,
                    encoding: 'base64',
                    commit_message: message,
                    author_name: gitAuthor,
                    author_email: gitEmail,
                }),
            }
        );

        if (!createFileResponse.ok) {
            throw new Error(`Failed to create file: ${createFileResponse.statusText}`);
        }

        // Step 4: Create a merge request
        console.log("create MR");
        const createMRResponse = await fetch(
            `${apiBaseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`,
            {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': gitlabToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source_branch: newBranch,
                    target_branch: branchToMergeInto,
                    title: "no-comment received a comment",
                    description: "received JSON: \n```json\n" + JSON.stringify(json, null, 2) + "\n```",
                }),
            }
        );

        if (!createMRResponse.ok) {
            throw new Error(`Failed to create merge request: ${createMRResponse.statusText}`);
        }

        console.log(`Created MR for comment: ${json._id}`);
        ok = true;
    } catch (e) {
        console.error("some error encountered", e);
    }

    return ok;
}
