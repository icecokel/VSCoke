import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "안녕하세요. 오늘은 화면 설계할때, 반드시 필요하진 않지만, 알아두면 유용한 사이트 정보를 공유해 드리려고 합니다.",
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
            value: "1. 2 ColorCombinations",
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
        value: "주소 : ",
      },
      {
        type: "link",
        url: "https://2colors.colorion.co/",
        title: null,
        children: [
          {
            type: "text",
            value: "https://2colors.colorion.co/",
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
        value: " [Two Color Combinations",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Two color combination palettes",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "2colors.colorion.co](https://2colors.colorion.co/)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "해당 사이트는 조합이 좋은 두 색상을 추천해주는 사이트 입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "많은 색상을 필요치 않은 부분에 참고하면 매우 좋을듯 하고, 사용 방법으로는 두가치 컬러 사이에 아이콘을 클릭하여 RGB 값을 복사하여 사용 하시면 됩니다.",
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
            value: "2. DesignSeeds",
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
        value: "주소 : ",
      },
      {
        type: "link",
        url: "https://www.design-seeds.com/",
        title: null,
        children: [
          {
            type: "text",
            value: "https://www.design-seeds.com/",
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
        value: " [Design Seeds | for all who ♥ color | inspiration & color palettes",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "“All the flowers of all the tomorrows are in the seeds of today.” ~ Indian Proverb",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "www.design-seeds.com](https://www.design-seeds.com/)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "해당 사이트는 4~6가지 색상 조합을 선책 할때 유용한 사이트 입니다. 사이트 프로젝트 진행 할 때, 어떤 컨셉을 잡고, 색상코드를 고정해 두는 경우가 종종있는데, 그럴때 참고하시면 유용한 사이트 입니다. 봄, 여름, 가을, 겨울 등 4계절으로 카테고리가 나눠져 있고, 항목 마다 해당 계절에 어울리는 색상 조합들이 있습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "사용방법은 이미지를 클릭하면 색상 조합과 RGB 값이 나열되어 있습니다.",
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
            value: "3. Webflow Templates",
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
        value: "주소 : ",
      },
      {
        type: "link",
        url: "https://webflow.com/templates/free-website-templates",
        title: null,
        children: [
          {
            type: "text",
            value: "https://webflow.com/templates/free-website-templates",
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
        value: " [Free HTML5 responsive website templates | Webflow",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Browse the best free business, portfolio, and blog HTML5 responsive website templates. Then customize your template in Webflow without code.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "webflow.com](https://webflow.com/templates/free-website-templates)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "해당 사이트는 저도 얼마 전에 알게된 사이트인데 무료 웹디자인을 공유 해주는 사이트입니다. ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "모두 무료는 아니고 템플릿에 따라 유료가 있을 수 있으니, 사용에 주의 바랍니다.",
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
            value: "4. StartBootstrap",
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
        value: "주소 : ",
      },
      {
        type: "link",
        url: "https://startbootstrap.com/themes",
        title: null,
        children: [
          {
            type: "text",
            value: "https://startbootstrap.com/themes",
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
        value: " [Free Bootstrap Themes & Templates - Start Bootstrap",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Landing Page A clean, functional landing page theme",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "startbootstrap.com](https://startbootstrap.com/themes)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "해당 사이트는 한참 개발공부 시작할 때, 참고하던 사이트 입니다. 사실 너무나 유명한 사이트지만 간혹 모르시는 분들도 있어서 추가 했습니다. ",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "사용방법은 검색하실때 아래 그림과 같이 Pro를 체크 해제하시고 검색하시면 무료 자료를 쉽게 확인 할 수 있습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/GsR6r/btrcNk0Wrti/AAAAAAAAAAAAAAAAAAAAAIylOGXshAHKxOFJYWYB_W7rMSzdMgNjXSBquEsIDZo_/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=e2eLAUFN0TNHGAxdU5WBak7QWEU%3D",
        alt: "",
        title: null,
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
            value: "마침.",
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
          "토이 프로젝트 기획 시 아이디어가 떠오르지 않고, 화면 설계나 색조합에 자신 없는 분들에게 추천하는 사이트들 입니다. 기획시 시간절약에 도움이 될 수 있다고 생각합니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevUsefulSitesForDesign2Post = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevUsefulSitesForDesign2Post;
