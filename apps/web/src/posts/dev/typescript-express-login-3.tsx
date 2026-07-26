import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "안녕하세요. 오늘은 저번 포스팅에 이어서 TypeScript 환경에서의 Express-session의 cookie를 이용하여, 자동 로그인을 진행하는 파트를 포스팅 해보겠습니다.",
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
                    value: "작업환경",
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
                    value: "로그인 기억하기",
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
            value: "1. 작업환경",
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
            value: "VSCode 1.59",
          },
        ],
      ],
      [
        [
          {
            type: "text",
            value: "node",
          },
        ],
        [
          {
            type: "text",
            value: "v14.17.3",
          },
        ],
      ],
      [
        [
          {
            type: "text",
            value: "npm",
          },
        ],
        [
          {
            type: "text",
            value: "6.14.13",
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
            value: "2. 로그인 기억하기",
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
        value:
          " 작업 전 cookie의 Expires / Max-Age 먼저 알아 보고 가겠습니다. 각각 만료 / 최대 연령(수명주기) 라고 직역이 가능 할 듯 합니다. cookie가 사라지는 시점이죠. express-session에서는 cookie의 MaxAge를 따로 설정해주지 않으면 seesion 상태가 됩니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/b2XQfG/btrfcY9vTxo/AAAAAAAAAAAAAAAAAAAAAAt__v8BD7G9vjwbkQwMgUqwryxSTepqImvUHGGJlu92/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=XxVTjRqm7E4sybw2ArzPZJTsqOk%3D",
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
          " 세션이 사라지면 쿠키도 같이 사라지죠. 로그인 기억하기 기능을 만들 것이기 때문에 저희는 cookie에게 MaxAge 값을 주어서 세션이 사라져도 cookie는 남을 수 있도록 작업을 할 겁니다. ",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      'controller.post("/test", (req, res) => {\n  console.log("TEST CONSOLE");\n  const session = req.session;\n\n  // request body 안에 내용이 있을 때\n  if (req.body) {\n    // 이미 로그인 중이 아니라면,\n    if (!req.session.isLogined) {\n      // session에 필요한 정보를 저장\n      session.email = req.body.email;\n      session.nickName = req.body.nickName;\n      session.isLogined = true;\n      if (req.body.isRemember) {\n\n        console.log(req.body);\n\n        // 기억하길 원할 때 14일 간 cookie를 살려둠\n        const NANO_SEC_IN_A_DAY = 86400000;\n        session.cookie.maxAge = 14 * NANO_SEC_IN_A_DAY;\n\n      }\n      session.save(() => {\n        // session에 저장하고, 진행할 내용\n        res.send({ result: true });\n      });\n    } else {\n      res.send({ error: "Aleady Logined" });\n    }\n  }\n});',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          " 기존 소스와 같이 약간만 수정했습니다. 클라이언트 단에서 isRemember 값을 true로 보내 줬을 때, cookie의 MaxAge를 14일로 줍니다. ",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "cookie.maxAge 에 들어가는 숫자의 값은 최소 단위가 나노초 이기 때문에 하루를 먼저 나노초로 환산 한 후에 14를 곱해준 값을 추가로 넣어 줬습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bAlSLU/btrfhqqnn6E/AAAAAAAAAAAAAAAAAAAAAF1XSrfEf_lE2nGBJQGFmjLD9aHjTzd33HZdrlGilMHC/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=mk%2Bx5ONM3HIw1EoH0FmrNCxfpwg%3D",
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
          " 해당 부분은 현재 진행중인 토이 프로젝트의 로그인 일부분입니다. 로그인 상태 유지 체크 박스를 클릭시",
      },
    ],
  },
  {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "inlineCode",
            value: "{ email: 'ice@coke.com', nickName: 'blog', isRemember: true }",
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
        value: "isRemember에 true를 담아서 보냅니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/MJjmA/btrfiaN48p4/AAAAAAAAAAAAAAAAAAAAAJl2lMolDYauCe_rsdSj-87rdVjn2JpkGJEPpOcKTX_w/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ZhynpcHD9fOjpc7VHBS619l6%2BCk%3D",
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
          "작업을 9월 16일에 진행했으니, 9월 30일까지로 연장되 cookie의 Max-Age를 볼 수 있습니다. 이제 브라우저를 껐다가 켜도, 로그인 상태가 풀리지 않겠네요! ( 서버 재기동이 없다는 가정 )",
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          " 본 포스팅을 보고 어려움이 있으신 분들은 기존 포스팅부터 참고하시면서 따라오시길 바랍니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: "https://icecokel.tistory.com/16",
        title: null,
        children: [
          {
            type: "text",
            value: "https://icecokel.tistory.com/16",
          },
        ],
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevTypescriptExpressLogin3Post = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevTypescriptExpressLogin3Post;
