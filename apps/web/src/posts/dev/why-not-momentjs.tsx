import {
  PostCodeBlock,
  PostHeading3,
  PostHorizontalRule,
  PostImage,
  PostLink,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
} from "@/components/blog/blog-post-elements";

const DevWhyNotMomentjsPost = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요. 많은 javascript 개발자가 사랑하는 모듈이였지만, 이제는 바꿔야할 moment.js와 그
        이유에 대해서 포스팅 해보겠습니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>소식</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>Luxon</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>사용법 예시</PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>1. 소식</PostStrong>
      </PostHeading3>
      <PostParagraph>
        moment.js가 레거시 프로젝트로 공식적으로 선언이 되었습니다. 이번 소식은 아닐 수 도
        있습니다만, 중요한 소식이고 영향력이 있는 소식이라 판단되어 공유 합니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/V30a8/btr1T6TsHiG/AAAAAAAAAAAAAAAAAAAAABaxvC0oQq_b8TbtDV5m4QLTwPtMLE6kxCY3_jKZvA0u/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ep8hWeBVQLNRP%2BM%2BWSZtJ3utF1o%3D"
        }
      />
      <PostParagraph>
        <PostLink
          href={
            "https://momentjs.com/docs/#:~:text=We%20now%20generally%20consider%20Moment%20to%20be%20a%20legacy%20project%20in%20maintenance%20mode.%20It%20is%20not%20dead%2C%20but%20it%20is%20indeed%20done."
          }
        >
          https:&#47;&#47;momentjs.com/docs/#:~:text=We%20now%20generally%20consider%20Moment%20to%20be%20a%20legacy%20project%20in%20maintenance%20mode.%20It%20is%20not%20dead%2C%20but%20it%20is%20indeed%20done.
        </PostLink>
      </PostParagraph>
      <PostParagraph>{" [Moment.js | Docs"}</PostParagraph>
      <PostParagraph>
        moment.relativeTimeThreshold(unit); &#47;&#47; getter moment.relativeTimeThreshold(unit,
        limit); &#47;&#47; setter duration.humanize has thresholds which define when a unit is
        considered a minute, an hour and so on. For example, by default more than 45 seconds is
        consider
      </PostParagraph>
      <PostParagraph>
        momentjs.com](https:&#47;&#47;momentjs.com/docs/#:~:text=We%20now%20generally%20consider%20Moment%20to%20be%20a%20legacy%20project%20in%20maintenance%20mode.%20It%20is%20not%20dead%2C%20but%20it%20is%20indeed%20done.)
      </PostParagraph>
      <PostParagraph>
        현재는 급한 문제는 없겠지만, 라이브러리이 가벼운 편도아니고, 타임존 설정등 추가기능을
        사용하고 싶으면, 추가적으로 모듈을 설치해야하는 불편함도 있고하니, date 라이브러리를 바꾸는
        것은 권장 드립니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>2. Luxon</PostStrong>
      </PostHeading3>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/HY45Y/btr1WyvrPdo/AAAAAAAAAAAAAAAAAAAAAOs_yHH5rRlVBZWkUjd8WLfP4ivySBfD-Cow3l3kLEfE/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=AMkVu%2FL4kfCtK34lKNa3TrFv15E%3D"
        }
      />
      <PostParagraph>
        moment 공식 문서에서도 설명 했듯이 가장 moment 스럽지만 moment의 단점이 보완된
        라이브러리라고 할 수 있습니다. moment가 익숙하신 분들에게 추천드립니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>3. 사용법 예시</PostStrong>
      </PostHeading3>
      <PostParagraph>
        <PostStrong>Format</PostStrong>
      </PostParagraph>
      <PostCodeBlock
        code={
          'const dateFromMoment = moment().format("YYYY/MM/DD") // "2023/03/06"\n\nconst dateFromLuxon = DateTime.now().toFormat("yyyy/LL/dd") // "2023/03/06"'
        }
      />
      <PostParagraph>
        아마 format()을 쓰시는 분들이 적지 않을 것이라고 생각합니다. 주의 하실 점은, 년 월 일을
        표시하는 알파벳이 바뀐점인데요. 처음엔 조금 불편하겠지만, 이 부분은 익숙해지기 쉬운 쪽이라고
        생각합니다.
      </PostParagraph>
      <PostParagraph>
        <PostStrong>timezone</PostStrong>
      </PostParagraph>
      <PostParagraph>
        {
          '이전에 저와같이 타임존이 중요하신 분들은 "mement-timezon"을 추가적으로 설지하셔서 사용하셨을 것이라고 생각합니다. luxon에서는 별도 설치 없이 timezone 설정이 가능합니다 '
        }
      </PostParagraph>
      <PostCodeBlock
        code={
          'const nowFromMoment = moment().tz("America/New_York").fromat();\nconst nowFromLuxon = DataTime.now().set({millisecond : 0}).setZone("America/New_York").toISO({suppressMilliseconds : true});'
        }
      />
      <PostParagraph>
        이전보다 길어지긴 했지만, 추가 라이브러리 설치하지 않아도 되는것이 좋습니다.
      </PostParagraph>
      <PostParagraph>
        중간에 millisecond를 0으로 바꾸고, toISO에 설정값을 준 이유는, 기존 moment-timezone을
        이용해서 단순 format만 했을때, millsecond는 생략되어 나왔기 때문에 포맷을 맞추기 위함입니다.
        millisecond가 offset에 포함되어도 괜찮으신 분들은 생략해도 좋습니다.
      </PostParagraph>
      <PostParagraph>
        <PostStrong>참고자료</PostStrong>
      </PostParagraph>
      <PostParagraph>
        luxon의 공식 홈페이지 입니다.
        <br />
        <PostLink href={"https://moment.github.io/luxon/#/"}>
          https:&#47;&#47;moment.github.io/luxon/#/
        </PostLink>
      </PostParagraph>
      <PostParagraph>
        moment를 주로 사용하시던 분이라면, 아래 링크를 참고 하시면 좋을 듯합니다.
        <br />
        <PostLink href={"https://moment.github.io/luxon/#/moment"}>
          https:&#47;&#47;moment.github.io/luxon/#/moment
        </PostLink>
      </PostParagraph>
      <PostParagraph>
        <PostLink href={"https://moment.github.io/luxon/#/formatting"}>
          https:&#47;&#47;moment.github.io/luxon/#/formatting
        </PostLink>
      </PostParagraph>
      <PostParagraph>{" [luxon - Immutable date wrapper"}</PostParagraph>
      <PostParagraph>
        moment.github.io](https:&#47;&#47;moment.github.io/luxon/#/moment)
      </PostParagraph>
      <PostHorizontalRule />
      <PostParagraph>
        moment가 레거시 프로젝트 되었다는 소식을 늦게나마 들었을 때, 현재 제가 주로 사용하는
        라이브러리들이 언제 레거시가 될지 모른다고 생각했습니다. 유지보수가 종료된다는건 보안이슈와
        연결될 가능성이 충분하다고 생각해서, 틈틈히 라이브러리, 프레임워크등 릴리즈를 확인하는
        습관이 필요한듯합니다..
      </PostParagraph>
    </>
  );
};

export default DevWhyNotMomentjsPost;
