import { Octokit, App } from "octokit";
import { JsonComment, EnvironmentVariables } from './types';
import { getFromEnvironmentOrFail } from './environment';

export const pr = async (env: Env, pageSlug: string, json: JsonComment) => {
    console.log(`create PR: ${JSON.stringify(json)}`);
    let ok = false;
    try {
        // vital settings
        const githubToken = getFromEnvironmentOrFail(env, EnvironmentVariables.GITHUB_TOKEN);
        const owner = getFromEnvironmentOrFail(env, EnvironmentVariables.GITHUB_OWNER);
        const repo = getFromEnvironmentOrFail(env, EnvironmentVariables.GITHUB_REPO);
        const gitAuthor = getFromEnvironmentOrFail(env, EnvironmentVariables.GIT_AUTHOR);
        const gitEmail = getFromEnvironmentOrFail(env, EnvironmentVariables.GIT_EMAIL);
        const branchToMergeInto = getFromEnvironmentOrFail(env, EnvironmentVariables.GIT_BRANCH_TO_MERGE_INTO);
        const commentDir = getFromEnvironmentOrFail(env, EnvironmentVariables.COMMENT_DIR);

        // computed
        const newBranch = `no-comment_${json._id}`;
        const newBranchRef = `refs/heads/${newBranch}`;
        const message = "no-comment - comment"
        const path = `${commentDir}/${pageSlug}/comment_${json._id}.json`


        // login
        const octokit = new Octokit({auth: githubToken});

        // lookup latest ref to create branch from
        console.log("lookup source ref");
        const refLookup = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${branchToMergeInto}`,
        });

        // create a branch...
        //console.log(JSON.stringify(refLookup));
        const shaOfBranchToMergeInto = refLookup.data.object.sha;
        if (shaOfBranchToMergeInto === "") {
            throw new Error(`no SHA available for branch to merge into: ${branchToMergeInto}`);
        }
        console.log(`create branch from: ${shaOfBranchToMergeInto}`);


        const result = await octokit.rest.git.createRef({
            owner,
            repo,
            ref: newBranchRef,
            sha: shaOfBranchToMergeInto,
        });
        //console.log(JSON.stringify(result));

        // commit a new JSON file with data from form
        console.log("create data file");
        const dataFileResult = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            branch: newBranchRef,
            content: Buffer.from(JSON.stringify(json)).toString('base64'),
            'committer.name': gitAuthor,
            'committer.email': gitEmail,
            'author.name': gitAuthor,
            'author.email': gitEmail,
        });
        // console.log(JSON.stringify(dataFileResult));


        // create pull request
        console.log("create PR");
        const prResult = await octokit.rest.pulls.create({
            owner,
            repo,
            head: newBranch,
            base: branchToMergeInto,
            title: "no-comment received a comment",
            body: "received JSON: \n```json\n" + JSON.stringify(json, null, 2) + "\n```",
          });
        console.log(`Created PR for comment: ${json._id}`);
        ok = true
    } catch (e) {
        console.error("some error encountered", e);
    }

    return ok;
}