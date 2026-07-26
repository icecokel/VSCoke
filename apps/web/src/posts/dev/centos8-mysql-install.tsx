import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [{ type: "text", value: "CentOS 8 MySQL 설정 기록과 안전한 계정 생성" }],
  },
  {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [{ type: "text", value: "지원 종료 환경 안내" }],
          },
          {
            type: "text",
            value:
              ": CentOS Linux 8은 2021-12-31에 지원이 종료되었습니다. 새 서버는 지원 중인 운영체제를 사용하고, 이 글은 기존 환경을 이전·점검할 때만 참고하세요.",
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
          "지원이 끝난 운영체제에서는 패키지를 설치하는 것보다 운영체제를 먼저 이전하는 편이 안전합니다. 불가피하게 기존 서버를 점검할 때에도 공개 인터넷에서 MySQL을 열지 말고, 백업·방화벽·접속 계정을 함께 확인하세요.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "기존 서버 상태 확인" }],
  },
  {
    type: "code",
    language: "bash",
    value: "sudo systemctl status mysqld\nmysql --version\nmysql -u root -p",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "서비스 상태와 실제 버전을 먼저 확인하세요. 설치가 필요한 새 환경이라면 해당 운영체제와 MySQL 버전에 맞는 공식 설치 문서를 사용해야 하며, 이 글의 CentOS 8 설치 명령을 새 서버에 그대로 적용하면 안 됩니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "데이터베이스와 최소 권한 계정 만들기" }],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "데이터베이스·테이블 이름은 식별자로, 사용자 이름·호스트·비밀번호는 문자열로 분리합니다. 아래의 IP는 애플리케이션 서버 IP로 바꾸세요.",
      },
    ],
  },
  {
    type: "code",
    language: "sql",
    value:
      "CREATE DATABASE IF NOT EXISTS app_db\n  CHARACTER SET utf8mb4\n  COLLATE utf8mb4_0900_ai_ci;\n\nCREATE USER 'app_user'@'10.0.0.25' IDENTIFIED BY '<strong-password>';\n\nGRANT SELECT, INSERT, UPDATE, DELETE\n  ON app_db.*\n  TO 'app_user'@'10.0.0.25';",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "애플리케이션에 스키마 변경 권한이 필요할 때만 CREATE·ALTER·DROP을 별도로 추가하세요. 모든 호스트를 의미하는 %와 GRANT ALL은 피하고, 계정은 필요한 데이터베이스에 필요한 권한만 가져야 합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "CREATE USER와 GRANT는 즉시 적용되므로 FLUSH PRIVILEGES를 실행할 필요가 없습니다. 비밀번호를 셸 기록이나 SQL 파일에 남기지 말고 비밀 관리 도구 또는 환경 변수로 주입하세요.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "원격 접속 전 확인 목록" }],
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "3306 포트는 애플리케이션 서버의 사설 IP 또는 VPN 대역에서만 허용합니다.",
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
                type: "text",
                value: "원격 연결에는 TLS를 사용하고, root 계정을 원격 접속에 사용하지 않습니다.",
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
                type: "text",
                value: "운영체제와 MySQL의 지원 상태, 백업 복구 절차를 정기적으로 확인합니다.",
              },
            ],
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
        url: "https://dev.mysql.com/doc/refman/8.0/en/creating-accounts.html",
        title: null,
        children: [{ type: "text", value: "MySQL 공식 계정·권한 가이드" }],
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevCentos8MysqlInstallPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevCentos8MysqlInstallPost;
