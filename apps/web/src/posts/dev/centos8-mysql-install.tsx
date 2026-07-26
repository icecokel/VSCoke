import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "안녕하세요. 오늘은 리눅스인 CentOS8에 MySQL 설치하는 방법 및 간단한 유저 세팅까지 포스팅 해보겠습니다.",
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
                    value: "MySQL 설치 및 보안설정",
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
                    value: "DATABASE 생성 및 유저 생성",
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
            value: "CentOS Linux release 8.4.2105",
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
            value: "Putty.exe",
          },
        ],
      ],
      [
        [
          {
            type: "text",
            value: "Mysql",
          },
        ],
        [
          {
            type: "text",
            value: "8.0.21",
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
            value: "2. MySQL 설치 및 보안설정",
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
        value: " 리눅스 접속 방법은 이번 포스팅에서는 별도로 다루지 않습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: " CentOS에 접속 및 로그인 하신 후 MySQL 설치 작업을 시작합니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "yum -y install mysql-server",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/cTPKrq/btrdESV442j/AAAAAAAAAAAAAAAAAAAAAGP2nzVaJ5efSWD9JUOqaDlJhxVm-amKcmgnln6rBISR/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=oiRO4xZCOL29Tz0%2F6ooToQ7hugg%3D",
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
        value: '"완 료 되 었 습 니 다 ! " 라는 어색한 문구와 함께 mysql 설치가 완료됩니다.',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "MySQL 설치가 간단히 끝나고 실행을 해보겠습니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "systemctl start mysqld\nsystemctl status mysqld",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/bbnPUy/btrdJVkryIS/AAAAAAAAAAAAAAAAAAAAAONTFVRpU6--JFko8s6tTPah6a1aYn6BhrJ497VgKpRG/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=%2B9KoUOdxSL7odNXpbuR5uRuvJuE%3D",
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
          "정상적으로 켜짐을 확인 한 후, 바로 사용이 가능하지만 보안 설정을 하고 진행하겠습니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "mysql_secure_installation",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/brxmuK/btrdHd7tIxs/AAAAAAAAAAAAAAAAAAAAAOpcd0QFGAGmSpmhTHT6WNVmkT8mX832_aSBBUkyqJuQ/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=6ElGZh2g4dQJmeAc9ezeYLmbQnE%3D",
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
        value: "기본적으로 y를 기입하고 엔터하면 YES 이고 그외의 다른 키 값들은 NO 입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "password가 안보이는게 정상이므로 당황하지 않고, 손의 감각을 믿으시면 됩니다.",
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
            value: "2. DATABASE 생성 및 유저 생성",
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
        value: "보안 설정이 완료되었으면, MySQL을 접속하여 DB 와 유저를 생성해 보겠습니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "mysql -u root -p",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/kIN5Q/btrdJ3W6HeB/AAAAAAAAAAAAAAAAAAAAAD6RBLxYbpDhOKAmogmc7OFgKa8rljZkNilMcfPl-q-b/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=9UzH8JBPqrmqzU3weHSc3OBrl24%3D",
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
          "[Enter password : ] 에는 보안설정때 설정하신 password, (보안 설정을 진행하지 않았다면, 따로 설정한 root password) 로 로그인을 진행합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "사용할 database를 생성합니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "CREATE DATABASE '사용할 DB 이름' ;",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/VGetR/btrdK6lKlrz/AAAAAAAAAAAAAAAAAAAAAOXGYsvFhaUUahnzQc8EPTxDsl3h-8ZmCm6utPjBbL9R/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=7GXiG99GdgixHTFjsGZ%2BrJ6wU1s%3D",
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
          "DATABASE를 만들고 해당 DB 를 사용할 USER를 생성해주고 권한을 설정해 줍니다. 저는 원격지에서 접속할 확률이 높기 때문에 그에 맞게 권한 설정을 했습니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      "create user '사용할 유저 이름'@'%' identified by '유저 패스워드';\n// '%' 의 의미는 외부에서의 접근을 허용\n// 보안 설정을 저와 같이 하신 분들은 대문자 하나 이상 숫자 포함 8자 이상으로 비밀번호를 설정하시길 바랍니다.\n\ngrant all privileges on '사용할 DB '.* to '유저 이름'@'%' ;\n\nflush privileges // 권한등 수정한 내용을 적용 시키기 위해서 사용합니다.",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/dwnc7r/btrdFmwRLZD/AAAAAAAAAAAAAAAAAAAAAK3OOuzrmC1lIxrtNE6grFxM2Ba-LV8QB-pAuFiFPzKs/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=rEuJ8PnmGionkWt3igxt5JenHAk%3D",
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
          "계정도 정상적으로 생성되었으면, DB툴을 이용해 접속 확인을 해야겠죠? 접속 테스트를 진행합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value:
              "** 테스트를 위해 저는 sqlyog를 사용했습니다. 저와 같은 툴을 사용하실 분은 하단 링크에서 다운로드하시면 됩니다.",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: "https://github.com/webyog/sqlyog-community/wiki/Downloads",
        title: null,
        children: [
          {
            type: "text",
            value: "https://github.com/webyog/sqlyog-community/wiki/Downloads",
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
          " [GitHub - webyog/sqlyog-community: Webyog provides monitoring and management tools for open source relational databases. We devel",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Webyog provides monitoring and management tools for open source relational databases. We develop easy-to-use MySQL client tools for performance tuning and database management. Webyog's solution...",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "github.com](https://github.com/webyog/sqlyog-community/wiki/Downloads)",
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
            type: "text",
            value: "**",
          },
          {
            type: "break",
          },
          {
            type: "text",
            value:
              "MySQL Host Address** : 접속할 PC 또는 서버의 IP 주소, 해당 컴퓨터에서 진행했다면 localhost",
          },
          {
            type: "break",
          },
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "사용자 이름",
              },
            ],
          },
          {
            type: "text",
            value: " : 위에서 생성한 접속가능한 유저이름",
          },
          {
            type: "break",
          },
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "비밀번호",
              },
            ],
          },
          {
            type: "text",
            value: " : 위에서 생성한 접속가능한 유저 비밀번호",
          },
          {
            type: "break",
          },
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "포트",
              },
            ],
          },
          {
            type: "text",
            value: " : MySQL 서비트 포트 (기본 : 3306) ",
          },
          {
            type: "break",
          },
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "데이터 베이스",
              },
            ],
          },
          {
            type: "text",
            value: " : DB 이름 (상황에 따라 생략 가능)",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "https://blog.kakaocdn.net/dna/HKNdX/btrdISIwFki/AAAAAAAAAAAAAAAAAAAAAMK0E9ws6904mmebg8QHxZwzlt5aQ0G_JDUhR1XE939H/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=iKuxKviMMC6Qgcts43bn6lldC%2BI%3D",
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
        value: "접속 성공! 이라는 팝업을 보면 설정은 성공입니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevCentos8MysqlInstallPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevCentos8MysqlInstallPost;
