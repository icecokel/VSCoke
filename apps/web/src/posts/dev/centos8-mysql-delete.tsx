import {
  PostCodeBlock,
  PostHorizontalRule,
  PostParagraph,
} from "@/components/blog/blog-post-elements";

const DevCentos8MysqlDeletePost = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요 이번에 여러 작업 때문에 개인서버에서 MySQL를 삭제하고, 다시 설치해야할 일이
        생겼습니다. 완벽하게 지우지 못하면 계정정보나 일부 설정등이 남아서 다음에 설치할 DB에서
        번거로워질수 있는데요. 그래서 오늘은 CentOS8에서 MySQL 깨끗하게 삭제하는 방법을 포스팅
        하겠습니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostParagraph>우선 yum을 통해서mysql 서버를 삭제 하겠습니다.</PostParagraph>
      <PostCodeBlock code={"yum -y remove mysql mysql-server"} />
      <PostParagraph>
        {
          "yum 옵션에 -y를 주면 [y/n]을 물어보는 질문에서 자동으로 y로 기입되어 작업이 진행됩니다. 확실한 작업을 하실때  -y를 해서 y + 엔터 난사를 피하세요"
        }
      </PostParagraph>
      <PostParagraph>
        위 명령어로 MySQL 서버를 삭제한 뒤, 데이터 디렉터리인 /var/lib/mysql의 내용을 확인합니다.
      </PostParagraph>
      <PostCodeBlock code={"ls /var/lib/mysql"} />
      <PostParagraph>
        디렉터리가 있는지 확인하고, 보존할 데이터가 있다면 먼저 백업합니다. 삭제해도 되는 데이터인지
        확인한 뒤 다음 명령을 실행합니다.
      </PostParagraph>
      <PostCodeBlock code={"rm -rf /var/lib/mysql"} />
      <PostParagraph>
        옵션 -rf 를 주면 디렉토리의 하위항목을 까지 강제로 삭제가 진행이 됩니다. 다른 디렉토리가 지정되지 않도록 조심하세요.
      </PostParagraph>
      <PostHorizontalRule />
      <PostParagraph>
        오늘은 아주 간단한 포스팅을 진행했습니다. DB 서버 설치 및 삭제 만큼 번거로운일이 없는데
        보시는 분들 하시는 작업 무탈하시길 바랍니다.
      </PostParagraph>
    </>
  );
};

export default DevCentos8MysqlDeletePost;
