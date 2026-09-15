import { createTranslator } from "next-intl";
import {
  PostBlockquote,
  PostHeading1,
  PostHeading2,
  PostLink,
  PostParagraph,
  PostTable,
  PostTableBody,
  PostTableCell,
  PostTableHead,
  PostTableHeader,
  PostTableRow,
} from "@/components/blog/blog-post-elements";
import { PostgreSqlClickHouseBenchmark } from "@/components/blog/postgresql-clickhouse-benchmark";
import {
  benchmarkDatabaseNames,
  benchmarkMeasurements,
  benchmarkQueries,
} from "@/components/blog/postgresql-clickhouse-benchmark-data";
import messages from "../../../messages/posts/postgresql-clickhouse.ko.json";

// 기존 블로그처럼 원문 언어는 한국어로 유지하고, 조작 UI만 방문자의 locale을 따른다.
const t = createTranslator({ locale: "ko-KR", messages });
const clickhouseReference = "https://clickhouse.com/docs/get-started/about/intro";
const postgresReference = "https://www.postgresql.org/docs/current/indexes-intro.html";

const PostgreSqlClickHouseComparisonPost = () => (
  <>
    <PostHeading1>{t("intro.heading")}</PostHeading1>
    <PostParagraph>{t("intro.first")}</PostParagraph>
    <PostParagraph>{t("intro.second")}</PostParagraph>
    <PostBlockquote>
      <PostParagraph>
        <strong>{t("intro.question")}</strong>
      </PostParagraph>
    </PostBlockquote>
    <PostParagraph>{t("intro.third")}</PostParagraph>

    <PostHeading1>{t("storage.heading")}</PostHeading1>
    <PostParagraph>{t("storage.first")}</PostParagraph>
    <PostBlockquote>
      <PostParagraph>
        <strong>{t("storage.question")}</strong>
      </PostParagraph>
    </PostBlockquote>
    <PostParagraph>{t("storage.second")}</PostParagraph>

    <PostHeading1>{t("discovery.heading")}</PostHeading1>
    <PostParagraph>{t("discovery.first")}</PostParagraph>
    <PostParagraph>{t("discovery.second")}</PostParagraph>

    <PostHeading1>{t("expectation.heading")}</PostHeading1>
    <PostParagraph>{t("expectation.first")}</PostParagraph>
    <PostBlockquote>
      <PostParagraph>
        <strong>{t("expectation.quote")}</strong>
      </PostParagraph>
    </PostBlockquote>
    <PostParagraph>{t("expectation.second")}</PostParagraph>

    <PostHeading1>{t("method.heading")}</PostHeading1>
    <PostParagraph>{t("method.intro")}</PostParagraph>
    <dl className="my-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {(["range", "repeats", "execution", "validation"] as const).map(key => (
        <div key={key} className="rounded-xl border border-border bg-muted/20 p-4">
          <dt className="mb-1 text-xs text-muted-foreground">{t(`method.${key}Label`)}</dt>
          <dd className="text-sm leading-6 font-medium" data-blog-speech-segment>
            {t(`method.${key}Value`)}
          </dd>
        </div>
      ))}
    </dl>
    <PostParagraph>{t("method.rangeDetail")}</PostParagraph>
    <aside className="my-7 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <p className="mb-2 font-semibold" data-blog-speech-segment>
        {t("method.important")}
      </p>
      <p className="text-sm leading-7 text-foreground/80" data-blog-speech-segment>
        {t("method.importantDetail")}
      </p>
    </aside>

    <PostHeading1>{t("results.heading")}</PostHeading1>
    <PostHeading2>{t("results.filterTitle")}</PostHeading2>
    <PostParagraph>{t("results.filter")}</PostParagraph>
    <PostHeading2>{t("results.groupTitle")}</PostHeading2>
    <PostParagraph>{t("results.group")}</PostParagraph>
    <PostParagraph>{t("results.groupLarge")}</PostParagraph>
    <PostHeading2>{t("results.joinTitle")}</PostHeading2>
    <PostParagraph>{t("results.join")}</PostParagraph>
    <PostBlockquote>
      <PostParagraph>
        <strong>{t("results.takeaway")}</strong>
      </PostParagraph>
    </PostBlockquote>
    <PostParagraph>{t("results.takeawayDetail")}</PostParagraph>

    <PostHeading1>{t("explorer.heading")}</PostHeading1>
    <PostParagraph>{t("explorer.intro")}</PostParagraph>
    <PostgreSqlClickHouseBenchmark />

    <PostHeading1>{t("records.heading")}</PostHeading1>
    <PostParagraph>{t("records.intro")}</PostParagraph>
    <details
      className="my-7 rounded-xl border border-border bg-muted/10 p-4 sm:p-5"
      data-testid="benchmark-records"
    >
      <summary className="cursor-pointer rounded-md text-sm leading-6 font-semibold focus-visible:outline-2 focus-visible:outline-ring">
        {t("records.summary")}
      </summary>
      {benchmarkQueries.map(query => (
        <PostTable key={query} data-testid={`benchmark-table-${query}`}>
          <caption className="border-b border-border bg-muted/40 px-4 py-3 text-left text-sm font-medium">
            {t("records.caption", { query: t(`records.${query}`) })}
          </caption>
          <PostTableHead>
            <PostTableRow>
              <PostTableHeader scope="col" className="whitespace-nowrap">
                {t("records.range")}
              </PostTableHeader>
              <PostTableHeader scope="col" className="text-right">
                {benchmarkDatabaseNames.postgres}
              </PostTableHeader>
              <PostTableHeader scope="col" className="text-right">
                {benchmarkDatabaseNames.clickhouse}
              </PostTableHeader>
              <PostTableHeader scope="col" className="whitespace-nowrap">
                {t("records.verdict")}
              </PostTableHeader>
            </PostTableRow>
          </PostTableHead>
          <PostTableBody>
            {benchmarkMeasurements[query].map(row => (
              <PostTableRow key={row.rows}>
                <PostTableHeader scope="row" className="font-mono font-normal tabular-nums">
                  {row.rows.toLocaleString("ko-KR")}
                </PostTableHeader>
                <PostTableCell className="text-right font-mono tabular-nums">
                  {row.postgres.toFixed(3)}
                </PostTableCell>
                <PostTableCell className="text-right font-mono tabular-nums">
                  {row.clickhouse.toFixed(3)}
                </PostTableCell>
                <PostTableCell className="whitespace-nowrap">
                  {row.verdict === "pending"
                    ? t("records.pending")
                    : benchmarkDatabaseNames[row.verdict]}
                </PostTableCell>
              </PostTableRow>
            ))}
          </PostTableBody>
        </PostTable>
      ))}
    </details>
    <p className="text-xs leading-6 text-muted-foreground">{t("records.source")}</p>

    <PostHeading1>{t("limits.heading")}</PostHeading1>
    <PostParagraph>{t("limits.intro")}</PostParagraph>
    <PostParagraph>{t("limits.environment")}</PostParagraph>
    <PostParagraph>{t("limits.statistics")}</PostParagraph>
    <PostParagraph>{t("limits.scope")}</PostParagraph>
    <PostParagraph>
      {t("limits.theory")} <PostLink href={clickhouseReference}>[1]</PostLink>{" "}
      <PostLink href={postgresReference}>[2]</PostLink>
    </PostParagraph>

    <PostHeading1>{t("decision.heading")}</PostHeading1>
    <PostParagraph>{t("decision.intro")}</PostParagraph>
    <PostHeading2>{t("decision.workloadTitle")}</PostHeading2>
    <PostParagraph>{t("decision.workload")}</PostParagraph>
    <PostParagraph>{t("decision.workloadCaveat")}</PostParagraph>
    <PostHeading2>{t("decision.teamTitle")}</PostHeading2>
    <PostParagraph>{t("decision.team")}</PostParagraph>
    <PostParagraph>{t("decision.teamDetail")}</PostParagraph>
    <PostBlockquote>
      <PostParagraph>
        <strong>{t("decision.quote")}</strong>
      </PostParagraph>
    </PostBlockquote>
    <PostParagraph>{t("decision.completion")}</PostParagraph>

    <PostHeading1>{t("ai.heading")}</PostHeading1>
    <PostParagraph>{t("ai.first")}</PostParagraph>
    <PostParagraph>{t("ai.second")}</PostParagraph>
    <PostBlockquote>
      <PostParagraph>
        <strong>{t("ai.quote")}</strong>
      </PostParagraph>
    </PostBlockquote>

    <PostHeading1>{t("outro.heading")}</PostHeading1>
    <PostParagraph>{t("outro.first")}</PostParagraph>
    <PostParagraph>{t("outro.last")}</PostParagraph>

    <PostHeading1>{t("references.heading")}</PostHeading1>
    <PostParagraph>{t("references.intro")}</PostParagraph>
    <div className="space-y-2 text-sm leading-6">
      <p>
        <PostLink href={clickhouseReference}>[1] {t("references.clickhouse")}</PostLink>
      </p>
      <p>
        <PostLink href={postgresReference}>[2] {t("references.postgres")}</PostLink>
      </p>
    </div>
  </>
);

export default PostgreSqlClickHouseComparisonPost;
