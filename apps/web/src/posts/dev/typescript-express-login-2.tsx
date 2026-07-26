import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "안녕하세요. 오늘은 저번 포스팅에 이어서 TypeScript 환경에서의 Express-session 로그인 처리 포스팅을 진행하겠습니다.",
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
                    value: "express-session, SessionData 수정",
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
                    value: "로그인처리",
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
            value: "2. express-session, SessionData 수정",
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
          "대부분의 이 포스팅을 찾아오신 분들이 막혀서 진행 못했던 부분이라고 판단되는 부분입니다. 저도 이걸로 고생을 많이 했었습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bK8GTC/btrd9lkpRok/AAAAAAAAAAAAAAAAAAAAAK0QrHe6ExQ0FdJB34jzGV285UGzkSSs7Q9W6m5UDoTD/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=7ftaCqY9fQQwEvIEaqyaO5pxLSM%3D",
        alt: "",
        title: null,
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: "import",
      },
      {
        type: "text",
        value:
          ' 한 부분에서 "express-session" 부분에서 마우스 커서를 올리고 [F12]를 눌러 express-session 자체를 봅니다.',
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "    interface SessionData {\n        cookie: Cookie;\n    }",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "중간에 (저는 213번째 줄에 있었습니다.)보면 SessionData 인터페이스를 정의한느 부분이있습니다. 여기에 필요한 정보를 추가 해주지 않으면 TypeScript에서는 Data를 추가할 수가 없습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "필요한 정보들을 추가해줍니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      "    interface SessionData {\n        cookie: Cookie;\n        email: string;\n        isLogined: boolean;\n        nickName: string;\n    }",
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
            value: "3. 로그인 처리",
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
          "본격적으로 간단한 로그인 처리를 진행하겠습니다. 먼저 그전에 http method가 GET 이있던, 부분을 POST로 바꿔서 진행하도록 하겠습니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      '// 기존 소스\n// controller.get("/test", (req, res) => {\n//   console.log("TEST CONSOLE");\n//   console.log(req.session);\n// });\n\n// 수정된 소스\ncontroller.post("/test", (req, res) => {\n  console.log("TEST CONSOLE");\n  const session = req.session;\n\n  res.send(`ya : ${req.body.ho}`);\n});',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Postman을 이용하여 정상적으로 post 요청이 들어오는지 확인해 봅시다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bgj8nq/btrehjZ15zJ/AAAAAAAAAAAAAAAAAAAAAN_iOIffeLP1triooYc3-PDWqlwuG974392wToKlBmtD/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=miPCYVigpqe8JoLp7V4gC5mekDg%3D",
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
        value: "ya에서 ho로 감싼 데이터가 정상적으로 보입니다. ",
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
            type: "strong",
            children: [
              {
                type: "text",
                value: "user/test 인 이유는 user로 라우터 처리한 파일에서 작업했기 때문입니다.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      'controller.post("/test", (req, res) => {\n  console.log("TEST CONSOLE");\n  const session = req.session;\n  // request body 안에 내용이 있을 때\n  if (req.body) {\n    // 이미 로그인 중이 아니라면,\n    if (!req.session.isLogined) {\n      // session에 필요한 정보를 저장\n      session.email = req.body.email;\n      session.nickName = req.body.nickName;\n      session.isLogined = true;\n      session.save(() => {\n        // session에 저장하고, 진행할 내용\n        res.send({ result: true });\n      });\n    } else {\n      res.send({ error: "Aleady Logined" });\n    }\n  }\n});',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "코딩을 확인하고, 내용을 확인해 봅시다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bdq6o0/btrea169WZe/AAAAAAAAAAAAAAAAAAAAAIzHSDnuMyWw4esyCeVgTWPIKwymyTaTKbbn5NcofzZ-/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=W8XfRF%2Bgr9uE2FE%2Fi8ZRVAVAm%2F8%3D",
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
        value: "정상적으로 로그인 처리가 되었습니다. 다시 시도 해봅니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bEJuyX/btree4I2eA0/AAAAAAAAAAAAAAAAAAAAAE_7ibmQu6qoDhenILNUrdSvmf2KSszwu-ASCMk4bON5/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=15%2FhAhwL4mBThso7TQ0DmKjfjrU%3D",
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
        value: "이미 로그인 중이라고 뜹니다. ",
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
          "이로써 간단한 로그인 처리는 끝났습니다. 다음 포스팅에서는 쿠키에 저장되는 부분과, 일정기간동안 로그인 정보를 기억하는 방법을 다뤄 볼까합니다. 감사합니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevTypescriptExpressLogin2Post = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevTypescriptExpressLogin2Post;
