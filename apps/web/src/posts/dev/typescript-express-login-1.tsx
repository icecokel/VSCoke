import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "안녕하세요. 오늘은 페이지마다 로그인 유무를 확인하고, 로그인 정보를 기억하는 등 활용성이 좋은 Express-session을 이용한 방법을 포스팅하겠습니다.",
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
                    value: "작업 환경",
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
                    value: "개념",
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
                    value: "설치 및 세팅",
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
            value: "2. 개념",
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
        value: "Java로 Sping 공부하신 분들은, ",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: 'request.getSession().setAttribute("user", user);',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "대략 이런 식으로 session에 로그인된 user 정보를 저장해 두신다는 걸 알 겁니다. 왜 이렇게 해야 할까요? 브라우저에도 Session Storage가 있던데 그걸 이용하면 안 되는 걸까요? Session Storage에 저장해두면, 세션 종료될 때 소멸되니까 관리도 편할 텐데요..  ",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "정답은 안됩니다. 불가하다고 생각하시는 게 나을듯합나다. 앞서 인사말에서 말했듯, 페이지에서 로그인 유무를 확인해야 하거나, 또는 로그인 정보에 따른 권한 처리를 해주고 싶을 때 만약 브라우저의 Session Storage에 저장한다면 매우 위험한 결과를 보실 수 있습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bHPWHZ/btree5gKEiR/AAAAAAAAAAAAAAAAAAAAACWczgxga2CVXsNfH8jVaUdPgc6BmHN7m1FfpvEYOrJV/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=uRAFRZbFF9HCT4G6oMd8GknMPi0%3D",
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
          "Session Storage가 있습니다. 여기에는 개발자 툴을 켤 수만 있는 사람이라면, 바로 Session을 추가하고, 수정할 수 있습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/dgqWIT/btreh1LsL2C/AAAAAAAAAAAAAAAAAAAAADWlBlYgQzEzsiSwSC4W_pmggwCMIVIt5PpNcB3zb9--/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=5WQ%2FAtDCWr0qxMa7r8iEmy8lGtQ%3D",
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
        value: "그냥 따닥 더블클릭하고 생성하 기만하면 됩니다. 이걸 다시 더블클릭하면?",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/MIhMU/btreaRwdiym/AAAAAAAAAAAAAAAAAAAAAETbrj7nP98lsZ_9Cftfdr-PVTJrbxHZWdxvSDJmrwDr/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=A7Sll1JM%2FgMlq4O1c4kGjNvOcX8%3D",
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
          "정말 쉽게 수정이 가능합니다. 그렇기에 브라우저 Application에 직접 중요 정보를 저장하는 것은 매우 위험한 일이 될 수 있습니다. 그렇기에 로그인 정보같이 중요한 정보는 브라우저가 아닌, 서버 쪽에 저장하는 것이 중요합니다.",
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
            value: "3. 설치 및 세팅",
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
        value: " 우선 express의 미들웨어 중 하나인 express-session을 설치하도록 하겠습니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      "npm install express-session\n// express-session 설치\nnpm i --save-dev @types/express-session\n// typeScript가 이해 할 수 있도록 설치",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "제가 설치 명령어를 install로 사용할 때도 있고 i로 사용할 때도 있습니다. 무관하니 편한 거 사용하시면 됩니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: "https://www.npmjs.com/package/express-session",
        title: null,
        children: [
          {
            type: "text",
            value: "https://www.npmjs.com/package/express-session",
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
        value: " [express-session",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Simple session middleware for Express",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "www.npmjs.com](https://www.npmjs.com/package/express-session)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "설치 전에는 request에서 session을 봐도 값을 볼 수가 없습니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      'controller.get("/test", (req, res) => {\n  console.log("TEST CONSOLE");\n  console.log(req.session);\n});',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/c9R2Hx/btred0GptRd/AAAAAAAAAAAAAAAAAAAAAJZu_pArE5KV6JzdnQzzkvNhnj18yVL6DmJrHDT7D7_5/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=5XmbetZdGxMBz25YOhkCnlFlvX8%3D",
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
        value: "이제 설치가 완료되었으면 사용해서 콘솔이 잘 나오도록 세팅합시다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      'import { Router } from "express";\nimport session from "express-session";\n// "express-session"에 빨간 밑줄이 생기신 분들은, @Type이 잘 설치 되었는지 확인 바랍니다.\nimport ServerConfig from "server/serverConfig";\n// 중요한 정보들은 따로 파일로 관리하는것이 안전합니다.\n\n\nconst controller = Router();\n// 저는 라우터를 사용해서 따로 뺐지만,\n// const app = express(); 에다가 작업하셔도됩니다.\n\n\ncontroller.use(session(ServerConfig.expressSession.option));\n// express 에다가 미들웨어를 올려줍니다\n\n\n/* session(ServerConfig.expressSession.option 내용입니다\n\n  expressSession: {\n    option: {\n      secret: "비밀키",\n      resave: false,\n      saveUninitialized: true,\n    },\n  },\n\n*/\n/* 이런식으로 사용하셔도됩니다.\n\n      controller.use(session({\n        secret: "비밀키",\n        resave: false,\n        saveUninitialized: true,\n      }));\n\n\n\n*/',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "비밀키라고 적어둔 부분으로 암복호화가 진행되는 듯합니다. 정보가 유출되지 않도록 따로 파일로 보관하여 만들어 주는 것을 권장합니다. github에 올리는 코드라면, gitignore처리해두시는 걸 권장합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "세팅이 된 듯 하니 다시 테스트를 진행해보겠습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/dlGfh3/btred0sVQnT/AAAAAAAAAAAAAAAAAAAAAIC3q5iGDSRh41Cpdv6uBJirIsRxnW11Derk1J7ZWdsM/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=7wF%2F7SDDOtV248d3vRG2BCIQWh4%3D",
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
        value: "정상적으로 보입니다. 세팅은 여기서 끝내고,",
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
        value: "다음 포스팅 때에는 본격적으로 로그인 처리에 대해서 진행해보도록 하겠습니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevTypescriptExpressLogin1Post = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevTypescriptExpressLogin1Post;
