import { GeekNewsCrawlerService } from './geeknews.crawler.service';

describe('GeekNewsCrawlerService', () => {
  const originalFetch = global.fetch;
  let service: GeekNewsCrawlerService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new GeekNewsCrawlerService();
    fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('최신글 목록 페이지에서 토픽 요약을 파싱해야 함', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse(`
        <div class="topic_row" data-topic-state-id="28511">
          <div class="topictitle">
            <a href="https://example.com/article" id="tr1">
              <h1>테스트 제목</h1>
            </a>
          </div>
          <div class="topicdesc">
            <a href="topic?id=28511">테스트 요약 본문</a>
          </div>
          <div class="topicinfo">
            <span id="tp28511">13</span> points by <a href="/@winterjung">winterjung</a> 2시간전 |
            <a href="topic?id=28511&amp;go=comments" class="u">댓글 10개</a>
          </div>
        </div>
      `),
    );

    const topics = await service.crawlLatestPage(1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://news.hada.io/new?page=1');
    const headers = requestInit?.headers as Record<string, string> | undefined;
    expect(typeof headers?.['accept-language']).toBe('string');
    expect(typeof headers?.['user-agent']).toBe('string');
    expect(topics).toEqual([
      {
        topicId: 28511,
        topicUrl: 'https://news.hada.io/topic?id=28511',
        sourceUrl: 'https://example.com/article',
        title: '테스트 제목',
        summary: '테스트 요약 본문',
        author: 'winterjung',
        points: 13,
        commentCount: 10,
        rank: 1,
        listedAtText: '2시간전',
      },
    ]);
  });

  it('토픽 상세 페이지에서 JSON-LD 본문과 게시 시각을 파싱해야 함', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse(`
        <script type="application/ld+json">
          {
            "@type": "DiscussionForumPosting",
            "headline": "상세 제목",
            "text": "상세 본문",
            "datePublished": "2026-04-14T11:11:43+09:00"
          }
        </script>
      `),
    );

    const topic = await service.crawlTopicDetail({
      topicId: 28511,
      topicUrl: 'https://news.hada.io/topic?id=28511',
      sourceUrl: 'https://example.com/article',
      title: '목록 제목',
      summary: '목록 요약',
      author: 'winterjung',
      points: 13,
      commentCount: 10,
      rank: 1,
      listedAtText: '2시간전',
    });

    expect(topic.title).toBe('상세 제목');
    expect(topic.content).toBe('상세 본문');
    expect(topic.postedAt?.toISOString()).toBe('2026-04-14T02:11:43.000Z');
  });
});

function createMockResponse(html: string): Response {
  return {
    ok: true,
    text: jest.fn().mockResolvedValue(html),
  } as unknown as Response;
}
