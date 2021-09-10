export type Label = {
  name: string;
  checked: boolean;
};

export type IssueEvent = {
  // Copied from `IssuesListEventsResponseData`
  id: number;
  node_id: string;
  url: string;
  actor: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  event: string;
  commit_id: string;
  commit_url: string;
  created_at: string;
  // Add a new field
  label?: {
    name: string;
    color: string;
  };
};
