import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "안녕하세요. 오늘은 BE에서 REST API 만들때, 또는 FE에서 만들어진 REST API 사용 시 유용하게 쓸 수 있는 툴인 POSTMAN 에 대해서 포스팅 해보겠습니다.",
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "list",
    ordered: true,
    start: 1,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "사용환경",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "POSTMAN 설치",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "POSTMAN 사용 예시",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "1. 사용환경",
          },
        ],
      },
    ],
  },
  {
    type: "table",
    align: [null, null],
    rows: [
      [
        [
          {
            type: "text",
            value: "운영체제",
          },
        ],
        [
          {
            type: "text",
            value: "Windows 10 Pro",
          },
        ],
      ],
      [
        [
          {
            type: "text",
            value: "사용 툴",
          },
        ],
        [
          {
            type: "text",
            value: "POSTMAN v8.12.1",
          },
        ],
      ],
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "2. POSTMAN 설치",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: " POSTMAN 설치 주소입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: "https://www.postman.com/downloads/",
        title: null,
        children: [
          {
            type: "text",
            value: "https://www.postman.com/downloads/",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: " [Download Postman | Try Postman for Free",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Try Postman for free! Join 17 million developers who rely on Postman, the collaboration platform for API development. Create better APIs—faster.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "www.postman.com](https://www.postman.com/downloads/)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "본인 OS 환경에 맞게 설치 하시면 됩니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bC7K5D/btrepv6E4pL/AAAAAAAAAAAAAAAAAAAAAOCqPpyuxoNxmjOuq3WShXRHx676u3Lvo84vb9apXFVu/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=IFMF4%2BP9%2FW6t430t5fEftHtwv2A%3D",
        alt: "",
        title: null,
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "우측 상단의 [Sign In] 버튼을 눌러 로그인을 진행합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/cS5hNu/btrelRvRs1W/AAAAAAAAAAAAAAAAAAAAAPr7K4lxg_9UXW2GobrOnJQa5smj6sfz8K1yJjdi2U3c/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=tT23SNJobUsM%2BUZviZYfKE5hebU%3D",
        alt: "",
        title: null,
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "가입을 하시거나, google 소셜 로그인을 진행해주세요, 로그인을 안해도 사용이 가능하나 로그인을 하면 나중에 했던 작업을 확인 할 수 있어서 좋습니다. ",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "로그인까지 마치면 설치 작업은 끝이라고 할 수 있겠습니다.",
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "3. POSTMAN 사용 예시",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: " 상단 탭에서 [Workspaces] 클릭하고 [My Workspace]를 눌러 이동합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bfyU7J/btreiQRMpGx/AAAAAAAAAAAAAAAAAAAAAD0zUcC2ibBmX-IKn_-xBhrv02FZ0I1a2TaPzrcUU-ta/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=aNbyrrLVk9TSmLiIQIOGUGli7Lg%3D",
        alt: "",
        title: null,
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이동된 페이지에서 [+]를 눌러 새로운 작업을 엽니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bQc1gs/btreoFIydXG/AAAAAAAAAAAAAAAAAAAAAGff9o-A7B7Up-syClK5AfJnL30PP4iTvx-UL8eiO4id/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=HMkf9ePIA12Aek%2FOwxr2qN3SH60%3D",
        alt: "",
        title: null,
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "테스트를 위한 코드 입니다. 참고 하실 분들은 참고하세요!",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      'app.get("/getApi", (req, res) => {\n  console.log(req.path);\n  console.log(req.query);\n  const result = JSON.stringify({ path: req.path, query: req.query });\n  res.send(`GET :::` + result);\n});\n\napp.post("/postApi", (req, res) => {\n  console.log(req.path);\n  console.log(req.body);\n\n  res.send("POST :" + JSON.stringify(req.body));\n});',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "getApi를 호출해 보겠습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/sHUN2/btrejVk2Mho/AAAAAAAAAAAAAAAAAAAAADQ3hxnwWAjluoUCvWtKHc09vBpDJ9xoIcXtddrwDM5T/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=2IApb4Yx4K4GFK1kom590S4PkR0%3D",
        alt: "",
        title: null,
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "쿼리 스트링 굉장히 간편이 만들 수 있습니다. 이 부분도 엄청 편해진 부분이지만, POSTMAN의 꽃은 GET을 뺀 나머지 라고 생각합니다. POST 예시 보겠습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/mvmwU/btrehB1Vh56/AAAAAAAAAAAAAAAAAAAAANq40u1JssAy6llseM9IW41Giv0J1H5FF6owzW92lB1c/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=PNmDDFA8FvGIbf9cQfCG7IO8dNw%3D",
        alt: "",
        title: null,
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "JSON 데이터 만들어서 보내는게 생각 보다 많이 귀찮은데요, 페이지를 만들거나 그게 아니면 최소한 javascript라도 짜놔야 할 수 있죠. 하지만 POSTMAN을 이용하면 이렇게 편합니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevPostmanApiTestPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevPostmanApiTestPost;
