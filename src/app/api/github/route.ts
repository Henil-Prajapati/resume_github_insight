import { NextResponse } from "next/server";

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_REPO_LIMIT = 6;
const MAX_ACTIVITY_ITEMS = 8;

async function fetchGithubJson<T>(endpoint: string) {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-resume-helper",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body?.message === "string"
        ? body.message
        : `GitHub request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function fetchReadmeExcerpt(
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.raw",
          "User-Agent": "ai-resume-helper",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    return text.slice(0, 500);
  } catch (error) {
    console.error("Failed to load README", error);
    return null;
  }
}

type GithubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string; url: string };
  payload: Record<string, unknown>;
};

function mapEventToSummary(event: GithubEvent) {
  const base = {
    id: event.id,
    type: event.type,
    repoName: event.repo?.name ?? "",
    created_at: event.created_at,
    description: "",
    url: null as string | null,
  };

  switch (event.type) {
    case "PushEvent": {
      const payload = event.payload as {
        commits?: Array<{ message?: string | null }>;
      };
      const commits = payload.commits ?? [];
      const messages = commits
        .map((commit) => commit?.message)
        .filter(Boolean)
        .slice(0, 2);
      return {
        ...base,
        description:
          messages.length > 0
            ? `Pushed ${messages.length} commit${messages.length > 1 ? "s" : ""}: ${messages.join(" · ")}`
            : "Pushed new commits",
      };
    }
    case "PullRequestEvent": {
      const payload = event.payload as {
        action?: string;
        pull_request?: { title?: string; html_url?: string } | null;
      };
      const action = payload.action ?? "updated";
      const pr = payload.pull_request;
      return {
        ...base,
        description: `${action.replace(/_/g, " ")} pull request ${pr?.title ?? ""}`.trim(),
        url: pr?.html_url ?? null,
      };
    }
    case "IssuesEvent": {
      const payload = event.payload as {
        action?: string;
        issue?: { title?: string; html_url?: string } | null;
      };
      const issueAction = payload.action ?? "updated";
      const issue = payload.issue;
      return {
        ...base,
        description: `${issueAction.replace(/_/g, " ")} issue ${issue?.title ?? ""}`.trim(),
        url: issue?.html_url ?? null,
      };
    }
    case "CreateEvent": {
      const payload = event.payload as { ref_type?: string; ref?: string | null };
      const refType = payload.ref_type ?? "repository";
      const ref = payload.ref;
      return {
        ...base,
        description: `Created ${refType}${ref ? ` ${ref}` : ""}`,
        url: null,
      };
    }
    case "ReleaseEvent": {
      const payload = event.payload as {
        release?: { name?: string; html_url?: string } | null;
      };
      const release = payload.release;
      return {
        ...base,
        description: `Published release ${release?.name ?? ""}`.trim(),
        url: release?.html_url ?? null,
      };
    }
    default:
      return {
        ...base,
        description: event.type.replace(/([A-Z])/g, " $1").trim(),
      };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body.username !== "string") {
      return NextResponse.json(
        { error: "A GitHub username is required." },
        { status: 400 },
      );
    }

    const username = body.username.trim();
    const repoLimit =
      typeof body.repoLimit === "number" && body.repoLimit > 0
        ? Math.min(body.repoLimit, 10)
        : DEFAULT_REPO_LIMIT;

    if (!username) {
      return NextResponse.json(
        { error: "GitHub username cannot be empty." },
        { status: 400 },
      );
    }

    const profile = await fetchGithubJson<{
      login: string;
      name: string | null;
      avatar_url: string;
      html_url: string;
      bio: string | null;
      followers: number;
      following: number;
      public_repos: number;
      public_gists: number;
      created_at: string;
    }>(`/users/${username}`);

    const repos = await fetchGithubJson<
      Array<{
        name: string;
        html_url: string;
        description: string | null;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        language: string | null;
        topics?: string[];
        homepage: string | null;
        updated_at: string;
      }>
    >(`/users/${username}/repos?per_page=100&sort=updated`);

    const sortedRepos = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, repoLimit);

    const reposWithReadme = await Promise.all(
      sortedRepos.map(async (repo) => {
        const readmeExcerpt = await fetchReadmeExcerpt(username, repo.name);
        return {
          ...repo,
          topics: repo.topics ?? [],
          readmeExcerpt,
        };
      }),
    );

    const languageCounts = repos.reduce<Record<string, number>>((acc, repo) => {
      if (repo.language) {
        acc[repo.language] = (acc[repo.language] ?? 0) + 1;
      }
      return acc;
    }, {});

    const topLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const aggregates = repos.reduce(
      (acc, repo) => {
        acc.totalStars += repo.stargazers_count;
        acc.totalForks += repo.forks_count;
        acc.totalOpenIssues += repo.open_issues_count;
        if (repo.homepage) acc.reposWithLiveDemo += 1;
        return acc;
      },
      {
        totalStars: 0,
        totalForks: 0,
        totalOpenIssues: 0,
        reposWithLiveDemo: 0,
      },
    );

    const spotlight = reposWithReadme[0] ?? null;

    const events = await fetchGithubJson<GithubEvent[]>(
      `/users/${username}/events/public`,
    );

    const recentActivity = events
      .map((event) => mapEventToSummary(event))
      .filter((item) => item.repoName)
      .slice(0, MAX_ACTIVITY_ITEMS);

    return NextResponse.json({
      data: {
        ...profile,
        topLanguages,
        repos: reposWithReadme,
        aggregates: {
          ...aggregates,
          repositoryCount: repos.length,
          averageStars:
            repos.length > 0
              ? parseFloat((aggregates.totalStars / repos.length).toFixed(1))
              : 0,
        },
        spotlight,
        recentActivity,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch GitHub analytics right now.",
      },
      { status: 500 },
    );
  }
}
