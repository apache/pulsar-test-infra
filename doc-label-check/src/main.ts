import * as core from '@actions/core';
import * as github from '@actions/github';
import * as octokitTypes from '@octokit/types';

import { Label, IssueEvent } from './types';
import { Quiet } from './enums';
import {
  formatStrArray,
  validateEnum,
  parseOffsetString,
  getOffsetDate,
  isLabelEvent,
  isCreatedByUser,
  removeDuplicates,
} from './utils';
import { formatLabel, extractLabels, getName } from './labels';
import { Logger, LoggingLevel } from './logger';

async function processIssue(
  octokit: ReturnType<typeof github.getOctokit>,
  repo: string,
  owner: string,
  issue_number: number,
  htmlUrl: string,
  description: string,
  labelPattern: string,
  logger: Logger,
): Promise<void> {
  logger.debug(`--- ${htmlUrl} ---`);

  // Labels extracted from an issue description
  const labels = extractLabels(description, labelPattern);
  if (labels.length === 0) {
    logger.debug('No labels found');
    return;
  }

  octokit.issues.listEvents({
    owner,
    repo,
    issue_number,
  });

  const listEventsData: IssueEvent[] = await octokit.paginate(
    octokit.issues.listEvents,
    {
      owner,
      repo,
      issue_number,
    },
  );

  // Labels added or removed by users
  const labelsToIgnore = removeDuplicates(
    listEventsData
      .filter(event => isLabelEvent(event) && isCreatedByUser(event))
      .map(({ label }) => label && label.name),
  );

  logger.debug('Labels to ignore:');
  logger.debug(formatStrArray(labelsToIgnore));

  // Labels registered in a repository
  const labelsForRepoData = await octokit.paginate(
    octokit.issues.listLabelsForRepo,
    {
      owner,
      repo,
    },
  );

  const labelsForRepo = labelsForRepoData.map(getName);
  const labelsToProcess = labels.filter(
    ({ name }) =>
      labelsForRepo.includes(name) && !labelsToIgnore.includes(name),
  );

  if (labelsToProcess.length === 0) {
    logger.debug('No labels to process');
    return;
  }

  // Labels that are already applied on an issue
  const labelsOnIssueResp = await octokit.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number,
  });
  const labelsOnIssue = labelsOnIssueResp.data.map(getName);

  logger.debug('Labels to process:');
  logger.debug(formatStrArray(labelsToProcess.map(formatLabel)));
  
  // Remove labels
  const shouldRemove = ({ name, checked }: Label): boolean =>
    !checked && labelsOnIssue.includes(name);
  const labelsToRemove = labelsToProcess.filter(shouldRemove).map(getName);

  logger.debug('Labels to remove:');
  logger.debug(formatStrArray(labelsToRemove));
  logger.debug("ffffffff")
  logger.debug(octokit)
  if (labelsToRemove.length > 0) {
    labelsToRemove.forEach(async name => {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number,
        name,
      });
    });
  }

  // Add labels
  const shouldAdd = ({ name, checked }: Label): boolean =>
    checked && !labelsOnIssue.includes(name);
  const labelsToAdd = labelsToProcess.filter(shouldAdd).map(getName);

  logger.debug('Labels to add:');
  logger.debug(formatStrArray(labelsToAdd));

  if (labelsToAdd.length > 0) {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number,
      labels: labelsToAdd,
    });
  }
}

async function main(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const labelPattern = core.getInput('label-pattern', { required: true });
    const quiet = core.getInput('quiet', { required: false });
    const offset = core.getInput('offset', { required: false });

    validateEnum('quiet', quiet, Quiet);
    const logger = new Logger(
      quiet === Quiet.TRUE ? LoggingLevel.SILENT : LoggingLevel.DEBUG,
    );

    const octokit = github.getOctokit(token);
    logger.debug("ffffffff")
    logger.debug(octokit)
    const { repo, owner } = github.context.repo;
    const { eventName } = github.context;

    switch (eventName) {
      case 'issues': {
        const { issue } = github.context.payload;
        if (issue === undefined) {
          return;
        }

        const { body, html_url, number: issue_number } = issue;
        if (body === undefined || html_url === undefined) {
          return;
        }

        await processIssue(
          octokit,
          repo,
          owner,
          issue_number,
          html_url,
          body,
          labelPattern,
          logger,
        );
        break;
      }

      case 'pull_request':
      case 'pull_request_target': {
        const { pull_request } = github.context.payload;
        if (pull_request === undefined) {
          return;
        }

        const { body, html_url, number: issue_number } = pull_request;
        if (body === undefined || html_url === undefined) {
          return;
        }

        await processIssue(
          octokit,
          repo,
          owner,
          issue_number,
          html_url,
          body,
          labelPattern,
          logger,
        );
        break;
      }

      case 'schedule': {
        const parsed = parseOffsetString(offset);
        const offsetDate = getOffsetDate(new Date(), ...parsed);

        // Iterate through all open issues and pull requests
        for await (const page of octokit.paginate.iterator(
          octokit.issues.listForRepo,
          { owner, repo, since: offsetDate.toISOString() },
        )) {
          for (const issue of page.data) {
            const {
              body,
              number,
              html_url,
            } = issue as octokitTypes.IssuesGetResponseData;

            await processIssue(
              octokit,
              repo,
              owner,
              number,
              html_url,
              body,
              labelPattern,
              logger,
            );
          }

          const rateLimitResp = await octokit.rateLimit.get();
          logger.debug(rateLimitResp.data);
        }
        break;
      }

      default: {
        return;
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main().catch(err => {
  throw err;
});
