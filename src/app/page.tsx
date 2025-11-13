"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type ParsedResumeResponse = {
  name: string | null;
  headline: string | null;
  githubUrl: string | null;
  githubUsername: string | null;
  emails: string[];
  phones: string[];
  skills: string[];
  summary: string[];
  rawText: string;
};

type GithubRepo = {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  homepage: string | null;
  readmeExcerpt: string | null;
  updated_at: string;
};

type GithubAggregates = {
  repositoryCount: number;
  totalStars: number;
  totalForks: number;
  totalOpenIssues: number;
  reposWithLiveDemo: number;
  averageStars: number;
};

type GithubActivity = {
  id: string;
  type: string;
  repoName: string;
  description: string;
  url: string | null;
  created_at: string;
};

type GithubProfile = {
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
  topLanguages: Array<{ language: string; count: number }>;
  repos: GithubRepo[];
  aggregates: GithubAggregates;
  spotlight: GithubRepo | null;
  recentActivity: GithubActivity[];
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResume, setParsedResume] =
    useState<ParsedResumeResponse | null>(null);
  const [githubProfile, setGithubProfile] = useState<GithubProfile | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);

  const hasResults = useMemo(() => Boolean(parsedResume), [parsedResume]);
  const githubUsername = parsedResume?.githubUsername ?? null;
  const totalLanguageCount = useMemo(() => {
    if (!githubProfile) return 0;
    return githubProfile.topLanguages.reduce((sum, lang) => sum + lang.count, 0);
  }, [githubProfile]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Please upload a file under 5 MB.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setParsedResume(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message ?? "Unable to parse resume.");
      }

      const { data } = await response.json();
      setParsedResume(data);
      setGithubProfile(null);
      setGithubError(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while uploading the resume.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!githubUsername) {
      setGithubProfile(null);
      setGithubError(null);
      setGithubLoading(false);
      return;
    }

    let isCancelled = false;
    const fetchGithubInsights = async () => {
      setGithubLoading(true);
      setGithubError(null);

      try {
        const response = await fetch("/api/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: githubUsername, repoLimit: 5 }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data?.error ?? "Unable to fetch GitHub analytics.");
        }

        const { data } = await response.json();
        if (!isCancelled) {
          setGithubProfile(data);
        }
      } catch (githubFetchError) {
        if (!isCancelled) {
          setGithubProfile(null);
          setGithubError(
            githubFetchError instanceof Error
              ? githubFetchError.message
              : "Unable to load GitHub analytics right now.",
          );
        }
      } finally {
        if (!isCancelled) {
          setGithubLoading(false);
        }
      }
    };

    fetchGithubInsights();

    return () => {
      isCancelled = true;
    };
  }, [githubUsername]);

  return (
    <main className="flex min-h-screen w-full justify-center bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.25),_transparent_50%),_radial-gradient(circle_at_bottom,_rgba(14,116,144,0.2),_transparent_55%)] px-4 py-16 text-slate-100">
      <div className="w-full max-w-5xl space-y-10">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-indigo-500/10 backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs tracking-wide text-white/70">
                <span className="size-2 rounded-full bg-emerald-400" />
                AI-powered candidate intelligence
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Personalize hiring with resume + GitHub intelligence
          </h1>
                <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                  Upload a candidate resume to instantly surface key experience, contact
                  signals, and live GitHub analytics. Showcase flagship projects, recent
                  activity, and language depth in a single professional profile.
          </p>
        </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                  <span className="size-2 rounded-full bg-indigo-400" /> AI résumé parsing
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                  <span className="size-2 rounded-full bg-blue-400" /> GitHub analytics
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                  <span className="size-2 rounded-full bg-emerald-400" /> Activity timeline
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-white/70 shadow-xl shadow-slate-900/40">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Snapshot
              </p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center justify-between">
                  <span>Upload formats</span>
                  <span className="font-medium text-white">PDF · TXT</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>GitHub analytics</span>
                  <span className="font-medium text-white">Auto-detected</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Processing time</span>
                  <span className="font-medium text-white">Under 5s</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Recent activity</span>
                  <span className="font-medium text-white">Timeline view</span>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <label
            htmlFor="resume"
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/30 bg-white/5 px-8 py-14 text-center transition hover:border-indigo-300/40 hover:bg-indigo-500/10"
          >
            <div className="space-y-2">
              <p className="text-lg font-semibold text-white">
                Upload a resume to generate insights
              </p>
              <p className="text-xs text-white/50">
                PDF and plain text formats are supported. Maximum size 5 MB.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/40">
              Browse files
            </span>
            <input
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </label>

          {isLoading && (
            <p className="mt-6 text-center text-sm text-slate-600">
              Reading your resume. Hang tight...
            </p>
          )}

          {error && (
            <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Extracted Insights
            </h2>
            {hasResults && (
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60">
                Resume intelligence
              </span>
            )}
          </div>

          {!hasResults && (
            <p className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-white/60 shadow-lg shadow-black/20">
              Upload a resume to see the extracted details here.
            </p>
          )}

          {hasResults && parsedResume && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
                <h3 className="text-lg font-semibold text-white">
                  Resume Overview
                </h3>
                <dl className="mt-4 space-y-3 text-sm text-white/70">
                  <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                    <dt className="text-xs uppercase tracking-wider text-white/40">
                      Name
                    </dt>
                    <dd>{parsedResume.name ?? "Not detected"}</dd>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                    <dt className="text-xs uppercase tracking-wider text-white/40">
                      Headline
                    </dt>
                    <dd>{parsedResume.headline ?? "Not detected"}</dd>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                    <dt className="text-xs uppercase tracking-wider text-white/40">
                      GitHub
                    </dt>
                    <dd>
                      {parsedResume.githubUrl ? (
                        <a
                          href={parsedResume.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 underline"
                        >
                          {parsedResume.githubUrl}
                        </a>
                      ) : (
                        "Not found"
                      )}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                    <dt className="text-xs uppercase tracking-wider text-white/40">
                      Email
                    </dt>
                    <dd>
                      {parsedResume.emails.length
                        ? parsedResume.emails.join(", ")
                        : "Not detected"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                    <dt className="text-xs uppercase tracking-wider text-white/40">
                      Phone
                    </dt>
                    <dd>
                      {parsedResume.phones.length
                        ? parsedResume.phones.join(", ")
                        : "Not detected"}
                    </dd>
                  </div>
                </dl>
              </div>

              {!!parsedResume.summary.length && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
                  <h3 className="text-lg font-semibold text-white">
                    Highlights
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm text-white/70">
                    {parsedResume.summary.map((item, index) => (
                      <li
                        key={index}
                        className="rounded-xl border border-white/5 bg-white/5 px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!parsedResume.skills.length && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 md:col-span-2">
                  <h3 className="text-lg font-semibold text-white">
                    Skills Spotlight
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-white">
                    {parsedResume.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-white/10 px-3 py-1"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              GitHub Insights
            </h2>
            {hasResults && (
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60">
                {githubProfile?.repos.length ?? 0} curated
              </span>
            )}
          </div>

          {!githubUsername && (
            <p className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 text-center text-sm text-white/60 shadow-lg shadow-black/20">
              Add your GitHub profile to the resume to unlock profile analytics
              and project summaries.
            </p>
          )}

          {githubUsername && githubLoading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center shadow-lg shadow-black/20">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-indigo-300/30 bg-indigo-500/20 text-indigo-200">
                <svg
                  className="size-5 animate-spin"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 1.5a6.5 6.5 0 1 1-6.15 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="mt-4 text-sm text-white/60">
                Fetching GitHub analytics for {githubUsername}...
              </p>
            </div>
          )}

          {githubError && (
            <p className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {githubError}
            </p>
          )}

          {githubProfile && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Total Stars
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {githubProfile.aggregates.totalStars.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40">Across all repositories</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Forks
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {githubProfile.aggregates.totalForks.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40">Community engagement</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Avg Stars / Repo
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {githubProfile.aggregates.averageStars}
                  </p>
                  <p className="text-xs text-white/40">{githubProfile.aggregates.repositoryCount} repositories tracked</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Live Projects
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {githubProfile.aggregates.reposWithLiveDemo}
                  </p>
                  <p className="text-xs text-white/40">Repositories with live deployments</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={githubProfile.avatar_url}
                    alt={`${githubProfile.login} avatar`}
                    className="h-20 w-20 rounded-full border border-slate-200"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {githubProfile.name ?? githubProfile.login}
                        </h3>
                        <a
                          href={githubProfile.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-sky-600 underline"
                        >
                          @{githubProfile.login}
                        </a>
                      </div>
                      <dl className="flex flex-wrap gap-4 text-xs text-white/60">
                        <div>
                          <dt className="font-medium">Followers</dt>
                          <dd>{githubProfile.followers}</dd>
                        </div>
                        <div>
                          <dt className="font-medium">Following</dt>
                          <dd>{githubProfile.following}</dd>
                        </div>
                        <div>
                          <dt className="font-medium">Repos</dt>
                          <dd>{githubProfile.public_repos}</dd>
                        </div>
                        <div>
                          <dt className="font-medium">Gists</dt>
                          <dd>{githubProfile.public_gists}</dd>
                        </div>
                      </dl>
                    </div>
                    {githubProfile.bio && (
                      <p className="text-sm text-white/70">{githubProfile.bio}</p>
                    )}
                    <p className="text-xs text-white/50">
                      Joined GitHub on {new Date(githubProfile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {githubProfile.topLanguages.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
                  <h3 className="text-lg font-semibold text-white">
                    Top Languages
                  </h3>
                  <div className="mt-4 space-y-3">
                    {githubProfile.topLanguages.map((lang) => {
                      const percentage = totalLanguageCount
                        ? Math.round((lang.count / totalLanguageCount) * 100)
                        : 0;
                      return (
                        <div key={lang.language} className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-white/60">
                            <span>{lang.language}</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
                              style={{ width: `${Math.max(6, percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {githubProfile.repos.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      Highlighted Repositories
                    </h3>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60">
                      {githubProfile.repos.length} curated
                    </span>
                  </div>
                  {githubProfile.spotlight && (
                    <div className="mt-5 space-y-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5 text-white/80">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                            Spotlight
                          </p>
                          <a
                            href={githubProfile.spotlight.html_url}
            target="_blank"
                            rel="noreferrer"
                            className="text-lg font-semibold text-slate-50 underline"
                          >
                            {githubProfile.spotlight.name}
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-indigo-100/80">
                          {githubProfile.spotlight.language && (
                            <span className="rounded-full border border-indigo-300/30 bg-indigo-500/20 px-2 py-1">
                              {githubProfile.spotlight.language}
                            </span>
                          )}
                          <span>⭐ {githubProfile.spotlight.stargazers_count}</span>
                          <span>🍴 {githubProfile.spotlight.forks_count}</span>
                          <span>
                            Updated {new Date(githubProfile.spotlight.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {githubProfile.spotlight.description && (
                        <p className="text-sm text-indigo-100/80">
                          {githubProfile.spotlight.description}
                        </p>
                      )}
                      {githubProfile.spotlight.readmeExcerpt && (
                        <p className="whitespace-pre-wrap rounded-xl border border-indigo-300/20 bg-indigo-500/10 p-4 text-xs text-indigo-100/80">
                          {githubProfile.spotlight.readmeExcerpt}
                        </p>
                      )}
                    </div>
                  )}
                  <ul className="mt-4 space-y-4 text-sm text-white/80">
                    {githubProfile.repos.map((repo) => (
                      <li
                        key={repo.html_url}
                        className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-inner shadow-black/20"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-base font-semibold text-sky-300 underline"
                          >
                            {repo.name}
                          </a>
                          <div className="flex flex-wrap gap-3 text-xs text-white/50">
                            {repo.language && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                {repo.language}
                              </span>
                            )}
                            <span>⭐ {repo.stargazers_count}</span>
                            <span>🍴 {repo.forks_count}</span>
                            <span>
                              Updated {new Date(repo.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-sm text-white/70">{repo.description}</p>
                        )}
                        {repo.readmeExcerpt && (
                          <p className="whitespace-pre-wrap rounded-xl border border-white/5 bg-white/5 p-4 text-xs text-white/60">
                            {repo.readmeExcerpt}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-white/60">
                          {repo.topics.map((topic) => (
                            <span key={topic} className="rounded-full border border-white/10 bg-white/10 px-2 py-1">
                              #{topic}
                            </span>
                          ))}
                        </div>
                        {repo.homepage && (
                          <a
                            href={repo.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky-300 underline"
                          >
                            Live Demo
                            <svg
                              className="size-3"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3 9L9 3M9 3H4.5M9 3V7.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {githubProfile.recentActivity.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
                  <h3 className="text-lg font-semibold text-white">
                    Recent Activity
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm text-white/80">
                    {githubProfile.recentActivity.map((activity) => (
                      <li
                        key={activity.id}
                        className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                              {activity.type.replace(/([A-Z])/g, " $1").trim()}
                            </p>
                            <p className="text-sm text-white/80">
                              {activity.description}
                            </p>
                            <p className="text-xs text-white/50">{activity.repoName}</p>
                          </div>
                          <span className="text-xs text-white/40">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        {activity.url && (
                          <a
                            href={activity.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-sky-300 underline"
                          >
                            View on GitHub
                            <svg
                              className="size-3"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3 9L9 3M9 3H4.5M9 3V7.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
        </div>
      </main>
  );
}