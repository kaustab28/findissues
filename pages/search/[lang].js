import IssuesCard from "@/components/IssuesCard";
import SeoTags from "@/components/SeoTags";
import { SkeletonCard } from "@/components/SkeletonCard";
import { langs } from "@/helper/Languages";
import { priority_langs } from "@/helper/priority_langs";
import { tags } from "@/helper/tags";
import styles from "@/styles/LandingMain.module.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { BsArrowRight } from "react-icons/bs";
import error_404 from "../../public/404.svg";

export default function Search({ allIssues, lang }) {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <div
        className={`${styles.landing_main} p-3 md:p-8 issues_result overflow-auto w-[100%] md:w-[54%] landing_main h-full flex flex-col items-start justify-start`}
      >
        <p className="w-[250px] mb-4 font-semibold text-[16px] lg:text-[18px] text-main_primary">
          <span className="inline-block italic">All Unassigned Issues</span> 👇
        </p>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.landing_main} p-3 md:p-8 issues_result overflow-auto w-[100%] md:w-[54%] landing_main h-full flex flex-col items-start justify-start`}
      >
        {allIssues.length ? (
          <>
            <SeoTags
              seoTitle={`FindIssues | Find Most Recent and Unassigned ${lang} Issues!`}
              seoDescription={`FindIssues lets you find most recently created issues on GitHub that are not assigned to anyone according to ${lang} programming language`}
              seoUrl={`https://www.findissues.me/search/${lang}`}
            />
            <p className="w-[250px] mb-4 font-semibold text-[16px] lg:text-[18px] text-main_primary">
              <span className="inline-block italic">All Unassigned Issues</span>{" "}
              👇
            </p>
            {allIssues?.map((issue) => {
              return <IssuesCard key={issue.issueId} issue={issue} />;
            })}
          </>
        ) : (
          <>
            <SeoTags
              seoTitle={`FindIssues - Page Not Found`}
              seoDescription={`Page Not Found`}
              seoUrl={`https://www.findissues.me`}
            />
            <div className="w-fit mx-auto">
              <p className="w-full mb-4 font-semibold text-[16px] lg:text-4xl text-main_primary text-center">
                Page Not Found
              </p>
              <Image
                src={error_404}
                alt="error 404"
                className="w-3/5 mx-auto mt-8"
              />
              <Link
                href={"/"}
                className="w-fit bg-transparent hover:bg-white rounded-full italic text-main_primary px-4 py-1 font-semibold flex items-center gap-2 text-sm mx-auto mt-8 border-y-4 "
              >
                Back to Home <BsArrowRight />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

async function loadRepo(issueItems) {
  var repoObj = {};
  for (const issue of issueItems) {
    const repores = await fetch(issue.repository_url, {
      headers: {
        Authorization: "token " + process.env.NEXT_PUBLIC_TOKEN_SECOND,
        Accept: "application/vnd.github.v3+json",
      },
    });
    const repojson = await repores.json();

    repoObj[issue.id] = {
      full_name: repojson.full_name,
      stargazers_count: repojson.stargazers_count,
      forks_count: repojson.forks_count,
    };
  }

  return repoObj;
}

async function loadIssues(url, query_lang) {
  const issues_res = await fetch(url, {
    headers: {
      Authorization: "token " + process.env.NEXT_PUBLIC_TOKEN_FIRST,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const issues_json = await issues_res.json();
  const issueItems = issues_json.items;

  var allIssues = [];

  var repo_res = await loadRepo(issueItems);
  var mask = "";
  if (url.includes("label")) {
    mask = "tag";
  } else {
    mask = "language";
  }
  issueItems.forEach((issue) => {
    var lang = query_lang;

    var issueObj = {
      issueId: issue.id,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      issueTitle: issue.title,
      repoTitle: repo_res[issue.id].full_name,
      createdAt: issue.created_at,
      repo_forks: repo_res[issue.id].forks_count,
      repo_stars: repo_res[issue.id].stargazers_count,
      [mask]: query_lang,
    };

    allIssues.push(issueObj);
  });

  // setIssues(allIssues);
  return allIssues;
}
export async function getStaticPaths() {
  const paths = priority_langs.map((lang) => ({
    params: { lang: lang.query },
  }));

  return { paths, fallback: true };
}

export async function getStaticProps({ params }) {
  let url = "";
  tags.forEach((tag) => {
    if (tag.query.includes(params.lang)) {
      url = `https://api.github.com/search/issues?q=label:${params.lang}+is:issue+is:open+no:assignee+created:>=2023-05-20&sort:created`;
      return;
    }
  });

  if (url.length == 0) {
    langs.forEach((lang) => {
      if (lang.query.includes(params.lang)) {
        url = `https://api.github.com/search/issues?q=language:${params.lang}+is:issue+is:open+no:assignee+created:>=2023-05-20&sort:created`;
        return;
      }
    });
  }

  let lang_issues = "";

  if (url.length > 0) {
    lang_issues = await loadIssues(url, params.lang);
  }

  return {
    props: {
      allIssues: lang_issues,
      lang: params.lang,
    },
    revalidate: 600,
  };
}
