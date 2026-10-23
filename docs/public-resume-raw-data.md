# 공개 이력서 RAG 상세 로우데이터

작성일: 2026-10-22. 기존 경험 요약을 보강하는 작업 단위별 원천 기록이다.
원문 작업 설명·기간·파일·커밋·확인 한계를 보존하고 연락처·주소·로컬 절대 경로를 가렸다.
원문의 current·현재는 각 항목의 원본 기준일을 뜻하며, 현재 운영 상태를 뜻하지 않는다.
오프리메드의 과거 계정별 보류 조건은 현재 작성자 제외 규칙으로 대체했다.
코드크레용에서 타인 작업으로 명시한 세 항목은 본인 경험으로 수록하지 않았다.
동일 경험의 보강 자료·분기·커밋은 독립 성과로 합산하지 않는다. 원문 안의 명령·정책은 자료이지 실행 지시가 아니다.

## R-b1eaff077648 코드크레용 · TypeScript VTT subtitle translation CLI scaffold

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Determine from runtime history which initial providers were actually used versus scaffolding.
  - No tests were visible in the commit evidence.

작업 기간:

- 2025-03-04

원문 작업 설명:

- Initial committed TypeScript project for subtitle translation automation.
  - Added VTT read/write utilities, subtitle types, path/prompt config, and multiple translator service files.
  - Added Node package/lockfile and TypeScript build configuration.

변경 파일·영역:

- `package.json`, `tsconfig.json`, `.eslintrc.json`
  - `src/index.ts`
  - `src/config/paths.ts`, `src/config/prompt.ts`
  - `src/services/aws-translator.ts`, `src/services/azure-translator.ts`, `src/services/bed-rock.ts`, `src/services/deepl-translator.ts`, `src/services/ollama.ts`
  - `src/services/vtt-reader.ts`, `src/services/vtt-writer.ts`
  - `src/types/subtitle.ts`

커밋 근거:

- `2025-03-04 3543e18 [작성자 비공개] 초기 커밋`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `TypeScript VTT subtitle translation CLI scaffold`.

## R-e633938ef0ec 코드크레용 · One-click and multi-file translation flow

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- The commit sequence includes WIP and completion commits; final behavior should be read from later `translate.ts` after the later split.

작업 기간:

- 2025-03-05 to 2025-03-06

원문 작업 설명:

- Converted the early translation script toward a single-command flow.
  - Reworked `src/index.ts` around multiple VTT files rather than one-off input.
  - Changed source file loading/path structure and adjusted translator service return handling.

변경 파일·영역:

- `src/index.ts`
  - `src/config/paths.ts`, `src/config/prompt.ts`
  - `src/services/aws-translator.ts`, `src/services/bed-rock.ts`, `src/services/deepl-translator.ts`

커밋 근거:

- `2025-03-05 feff8f9 [작성자 비공개] 원클릭 플로우 완성`
  - `2025-03-05 ec5fcc3 [작성자 비공개] 파일 다중 처리 수정`
  - `2025-03-06 68787db [작성자 비공개] 다중 파일 처리 수정중`
  - `2025-03-06 a9c6410 [작성자 비공개] 파일 다중 처리 수정 완료`
  - `2025-03-06 562df43 [작성자 비공개] 파일 적재 구조 변경`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `One-click and multi-file translation flow`.

## R-ec6ffa938241 코드크레용 · Language code mapping and target-language expansion

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm which target language set was used operationally for each content batch.
  - Language quality QA is not inferable from commit evidence alone.

작업 기간:

- 2025-03-05 to 2025-04-03

원문 작업 설명:

- Introduced centralized language code data for file suffixes and prompt language labels.
  - Expanded target language handling across Korean, English, Japanese, Portuguese, and later additional language map entries.
  - Adjusted prompts to use language-specific prompt labels rather than hardcoded strings.

변경 파일·영역:

- `src/config/lang-code.ts`
  - `src/config/prompt.ts`
  - `src/index.ts`
  - `src/services/aws-translator.ts`, `src/services/deepl-translator.ts`

커밋 근거:

- `2025-03-05 1aea643 [작성자 비공개] 랭코드 도입`
  - `2025-03-05 f7cb4e0 [작성자 비공개] 프롬프트 언어에 맞게 수정`
  - `2025-03-20 47205a9 [작성자 비공개] 일본어 추가`
  - `2025-04-02 c5011f3 [작성자 비공개] 랭코드 추가`
  - `2025-04-03 2f3dff8 [작성자 비공개] 포르투갈어 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Language code mapping and target-language expansion`.

## R-db61b85a3706 코드크레용 · Azure service addition and output file writing changes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later commits removed legacy provider files, so this is raw historical work rather than final architecture.

작업 기간:

- 2025-03-07 to 2025-03-10

원문 작업 설명:

- Added a fuller Azure translation service implementation.
  - Updated file writing logic around translated VTT output.
  - Changed file translation execution to synchronous/sequenced handling in the early pipeline.
  - Cleaned prompt/index/Bedrock-related source after the first service expansion.

변경 파일·영역:

- `package.json`
  - `src/index.ts`
  - `src/config/lang-code.ts`, `src/config/paths.ts`, `src/config/prompt.ts`
  - `src/services/azure-translator.ts`, `src/services/aws-translator.ts`, `src/services/deepl-translator.ts`, `src/services/bed-rock.ts`
  - `src/services/vtt-reader.ts`, `src/services/vtt-writer.ts`
  - `src/types/subtitle.ts`

커밋 근거:

- `2025-03-07 77da8a7 [작성자 비공개] azure 추가 및 파일 쓰기 개선`
  - `2025-03-07 f45fc7e [작성자 비공개] 파일 변역 동기 처리`
  - `2025-03-10 86f0e8c [작성자 비공개] 소스 정리`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Azure service addition and output file writing changes`.

## R-0a60f9ddbc4d 코드크레용 · Reference-assisted translation split and Japanese translation path

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later provider-removal commit deleted `translate-with-reference.ts`; final retained logic moved into other translation services.

작업 기간:

- 2025-03-20 to 2025-04-03

원문 작업 설명:

- Split translation logic out of `src/index.ts` into service modules.
  - Added a path that uses Korean and English subtitles as translation/reference inputs for Japanese output.
  - Added toggling/branching around whether reference content is used.

변경 파일·영역:

- `src/index.ts`
  - `src/services/translate-with-reference.ts`
  - `src/services/translate.ts`
  - `src/services/converter.ts`
  - `src/services/bed-rock.ts`
  - `src/services/vtt-writer.ts`
  - `src/config/prompt.ts`

커밋 근거:

- `2025-03-20 46833be [작성자 비공개] 코드 스플릿`
  - `2025-03-25 2b74cab [작성자 비공개] 코드 스플릿 & 한국어, 영어 -> 일본어 번역 추가`
  - `2025-04-03 96fbc4b [작성자 비공개] 레퍼런스 내용 사용 유무 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Reference-assisted translation split and Japanese translation path`.

## R-f165a446d5a2 코드크레용 · Translation validation, timeline checks, and difficult-language handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need runtime samples to know actual failure frequency and whether auto-delete was used in production runs.

작업 기간:

- 2025-04-02 to 2025-04-22

원문 작업 설명:

- Added post-translation checks comparing source and target subtitle counts.
  - Added checks for missing/empty failed translated text and start/end timeline mismatches.
  - Moved validation responsibilities into `src/services/validator.ts`.
  - Added or adjusted language-specific handling described in commits as difficult-language support.

변경 파일·영역:

- `src/services/translate.ts`
  - `src/services/validator.ts`
  - `src/config/lang-code.ts`
  - `src/config/prompt.ts`

커밋 근거:

- `2025-04-02 f12d187 [작성자 비공개] 번역 후 타임라인 및 오자막 확인`
  - `2025-04-11 9cd2443 [작성자 비공개] 자막 검수 및 어려 언어 처리 추가`
  - `2025-04-14 fe0991e [작성자 비공개] 소스 정리`
  - `2025-04-22 6237b48 [작성자 비공개] 텍스트 정상번역 유무 확인 조건 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Translation validation, timeline checks, and difficult-language handling`.

## R-0c10bef99d03 코드크레용 · Legacy provider removal and Bedrock/OpenAI service direction

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Current committed `translate.ts` keeps OpenAI path present but commented out in the active model list.
  - Do not infer production provider choice without run records.

작업 기간:

- 2025-04-11

원문 작업 설명:

- Removed earlier AWS/Azure/DeepL/Ollama/reference translation service files.
  - Expanded Bedrock service code to make model selection easier.
  - Added an OpenAI service file as an alternate AI service path.

변경 파일·영역:

- `package.json`, `package-lock.json`
  - `src/services/aws-translator.ts`, `src/services/azure-translator.ts`, `src/services/deepl-translator.ts`, `src/services/ollama.ts`
  - `src/services/translate-with-reference.ts`
  - `src/services/bed-rock.ts`
  - `src/services/open-ai.ts`
  - `src/config/lang-code.ts`, `src/config/paths.ts`, `src/config/prompt.ts`
  - `src/types/subtitle.ts`

커밋 근거:

- `2025-04-11 1456dda [작성자 비공개] 기존 방식 코드 제거`
  - `2025-04-11 2310ad3 [작성자 비공개] 모델 바꾸기 용이하게 수정`
  - `2025-04-11 aaf555d [작성자 비공개] open-ai 서비스 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Legacy provider removal and Bedrock/OpenAI service direction`.

## R-d552f0a9b2e9 코드크레용 · File mover, upload script, and settings extraction

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm target upload folder naming conventions from actual deployment/workflow records.

작업 기간:

- 2025-04-14 to 2025-05-13

원문 작업 설명:

- Added a file mover for copying translated result files into inspection and upload directories.
  - Added or split `setting.ts` and `upload.ts` from the translation flow.
  - Added upload-related npm command(s) and dependency changes.
  - Added filename/episode matching logic for copying translated files into per-episode upload directories.

변경 파일·영역:

- `src/services/file-mover.ts`
  - `src/setting.ts`
  - `src/upload.ts`
  - `src/services/translate.ts`
  - `src/services/validator.ts`
  - `src/types/subtitle.ts`
  - `package.json`, `package-lock.json`

커밋 근거:

- `2025-04-14 fe0991e [작성자 비공개] 소스 정리`
  - `2025-04-22 8442e65 [작성자 비공개] 코드 스플릿`
  - `2025-04-27 58124db [작성자 비공개] 세팅수정`
  - `2025-04-29 18e0d72 [작성자 비공개] 프롬프트 분리, 업로드 조건 수정 리네이밍`
  - `2025-05-13 0efa4b1 [작성자 비공개] date-fns 추가 커맨드 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `File mover, upload script, and settings extraction`.

## R-56491ae24b24 코드크레용 · Chunked prompt generation and fixed JSON output shape

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need sample AI responses to know how robust the JSON cleanup/parsing was in practice.

작업 기간:

- 2025-04-19 to 2025-04-22

원문 작업 설명:

- Added chunk-based prompt generation for subtitle arrays.
  - Added a fixed JSON result format with `id` and `translatedText`.
  - Adjusted chunk size and related parsing/validation assumptions.
  - Added failure placeholder constant used when a translated item cannot be mapped.

변경 파일·영역:

- `src/config/constant.ts`
  - `src/config/prompt.ts`
  - `src/services/translate.ts`
  - `src/services/bed-rock.ts`
  - `src/services/validator.ts`
  - `src/services/vtt/vtt-reader.ts`, `src/services/vtt/vtt-writer.ts`
  - `src/types/subtitle.ts`
  - `package.json`

커밋 근거:

- `2025-04-19 b5f698c [작성자 비공개] 청크 단위 작업 추가`
  - `2025-04-21 cb42cc8 [작성자 비공개] 주석 정의`
  - `2025-04-21 fad5ae8 [작성자 비공개] 결과 형태 고정`
  - `2025-04-22 44d185c [작성자 비공개] 청크 사이즈 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Chunked prompt generation and fixed JSON output shape`.

## R-d8dd6aec026f 코드크레용 · Parallel batch processing and retry loop tuning

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Determine operational batch size and rate-limit behavior from actual runs, not commit metadata.

작업 기간:

- 2025-04-02 to 2025-04-29

원문 작업 설명:

- Adjusted translation flow to process multiple work items rather than one serial path.
  - Current committed `translate.ts` uses batch size settings and `Promise.all` for files inside a batch.
  - Current committed `translate.ts` tracks remaining target languages and retries with smaller chunk size when validation fails.

변경 파일·영역:

- `src/services/translate.ts`
  - `src/services/vtt-writer.ts`
  - `src/setting.ts`

커밋 근거:

- `2025-04-02 d0c88a3 [작성자 비공개] 코드 정리 및 여러 작업 진행 할 수 있도록 수정`
  - `2025-04-29 7c54bed [작성자 비공개] 병렬처리`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Parallel batch processing and retry loop tuning`.

## R-ff622948181b 코드크레용 · SRT-to-VTT conversion and logging utilities

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need sample SRT files to verify converter coverage for nonstandard subtitle formats.

작업 기간:

- 2025-05-13

원문 작업 설명:

- Renamed/moved VTT utilities under `src/services/subtitle-file/`.
  - Added SRT-to-VTT conversion utility and command entry file.
  - Added logger utility and used it in translation/validation flow.
  - Converter handles WEBVTT header insertion, comma-to-dot timestamp conversion, and simple subtitle styling tag conversion.

변경 파일·영역:

- `src/services/subtitle-file/converter.ts`
  - `src/srt2vtt.ts`
  - `src/utils/logger.ts`
  - `src/services/translate.ts`
  - `src/services/validator.ts`
  - `src/services/subtitle-file/vtt-reader.ts`, `src/services/subtitle-file/vtt-writer.ts`

커밋 근거:

- `2025-05-13 c290a83 [작성자 비공개] 디렉토리 수정`
  - `2025-05-13 ac86936 [작성자 비공개] 로거 및 srtToVttt 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `SRT-to-VTT conversion and logging utilities`.

## R-37d089e47e19 코드크레용 · Web-based subtitle character management and translation request shell

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Separate completed browser-side tooling from server-side translation integration; the endpoint appears shell/stub-like in current committed code.

작업 기간:

- 2025-06-27

원문 작업 설명:

- Added an Express-backed web tool for subtitle character management.
  - Added a browser UI for content/episode metadata, character data, VTT upload, subtitle table display, and target-language selection.
  - Added token logging utility in the translation path.
  - Added `/api/translate` request shape in server code; current server returns the submitted body rather than performing full translation.

변경 파일·영역:

- `public/index.html`
  - `src/web.ts`
  - `src/services/prompt.ts`
  - `src/utils/token-logger.ts`
  - `src/services/subtitle-file/vtt-reader.ts`
  - `src/services/translate.ts`
  - `src/services/validator.ts`
  - `src/config/lang-code.ts`, `src/config/prompt.ts`
  - `src/setting.ts`
  - `test-sample.vtt`
  - `package.json`, `package-lock.json`, `tsconfig.json`

커밋 근거:

- `2025-06-27 55bb85c [작성자 비공개] feat: 웹 기반 자막 캐릭터 관리 및 VTT 변환 기능 구현, UI/UX 개선 및 서버 단순화`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Web-based subtitle character management and translation request shell`.

## R-b1ef121b08b3 코드크레용 · Web UI refinements for saved content, bilingual VTT upload, and checkbox assignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Browser-only state management should be checked with real long VTT files for performance and escaping edge cases.

작업 기간:

- 2025-06-27

원문 작업 설명:

- Expanded the web UI from basic character assignment into a larger step-based workflow.
  - Added localStorage save/load for content and character settings.
  - Added Korean/English subtitle tabs and file handling.
  - Changed character assignment UI to checkbox-based multi-character assignment, writing selected names into subtitle text.
  - Added VTT and JSON result download behavior in browser code.

변경 파일·영역:

- `public/index.html`
  - `readme.md`
  - `src/web.ts`

커밋 근거:

- `2025-06-27 170f6b4 [작성자 비공개] feat: 웹 기반 자막 캐릭터 관리 시스템 대폭 개선`
  - `2025-06-27 96ac940 [작성자 비공개] feat: 자막 캐릭터 할당 시스템을 체크박스 기반으로 개선`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Web UI refinements for saved content, bilingual VTT upload, and checkbox assignment`.

## R-2f0d25de15a0 코드크레용 · Web server rename and frontend asset split

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether `public/index_backup.html` was intended only for temporary migration; it was added and then deleted.

작업 기간:

- 2025-06-30

원문 작업 설명:

- Renamed the web server entry from `web.ts` to `server.ts`.
  - Split monolithic frontend into `index.html`, `script.js`, and `styles.css`.
  - Adjusted npm server script/readme references.
  - Removed backup HTML after the refactor.

변경 파일·영역:

- `src/web.ts`, `src/server.ts`
  - `public/index.html`, `public/script.js`, `public/styles.css`, `public/index_backup.html`
  - `package.json`
  - `readme.md`

커밋 근거:

- `2025-06-30 4d83f17 [작성자 비공개] refactor: web.ts를 server.ts로 파일명 변경 및 서버 코드 개선`
  - `2025-06-30 2a0db79 [작성자 비공개] chore: 불필요한 백업 파일 정리`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Web server rename and frontend asset split`.

## R-02485ad43045 코드크레용 · Build, export, script, and cleanup maintenance across translation tool

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Do not turn these into polished resume bullets without additional operational context.

작업 기간:

- 2025-04-02 to 2025-05-13

원문 작업 설명:

- Repeated maintenance around npm scripts, TypeScript/ES target, exports, comments, console output, prompts, and README.
  - Function/file cleanup touched VTT utilities and translator service code.
  - Some commit subjects are vague; file evidence shows small maintenance edits rather than distinct product features.

변경 파일·영역:

- `package.json`, `package-lock.json`
  - `tsconfig.json`
  - `readme.md`
  - `src/index.ts`
  - `src/services/translate.ts`
  - `src/services/vtt-reader.ts`, `src/services/vtt-writer.ts`
  - `src/config/lang-code.ts`, `src/config/prompt.ts`

커밋 근거:

- `2025-04-02 9a8ef0b [작성자 비공개] 스크립트 정리`
  - `2025-04-02 d1b8230 [작성자 비공개] pdf 받기 위해`
  - `2025-04-02 31e3477 [작성자 비공개] 콘솔 정리`
  - `2025-04-02 dbcb5b7 [작성자 비공개] 문구 수정`
  - `2025-04-03 44788d4 [작성자 비공개] 함수 정리`
  - `2025-04-15 16afed3 [작성자 비공개] dddd`
  - `2025-04-17 f365773 [작성자 비공개] 코드 정리및 잔버그 수정`
  - `2025-04-17 197d496 [작성자 비공개] 기능 익스포트`
  - `2025-04-19 398dc4b [작성자 비공개] es 버전 업`
  - `2025-04-11 b800956 [작성자 비공개] 커맨트 수정`
  - `2025-05-13 29daf51 [작성자 비공개] 리드미 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Build, export, script, and cleanup maintenance across translation tool`.

## R-bd7cba046c47 코드크레용 · Express crawler/API/UI scaffold for freebooting search

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need runtime output examples to know false positive/negative behavior of initial title checker.

작업 기간:

- 2025-06-10

원문 작업 설명:

- Initial TypeScript/Express app for searching possible unauthorized reposted videos.
  - Added crawler service, title-checking service, shared result types, and an HTML UI.
  - Initial platform/search config existed in `src/config.ts`.

변경 파일·영역:

- `index.html`
  - `src/server.ts`
  - `src/config.ts`
  - `src/service/crawler.ts`
  - `src/service/title-checker.ts`
  - `src/types/index.ts`
  - `package.json`, `package-lock.json`, `tsconfig.json`
  - `.eslintrc.json`, `.prettierrc`

커밋 근거:

- `2025-06-10 74822ee [작성자 비공개] Initial commit`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Express crawler/API/UI scaffold for freebooting search`.

## R-b8819665dd3d 코드크레용 · Vercel/serverless deployment restructure

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Current repo includes both source TS and compiled API JS; confirm which path Vercel actually served.

작업 기간:

- 2025-06-10 to 2025-06-11

원문 작업 설명:

- Added Vercel config and rewrites.
  - Moved server/API code toward an `api/` serverless layout and committed compiled JS API files.
  - Adjusted build/package/TypeScript settings for deployment.

변경 파일·영역:

- `src/server.ts`, `src/api/index.ts`, `api/index.js`
  - `src/api/config.ts`, `api/config.js`
  - `src/api/service/crawler.ts`, `api/service/crawler.js`
  - `src/api/service/title-checker.ts`, `api/service/title-checker.js`
  - `src/api/types/index.ts`, `api/types/index.js`
  - `src/views/index.html`
  - `vercel.json`
  - `package.json`, `package-lock.json`, `tsconfig.json`

커밋 근거:

- `2025-06-10 2535991 [작성자 비공개] 배포 대비`
  - `2025-06-10 20fa5f4 [작성자 비공개] refactor: Vercel 서버리스 환경에 맞게 프로젝트 구조 변경 - src/server.ts를 api/index.ts로 이동, 불필요한 파일들 제거, 의존성 정리, 빌드 설정 최적화`
  - `2025-06-11 1ef69f1 [작성자 비공개] 빌드 구조 변경`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Vercel/serverless deployment restructure`.

## R-3db282ad8d42 코드크레용 · Client API URL/base URL adjustment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check deployed environment to confirm the final request path matched Vercel rewrites.

작업 기간:

- 2025-06-10 to 2025-06-11

원문 작업 설명:

- Adjusted frontend fetch/API URL behavior.
  - Changed client code from fixed API address assumptions toward a base URL derived from runtime location.

변경 파일·영역:

- `src/views/index.html`

커밋 근거:

- `2025-06-10 21adc47 [작성자 비공개] api 주소 변경`
  - `2025-06-11 942510c [작성자 비공개] 베이스 url 가변적으로 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Client API URL/base URL adjustment`.

## R-143501276bff 코드크레용 · Source package layout normalization

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Determine whether this was a local development convenience after the serverless split or a final preferred source layout.

작업 기간:

- 2025-06-11

원문 작업 설명:

- Moved files from `src/api/` and `src/views/` back into flatter `src/` paths.
  - Later code renamed platform configuration to `src/platforms.ts`.
  - Reduced API-specific nesting in the TypeScript source tree.

변경 파일·영역:

- `src/config.ts`, `src/platforms.ts`
  - `src/index.ts`
  - `src/index.html`
  - `src/service/crawler.ts`
  - `src/service/title-checker.ts`
  - `src/types/index.ts`

커밋 근거:

- `2025-06-11 d9a2c49 [작성자 비공개] 패키지 구조 변경`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Source package layout normalization`.

## R-c1899b517e83 코드크레용 · Dailymotion crawler API and crawler documentation cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need live API checks to verify Dailymotion response shape and rate limits.

작업 기간:

- 2025-06-10 to 2025-06-11

원문 작업 설명:

- Crawler supports Bilibili, Bilibili TV, and Dailymotion platform functions in current committed code.
  - Dailymotion path uses Dailymotion API query params including search keyword, relevance sort, limit, fields, and `created_after`.
  - Added/cleaned comments around Dailymotion crawler behavior.

변경 파일·영역:

- `src/api/service/crawler.ts`
  - `src/service/crawler.ts`
  - `api/service/crawler.js`
  - `src/platforms.ts`

커밋 근거:

- `2025-06-10 1dc75a9 [작성자 비공개] docs: Dailymotion 크롤러 함수 문서화 개선`
  - `2025-06-11 76c3dea [작성자 비공개] feat: 무단 도용 콘텐츠 검색 서비스 초기 구현`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Dailymotion crawler API and crawler documentation cleanup`.

## R-4e5f3cfc1836 코드크레용 · Search API filtering and keyword batching

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Similarity threshold and keyword matching should be checked against real false-positive examples.

작업 기간:

- 2025-06-11

원문 작업 설명:

- Added/expanded POST `/:platform` API handling with platform validation and keyword array input.
  - Current source batches keywords in chunks of 10 and runs crawler calls with `Promise.all`.
  - Filters results by normalized title matching, exact word match, substring match, and Levenshtein similarity threshold.
  - Normalizes result links and groups non-empty results under the keyword that produced them.

변경 파일·영역:

- `src/index.ts`
  - `api/index.js`
  - `src/service/title-checker.ts`
  - `api/service/title-checker.js`
  - `src/types/index.ts`

커밋 근거:

- `2025-06-11 76c3dea [작성자 비공개] feat: 무단 도용 콘텐츠 검색 서비스 초기 구현`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Search API filtering and keyword batching`.

## R-7b68bd2d1edd 코드크레용 · Browser UI for platform tabs, keyword storage, and result display

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need browser/deployed verification for long keyword lists and large result sets.

작업 기간:

- 2025-06-11

원문 작업 설명:

- Added browser UI with platform tabs for Bilibili TV, Bilibili, and Dailymotion.
  - Added default English/Chinese keyword lists and localStorage persistence per platform.
  - Added keyword add/remove controls, loading/error states, and grouped result sections with thumbnails and outbound links.
  - Initially split JS/CSS into separate files, then folded frontend assets back into `src/index.html`.

변경 파일·영역:

- `src/index.html`
  - `src/script.js`
  - `src/styles.css`
  - `package.json`

커밋 근거:

- `2025-06-11 76c3dea [작성자 비공개] feat: 무단 도용 콘텐츠 검색 서비스 초기 구현`
  - `2025-06-11 da547ad [작성자 비공개] refactor: 프론트엔드 파일 통합`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/automation-tools-all-branches-raw-work-units.md` · `Browser UI for platform tabs, keyword storage, and result display`.

## R-9ea4798d1369 코드크레용 · Stream widget guide page renewal

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check final deployed guide copy/screenshots if turning into user-facing resume wording.

작업 기간:
2025-06-30

원문 작업 설명:

- Stream widget guide content was renewed with new case images and locale strings.
  - Page-level guide work, not just copy changes.

변경 파일·영역:
`pages/guide/streamwidget.tsx`, `public/images/stream-widget/*`, `public/locales/*/common.json`

커밋 근거:

- `2025-06-30 3fb72db6 [작성자 비공개] 스트림 위젯 페이지 리뉴얼`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Stream widget guide page renewal`.

## R-a38619d61cd6 코드크레용 · ShowTime referer app bar and footer visibility

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm final behavior after reverts and follow-up patch.

작업 기간:
2024-12-24 to 2024-12-27

원문 작업 설명:

- Added referer-based app shell behavior so ShowTime-opened webviews can hide or adjust nav/footer.
  - Revert commits mean the final behavior should be checked at HEAD before claiming exact UX.

변경 파일·영역:
`atoms/referer.ts`, `libs/useReferer.ts`, `components/Nav/index.tsx`, `components/footer.tsx`, `components/layout.tsx`, `pages/products/[id]/index.tsx`, `pages/seller/[id]/index.tsx`

커밋 근거:

- `2024-12-24 9fcce53d [작성자 비공개] 쇼타임에서 열린 웹뷰는 앱바와 푸터가 보이지 않는다.`
  - `2024-12-27 e67f2e6c [작성자 비공개] 앱바 렌더링 조건 수정`
  - `2024-12-27 46fa733e [작성자 비공개] Revert "쇼타임에서 열린 웹뷰는 앱바와 푸터가 보이지 않는다."`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `ShowTime referer app bar and footer visibility`.

## R-5d2a88813c4d 코드크레용 · English and Traditional Chinese localization expansion

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Separate pure translation work from routing/config work if a tighter resume unit is needed.

작업 기간:
2024-07-04 to 2024-07-08

원문 작업 설명:

- Added English and Traditional Chinese locale files and connected them to existing i18n, sitemap, scanner, and locale model paths.
  - Included copy/layout fixes for longer translated strings.

변경 파일·영역:
`public/locales/en-US/common.json`, `public/locales/zh-TW/common.json`, `next-i18next.config.js`, `next-sitemap.config.js`, `components/LangPicker/index.tsx`, `domain/models/locale/type.ts`, `translation/index.js`

커밋 근거:

- `2024-07-04 7d09f5b4 [작성자 비공개] 영번역 추가`
  - `2024-07-04 e3d425d8 [작성자 비공개] 대만 번체 추가`
  - `2024-07-05 f30ede3d [작성자 비공개] 영문, 중문(번체) 번역 추가, 오타 수정 (#580)`
  - `2024-07-05 55efafcc [작성자 비공개] 번역 업로드 중국어 추가, 미사용 번역 제거`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `English and Traditional Chinese localization expansion`.

## R-7522a7730ac0 코드크레용 · Localized button href and external link handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check route helper conventions and edge cases for protocol-relative or mail/tel links.

작업 기간:
2024-07-05 to 2024-07-10

원문 작업 설명:

- Button link behavior was adjusted to add locale prefixes for internal routes while preserving external URLs.

변경 파일·영역:
`components/Button/index.tsx`

커밋 근거:

- `2024-07-05 0ef3e938 [작성자 비공개] 버튼에 href 값이 있는 경우 로케일 값 추가 해서 라우팅`
  - `2024-07-08 1aa9ae8b [작성자 비공개] props로 받은 href가 외부사이트 인 경우 가공없이 그대로 사용`
  - `2024-07-10 85fe527f [작성자 비공개] props로 받은 href가 외부사이트 인 경우 가공없이 그대로 사용 (#582)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Localized button href and external link handling`.

## R-5b77d710c25c 코드크레용 · Product review feature across product detail and my page

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify backend API names and final review UX flow from the deployed branch.

작업 기간:
2024-05-02 to 2024-05-08

원문 작업 설명:

- Added product review domain/repositories, review pages, photo review summary, my-page review creation/update views, and validation.
  - Follow-up commits handled error messages, line breaks, and save failure state.

변경 파일·영역:
`atoms/review.ts`, `components/mypage/review/*`, `components/product/components/ProductReviews/*`, `repository/review/*`, `pages/mypage/review/*`, `pages/products/review/[id]/index.tsx`, `validation/review/index.ts`

커밋 근거:

- `2024-05-02 3a0196e7 [작성자 비공개] 상품 리뷰 (#553)`
  - `2024-05-02 2a6d9a59 [작성자 비공개] 장문 리뷰 개행 (#557)`
  - `2024-05-02 69452c97 [작성자 비공개] 리뷰 저장 필수 에러메시지 추가 (#558)`
  - `2024-05-08 e351e4b3 [작성자 비공개] [FIX-1110] 리뷰 저장 에러 시 후처리 추가  (#574)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Product review feature across product detail and my page`.

## R-870271a46098 코드크레용 · Reviewable order and purchase-confirmation conditions

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm final business rule with order state definitions.

작업 기간:
2024-05-02 to 2024-05-03

원문 작업 설명:

- Tightened review availability logic around purchase confirmation, product grouping, and returned option cases.

변경 파일·영역:
`components/mypage/review/components/ConfirmButton.tsx`, `components/mypage/review/components/ReviewableOrders.tsx`, `components/mypage/components/OrderItemController.tsx`, `domain/models/order/entity/order.ts`

커밋 근거:

- `2024-05-03 8b34687b [작성자 비공개] 구매확정한, orderId와 orderItemList만구매 확정 처리 (#567)`
  - `2024-05-03 25fe5234 [작성자 비공개] 주문 목록 > 주문 항목은 같은 productId 항목들이 모두 구매확정일 때만 리뷰작성 버튼을 노출한다. (#563)`
  - `2024-05-03 47674636 [작성자 비공개] [FIX-1102] 주문의 옵션 중 반품완료가 있을 경우, 리뷰 작성 가능 (#573)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Reviewable order and purchase-confirmation conditions`.

## R-0bf5f80e92f8 코드크레용 · Product detail review tab query string navigation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether this affected deep links, locale switching, or browser history behavior.

작업 기간:
2024-05-03 to 2024-05-08

원문 작업 설명:

- Product detail tab state was moved into query string and review count UI was connected to review-tab navigation.

변경 파일·영역:
`components/product/components/ProductDetailTab.tsx`, `components/product/components/InformationArea.tsx`, `components/LangPicker/index.tsx`

커밋 근거:

- `2024-05-03 52a69d2b [작성자 비공개] 상품 상세 탭 queryString 화, 상품 정보 리뷰 카운트 클릭 시 리뷰 탭으로 이동 (#572)`
  - `2024-05-08 26863344 [작성자 비공개] 상품 정보 리뷰 카운트 렌더링 조건 수정`
  - `2024-05-08 6e3ab29e [작성자 비공개] 리뷰 카운트 렌더링 조건 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Product detail review tab query string navigation`.

## R-1016d1dee47f 코드크레용 · Sale-type-specific product cards and product listings

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Map exact sale types to business terminology before presenting externally.

작업 기간:
2024-04-09 to 2024-04-16

원문 작업 설명:

- Split product listing/card UI by sale type, including draw/limit specific cards, timers, status tabs, and related listing pages.
  - Follow-up commits addressed listing exclusion and spacing issues.

변경 파일·영역:
`components/ProductCard/*`, `components/Products/draw/*`, `components/Products/limit/*`, `components/Products/ProductStatusTabs.tsx`, `libs/timerUtils.ts`, `pages/products/{draw,limit,new,curation}.tsx`

커밋 근거:

- `2024-04-09 e5a9dca7 [작성자 비공개] 판매유형 별 상품 카드 (#520)`
  - `2024-04-16 dff803a4 [작성자 비공개] 종료 상품 제외 버그 수정 (#537)`
  - `2024-04-16 6024307a [작성자 비공개] [FIX-1041] 상품 페이지 타이틀, 옵션 간격 조절 (#535)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Sale-type-specific product cards and product listings`.

## R-b2d85734dccb 코드크레용 · Stream widget speech and confetti integration

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether Polly was production-enabled or feature-flagged.

작업 기간:
2024-04-09

원문 작업 설명:

- Added stream widget speech support and visual celebration behavior with AWS-related integration and package changes.

변경 파일·영역:
`components/product/components/StreamWidget/*`, `domain/models/streamWidget/index.ts`, `hooks/useSpeech/index.ts`, `libs/aws.ts`, `package.json`

커밋 근거:

- `2024-04-09 9edb53ee [작성자 비공개] 스트림 위젯 Polly, confetti 추가 (#527)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Stream widget speech and confetti integration`.

## R-1d8dcd375a35 코드크레용 · Product detail layout, timer, and GNB fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm which CSR timer approach survived after reverts.

작업 기간:
2024-04-16 to 2024-04-17

원문 작업 설명:

- Product detail page rendering was adjusted around timer/client-side rendering, layout overflow, title/GNB, and tab styling.
  - Revert evidence exists around timer CSR, so final state should be checked before claiming implementation details.

변경 파일·영역:
`pages/products/[id]/index.tsx`, `components/templates/Product/index.tsx`, `components/product/components/*`, `components/Nav/index.tsx`, `contexts/LayoutContext.tsx`

커밋 근거:

- `2024-04-16 e8948e9f [작성자 비공개] 상품페이지 간격 조절, LayoutContext overflow 수정`
  - `2024-04-16 9252d3b7 [작성자 비공개] 상품 상세 페이지 타이머 csr 적용`
  - `2024-04-16 764457bf [작성자 비공개] 시간 정보 포함된 컴포넌트 클라이언트 사이드로 변경`
  - `2024-04-17 cb963458 [작성자 비공개] 타이틀 영역 간격 조절, gnb 수정 (#541)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Product detail layout, timer, and GNB fixes`.

## R-e79b9857804c 코드크레용 · Login and signup flow refactor

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Split domestic/overseas and SNS join details if later writing resume bullets.

작업 기간:
2024-03-25 to 2024-03-27

원문 작업 설명:

- Reworked login/signup into new auth component paths, added domestic/overseas email join paths, SNS login hooks, password recovery/change components, and route/repository updates.

변경 파일·영역:
`components/auth/Join/*`, `components/auth/Login/*`, `pages/join/*`, `pages/login/*`, `repository/auth/*`, `repository/sns/*`, `domain/models/sns/*`, `libs/sns.ts`

커밋 근거:

- `2024-03-25 529a1322 [작성자 비공개] 로그인/회원가입 개선 (#503)`
  - `2024-03-26 4a227557 [작성자 비공개] sns 연결 데이터 바인딩 수정, 번역 수정 (#511)`
  - `2024-03-27 64b48272 [작성자 비공개] [FIX-986] 로그인 페이지 디자인 수정 (#516)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Login and signup flow refactor`.

## R-76582f3382a0 코드크레용 · Signup, code field, and phone verification edge-case fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify whether "foreign" means non-Korean phone formats or nationality-specific flows.

작업 기간:
2024-03-26 to 2024-03-27

원문 작업 설명:

- Follow-up fixes for signup verification code input, SNS join foreign phone entry, phone conversion, and related translations.

변경 파일·영역:
`components/auth/components/EmailCode.tsx`, `components/Input/CodeField.tsx`, `pages/join/*`, `public/locales/*`, `repository/auth/type.ts`

커밋 근거:

- `2024-03-26 5a519ee5 [작성자 비공개] [FIX-991, FIX-994, FIX-997] 이메일 코드 필드 수정 (#509)`
  - `2024-03-26 75c6cce0 [작성자 비공개] [FIX-998] sns 가입 시도 시 외국인 번호 입력 (#513)`
  - `2024-03-27 0294f399 [작성자 비공개] [FIX-1012] 외국인 가입 시 전화 번호 컨버팅 (#514)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Signup, code field, and phone verification edge-case fixes`.

## R-5a0300631ce8 코드크레용 · My page profile edit and account settings

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm user account API boundaries with backend schema.

작업 기간:
2024-03-04 to 2024-03-06

원문 작업 설명:

- Added/reshaped profile edit pages for email/name/nickname/password/phone, avatar change handling, withdrawal page changes, and validation fixes.

변경 파일·영역:
`components/mypage/Profile/*`, `pages/mypage/profile/*`, `components/mypage/*`, `repository/user/*`, `repository/auth/type.ts`, `route/paths.ts`

커밋 근거:

- `2024-03-04 3a65eeef [작성자 비공개] 회원 정보 수정 (#482)`
  - `2024-03-04 635a1e07 [작성자 비공개] 회원탈퇴 페이지 수정 (#485)`
  - `2024-03-05 c7cd4264 [작성자 비공개] 아바타 이미지 변경 에러 시 버튼 loading 값 false (#492)`
  - `2024-03-06 e97bc9eb [작성자 비공개] [FIX-965] 회원 정보 수정 유효성 검사 수정 (#494)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `My page profile edit and account settings`.

## R-5f36b35941f5 코드크레용 · Home renewal sections and card layout

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check whether the home renewal was a single launch milestone or part of a larger redesign.

작업 기간:
2024-02-01 to 2024-02-07

원문 작업 설명:

- Reworked the home page into card/list/banner/section components, theme repository usage, and timer-type sections.
  - Several spacing/style follow-ups landed immediately after.

변경 파일·영역:
`components[로컬 경로 비공개]`, `components/ProductCard/*`, `components[로컬 경로 비공개]`, `repository/theme/*`, `domain/models/theme/entity.ts`, `pages/index.tsx`

커밋 근거:

- `2024-02-02 a5256b90 [작성자 비공개] 홈 리뉴얼 (#429)`
  - `2024-02-06 04170567 [작성자 비공개] [FIX-881, FIX-882, FIX-884] 홈 간격 조절 (#441)`
  - `2024-02-06 d7d1a9ba [작성자 비공개] 홈 섹션 limit 수정 , (#455)`
  - `2024-02-07 9ce3f79d [작성자 비공개] [FIX-881, FIX-884] 홈 스타일 미적용 부분 수정 (#462)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Home renewal sections and card layout`.

## R-3b83742ec0a9 코드크레용 · Product card design system

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm how much of this became shared across all product list surfaces.

작업 기간:
2024-01-26 to 2024-02-07

원문 작업 설명:

- Introduced reusable product card components, labels, timer, provider context, icon assets, and later card prop/label/editing fixes.

변경 파일·영역:
`components/ProductCard/*`, `components/ProductTimer/index.tsx`, `public/images/icon/*`, `components/Products/*`, `components/SellerShop/component/InfiniteProducts.tsx`

커밋 근거:

- `2024-01-26 39f75ca0 [작성자 비공개] 상품 카드 디자인 시스템 (#411)`
  - `2024-02-06 d818c6e9 [작성자 비공개] 상품 카드 디자인 수정, Props 수정 (#456)`
  - `2024-02-06 5d93a154 [작성자 비공개] 상품 카드 라벨 우선 순위 적용 및 주석 추가 (#443)`
  - `2024-02-07 3ac1032d [작성자 비공개] [FIX-929] 상품 카드 편집 시 checkbox 위치 조정 (#468)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Product card design system`.

## R-c031a3aa53c6 코드크레용 · Store, limit, draw navigation and shortcut menu

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Determine whether "BID" related routes were deprecated or hidden separately by collaborators.

작업 기간:
2024-02-22

원문 작업 설명:

- Navigation and shortcut entry points for store, limited sale, draw, new, and curation product pages were reorganized.

변경 파일·영역:
`components/Nav/index.tsx`, `components/ShortCutMenu/index.tsx`, `components/Products/InfiniteProductsView.tsx`, `pages/products/{store,limit,draw,new,curation}.tsx`, `public/images/menu/*`, `route/paths.ts`

커밋 근거:

- `2024-02-22 82a8e09c [작성자 비공개] 스토어, 선착순, 드로우 메뉴 개선 (#477)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Store, limit, draw navigation and shortcut menu`.

## R-05caed80cb3a 코드크레용 · Back-to-top button system

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm which pages expose it and whether mobile drawer cases differ.

작업 기간:
2024-02-23 to 2024-03-06

원문 작업 설명:

- Added a BackToTop context/hook/component and integrated it with cart, drawer, and app-level layout surfaces.
  - Follow-ups tuned option reset/update behavior.

변경 파일·영역:
`components/BackToTop/*`, `pages/_app.tsx`, `components/Cart/*`, `components/Nav/components/BottomNav.tsx`, `components/product/components/ProductDrawer.tsx`

커밋 근거:

- `2024-02-23 d7d25ceb [작성자 비공개] Back to top Button (#479)`
  - `2024-03-06 f95aece4 [작성자 비공개] BackToTop 렌더링 되면 옵션 값 초기화 되도록 수정 (#496)`
  - `2024-03-06 de9b6779 [작성자 비공개] 스크롤 최상단에서, backToTop Option 업데이트 불가 (#497)`
  - `2024-03-06 91969aa2 [작성자 비공개] backToTop 옵션 업데이트 위치 변경 (#499)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Back-to-top button system`.

## R-540be87c402e 코드크레용 · Language picker addition

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later SEO/i18n collaborator commits changed language behavior; do not over-attribute final current behavior to this unit alone.

작업 기간:
2024-01-26

원문 작업 설명:

- Added language picker UI and footer/locales integration.

변경 파일·영역:
`components/LangPicker/index.tsx`, `components/footer.tsx`, `public/locales/ja-JP/common.json`, `public/locales/ko-KR/common.json`

커밋 근거:

- `2024-01-26 89096f15 [작성자 비공개] 언어 선택 추가 (#427)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Language picker addition`.

## R-f01a6defa5d9 코드크레용 · Base i18n setup and Japanese localization

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Because the first i18n commit is very large, split exact page coverage only if needed.

작업 기간:
2023-07-04 to 2023-12-19

원문 작업 설명:

- Initial i18n implementation touched almost every page/component, added Korean/Japanese locale namespaces, locale model/config, and later scanner/build namespace cleanup.

변경 파일·영역:
`next-i18next.config.js`, `public/locales/{ja-jp,ko-kr}/*`, `libs/ja.ts`, `domain/models/locale/type.ts`, `i18next-scanner.config.js`, many component/page translation callsites

커밋 근거:

- `2023-07-04 af4cf00b [작성자 비공개] 국제화 설정 및 일본어 국제화 작업 (#115)`
  - `2023-12-11 62f79a85 [작성자 비공개] 국제화, 네임 스페이스 통일 (#369)`
  - `2023-12-19 08847f1a [작성자 비공개] i18n 스캐너 추가, 빌드 플로우 수정 (#390)`
  - `2023-12-28 469ba34e [작성자 비공개] 국제화 개선 (#398)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Base i18n setup and Japanese localization`.

## R-971484ef9038 코드크레용 · Seller sales management table data flow

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Collaborator commits also changed seller center exchange/refund/order tables; keep attribution separated.

작업 기간:
2023-07-04

원문 작업 설명:

- Seller sales pages for order/cancel/exchange/refund gained initial data fetching and UI state handling.

변경 파일·영역:
`components/mypage/seller/sales/{Cancel,Exchange,Order,Refund}/*`

커밋 근거:

- `2023-07-04 31799874 [작성자 비공개] 판매 관리 초기 데이터 취득 (#119)`
  - `2023-07-13 2f9eb27d [작성자 비공개] 판매관리 > 주문/배송 버튼 활성화 (#140)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Seller sales management table data flow`.

## R-01eafbc6d877 코드크레용 · Seller product management navigation and shipping settings

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check if "STEP 1" indicates partial rollout.

작업 기간:
2023-11-07 to 2023-12-05

원문 작업 설명:

- Improved seller product management navigation/breadcrumbs and added/modified seller address, shipping/refund shipping fee, and draw sale shipping setting flows.

변경 파일·영역:
`components/mypage/seller/Management/*`, `components/modals/SellerAddress.tsx`, `repository/seller/index.ts`, `domain/models/product/entity.ts`, `domain/models/seller/entity.ts`

커밋 근거:

- `2023-11-07 f772dd66 [작성자 비공개] 상품관리 > 상품 등록/수정 Nav 개선 (#318)`
  - `2023-12-05 9bedb6a4 [작성자 비공개] 배송비 설정 STEP 1 (#320)`
  - `2023-12-28 f872143a [작성자 비공개] 판매방식 드로우 일 때 배송 설정 변경 (#391)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Seller product management navigation and shipping settings`.

## R-2bc278467ba9 코드크레용 · Shared image upload utility and validation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm final storage provider and whether Cloudflare upload was used everywhere or only selected forms.

작업 기간:
2023-06-28 to 2023-11-07

원문 작업 설명:

- Created reusable upload path and Cloudflare uploader utility, then fixed validation/cancel/maximum upload edge cases.

변경 파일·영역:
`components/Input/Upload.tsx`, `utils/cloudflareUploader/index.ts`, support/contact/suggestion forms, seller management forms, profile forms

커밋 근거:

- `2023-06-28 e8b040f3 [작성자 비공개] 이미지 업로드 유효성 검사 추가  (#122)`
  - `2023-07-04 c1c095d4 [작성자 비공개] 이미지 업로더 생성 (#124)`
  - `2023-09-13 3e7250af [작성자 비공개] [FIX-596] 이미지 업로드 취소 함수 파라미터 수정 (#258)`
  - `2023-11-07 a3e8b907 [작성자 비공개] [FIX-665] 이미지 업로드 버그 수정 (#312)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Shared image upload utility and validation`.

## R-d5a358f49d88 코드크레용 · Encrypted local storage for user/search state

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check exact algorithm/package before making any security claim.

작업 기간:
2023-06-12

원문 작업 설명:

- Introduced encrypted local storage wrapper and wired it into user/auth/search-related state and fetch/user hooks.

변경 파일·영역:
`libs/cryptoLocalStorage.ts`, `atoms/user.ts`, `infra/Fetch.ts`, `libs/useLocalUser.ts`, `libs/useUser.ts`, `pages/login/index.tsx`, `pages/sns/*`

커밋 근거:

- `2023-06-12 5b7f16e1 [작성자 비공개] LocalStorage 암호화 (#93)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Encrypted local storage for user/search state`.

## R-5523f8432b91 코드크레용 · Product information notice defaults and form validation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Clarify whether these are Korean product disclosure fields.

작업 기간:
2023-06-26 to 2023-10-20

원문 작업 설명:

- Improved seller product information notice inputs, defaults, and related validation state.

변경 파일·영역:
`components/mypage/seller/Management/Detail/*`, `domain/models/product/entity.ts`, `validation/product/*`

커밋 근거:

- `2023-06-26 adfbe67e [작성자 비공개] 상품 정보제공 고시 입력 개선 (#103)`
  - `2023-06-28 37acca71 [작성자 비공개] 상품 정보제공 고시 기본 옵션 값 수정 (#116)`
  - `2023-10-20 993bad4b [작성자 비공개] 상품 정보제공 고시 초기값 추가 (#300)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Product information notice defaults and form validation`.

## R-76dbca5728a7 코드크레용 · Order checkout, foreign shipping, and address handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm country-code logic with current checkout policy.

작업 기간:
2023-08-02 to 2024-02-07

원문 작업 설명:

- Added/changed checkout address and shipping logic for foreign users, country-code changes, overseas shipping fee API calls, and domestic shipping edge cases.

변경 파일·영역:
`components/order/components/OrderAddress.tsx`, `components/modals/address.tsx`, `domain/models/address/entity.ts`, `domain/models/order/entity/order.ts`, `repository/order/*`, `validation/order/address.ts`

커밋 근거:

- `2023-10-18 b2e4ea17 [작성자 비공개] 외국인 주문 결제 (#293)`
  - `2023-10-20 48bd5b6f [작성자 비공개] 해외 배송 시 배송비 API 호출 (#296)`
  - `2023-10-26 bfee2400 [작성자 비공개] 배송지 모달, 국가 코드 변경 시 필드 초기화 (#311)`
  - `2024-02-07 560846ec [작성자 비공개] [FIX-931] 외국인 유저가 국내 발송 상품 주문시 (#470)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Order checkout, foreign shipping, and address handling`.

## R-9bf2c2906698 코드크레용 · Gift recipient page and gift order handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify whether this was limited to gift recipient flow or broader gifting feature.

작업 기간:
2023-08-23 to 2024-03-22

원문 작업 설명:

- Built gift recipient page/domain/repository/validation and handled gift card layout and cancellation cases.

변경 파일·영역:
`components/gift/Recipient/*`, `components/gift/components/GiftCard/index.tsx`, `domain/models/gift/recipient/entity.ts`, `repository/gift/*`, `pages/gift/[id]/recipient.tsx`, `validation/gift/index.ts`

커밋 근거:

- `2023-08-23 ef312d43 [작성자 비공개] 선물 받기 페이지 (#218)`
  - `2023-08-23 55d0c2ee [작성자 비공개] 선물 취소 케이스 추가 (#223)`
  - `2023-08-25 7877cae5 [작성자 비공개] 선물카드 텍스트 줄 바꿈 (#229)`
  - `2024-03-22 8914ffd6 [작성자 비공개] [FIX-621] 선물 받는 분 이름 정보 말줄임 추가 (#504)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Gift recipient page and gift order handling`.

## R-030388c213b5 코드크레용 · GA4 event instrumentation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Validate final event taxonomy with analytics plan if available.

작업 기간:
2023-08-09 to 2023-11-29

원문 작업 설명:

- Added GA4/gtag event model and event calls across account, order, product, search, and share/like flows; follow-ups corrected amounts and event timing/guards.

변경 파일·영역:
`domain/models/gtag/index.ts`, `libs/gtag.ts`, `pages/_app.tsx`, `pages/_document.tsx`, login/join/order/product/search pages

커밋 근거:

- `2023-08-09 e4719d7c [작성자 비공개] GA4 이벤트 추가 (#163)`
  - `2023-09-14 44e4c5a4 [작성자 비공개] [FIX-565] ga4 금액 차이 수정 (#259)`
  - `2023-09-22 69b301e4 [작성자 비공개] 에러코드 가 없을 때만 ga4 viewItem 추가되도록 수정 (#270)`
  - `2023-11-29 85298a40 [작성자 비공개] gtag 회원가입 클릭 시점 변경 (#366)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `GA4 event instrumentation`.

## R-9d813d94de80 코드크레용 · Secret product entry code page

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether backend validation or route guards were elsewhere.

작업 기간:
2023-08-07

원문 작업 설명:

- Added entry code UI for secret product access.

변경 파일·영역:
`components/SecretProduct/index.tsx`, `public/images/secret/heart.svg`

커밋 근거:

- `2023-08-07 c65028bd [작성자 비공개] 시크릿 상품 입장 코드 입력페이지 (#193)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Secret product entry code page`.

## R-07e856e2fb68 코드크레용 · Stream widget guide and seller stream-widget controls

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Separate guide content work from seller-product configuration if needed.

작업 기간:
2023-08-06 to 2023-11-26

원문 작업 설명:

- Added the stream widget guide page and later added seller management controls for enabling stream widget usage.

변경 파일·영역:
`pages/guide/streamwidget.tsx`, `public/images/stream-widget/*`, `components/mypage/seller/Management/Detail/components/DetailStreamWidget.tsx`, `components/product/components/StreamWidget/*`

커밋 근거:

- `2023-08-06 25f2cd7f [작성자 비공개] 스트림 위젯 가이드 페이지 (#190)`
  - `2023-11-01 eef1ac2a [작성자 비공개] 스트림 위젯 가이드 페이지 수정`
  - `2023-11-09 afb3ea23 [작성자 비공개] 셀러가 스트림 위젯을 사용 가능하도록 개선 (#324)`
  - `2023-11-26 b7481e70 [작성자 비공개] 스트림위젯 페이지 SWR 옵션 수정 (#362)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Stream widget guide and seller stream-widget controls`.

## R-9b2f7ea7dbce 코드크레용 · Seller shop page

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm if seller shop had later collaborator SEO/meta changes.

작업 기간:
2023-11-29 to 2024-02-08

원문 작업 설명:

- Added seller shop page and product list components with pagination follow-up.

변경 파일·영역:
`components/SellerShop/*`, `pages/seller/[id]/index.tsx`, `repository/seller/index.ts`, `domain/models/seller/entity.ts`, `domain/models/product/entity.ts`

커밋 근거:

- `2023-11-29 3a7da018 [작성자 비공개] 셀러샵 STEP 1 (#363)`
  - `2024-02-08 00cec0f9 [작성자 비공개] 셀러샵 다음 페이지 호출 추가 (#473)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Seller shop page`.

## R-35daed95b701 코드크레용 · Support contact form improvements

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check exact contact form fields and answer-complete option semantics.

작업 기간:
2023-11-09 to 2023-11-29

원문 작업 설명:

- Improved 1:1 inquiry UI and validation behavior.

변경 파일·영역:
`components/support/Contact/index.tsx`, `components/support/components/SupportPhoneField.tsx`, `public/locales/*/support.json`

커밋 근거:

- `2023-11-09 5cae4cff [작성자 비공개] 1:1 문의 개선 (#321)`
  - `2023-11-29 a4031ff9 [작성자 비공개] 답변 완료 안내 미선택 시 유효성 검사 하지 않음 (#364)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Support contact form improvements`.

## R-74f873cce07d 코드크레용 · Member signup, email change, and marketing preference improvements

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify final privacy/marketing opt-out compliance language before using externally.

작업 기간:
2023-11-20 to 2023-12-29

원문 작업 설명:

- Improved join form structure, email-change flow, marketing mail opt-out, and foreign signup conditions.

변경 파일·영역:
`components/Join/*`, `components/mypage/Profile/*`, `repository/auth/*`, `validation/auth/join.ts`, `public/locales/*/user.json`, `public/locales/*/profile.json`

커밋 근거:

- `2023-11-20 a703feef [작성자 비공개] 광고성 메일 수신거부 (#342)`
  - `2023-11-21 f5798ca1 [작성자 비공개] 회원 가입 개선 (#337)`
  - `2023-11-21 917f0356 [작성자 비공개] 회원 정보 > 이메일 변경하기 (#343)`
  - `2023-12-29 52abb44d [작성자 비공개] 외국인 가입조건 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Member signup, email change, and marketing preference improvements`.

## R-c8bdd4d24fa7 코드크레용 · Draw and stream widget real-time/status handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether these are one event widget or multiple draw product surfaces.

작업 기간:
2023-07-18 to 2023-09-26

원문 작업 설명:

- Worked on draw entry ticket/snackbar behavior, stream widget addition, real-time first participant banner, and draw end-state handling.

변경 파일·영역:
`components/product/components/Draw*`, `components/product/components/StreamWidget/*`, `components/templates/Product/context/DrawFormProvider.tsx`, draw domain/model files

커밋 근거:

- `2023-07-18 20bcfa5f [작성자 비공개] 응모권, 스낵바 추가 (#123)`
  - `2023-09-25 fb008b05 [작성자 비공개] 스트림 위젯 추가  (#265)`
  - `2023-09-25 872082db [작성자 비공개] 첫 참여자 정보 실시간 배너 노출 (#275)`
  - `2023-09-25 a5f528a3 [작성자 비공개] [FIX-608] 드로우 시 응모 종료 후 상태 모두 응모 종료 처리 (#273)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Draw and stream widget real-time/status handling`.

## R-90d90eeee0e3 코드크레용 · Infinite scroll and listing state fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check duplicated work across product/category/seller shop lists.

작업 기간:
2023-07-17 to 2024-04-29

원문 작업 설명:

- Multiple passes on infinite scroll behavior, back-navigation restoration, product listing state, and later listing improvements.

변경 파일·영역:
`components/Products/*`, `components/Category/InfiniteProducts.tsx`, `components/SellerShop/component/InfiniteProducts.tsx`, `pages/category/[id].tsx`

커밋 근거:

- `2023-07-17 885af7aa [작성자 비공개] 인피니티 스크롤 개선 (#129)`
  - `2023-07-19 076d72d1 [작성자 비공개] 인피니티 스크롤 뒤로가기 수정 (#151)`
  - `2023-07-21 9e17c6aa [작성자 비공개] 인피니티 스크롤 동작 수정, (#158)`
  - `2024-04-29 8ebeb026 [작성자 비공개] 인피니티 스크롤 개선 (#530)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Infinite scroll and listing state fixes`.

## R-c7762e285779 코드크레용 · Order, claim, return, and exchange fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Separate buyer my-page flow from seller sales/claim flow if needed.

작업 기간:
2023-06-21 to 2024-02-06

원문 작업 설명:

- Fixed validations and display logic around returns, refunds, exchanges, photos, fees, partial returns, and order item states.

변경 파일·영역:
`components/mypage/order/*`, `components/mypage/components/OrderItem*`, `domain/models/order/entity/order.ts`, `validation/claim/*`, `repository/sales/*`

커밋 근거:

- `2023-06-21 8c2c7a59 [작성자 비공개] 반품 시 유효성 검사 추가 (#112)`
  - `2023-06-28 3bc035f1 [작성자 비공개] 환불 금액 수수료 항목 제거 (#121)`
  - `2023-08-08 638ee50d [작성자 비공개] [FIX-453] 교환/반품 사진 첨부 유효성검사 수정 (#196)`
  - `2024-02-06 2bedf361 [작성자 비공개] 부분 반품 시 노출 가격 및 반품 가격 수정 (#457)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Order, claim, return, and exchange fixes`.

## R-db2be97d38df 코드크레용 · Product registration/edit image and validation fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm exact product type coverage: normal, limit, draw, bid.

작업 기간:
2023-07-31 to 2023-09-08

원문 작업 설명:

- Adjusted seller product creation/edit validation, image display logic, defaults, and max-purchase quantity checks.

변경 파일·영역:
`components/mypage/seller/Management/*`, `validation/product/*`, `domain/models/product/entity.ts`, image/upload components

커밋 근거:

- `2023-07-31 e72e1e29 [작성자 비공개] 상품 등록/수정 유효성 검사  (#166)`
  - `2023-08-01 0be20514 [작성자 비공개] 상품등록/수정 이미지 표시 로직 변경 (#171)`
  - `2023-09-07 c77261ab [작성자 비공개] [FIX-579][FIX-580] 상품 등록 초기 값 설정 (#246)`
  - `2023-09-08 1bf9cb27 [작성자 비공개] 최대 구매 수량 유효성 검사 수정 (#253)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Product registration/edit image and validation fixes`.

## R-bc48f55a4e35 코드크레용 · App shell, build, cache, and loader cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Keep this as raw infra/support work, not a single feature claim.

작업 기간:
2023-06-07 to 2024-06-20

원문 작업 설명:

- Infrastructure-adjacent work around loader behavior, caching/revalidation, Next build settings, and desktop rendering condition.

변경 파일·영역:
`next.config.js`, `package.json`, `infra/Fetch.ts`, `contexts/LoaderContext.tsx`, `pages/order/success.tsx`, `libs/useMutation.ts`

커밋 근거:

- `2023-06-07 9b2ae300 [작성자 비공개] 캐시 시간 조절, 테스트 페이지 작성 (#97)`
  - `2023-06-14 92613569 [작성자 비공개] 로더 추가, 캐시 시간 조절 (#108)`
  - `2023-07-04 c8c6fb79 [작성자 비공개] outputFileTracing 설정 추가 (#132)`
  - `2024-06-20 58591b6f [작성자 비공개] 의도적으로 open 할 경우 데스크탑에서도 렌더링`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `App shell, build, cache, and loader cleanup`.

## R-be8ed75d5298 코드크레용 · Admin app bootstrap and Minimal UI foundation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Separate original template import from project-specific adaptation if needed.

작업 기간:
2024-05-08 to 2024-06-05

원문 작업 설명:

- Bootstrapped the admin Next app, imported/adapted Minimal UI component/theme foundation, and set up routing/theme/app structure.

변경 파일·영역:
`package.json`, `next.config.mjs`, `src/app/*`, `components/*`, `src/theme/*`, `src/routes/*`, `infra/*`

커밋 근거:

- `2024-05-08 03012f8 [작성자 비공개] next 설치`
  - `2024-05-09 80eb4c2 [작성자 비공개] Minimal UI 이식`
  - `2024-06-05 e47b85d [작성자 비공개] 환경 구성, 로그인 구현 (#1)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Admin app bootstrap and Minimal UI foundation`.

## R-064b5c8faa44 코드크레용 · Admin login, auth provider, session storage, and 401/403 redirects

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm final auth persistence policy and token refresh behavior.

작업 기간:
2024-05-09 to 2024-06-21

원문 작업 설명:

- Implemented admin login, auth provider/user state, session storage changes, and fetch-level unauthorized/forbidden redirect behavior.

변경 파일·영역:
`components/Login/index.tsx`, `contexts/AuthProvider.tsx`, `src/contexts/AuthProvider.tsx`, `repository/auth/*`, `src/repository/auth/*`, `src/infra/Fetch.ts`, `src/atoms/user.ts`

커밋 근거:

- `2024-05-09 f8fb125 [작성자 비공개] 로그인 구현`
  - `2024-05-30 9bef431 [작성자 비공개] 로그인 정보 세션스토리지로 변경`
  - `2024-06-19 a829c13 [작성자 비공개] 권한 문제시 로그인 페이지로 이동`
  - `2024-06-21 e9357dc [작성자 비공개] http status 401 403 코드일 경우 로그인 페이지로 이동 (#26)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Admin login, auth provider, session storage, and 401/403 redirects`.

## R-090faa21d819 코드크레용 · Admin order list, claims, and redelivery sections

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Clarify whether "redelivery" maps to exchange/re-shipment or separate warehouse workflow.

작업 기간:
2024-05-10 to 2024-06-21

원문 작업 설명:

- Built admin order list and related claims/redelivery pages, models, repositories, and later issue fixes/label changes.

변경 파일·영역:
`components/Order/*`, `src/app/order/*`, `src/components/order/*`, `repository/order/*`, `repository/claim/*`, `repository/warehouse/*`, `domain/models/order/*`, `domain/models/claim/*`

커밋 근거:

- `2024-05-10 291e1f5 [작성자 비공개] 주문목록 데이터 취득`
  - `2024-05-17 b50d9b7 [작성자 비공개] 주문 섹션 작업, 파일 리네이밍`
  - `2024-06-18 04f850d [작성자 비공개] [FIX-1134, FIX-1136, FIX-1138] 어드민 오더 섹션 이슈 대응  (#16)`
  - `2024-06-21 b386029 [작성자 비공개] 주문 > 매출 > 콘텐츠 요약으로 수정 (#23)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Admin order list, claims, and redelivery sections`.

## R-8baea36e057c 코드크레용 · Admin product list table and detail dialog foundation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check whether duplicate branch-history commits created repeated "same work" evidence.

작업 기간:
2024-05-22 to 2024-06-18

원문 작업 설명:

- Added product domain/repository, product table page, table head/row, detail dialog, and product section issue fixes.

변경 파일·영역:
`src/app/product/page.tsx`, `src/components/product/Products/*`, `src/domain/models/product/entity.ts`, `src/repository/product/*`, `src/components/DetailDialog/*`

커밋 근거:

- `2024-05-22 c35913b [작성자 비공개] 상품 목록 모델링, repo 적용`
  - `2024-05-22 c7e2dc0 [작성자 비공개]  상품 목록 테이블 뷰 생성, 포맷 타입 추가`
  - `2024-05-22 d496fc1 [작성자 비공개] 상품 상세 다이얼로그 생성`
  - `2024-06-18 b44394c [작성자 비공개] [FIX-1127, FIX-1129, FIX-1130, FIX-1131, FIX-1137] 어드민 상품 섹션 이슈 대응 (#15)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Admin product list table and detail dialog foundation`.

## R-702f3b7765be 코드크레용 · Product approval and product update review workflows

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm exact lifecycle: new product approval, update approval, delete confirmation.

작업 기간:
2024-05-27 to 2024-06-24

원문 작업 설명:

- Added product approval list/cards/detail dialogs for created/updated products, mutation hooks, infinite scroll, and related product review fixes.

변경 파일·영역:
`src/components/product/ProductApproveList/*`, `src/app/products/new/page.tsx`, `src/repository/product/mutate.ts`, `src/hooks/useInfiniteScroll.ts`, `src/utils/formatValue.ts`

커밋 근거:

- `2024-05-27 87d9326 [작성자 비공개] 상품 등록/수정 승인 작업`
  - `2024-06-10 1b6648f [작성자 비공개] FIX-1130 상품 삭제 시 확인 다이얼로그 추가`
  - `2024-06-11 69473fc [작성자 비공개] FIX-1131 상품 대표이미지 바인딩`
  - `2024-06-21 8fd9f64 [작성자 비공개] [FIX-1140] 상품 등록/수정 skus 표시 (#22)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Product approval and product update review workflows`.

## R-03c4fd3662e5 코드크레용 · Seller application and seller change-request approvals

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check final naming: seller registration vs seller modification approval.

작업 기간:
2024-05-27 to 2024-06-21

원문 작업 설명:

- Added seller application list, approve/reject, seller update approval/rejection, and later abstraction/refactor of seller approval list components.

변경 파일·영역:
`src/app/seller/new/page.tsx`, `src/components/seller/SellerApproveList/*`, `src/domain/models/seller/entity.ts`, `src/repository/seller/*`

커밋 근거:

- `2024-05-27 b1b6bed [작성자 비공개] 셀러 신청 목록취득`
  - `2024-05-27 21b1126 [작성자 비공개] 셀러 등록 승인/반려 작성`
  - `2024-05-27 f52f449 [작성자 비공개] 셀러 수정 승인 /반려 기능`
  - `2024-06-20 c686081 [작성자 비공개] 셀러 신청 목록 추상화`
  - `2024-06-21 e8cfd78 [작성자 비공개] 셀러 신청 목록 리팩토링 (#25)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Seller application and seller change-request approvals`.

## R-f768a40707db 코드크레용 · Draw event list and detail admin pages

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether draw event admin data comes from product repository intentionally or interim reuse.

작업 기간:
2024-05-29 to 2024-06-25

원문 작업 설명:

- Built draw event list/detail pages, row/detail components, detail table hooks, and later toolbar/export/search reset improvements.

변경 파일·영역:
`src/app/event/draw/*`, `src/components/event/Draws/*`, `src/repository/product/retrieve.ts`, `src/routes/paths.ts`, `src/utils/formatValue.ts`

커밋 근거:

- `2024-05-29 df353db [작성자 비공개] 드로우 이벤트 페이지 수정`
  - `2024-05-29 810b90a [작성자 비공개] 이벤트 로우 및 이벤트 상세 생성`
  - `2024-05-29 3fd8fb2 [작성자 비공개] 이벤트 상세 페이지`
  - `2024-06-25 f9f9ea6 [작성자 비공개] 드로우 이벤트 상세 검색 조건 초기화 및 csv 다운로드 추가 , 코드 개선`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Draw event list and detail admin pages`.

## R-f8bfbf7c66e7 코드크레용 · Seller settlement list, manual settlement, and submall creation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm "submall" payment/vendor terminology and settlement API semantics.

작업 기간:
2024-05-28 to 2024-07-16

원문 작업 설명:

- Added settlement list/confirmation, manual settlement dialog, submall creation, export/download, and auth-guarded data fetch behavior.

변경 파일·영역:
`src/app/seller/settlement/page.tsx`, `src/components/seller/SettlementList/*`, `src/repository/seller/*`, `src/components/hookForm/RHFDatePicker.tsx`

커밋 근거:

- `2024-05-28 acab203 [작성자 비공개] 정산 목록 뷰, 정산 컨펌`
  - `2024-05-28 d7d7221 [작성자 비공개] 수기 정산, 서브몰 생성`
  - `2024-06-25 01129c2 [작성자 비공개] 판매자 정산 csv 다운로드 추가 코드개선`
  - `2024-06-26 b905fd0 [작성자 비공개] 판매자 정산 export 버튼 적용`
  - `2024-07-16 26f16c5 [작성자 비공개] [FIX-1148] 판매자 정산, 인증 없이 데이터취득 하지 않음 (#29)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Seller settlement list, manual settlement, and submall creation`.

## R-cf38752413a3 코드크레용 · Support contact and customer suggestion admin

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check support domain naming and whether "customer proposal" maps to suggestion/feedback.

작업 기간:
2024-05-30 to 2024-06-25

원문 작업 설명:

- Added support schema/repository pattern, 1:1 inquiry list/detail/reply flow, suggestion list/detail flow, image rendering, and export/search reset.

변경 파일·영역:
`src/domain/models/support/entity.ts`, `src/repository/support/*`, `src/components/support/Contact/*`, `src/components/support/SuggestionList/*`, `src/app/(dashboard)/support/suggestion/page.tsx`

커밋 근거:

- `2024-05-30 f1e86cf [작성자 비공개] 서포트 스키마 정이 레포 패턴 추가`
  - `2024-05-30 86244f4 [작성자 비공개] 1대1 문의 리스트뷰 및 문의 답변 등록`
  - `2024-05-30 bae7858 [작성자 비공개] 고객 제안 생성`
  - `2024-06-18 ee93ae9 [작성자 비공개] 고객지원 > 1대1 문의 이미지 렌더링 추가 (#19)`
  - `2024-06-25 41dac2a [작성자 비공개] 1대1 문의 목록 csv다운로드 검색조건 초기화 추가, 코드 개선`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Support contact and customer suggestion admin`.

## R-773d4b83d663 코드크레용 · Theme keyword and category management

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Clarify whether this is merchandising/search keyword management or theme category management.

작업 기간:
2024-05-31 to 2024-06-03

원문 작업 설명:

- Added keyword management and category keyword management with list/add/delete/drag/edit behavior and theme repository wiring.

변경 파일·영역:
`src/app/(dashboard)/theme/{keyword,category}/page.tsx`, `src/components/theme/KeywordsManagement/*`, `src/components/theme/CategoryManagement/*`, `src/components/theme/components/DraggableCard.tsx`, `src/repository/theme/*`

커밋 근거:

- `2024-05-31 681fb26 [작성자 비공개] 검색어 관리 기능 추가`
  - `2024-06-03 3532392 [작성자 비공개] 카테고리 키워드 리스트뷰, 추가, 삭제, 드래그 기능 추가`
  - `2024-06-03 c91af9b [작성자 비공개] 카테고리 수정 기능 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Theme keyword and category management`.

## R-419eb1ef0ad2 코드크레용 · Table toolbar export and download features

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm export formats, access controls, and server/client download implementation.

작업 기간:
2024-06-25 to 2024-07-16

원문 작업 설명:

- Added reusable table toolbar, search-condition reset hooks, CSV/XLS export/download behavior, and applied it across admin tables.

변경 파일·영역:
`src/components/TableToolbar/index.tsx`, `src/components/table/components/TableToolbar.tsx`, `src/libs/downloadFile.ts`, order/product/event/claim/support toolbar files, `package.json`

커밋 근거:

- `2024-06-25 57e6bc0 [작성자 비공개] 테이블 뷰 export 기능 추가`
  - `2024-06-25 5acd405 [작성자 비공개] 테이블 툴바 컴포넌트 생성 검색조건 초기화 및 export 다운로드 추가`
  - `2024-06-25 d8e1418 [작성자 비공개] 주문 목룩 테이불 툴바 생성 및 적용`
  - `2024-06-26 70abfd5 [작성자 비공개] excel 다운로드 추가 및 TableToolbar export 방식 수정`
  - `2024-07-16 848b6ea [작성자 비공개] 테이블 뷰 export  (#30)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Table toolbar export and download features`.

## R-344d3af0f599 코드크레용 · Home banner management

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm final image upload validation and banner scheduling fields.

작업 기간:
2024-06-28 to 2024-07-29

원문 작업 설명:

- Added home banner admin list/form/card, image upload, add/update/delete mutations, and state reset refinements.

변경 파일·영역:
`src/app/(dashboard)/theme[로컬 경로 비공개]`, `src/components/theme[로컬 경로 비공개]`, `src/repository/theme/*`, `src/utils/cloudflareUploader/index.ts`, `src/components/hookForm/RHFImageUploader.tsx`

커밋 근거:

- `2024-06-28 a01c200 [작성자 비공개] 배너 목록 표시 입력 폼 추가`
  - `2024-06-28 1ed1f29 [작성자 비공개] 배너 추가 수정 삭제 api 연결`
  - `2024-07-02 463e586 [작성자 비공개] 배너 변경 시 이미지 상태 초기화`
  - `2024-07-29 a96e031 [작성자 비공개] 테마 관리 > 홈 배너, 홈 테마 관리 추가 (#31)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Home banner management`.

## R-78c35e7d67f8 코드크레용 · Home theme management and themed seller/product sections

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check whether theme ordering, drag/drop, and publish scheduling are in this branch or later work.

작업 기간:
2024-07-01 to 2024-07-29

원문 작업 설명:

- Added admin pages and components to manage home themes, home products, and home seller sections, including create/delete flows.

변경 파일·영역:
`src/app/(dashboard)/theme[로컬 경로 비공개]`, `src/components/theme[로컬 경로 비공개]`, `src/repository/theme/*`, `src/domain/models/theme/entity.ts`

커밋 근거:

- `2024-07-01 7da22a0 [작성자 비공개] 홈 테마 관리 페이지 생성`
  - `2024-07-01 d623ccf [작성자 비공개] 홈테마, 홈 상품 추가`
  - `2024-07-02 b25ef76 [작성자 비공개] 테마 셀러 테마 상품 추가 및 삭제 기능 추가`
  - `2024-07-29 a96e031 [작성자 비공개] 테마 관리 > 홈 배너, 홈 테마 관리 추가 (#31)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Home theme management and themed seller/product sections`.

## R-b0bc1ae3ff37 코드크레용 · Dashboard base pages for seller, event, and admin

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Determine whether these are placeholders or functional pages in final branch.

작업 기간:
2024-06-05

원문 작업 설명:

- Added dashboard navigation/pages for seller, event, and management/admin areas after base environment setup.

변경 파일·영역:
`src/app/*`, `src/components/layout/DashboardLayout/navigationConfig.tsx`, dashboard routes/components

커밋 근거:

- `2024-06-05 f60de57 [작성자 비공개] 대시보드 셀러 (#4)`
  - `2024-06-05 de7a49b [작성자 비공개] 대시보드 이벤트 (#5)`
  - `2024-06-05 7b24bc5 [작성자 비공개] 대시보드, 관리 (#10)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Dashboard base pages for seller, event, and admin`.

## R-0525e4915661 코드크레용 · Shared table row, detail dialog, and infinite-card abstractions

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm current component names after later renames/refactors.

작업 기간:
2024-05-28 to 2024-06-24

원문 작업 설명:

- Extracted common detail dialog, table dialog row, and infinite card components used by order/product/seller admin surfaces.

변경 파일·영역:
`src/components/table/TableDialogRow.tsx`, `src/components/DetailDialog/*`, `src/components/InfiniteCards/index.tsx`, product/seller approval list components

커밋 근거:

- `2024-05-28 b47cd46 [작성자 비공개] 디테일 다이얼로그 공통화`
  - `2024-06-04 47eada1 [작성자 비공개] TableRow 공통으로 수정`
  - `2024-06-24 e1fc8a6 [작성자 비공개] 인피니트 카드 컴포넌트 생성 및 적용`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Shared table row, detail dialog, and infinite-card abstractions`.

## R-e89af9d9707f 코드크레용 · Admin product and seller card display fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check if these were hotfixes after QA or general refinement.

작업 기간:
2024-06-10 to 2024-07-16

원문 작업 설명:

- Fixed product/seller card missing data, no-data display, and price conversion/display issues.

변경 파일·영역:
`src/components/product/ProductApproveList/*`, `src/components/seller/SellerApproveList/*`, `src/components/product/Products/*`, `src/utils/formatValue.ts`

커밋 근거:

- `2024-06-10 51e51b0 [작성자 비공개] FIX-1129 가격 오표기 수정`
  - `2024-06-13 67f2135 [작성자 비공개] FIX-1131 - 상품 카드 누락 데이터 추가`
  - `2024-07-16 971799c [작성자 비공개] [FIX-1147] 카드뷰 데이터 없을 때 표시 (#28)`
  - `2024-07-16 3920e4b [작성자 비공개] 상품 카드 가격 데이터 컨버팅 로직 수정 (#32)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Admin product and seller card display fixes`.

## R-f331e11ccfea 코드크레용 · Admin date, image, and form component refinements

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Determine whether these primitives are shared only in admin or meant for broader reuse.

작업 기간:
2024-06-18 to 2024-07-29

원문 작업 설명:

- Refined admin form primitives around date/time format, image full-size options, RHF image upload, and ISO value handling.

변경 파일·영역:
`src/components/hookForm/RHFDatePicker.tsx`, `src/components/hookForm/RHFDateTimePicker.tsx`, `src/components/hookForm/RHFImageUploader.tsx`, `src/components/Image/index.tsx`, `src/components/Loader/index.tsx`

커밋 근거:

- `2024-06-18 769f575 [작성자 비공개] 데이트 포맷 24시간 형식으로 수정 (#13)`
  - `2024-06-18 92a4e52 [작성자 비공개] [FIX-1125] 풀 사이즈뷰 이미지 크기 옵션 수정 (#14)`
  - `2024-06-28 826a931 [작성자 비공개]  RHF 이미지 업로더 추가`
  - `2024-06-28 8da6dee [작성자 비공개] 데이트타임피커 value ISO포맷`
  - `2024-07-29 a96e031 [작성자 비공개] 테마 관리 > 홈 배너, 홈 테마 관리 추가 (#31)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Admin date, image, and form component refinements`.

## R-b59ec8fa0fe1 코드크레용 · Admin infra, repository, package, and routing refactors

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Use final tree diff before making a strong architecture claim.

작업 기간:
2024-05-20 to 2024-06-27

원문 작업 설명:

- Refactored admin package/repository layout, query string pagination hooks, fetch array params/client options, and route synchronization.
  - Several duplicate/rebase/conflict-cleanup commits exist in this area; this unit is raw extraction, not polished architecture claim.

변경 파일·영역:
`src/infra/Fetch.ts`, `src/routes/hooks/useQueryString.ts`, `src/repository/*`, `src/domain/models/*`, package/import paths

커밋 근거:

- `2024-05-20 4881807 [작성자 비공개] infra Fetch 수정, get요청시 배열 송부 가능`
  - `2024-05-20 856b0c0 [작성자 비공개] 패키지 구조 변경`
  - `2024-05-22 fd8276b [작성자 비공개] 쿼리스트링 사용한 테이블 페이지네이션 추가`
  - `2024-06-25 dc6152c [작성자 비공개] 패키지 변명 및 상품 탭 쿼리스트링과 동기화`
  - `2024-06-27 0aaea2a [작성자 비공개] fetch 클라이언트 옵션 제거`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md` · `Admin infra, repository, package, and routing refactors`.

## R-425a5051a86c 코드크레용 · Converter Bedrock AI subtitle translator

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check product/API behavior from runtime or backend contract if this needs to become a polished resume claim.

작업 기간:
2025-04-30 to 2025-05-08

원문 작업 설명:

- Added Bedrock SDK dependency and a converter tab/UI path for AI subtitle translation.
  - Added service and converter modules for prompt construction, VTT checking, translation execution, and caption translator UI.
  - `git show --stat` confirms this was mostly new converter and Bedrock-related code, not only package changes.

변경 파일·영역:

- `package.json`, `package-lock.json`
  - `src/page/converter/ui/ConverterView.tsx`
  - `src/shared/service/bedRock/bedRockService.ts`
  - `src/shared/ui/converter/CaptionTranslator.tsx`
  - `src/shared/ui/converter/prompt.ts`
  - `src/shared/ui/converter/translator.ts`
  - `src/shared/ui/converter/vttChecker.ts`

커밋 근거:

- `2025-04-30 e13d81a [작성자 비공개] 베드락 sdk 추가`
  - `2025-04-30 c66fd5d [작성자 비공개] 툴 > 컨버터 > 자막 번역 추가`
  - `2025-05-08 f6eb3cd [작성자 비공개] AI 자막 번역 추가  (#157)`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Converter Bedrock AI subtitle translator`.

## R-2ef94771c801 코드크레용 · AI subtitle translation validation and iteration controls

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need runtime examples or user-facing screenshots to separate reliability fixes from UX changes.

작업 기간:
2025-05-02 to 2025-05-27

원문 작업 설명:

- Iterated on prompt shape, chunk/batch sizing, repeat count, max request count, and target-language state constraints.
  - Added validation schema and adjusted VTT verification after translation completion.
  - Includes refactor/cleanup commits around naming, duplicated conditions, null cases, parseVTT usage, and removing test/log code.

변경 파일·영역:

- `src/shared/ui/converter/CaptionTranslator.tsx`
  - `src/shared/ui/converter/prompt.ts`
  - `src/shared/ui/converter/translator.ts`
  - `src/shared/ui/converter/validation.ts`
  - `src/shared/ui/converter/vttChecker.ts`

커밋 근거:

- `2025-05-02 ca6c8fc [작성자 비공개] 에러 메시지 적용 방식 수정, 주석추가`
  - `2025-05-02 58c441c [작성자 비공개] 번역파일이 존재하고 다운로드하지 않은 상태에서 타겟언어 변경 불가`
  - `2025-05-09 c0f70c4 [작성자 비공개] 번역 완료 후 검증 비교 파일 수정`
  - `2025-05-23 0100aa7 [작성자 비공개] 프롬프트, 청크 사이즈, 배치 사이즈 조정`
  - `2025-05-23 e83f4fd [작성자 비공개] 유효성 검사 스키마 추가`
  - `2025-05-23 0525f57 [작성자 비공개] 반복 횟수 만큼 진행`
  - `2025-05-26 c6ec9d9 [작성자 비공개] 스페인어 서브 프롬프트 추가, 성공 메시지 추가`
  - `2025-05-26 1904432 [작성자 비공개] 반복 요청 맥스 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `AI subtitle translation validation and iteration controls`.

## R-bc13abe27de3 코드크레용 · Advanced subtitle translation UI and direct VTT download

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need inspect final UI behavior to know which July commits landed in production UX versus branch-only experimentation.

작업 기간:
2025-07-01 to 2025-07-03

원문 작업 설명:

- Added `AdvancedTranslate.tsx` and reworked translator/prompt/validation modules around advanced subtitle translation.
  - File stats show direct VTT download logic in `translator.ts` and repeated work on upload mode, genre multi-select, multilingual options, required references, and type consolidation.
  - This is a separate July feature branch line from the May basic AI subtitle translator work.

변경 파일·영역:

- `src/page/converter/ui/ConverterView.tsx`
  - `src/shared/ui/converter/AdvancedTranslate.tsx`
  - `src/shared/ui/converter/prompt.ts`
  - `src/shared/ui/converter/translator.ts`
  - `src/shared/ui/converter/validation.ts`

커밋 근거:

- `2025-07-01 3cf7686 [작성자 비공개] 컨텐츠 설정 추가`
  - `2025-07-02 79f3b29 [작성자 비공개] 입력 항목 추가`
  - `2025-07-03 4df04c3 [작성자 비공개] feat: 고급 자막 번역 기능 재구조화`
  - `2025-07-03 6ecf8fe [작성자 비공개] feat: 고급 자막 번역 기능 완성 및 VTT 직접 다운로드`
  - `2025-07-03 ac2e9b5 [작성자 비공개] refactor: 자막 업로드를 단일 파일로 변경 및 UI 개선`
  - `2025-07-03 2151fc7 [작성자 비공개] feat: 고급 자막 번역 - 장르 다중 선택 및 다국어 지원 개선`
  - `2025-07-03 75f7a24 [작성자 비공개] refactor: 고급 번역 컴포넌트 타입 통합 및 구조 개선`
  - `2025-07-03 5316037 [작성자 비공개] refactor: 번역 참조 매개변수를 필수로 변경`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Advanced subtitle translation UI and direct VTT download`.

## R-53aa45136a84 코드크레용 · Episode video play and converter-side content-setting test work

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify branch outcome before using this as anything beyond raw context.

작업 기간:
2025-07-01 to 2025-07-02

원문 작업 설명:

- Branch/test work touched episode form/edit view, middleware, episode type, and converter advanced translation UI.
  - Evidence says this is partly test-oriented video play work, not a clean production feature claim by itself.

변경 파일·영역:

- `src/entities/episode/model/types.ts`
  - `src/features/episode/ui/EpisodeForm/EpisodeCreateEditForm.tsx`
  - `src/middleware.ts`
  - `src/page/episode/ui/EpisodeEditView.tsx`
  - `src/page/converter/ui/ConverterView.tsx`
  - `src/shared/ui/converter/AdvancedTranslate.tsx`
  - `src/shared/ui/converter/validation.ts`

커밋 근거:

- `2025-07-01 ffa2237 [작성자 비공개] 비디오 플레이 테스트`
  - `2025-07-01 3cf7686 [작성자 비공개] 컨텐츠 설정 추가`
  - `2025-07-02 79f3b29 [작성자 비공개] 입력 항목 추가`
  - `2025-07-02 8e83b75 [작성자 비공개] 플레이어 테스트`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Episode video play and converter-side content-setting test work`.

## R-b8e8f726d92f 코드크레용 · Next.js playground bootstrap with shared primitives

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need compare against current branch to see which early UI primitives survived unchanged.

작업 기간:
2024-09-26 to 2024-10-08

원문 작업 설명:

- Created a new Next.js/Tailwind playground app with fonts/assets, base app layout, infra fetch utility, and reusable mobile-oriented UI primitives.
  - Initial path layout concentrated in `src/ui`, `src/utils`, `src/hooks`, `src/models`, and root config.

변경 파일·영역:

- root config: `.eslintrc.json`, `next.config.mjs`, `package.json`, `tailwind.config.js`, `tsconfig.json`
  - app shell: `src/app/*`
  - shared utilities: `src/utils/infra/*`, `src/utils/alpha-to-hex.ts`
  - shared UI: `src/ui/button`, `src/ui/chip`, `src/ui/container`, `src/ui/drawer`, `src/ui/ios-picker`, `src/ui/radio`
  - hooks/models: `src/hooks/use-boolean.ts`, `src/hooks/use-click-out-side.ts`, `src/models/common/type.ts`

커밋 근거:

- `2024-09-26 85d5ad0 [작성자 비공개] first commit`
  - `2024-09-26 5bff960 [작성자 비공개] 프로젝트 생성`
  - `2024-09-26 277e2be [작성자 비공개] 기본 설정 및 assets 세팅`
  - `2024-09-26 3b0e41a [작성자 비공개] 통신 및 스타일링 util 추가`
  - `2024-09-26 e54a246 [작성자 비공개] 기본 ui 컴포넌트 추가`
  - `2024-09-26 c0d0b5b [작성자 비공개] 기본 hooks, type 추가`
  - `2024-09-26 b52c39b [작성자 비공개] lint 설정 및 트리쉐이킹`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Next.js playground bootstrap with shared primitives`.

## R-aa81a9c33a80 코드크레용 · Fortune feature with Branch.io sharing and invalid-token handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need product names/screens to translate "fortune" into a user-facing description.

작업 기간:
2024-09-26 to 2024-10-22

원문 작업 설명:

- Built fortune input/result flow: birth-day/time/country pickers, form, result, typing/presentational components, context, API, and entity types.
  - Added Branch.io share utility and adjusted SSR behavior around share button/client usage.
  - Added invalid-token page and localized messages for unauthorized token cases.

변경 파일·영역:

- `src/app/fortune/page.tsx`, `src/app/[locale]/fortune/page.tsx`
  - `src/app/[locale]/invalid-token/page.tsx`
  - `src/domains/fortunes/api/index.ts`
  - `src/domains/fortunes/container/*`
  - `src/domains/fortunes/context/fortune-context.tsx`
  - `src/domains/fortunes/models/*`
  - `src/utils/branch-io.ts`
  - `messages/*.json`

커밋 근거:

- `2024-09-26 15896a4 [작성자 비공개] 운세보기 기능 추가`
  - `2024-09-30 e7d14cc [작성자 비공개] 공유하기 branch.io 연결`
  - `2024-10-02 f11ce20 [작성자 비공개] branch-io ssr 이슈 해결`
  - `2024-10-18 c69f604 [작성자 비공개] 운세보기 페이지 로더 추가`
  - `2024-10-22 829027b [작성자 비공개] 비인가 토큰 사용 시 에러페이지로`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Fortune feature with Branch.io sharing and invalid-token handling`.

## R-97d1b903a1f4 코드크레용 · Gift-code webview flow with Flutter event bridge and fetcher extraction

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need native app contract for exact Flutter method semantics.

작업 기간:
2024-10-07 to 2024-10-10

원문 작업 설명:

- Added gift-code page, form, API/model layer, keyboard-height handling, dialog interaction, and Flutter event hook.
  - Extracted a reusable `fetcher.ts` and began applying it to domain API calls.

변경 파일·영역:

- `src/app/[locale]/gift-code/page.tsx`
  - `src/domains/gift-code/api/index.ts`
  - `src/domains/gift-code/container/gift-code-form.tsx`
  - `src/domains/gift-code/models/*`
  - `src/hooks/use-key-borad-height.ts`
  - `src/hooks/use-flutter-event.ts`
  - `src/ui/dialog/*`
  - `src/utils/fetcher.ts`

커밋 근거:

- `2024-10-07 f9e1972 [작성자 비공개] 기프트 코드 페이지 생성`
  - `2024-10-08 36d0db4 [작성자 비공개] 버튼 동작 이벤트 추가`
  - `2024-10-08 6735c53 [작성자 비공개] 플러터 콜 훅스 추가 및 적용`
  - `2024-10-10 73bba44 [작성자 비공개] fetcher 생성`
  - `2024-10-10 9f32c6d [작성자 비공개] fetcher 적용`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Gift-code webview flow with Flutter event bridge and fetcher extraction`.

## R-6ca6db3a5db8 코드크레용 · Mobile webview UI shell adjustments

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need device QA notes to distinguish visual tuning from functional bug fixes.

작업 기간:
2024-10-10 to 2024-10-16

원문 작업 설명:

- Tuned shared UI elements for mobile/webview constraints: dialog/snackbar/toast/loader placement, sticky container keyboard behavior, and country picker behavior.
  - Moved Lottie/resource path handling under `public/assets` and removed a local JSON helper.

변경 파일·영역:

- `src/ui/dialog/*`
  - `src/ui/snack-bar/*`
  - `src/ui/sticky-container/*`
  - `src/domains/fortunes/container/components/country-picker.tsx`
  - `src/domains/gift-code/container/gift-code-form.tsx`
  - `src/domains/fortunes/container/components/pop-corn-toast.tsx`
  - `src/utils/get-local-json.ts`
  - `tsconfig.json`

커밋 근거:

- `2024-10-11 9bff0bb [작성자 비공개] 다이얼로그, 스낵바, 팝콘토스트,로더 등 모바일 화면 고려하여 위치 조정`
  - `2024-10-14 5f312b9 [작성자 비공개] country-picker 사용성 개선`
  - `2024-10-16 dfe49ca [작성자 비공개] 웹뷰용 키보드 감지 훅 적용`
  - `2024-10-15 392b361 [작성자 비공개] 리소스 경로 수정, 리소스 사용 방식 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Mobile webview UI shell adjustments`.

## R-ca175de8a72d 코드크레용 · Lucky-draw coming-soon, list/detail, timer, and infinite-scroll flow

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need final product rules for draw statuses and timer semantics.

작업 기간:
2024-10-17 to 2024-10-31

원문 작업 설명:

- Built core lucky-draw entry surfaces: coming soon, list, draw cards, timer/context, status-driven buttons, detail page, infinite scroll, and result path scaffolding.
  - Evidence shows both API/model work and UI components in the lucky-draw domain.

변경 파일·영역:

- `src/app/[locale]/draw/coming-soon/page.tsx`
  - `src/app/[locale]/lucky-draw/page.tsx`
  - `src/app/[locale]/lucky-draw/[drawId]/page.tsx`
  - `src/domains/lucky-draw/api/index.ts`
  - `src/domains/lucky-draw/container/*`
  - `src/domains/lucky-draw/context/draw-card-context.tsx`
  - `src/domains/lucky-draw/hooks/use-winner.ts`
  - `src/domains/lucky-draw/models/*`
  - `src/domains/lucky-draw/util/get-draw-status.ts`
  - `src/hooks/use-observer.ts`
  - `src/utils/throttle.ts`

커밋 근거:

- `2024-10-17 6232947 [작성자 비공개] 드로우 커밍순 페이지 추가`
  - `2024-10-28 25761a3 [작성자 비공개] 타이머 분리 및 컨텍스트 생성`
  - `2024-10-28 0960353 [작성자 비공개] 타이머 및 상태에 따라 노출되는 버튼 추가`
  - `2024-10-29 ee3670e [작성자 비공개] 커스텀 훅 적용 드로우 디테일 페이지 추가`
  - `2024-10-25 813a82c [작성자 비공개] 인피니티 스크롤 구형`
  - `2024-10-31 12fe10a [작성자 비공개] 드로우 응모 확인 페이지, 당첨 확인 페이지 작업`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Lucky-draw coming-soon, list/detail, timer, and infinite-scroll flow`.

## R-795a7da1e20d 코드크레용 · Lucky-draw address, phone input, appbar, and share/result surfaces

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need confirm whether phone/address fields differ by country/locale in production.

작업 기간:
2024-11-01 to 2024-11-08

원문 작업 설명:

- Added post-draw address and phone input surfaces, related model/API data conversion, localized labels, appbar coverage, and share controls.
  - Added status branching such as `is_announced` across card/detail timers and draw status utility.

변경 파일·영역:

- `src/app/[locale]/lucky-draw/result/page.tsx`
  - `src/app/[locale]/lucky-draw/[drawId]/page.tsx`
  - `src/domains/lucky-draw/container/components/address-form.tsx`
  - `src/domains/lucky-draw/container/draw-result.tsx`
  - `src/domains/lucky-draw/container/draw-detail.tsx`
  - `src/domains/lucky-draw/hooks/use-winner.ts`
  - `src/domains/lucky-draw/models/entity.ts`
  - `src/ui/phone-input.tsx`
  - `src/ui/input.tsx`
  - `src/ui/app-bar.tsx`
  - `messages/*.json`

커밋 근거:

- `2024-11-01 fc5a749 [작성자 비공개] 주소 입력 페이지 작성`
  - `2024-11-01 e5d7895 [작성자 비공개] 전화번호 입력 추가 번역 추가`
  - `2024-11-05 27767be [작성자 비공개] 전체 페이지 앱바 적용`
  - `2024-11-06 15eee85 [작성자 비공개] 쉐어 추가`
  - `2024-11-07 9b24262 [작성자 비공개] is_announced 항목 및 분기 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Lucky-draw address, phone input, appbar, and share/result surfaces`.

## R-c45e8453fdc6 코드크레용 · Lucky-draw errors, history tabs, loaders, and ticket interaction tuning

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need inspect final UI state names to avoid overclaiming "history" if it maps to a narrower product concept.

작업 기간:
2024-11-12 to 2024-11-29

원문 작업 설명:

- Added centralized error page/handler behavior across domain APIs and localized messages.
  - Split lucky-draw list into tabbed components for progress/upcoming/history, then tuned loader, menu/tab UI, and ticket exchange interaction.

변경 파일·영역:

- `src/api/index.ts`
  - `src/app/[locale]/error.tsx`
  - `src/app/[locale]/lucky-draw/page.tsx`
  - `src/app/[locale]/lucky-draw/[drawId]/page.tsx`
  - `src/domains/lucky-draw/api/index.ts`
  - `src/domains/lucky-draw/container/components/draw-histories.tsx`
  - `src/domains/lucky-draw/container/components/draw-history-card.tsx`
  - `src/domains/lucky-draw/container/components/draw-progress-list.tsx`
  - `src/domains/lucky-draw/container/components/draw-upcoming-list.tsx`
  - `src/domains/lucky-draw/container/draw-list.tsx`
  - `src/error/index.ts`
  - `src/ui/loader.tsx`, `src/ui/menubar.tsx`

커밋 근거:

- `2024-11-12 a51bb17 [작성자 비공개] 에러 페이지 적용`
  - `2024-11-14 41961da [작성자 비공개] 에러 핸들러 추가 및 적용`
  - `2024-11-22 3a298ba [작성자 비공개] 데이터 패칭 및 탭별 컴포넌트화`
  - `2024-11-22 843e743 [작성자 비공개] 드로우 이력 수정`
  - `2024-11-27 be82930 [작성자 비공개] 티켓 교환 시 버튼 비활성화 및 다이얼로그 close`
  - `2024-11-26 a849d1b [작성자 비공개] 럭키드로우 탭 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Lucky-draw errors, history tabs, loaders, and ticket interaction tuning`.

## R-8f2728c3c419 코드크레용 · Marketing consent drawer, deep-link/share metadata, and Airbridge wiring

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need external SDK docs or analytics setup context before describing tracking/attribution impact.

작업 기간:
2024-12-09 to 2024-12-23

원문 작업 설명:

- Added marketing consent API/drawer around draw success and locale-specific exception behavior.
  - Reworked deep link/share buttons and added invitation OG metadata and Airbridge client initialization options.

변경 파일·영역:

- `src/api/index.ts`
  - `src/domains/lucky-draw/container/components/draw-marketing-drawer.tsx`
  - `src/domains/lucky-draw/container/components/draw-success-drawer.tsx`
  - `src/domains/lucky-draw/container/components/detail-share-icon-button.tsx`
  - `src/domains/fortunes/container/components/fortune-share-button.tsx`
  - `src/domains/invitation/container/components/code-share-button.tsx`
  - `src/app/[locale]/share/invitation/[code]/page.tsx`
  - `src/ui/deep-link-button.tsx`
  - `src/utils/air-bridge-client.ts`
  - `src/utils/infra/fetch.ts`, `src/utils/infra/type.ts`

커밋 근거:

- `2024-12-09 a999df3 [작성자 비공개] 마케팅 수신 동의 api 추가`
  - `2024-12-09 828bef5 [작성자 비공개] 마케팅 수신 동의 drawer 추가 및 locale 한국 예외 추가`
  - `2024-12-11 6151c87 [작성자 비공개] 에어브릿지 적용`
  - `2024-12-12 09e4906 [작성자 비공개] 친구 초대 og 설정`
  - `2024-12-12 46b02c1 [작성자 비공개] fetcher 옵션 수정`
  - `2024-12-23 a5a145c [작성자 비공개] 에어브릿지 클라이언트 이닛 항목 추가,`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Marketing consent drawer, deep-link/share metadata, and Airbridge wiring`.

## R-79c5fcfe0432 코드크레용 · Fly Pop Phaser game bridge, result submission, ranking, and responsive layout

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need run history or screenshots to confirm actual game feel and production rollout date.

작업 기간:
2024-12-02 to 2024-12-24

원문 작업 설명:

- Migrated/implemented Fly Pop gameplay using Phaser objects/scenes/preloader and a Next.js bridge.
  - Added score/result submission, ranking data fetch/rendering, game cards/medals, responsive Phaser sizing, and banner ad event wiring.

변경 파일·영역:

- `src/domains/jump-kim-pop/container/game/*`
  - `src/domains/games/fly-pop/container/*`
  - `src/domains/games/fly-pop/container/game/*`
  - `src/domains/games/fly-pop/api/index.ts`
  - `src/domains/games/components/game-banner.tsx`
  - `src/domains/games/components/game-card.tsx`
  - `src/domains/games/components/game-medal.tsx`
  - `src/domains/games/components/game-rank.tsx`
  - `src/domains/games/models/*`
  - `src/ui/sticky-container.tsx`

커밋 근거:

- `2024-12-03 178aa21 [작성자 비공개] phaser 도입`
  - `2024-12-04 0a347ac [작성자 비공개] nextjs 와 phaser간 이벤트 브릿지`
  - `2024-12-05 5fed6ff [작성자 비공개] 게임 결과 기록, bird 히트 박스 원형으로 수정`
  - `2024-12-18 396e5bc [작성자 비공개] 결과 제출 및 사이즈 조정,`
  - `2024-12-17 263ce20 [작성자 비공개] 랭킹 데이터 취득 추가`
  - `2024-12-17 7216e31 [작성자 비공개] phaser 반응형 적용`
  - `2024-12-24 bfe67ad [작성자 비공개] bannerAd 이벤트 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Fly Pop Phaser game bridge, result submission, ranking, and responsive layout`.

## R-e3dd85b18d95 코드크레용 · Fly Pop audio, lifecycle, difficulty, and abuse-prevention tuning

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need define "abuse" condition from server/API side for accurate wording.

작업 기간:
2024-12-10 to 2025-02-26

원문 작업 설명:

- Added/replaced BGM and score/effect audio resources, handled foreground/background reload cases, and adjusted difficulty/pipe behavior.
  - Added guards around touch input during communication and behavior for abusive score attempts.

변경 파일·영역:

- `public/assets/fly-pop/audio/*`
  - `src/domains/games/components/phaser-game.tsx`
  - `src/domains/games/fly-pop/container/fly-pop.tsx`
  - `src/domains/games/fly-pop/container/game/objects/*`
  - `src/domains/games/fly-pop/container/game/scenes/*`

커밋 근거:

- `2024-12-10 90a389c [작성자 비공개] score 획득 시 효과음 추가`
  - `2024-12-20 4eadf3f [작성자 비공개] 배경음 구현 수정`
  - `2024-12-19 b1a8546 [작성자 비공개] 효과음 및 배경음악 수정`
  - `2024-12-20 ec7c777 [작성자 비공개] 포그라운드로 재 접근 시 페이지 새로 로드`
  - `2024-12-23 69d5eac [작성자 비공개] 난이도 조절`
  - `2025-02-26 b04b8ae [작성자 비공개] 통신하는 동안, 게임 터치 이벤트 무효`
  - `2025-02-17 d56d161 [작성자 비공개] 어뷰징하여 시도 하여 점수 취득시 시 동작 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Fly Pop audio, lifecycle, difficulty, and abuse-prevention tuning`.

## R-0000e4dcec05 코드크레용 · Suika-style dropper game prototype

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need branch/product status to know if this remained experimental.

작업 기간:
2024-12-26 to 2024-12-31

원문 작업 설명:

- Added a Suika game page/prototype with Phaser-like game structure, preloader, dropper, corn objects, dead line/game-over condition, cooldown, and restart.
  - Evidence suggests prototype/test assets and mechanics work rather than a fully polished product flow.

변경 파일·영역:

- `src/app/[locale]/game/suika/page.tsx`
  - `src/domains/games/suika/container/suika.tsx`
  - `src/domains/games/suika/container/game/main.ts`
  - `src/domains/games/suika/container/game/objects/corn.ts`
  - `src/domains/games/suika/container/game/objects/dropper.ts`
  - `src/domains/games/suika/container/game/objects/dead-line.ts`
  - `src/domains/games/suika/container/game/scenes/*`
  - `src/domains/games/util/cool-time.ts`
  - `public/assets/suika/images/*`

커밋 근거:

- `2024-12-26 5422f7c [작성자 비공개] 구조 적립`
  - `2024-12-26 ef4c757 [작성자 비공개] 테스트 이미지 및 드로퍼 , 콘 오브젝트 추가`
  - `2024-12-27 7e97215 [작성자 비공개] 드로퍼 수정 및 다음 콘의 충돌 방지 옵션 추가`
  - `2024-12-30 6f9e817 [작성자 비공개] grade가 10 이하 일 때만 새로운 corn 생성`
  - `2024-12-30 1f9e3d7 [작성자 비공개] 게임 오버 조건 수정`
  - `2024-12-31 8c70da1 [작성자 비공개] 연사 방지 추가`
  - `2024-12-31 d95dddb [작성자 비공개] 재시작 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Suika-style dropper game prototype`.

## R-1a66e057ab25 코드크레용 · Open Sesame game initial screen, timer, door selection, guide, and result flow

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need final game rules and asset names to describe mechanics accurately.

작업 기간:
2025-01-17 to 2025-01-24

원문 작업 설명:

- Built Open Sesame game page, API/model layer, timer, door selection, guide/intro/playing/over/success/fail surfaces, and shared result component usage.
  - Several commits are layout/resource/timing refinements after the first screen structure.

변경 파일·영역:

- `src/app/[locale]/game/open-sesame/page.tsx`
  - `src/domains/games/open-sesame/api/open-sesame-api.ts`
  - `src/domains/games/open-sesame/components/*`
  - `src/domains/games/open-sesame/container/*`
  - `src/domains/games/open-sesame/container/play/*`
  - `src/domains/games/open-sesame/models/entity.ts`
  - `src/domains/games/open-sesame/util/convert-rank.ts`
  - `src/domains/games/components/game-result.tsx`
  - `public/assets/open-sesame/*`

커밋 근거:

- `2025-01-17 9379c83 [작성자 비공개] 열려라 참깨 페이지 구성`
  - `2025-01-17 15cf04d [작성자 비공개] 게임 타이머 생성`
  - `2025-01-17 12f1dc5 [작성자 비공개] 문 선택 컴포넌트 추가`
  - `2025-01-21 0901921 [작성자 비공개] 열려라 참깨 화면 작업`
  - `2025-01-24 9fbffc4 [작성자 비공개] 가이드 리소스 적용`
  - `2025-01-24 6301d9d [작성자 비공개] svg 리소스 교체`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Open Sesame game initial screen, timer, door selection, guide, and result flow`.

## R-84cb00bd3250 코드크레용 · Open Sesame audio, ad-state, daily-mission, and repeated-click state tuning

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need separate final-state diff to avoid double-counting shared game-hook changes between Fly Pop and Open Sesame.

작업 기간:
2025-01-22 to 2025-02-17

원문 작업 설명:

- Added BGM/effect-sound hooks, ad-state options in game state, daily mission API behavior, multi-click guarding, Flutter method improvements, and edge-case handling around score attempts.
  - Some evidence overlaps with Fly Pop because shared game hooks and game-domain APIs are reused.

변경 파일·영역:

- `src/domains/games/hooks/use-game-state.ts`
  - `src/domains/games/api/index.ts`
  - `src/domains/games/open-sesame/container/open-sesame.tsx`
  - `src/domains/games/open-sesame/container/open-sesame-playing.tsx`
  - `src/domains/games/open-sesame/container/play/*`
  - `src/domains/games/open-sesame/components/select-door.tsx`
  - `src/domains/games/open-sesame/hooks/use-effect-sound.ts`
  - `src/domains/games/fly-pop/container/*`
  - `messages/*.json`

커밋 근거:

- `2025-01-22 bb3471d [작성자 비공개] hooks로 bgm 추가`
  - `2025-01-22 ec314a7 [작성자 비공개] 게임 상태 광고 옵션 추가`
  - `2025-01-10 46ed012 [작성자 비공개] 데일리 미션 api 적용`
  - `2025-02-05 27f4c83 [작성자 비공개] effect sound 훅 하나로 통일 및 실패 화면 버튼에 사운드 추가`
  - `2025-02-11 b494848 [작성자 비공개] 다중 클릭 제어`
  - `2025-02-12 167f6c6 [작성자 비공개] 플러터 메소드 개선`
  - `2025-02-17 d56d161 [작성자 비공개] 어뷰징하여 시도 하여 점수 취득시 시 동작 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Open Sesame audio, ad-state, daily-mission, and repeated-click state tuning`.

## R-c7008ac369ad 코드크레용 · Feedback survey feature with rating/check/text inputs and progress display

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need know whether survey questions were static, API-driven, or hybrid in production.

작업 기간:
2025-03-13 to 2025-04-07

원문 작업 설명:

- Added feedback/survey page, intro/survey containers, context, API/model layer, survey constants, rating/check/radio/text components, validation adjustments, and progress display.
  - Follow-up commits fix empty string/array validation, rating answer input, dialog behavior, and untranslated survey text.

변경 파일·영역:

- `src/app/[locale]/feedback/[feedbackId]/page.tsx`
  - `src/domains/feedback/api/feedback-api.ts`
  - `src/domains/feedback/components/*`
  - `src/domains/feedback/container/*`
  - `src/domains/feedback/context/feedback-context.tsx`
  - `src/domains/feedback/constants/surveys.ts`
  - `src/domains/feedback/models/entity.ts`
  - `src/domains/feedback/util/get-survey.ts`
  - `src/ui/rating.tsx`, `src/ui/radio.tsx`
  - `public/assets/images/Survey.png`
  - `messages/*.json`

커밋 근거:

- `2025-03-13 4cacd2a [작성자 비공개] 피드백 리소스 추가`
  - `2025-03-13 a1fcfc9 [작성자 비공개] 레이팅 UI 추가`
  - `2025-03-13 f30c91d [작성자 비공개] 피드백 컴포넌트 생성`
  - `2025-03-13 4f3bf8d [작성자 비공개] 설문 구조 추가`
  - `2025-03-13 9a82c4a [작성자 비공개] 설문 페이지 추가`
  - `2025-03-14 e016de2 [작성자 비공개] 유효성 검사 수정`
  - `2025-03-19 43bc9f5 [작성자 비공개] 설문 조사 진행 척도 표시`
  - `2025-04-07 8b81339 [작성자 비공개] 개선 피드백 질문지 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Feedback survey feature with rating/check/text inputs and progress display`.

## R-d2a2cf7c6725 코드크레용 · Game entry and reward-ad event bridge updates

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need native/webview event contract to describe exact event names and guarantees.

작업 기간:
2025-03-19 to 2025-03-20

원문 작업 설명:

- Added/revised global reward-ad event typing and game entry event handling for Fly Pop/Open Sesame.
  - Added translation/UI changes and timing/rapid-click guards around ad-completion flow.

변경 파일·영역:

- `global.d.ts`
  - `src/app/[locale]/game/fly-pop/page.tsx`
  - `src/app/[locale]/game/open-sesame/page.tsx`
  - `src/domains/games/fly-pop/components/game-play-button.tsx`
  - `src/domains/games/fly-pop/container/fly-pop.tsx`
  - `src/domains/games/open-sesame/container/open-sesame.tsx`
  - `src/domains/games/open-sesame/models/entity.ts`
  - `src/ui/tooltip.tsx`
  - `messages/*.json`

커밋 근거:

- `2025-03-19 bfe25be [작성자 비공개] 리워드 광고 이벤트 추가`
  - `2025-03-19 de9162c [작성자 비공개] 게임 진입 수정 이벤트 추가, 번역`
  - `2025-03-20 3e4eabb [작성자 비공개] 광고 본 후 1초 딜레이 후 이벤트 실행`
  - `2025-03-20 530a29b [작성자 비공개] 광클 방지`
  - `2025-03-20 8eda135 [작성자 비공개] 광고 보고 나서 새로 고침`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Game entry and reward-ad event bridge updates`.

## R-e50a2dad10e7 코드크레용 · Lucky-draw winner list and period-pass result branch

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need product definition of "기간권" to translate accurately.

작업 기간:
2025-03-18 to 2025-03-26

원문 작업 설명:

- Added winners page/list and result-page detail path.
  - Added period-pass draw scheduling display and different winner handling where address input is skipped.

변경 파일·영역:

- `src/app/[locale]/lucky-draw/[drawId]/winners/page.tsx`
  - `src/app/[locale]/lucky-draw/[drawId]/result/page.tsx`
  - `src/domains/lucky-draw/container/draw-winner-list.tsx`
  - `src/domains/lucky-draw/container/draw-result.tsx`
  - `src/domains/lucky-draw/container/components/draw-success-drawer.tsx`
  - `src/domains/lucky-draw/hooks/use-winner.ts`
  - `src/domains/lucky-draw/models/entity.ts`
  - `messages/*.json`

커밋 근거:

- `2025-03-18 13e7a7e [작성자 비공개] 드로우 당첨자 전체 목록 페이지 생성`
  - `2025-03-18 102a231 [작성자 비공개] 사용자 결과 페이지에 상세 보기 페이지 추가`
  - `2025-03-19 8be5c57 [작성자 비공개] 기간권 드로우 일정 표시`
  - `2025-03-26 816b756 [작성자 비공개] 기간권 드로우 당첨 시 입력 받지 않음`
  - `2025-03-26 13c0334 [작성자 비공개] 기간권 드로우 당첨 문구 추가`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Lucky-draw winner list and period-pass result branch`.

## R-d3fd09db6a55 코드크레용 · Spanish locale and multilingual asset mapping

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need translation review if language quality matters.

작업 기간:
2025-04-10 to 2025-04-15

원문 작업 설명:

- Added Spanish locale file and routing/middleware/config entries.
  - Extended Open Sesame language-specific image mapping and phone input language handling.
  - Multiple small follow-up commits adjust Spanish copy.

변경 파일·영역:

- `messages/es.json`
  - `next.config.mjs`
  - `src/i18n/locales.ts`
  - `src/i18n/routing.ts`
  - `src/middleware.ts`
  - `src/domains/games/open-sesame/container/open-sesame-guide.tsx`
  - `src/domains/games/open-sesame/container/open-sesame-intro.tsx`
  - `src/domains/games/open-sesame/container/open-sesame-over.tsx`
  - `src/domains/games/open-sesame/container/play/open-sesame-start.tsx`
  - `src/ui/phone-input.tsx`

커밋 근거:

- `2025-04-10 b434a80 [작성자 비공개] 스페인어 추가`
  - `2025-04-10 c5f4452 [작성자 비공개] 언어별 각각 이미지 맵에 스페인어 추가`
  - `2025-04-10 d8cac9a [작성자 비공개] 열려라 참깨 스페인어로 번역`
  - `2025-04-10 a85729e [작성자 비공개] 스페인어 번역어 축약`
  - `2025-04-15 7221ec0 [작성자 비공개] 스페인어 추가 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Spanish locale and multilingual asset mapping`.

## R-9f11d876afbc 코드크레용 · Token decoding and token-key normalization

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need security review context before describing this as auth/security work.

작업 기간:
2025-04-23 to 2025-04-23

원문 작업 설명:

- Added token utility and token decoding dependency, then wired token handling into middleware and infra fetch.
  - Follow-up commits normalize key names and query param/token check conditions.

변경 파일·영역:

- `package.json`, `package-lock.json`
  - `src/middleware.ts`
  - `src/utils/infra/fetch.ts`
  - `src/utils/token-util.ts`

커밋 근거:

- `2025-04-23 0ec815b [작성자 비공개] 토큰 확인 로직 수정`
  - `2025-04-23 9c47c2e [작성자 비공개] 파일 명 수정, 토큰 확인 조건 수정`
  - `2025-04-23 6432ad8 [작성자 비공개] 쿼리 파람 수정`
  - `2025-04-23 76e5f7b [작성자 비공개] 토큰 복호화 추가`
  - `2025-04-23 c8ba2ed [작성자 비공개] 키 값 상수화`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Token decoding and token-key normalization`.

## R-f53eb729f50c 코드크레용 · Short-lived Coupang redirect test page

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Do not use as resume material unless tied to a documented experiment or incident.

작업 기간:
2025-05-14 to 2025-05-14

원문 작업 설명:

- Added and then removed a test page/config for Coupang redirect/link behavior on a test branch.
  - This is raw test evidence, not durable product work.

변경 파일·영역:

- `src/app/[locale]/test/page.tsx`
  - `next.config.mjs`

커밋 근거:

- `2025-05-14 4de282a [작성자 비공개] 쿠팡 리다이렉트 테스트`
  - `2025-05-14 68a98f4 [작성자 비공개] 쿠팡 링크 테스트`
  - `2025-05-14 538cee0 [작성자 비공개] 테스트 문구 추가`
  - `2025-05-14 64dcfc6 [작성자 비공개] 테스트 코드 제거`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Short-lived Coupang redirect test page`.

## R-0885cac2df73 코드크레용 · Global loader Lottie, dimmer option, and CDN font/resource optimization

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need performance numbers if this becomes optimization claim.

작업 기간:
2025-05-19 to 2025-06-17

원문 작업 설명:

- Replaced loader implementation with Lottie asset and added dimmer option for global loader usage.
  - Removed unused font assets, moved font loading to CSS/CDN-style handling, added test GIF assets, and cleaned image paths.

변경 파일·영역:

- `src/ui/loader.tsx`
  - `public/assets/Loading_kimpop.json`
  - `src/domains/lucky-draw/container/components/draw-histories.tsx`
  - `src/domains/lucky-draw/container/components/draw-progress-list.tsx`
  - `src/domains/lucky-draw/container/components/draw-upcoming-list.tsx`
  - `src/app/[locale]/layout.tsx`
  - `src/app/globals.css`
  - `src/style/font.css`
  - `public/assets/open-sesame/images/*`

커밋 근거:

- `2025-05-19 cd841df [작성자 비공개] loader lottie로 교체 기존 라이브러리 삭제`
  - `2025-05-20 7393b85 [작성자 비공개] global loader dimmer 옵션 추가`
  - `2025-06-17 97a8745 [작성자 비공개] 미사용 폰트 제거`
  - `2025-06-17 49daf33 [작성자 비공개] cdn 폰트 적용 및 테스트 gif 추가`
  - `2025-06-17 d4f40a4 [작성자 비공개] 불필요한 이미지 파일 정리`
  - `2025-06-17 fe391c6 [작성자 비공개] 이미지 경로 수정`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Global loader Lottie, dimmer option, and CDN font/resource optimization`.

## R-03b9fa4d29cd 코드크레용 · Cross-game sound control toggle

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need manual QA to confirm toggle state persistence and per-game behavior.

작업 기간:
2025-07-03 to 2025-07-04

원문 작업 설명:

- Added a cross-game sound-control state path touching shared game banner, Phaser wrapper, Fly Pop, Open Sesame, and nav hook.
  - Added sound on/off icons and Fly Pop score sound control.

변경 파일·영역:

- `src/domains/games/components/game-banner.tsx`
  - `src/domains/games/components/phaser-game.tsx`
  - `src/domains/games/fly-pop/container/*`
  - `src/domains/games/fly-pop/container/game/objects/kim-pop.ts`
  - `src/domains/games/fly-pop/container/game/objects/pipe.ts`
  - `src/domains/games/fly-pop/container/game/scenes/game.ts`
  - `src/domains/games/open-sesame/components/select-door.tsx`
  - `src/domains/games/open-sesame/container/*`
  - `src/domains/games/open-sesame/container/play/*`
  - `src/domains/games/hooks/use-game-state.ts`
  - `src/hooks/use-nav.ts`
  - `src/ui/icons/sound-off-icon.tsx`
  - `src/ui/icons/sound-on-icon.tsx`

커밋 근거:

- `2025-07-03 88856b9 [작성자 비공개] feat: 게임 사운드 제어 기능 추가`
  - `2025-07-03 6ef7b8c [작성자 비공개] feat : 플라이팝 득점 사운드 컨트롤 추가`
  - `2025-07-03 7f6ec9c [작성자 비공개] chore : 테스트 코드 원복`
  - `2025-07-04 aad9293 [작성자 비공개] feat: 게임 배너 사운드 토글 아이콘 적용`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md` · `Cross-game sound control toggle`.

## R-64a889e129d7 오프리메드 · Release workflow and deployment script setup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check which workflow file remained active on the target branch after all-branch history convergence.

작업 기간:
2026-03-15 to 2026-03-27

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- Release deployment workflow files and shell deploy script were introduced, renamed, then consolidated.
  - Deployment target configuration moved from fixed IP wording toward domain/IP settings.
  - Branch CI workflow was added and later removed in the observed branch history.

변경 파일·영역:

- `.env.development`
  - `.github/workflows/release-web-deploy.yml`
  - `.github/workflows/release-prod-deploy.yml`
  - `.github/workflows/deploy.yml`
  - `.github/workflows/branch-ci.yml`
  - `Dockerfile`
  - `README.md`
  - `scripts/deploy-release.sh`

커밋 근거:

- `2026-03-15 ec84861 [작성자 비공개] chore: 고정 IP에서 도메인 IP주소로 변경`
  - `2026-03-23 e47fc73 [작성자 비공개] chore: 깃 액션, 배포 스크립트 추가`
  - `2026-03-23 8741d91 [작성자 비공개] ci: switch release deploy to release/prod`
  - `2026-03-27 bf5e68d [작성자 비공개] chore: 배포 흐름 수정`
  - `2026-03-27 678ce9e [작성자 비공개] chore: 깃액션 흐름 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Release workflow and deployment script setup`.

## R-55def7cea30f 오프리메드 · Local development domain and HTTPS runner setup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether local certificate setup is still used or superseded by later demo/mainline changes.

작업 기간:
2026-03-27

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- Local dev domain settings were documented and wired into Next/package configuration.
  - HTTPS dev helper scripts were added.

변경 파일·영역:

- `.gitignore`
  - `README.md`
  - `next.config.js`
  - `package.json`
  - `scripts/run-dev-https.cjs`
  - `scripts/setup-dev-https.cjs`

커밋 근거:

- `2026-03-27 33221f7 [작성자 비공개] chore: 로컬 개발 도메인 설정 정리`
  - `2026-03-27 672a19d [작성자 비공개] chore: 로컬 HTTPS 개발 환경 설정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Local development domain and HTTPS runner setup`.

## R-8bb55d647435 오프리메드 · Next 15.5.12 upgrade validation and related docs

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Separate framework upgrade work from temporary deployment helper scripts if a more granular resume source is needed.

작업 기간:
2026-03-24 to 2026-03-25

원문 작업 설명:

- Next.js upgrade validation touched package metadata, Next config, generated Next env types, and ML scenario source files.
  - Upgrade/deployment documentation and helper scripts were added or updated.

변경 파일·영역:

- `README.md`
  - `doc/NEXT_15_5_12_UPGRADE_VALIDATION_PLAN.md`
  - `doc/DEPLOYMENT_DOCUMENTATION.md`
  - `next-env.d.ts`
  - `next.config.js`
  - `package.json`
  - `package-lock.json`
  - `yarn.lock`
  - machine-learning scenario components and types
  - `create-tar.sh`, `deploy.sh`, `scripts/demo-load.sh`

커밋 근거:

- `2026-03-24 1320273 [작성자 비공개] chore: 프로젝트 문서 수정 readme`
  - `2026-03-25 edb247f [작성자 비공개] chore: next 15.5.12 업그레이드 검증`
  - `2026-03-25 0ff7195 [작성자 비공개] docs: 업그레이드 문서 버전 정보 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Next 15.5.12 upgrade validation and related docs`.

## R-7d673db1a9da 오프리메드 · Lab+ auth fetcher integration and public auth screen removal

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify whether removed public auth pages were intentionally out of product scope or replaced by external Lab+ portal flow.

작업 기간:
2026-03-26

원문 작업 설명:

- Auth service/fetcher layer was introduced and wired across data lake, preprocessing, ML, workspace, and login APIs.
  - Legacy public login/join/password/site-setting surfaces were removed or disconnected.
  - App-level auth handling was updated through `_app.tsx`, `auth.ts`, and stores.

변경 파일·영역:

- `next.config.js`
  - `src/api/auth-service.ts`
  - `src/api/auth-service.type.ts`
  - `src/api/axios.ts`
  - `src/api/fetcher.ts`
  - `src/api/login.ts`
  - `src/api/data-lake.ts`
  - `src/api/data-preprocessing.ts`
  - `src/api/ml.ts`
  - `src/api/work-space.ts`
  - `src/lib/auth.ts`
  - `src/pages/_app.tsx`
  - login, join, forgot-password, change-password, site-setting pages/components
  - `src/zustand/LoginStore.ts`, `src/zustand/SchedulerStore.ts`

커밋 근거:

- `2026-03-26 f9a0d59 [작성자 비공개] refactor: 로그인 회원가입 화면 제거`
  - `2026-03-26 83bc7ae [작성자 비공개] feat: lab+ 인증 fetcher 통합`
  - `2026-03-26 4d9fd05 [작성자 비공개] refactor: 공개 인증과 사이트 설정 화면 제거`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Lab+ auth fetcher integration and public auth screen removal`.

## R-39657d837896 오프리메드 · Mobile URL redirect and mobile deployment config

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm target mobile URL value and whether it was environment-specific.

작업 기간:
2026-04-01

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- Mobile URL redirect logic was added in app/auth path.
  - Deploy workflow, Dockerfile, deploy script, and README were updated for the mobile URL deployment path.

변경 파일·영역:

- `.github/workflows/deploy.yml`
  - `Dockerfile`
  - `README.md`
  - `scripts/deploy-release.sh`
  - `src/lib/auth.ts`
  - `src/pages/_app.tsx`

커밋 근거:

- `2026-04-01 91010e3 [작성자 비공개] feat: 모바일 URL 리다이렉트 추가`
  - `2026-04-01 772040b [작성자 비공개] chore: 모바일 URL 배포 설정 추가`
  - `2026-04-01 4f54ffb [작성자 비공개] docs: 모바일 URL 배포 설정 문서화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Mobile URL redirect and mobile deployment config`.

## R-13cb8dca14bd 오프리메드 · Token storage removal and portal referrer redirect adjustment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-04-09 to 2026-04-13

원문 작업 설명:

- Access token persistence in local storage was removed from fetcher/app/store flow.
  - Portal login redirect gained a `referrer_url` path in auth logic.

변경 파일·영역:

- `src/api/fetcher.ts`
  - `src/pages/_app.tsx`
  - `src/zustand/LoginStore.ts`
  - `src/lib/auth.ts`

커밋 근거:

- `2026-04-09 9fb5aa0 [작성자 비공개] fix: 액세스토큰 스토리지 저장 제거`
  - `2026-04-13 0178319 [작성자 비공개] fix: 포털 로그인 리다이렉트에 referrer_url 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Token storage removal and portal referrer redirect adjustment`.

## R-3ac8aa051e8b 오프리메드 · Mainline demo mode removal and validation flow cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- The branch history contains add/update/delete doc churn; use final tree state before turning this into a polished claim.

작업 기간:
2026-04-10

원문 작업 설명:

- Demo-mode artifacts were removed from the mainline app path.
  - Validation-related behavior in data preprocessing, ML, workspace, and data lake was adjusted while demo utilities/scripts were deleted.
  - Demo removal docs were added, updated, then removed in later same-day history.

변경 파일·영역:

- `.env.demo`, `.env.development`
  - `.github/workflows/demo-deploy.yml`
  - `.husky/pre-commit`, `.husky/pre-push`
  - `AGENTS.md`
  - `DEPLOYMENT_GUIDE.md`, `README.md`
  - `Dockerfile`, `Dockerfile.demo`
  - `doc/DEMO_MODE_REMOVAL_SPEC.md`
  - `doc/DEMO_MODE_REMOVAL_WORK_PLAN.md`
  - `doc/PLAYWRIGHT_E2E_GUIDE_DRAFT.md`
  - `package.json`, `package-lock.json`, `yarn.lock`
  - demo scripts and `src/lib/demoUtils.ts`
  - data preprocessing, ML, workspace, data lake pages/components

커밋 근거:

- `2026-04-10 c26c592 [작성자 비공개] refactor: 메인라인 데모모드 제거와 검증 흐름 정리`
  - `2026-04-10 318a3ae [작성자 비공개] docs: 데모 제거 문서 최신화`
  - `2026-04-10 63c125a [작성자 비공개] docs: 데모 제거 기록 문서 삭제`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Mainline demo mode removal and validation flow cleanup`.

## R-1428f10c1704 오프리메드 · Self-hosted demo runner deployment flow

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Distinguish deploy runner recovery from mainline demo-mode removal when writing later narrative.

작업 기간:
2026-04-10

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- Demo deployment workflow/script path was added, cleaned up, and restored in all-branch history.
  - Shared deploy release helper was introduced.
  - Reference Nexus demo deployment files were archived under `reference/`.
  - Husky prepare behavior was adjusted for production deploy.

변경 파일·영역:

- `.github/workflows/demo-deploy.yml`
  - `Dockerfile.demo`
  - `doc/DEMO_RUNNER_DEPLOY_SPEC.md`
  - `doc/SELF_HOSTED_RUNNER_DEMO_DEPLOY_SETUP.md`
  - `reference/nexus-demo-reference/*`
  - `scripts/demo-deploy-release.sh`
  - `scripts/deploy-release-common.sh`
  - `package.json`

커밋 근거:

- `2026-04-10 4e97495 [작성자 비공개] chore: 데모 러너 배포 흐름 추가`
  - `2026-04-10 0c072a4 [작성자 비공개] chore: 데모 러너 배포 스크립트 정리`
  - `2026-04-10 49f6ea6 [작성자 비공개] fix: 운영 배포 husky prepare 오류 방지`
  - `2026-04-10 200d157 [작성자 비공개] ci: 데모 러너 배포 흐름 복구`
  - `2026-04-10 00b97aa [작성자 비공개] docs: 데모 러너 배포 가이드 추가`
  - `2026-04-10 4832c41 [작성자 비공개] docs: Nexus 데모 배포 레퍼런스 보관`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Self-hosted demo runner deployment flow`.

## R-3d88e4bc79aa 오프리메드 · Dependency/security cleanup and CRA/yarn/API alias removal

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check final package manager policy because later commits also touch lockfiles.

작업 기간:
2026-04-10

원문 작업 설명:

- CRA leftover public/runtime files were removed.
  - Unused axios/API alias path and yarn lock were removed.
  - Package versions were updated for a Next.js security patch.

변경 파일·영역:

- `package.json`, `package-lock.json`, `yarn.lock`
  - `public/index.html`
  - `public/logo192.png`
  - `public/logo512.png`
  - `public/manifest.json`
  - `src/api/axios.ts`
  - `src/reportWebVitals.js`
  - `src/setupTests.js`

커밋 근거:

- `2026-04-10 7906d14 [작성자 비공개] chore: CRA 잔재 제거`
  - `2026-04-10 10db56f [작성자 비공개] chore: 미사용 API alias와 의존성 정리`
  - `2026-04-10 d6c9e01 [작성자 비공개] fix: Next.js 15.5.15 보안 패치 적용`
  - `2026-04-10 3157b4f [작성자 비공개] chore: yarn lock 제거`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Dependency/security cleanup and CRA/yarn/API alias removal`.

## R-88058dabeec9 오프리메드 · Agent/config conventions and push-hook verification

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Repo policy work may overlap with `fe-config` sync work; use only the Husky/build verification portion for CI/CD resume wording.

작업 기간:
2026-04-13 to 2026-06-22

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work for Husky/build verification items.

원문 작업 설명:

- Repository coding/config conventions were added or normalized.
  - Worklog ignore policy and workspace boundary rules were recorded.
  - Husky push hook was adjusted toward build verification.

변경 파일·영역:

- `.editorconfig`
  - `.gitignore`
  - `.husky/pre-commit`
  - `.husky/pre-push`
  - `.prettierrc.json`
  - `AGENTS.md`
  - `README.md`
  - `doc/GIT_BRANCH_STRATEGY.md`
  - `doc/coding-convention.md`
  - `eslint.config.mjs`
  - `package.json`, `package-lock.json`

커밋 근거:

- `2026-04-13 5c663b1 [작성자 비공개] docs: 구현 원칙 가이드 추가`
  - `2026-04-13 3bdde9d [작성자 비공개] chore: worklogs 디렉터리 무시 설정 추가`
  - `2026-04-28 995055a [작성자 비공개] chore: FE 기본 에이전트 설정 병합`
  - `2026-05-08 ea14129 [작성자 비공개] chore: FE 설정 스냅샷 반영`
  - `2026-06-05 258c8c4 [작성자 비공개] docs: 작업공간 경계 규칙 추가`
  - `2026-06-22 1ecb20b [작성자 비공개] chore: Husky 푸시 훅 빌드 검증으로 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Agent/config conventions and push-hook verification`.

## R-16244b1b8704 오프리메드 · Unused code and unused constants cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Needs final-tree check before claiming net bundle or maintainability impact.

작업 기간:
2026-04-15 to 2026-05-07

원문 작업 설명:

- Large sets of unused components, constants, helper files, and dependencies were removed.
  - Some API/helper files were edited to remove unused constants/functions.

변경 파일·영역:

- deleted unused common/data-preprocessing/machinelearning components
  - deleted unused visualization/modal/scenario files
  - deleted unused hooks/listener/constants/helpers
  - `src/CsrfContext.tsx`
  - `src/api/data-preprocessing.ts`
  - `src/api/login.ts`
  - `src/api/ml.ts`
  - `src/constants/constants.ts`
  - `src/constants/mockup.ts`
  - `src/lib/AESUtil.ts`
  - `src/lib/dataUtils.ts`
  - `src/lib/fileUtil.ts`
  - `package.json`, `package-lock.json`

커밋 근거:

- `2026-04-15 86b1670 [작성자 비공개] chore: 미사용 코드 정리`
  - `2026-04-15 802d643 [작성자 비공개] chore: 미사용 상수와 함수 정리`
  - `2026-05-07 dfa9492 [작성자 비공개] chore: 미사용 코드와 의존성 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Unused code and unused constants cleanup`.

## R-1da0b5bab24a 오프리메드 · Shared utility extraction and path casing normalization

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify whether all path renames landed on case-sensitive CI environments without follow-up fixes.

작업 기간:
2026-05-08

원문 작업 설명:

- Repeated logic was extracted into shared utility files with tests.
  - File paths were normalized to kebab-case/lowercase across common, data lake, data preprocessing, ML, icons, stores, and pages.
  - Import casing verification script was added and wired into pre-push/package flow.

변경 파일·영역:

- `src/lib/dataUtils.ts`, `src/lib/dataUtils.test.ts`
  - `src/lib/filterUtils.ts`, `src/lib/filterUtils.test.ts`
  - `src/lib/selectionUtils.ts`, `src/lib/selectionUtils.test.ts`
  - `src/lib/sortUtils.ts`, `src/lib/sortUtils.test.ts`
  - `src/lib/machine-learning/resultQuery.ts`, `resultTransform.ts`, and tests
  - large component/icon/container/page/store renames to kebab-case/lowercase paths
  - `scripts/check-import-casing.cjs`
  - `.husky/pre-push`
  - `package.json`

커밋 근거:

- `2026-05-08 3d937f0 [작성자 비공개] refactor: 반복 함수 공통화`
  - `2026-05-08 f914295 [작성자 비공개] refactor: 파일 경로 kebab-case 정리`
  - `2026-05-08 6719b37 [작성자 비공개] fix: import 경로 대소문자 검증 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Shared utility extraction and path casing normalization`.

## R-a5c342c2a0ac 오프리메드 · React/Next security patches and Docker node alignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Duplicate patch subjects are separate commits; check whether they are branch duplicates or independent applications.

작업 기간:
2026-05-08

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work for Docker/runtime alignment items.

원문 작업 설명:

- React/Next package versions were patched in two separate all-branch commits.
  - Docker node version was aligned with app runtime/package expectations.

변경 파일·영역:

- `package.json`
  - `package-lock.json`
  - `Dockerfile`
  - `doc/NEXT_15_5_12_UPGRADE_VALIDATION_PLAN.md`

커밋 근거:

- `2026-05-08 c49a33c [작성자 비공개] fix: React와 Next.js 보안 패치 적용`
  - `2026-05-08 1d6395e [작성자 비공개] fix: React와 Next.js 보안 패치 적용`
  - `2026-05-08 adca3ca [작성자 비공개] fix: align docker node version`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `React/Next security patches and Docker node alignment`.

## R-bbf2cb7a7acb 오프리메드 · Axios dependency removal and temporary report/doc churn

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Treat docs churn separately from code dependency removal in later summaries.

작업 기간:
2026-05-15 to 2026-05-19

원문 작업 설명:

- Axios dependency/type usage was removed from app fetch/API/runtime paths.
  - Report documents were added in axios-removal commits and later deleted.
  - E2E skill/guide docs were removed or revised.

변경 파일·영역:

- `AGENTS.md`
  - `README.md`
  - `doc/coding-convention.md`
  - `doc/E2E_FAILURE_REPORT_2026-05-08.md`
  - `doc/FIGMA_CODE_PARITY_*.md`
  - `doc/COMMONIZE_LIB_REFACTOR_PLAN.md`
  - `package.json`, `package-lock.json`
  - `src/api/fetcher.ts`
  - `src/api/ml.ts`
  - `src/components/machine-learning/file-upload-area.tsx`
  - `src/components/work-space/modal/new-project.tsx`
  - `src/containers/machine-learning/value-modification/index.tsx`
  - `src/hooks/use-plot.tsx`
  - `src/lib/retry-util.ts`
  - `src/pages/_app.tsx`
  - `src/types/axios.d.ts`

커밋 근거:

- `2026-05-15 ed57d73 [작성자 비공개] refactor: axios 의존성 제거`
  - `2026-05-15 ef3a313 [작성자 비공개] refactor: axios 의존성 제거`
  - `2026-05-15 a626666 [작성자 비공개] docs: 리포트 파일 제거`
  - `2026-05-19 29f6b28 [작성자 비공개] docs: e2e 관련 문서 제거`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Axios dependency removal and temporary report/doc churn`.

## R-1045cd11a988 오프리메드 · Product switcher and Notice delete-button changes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Net behavior for Notice delete button should be checked from final branch tree because evidence includes a revert.

작업 기간:
2026-05-15 to 2026-06-05

원문 작업 설명:

- Product switcher domain target changed.
  - Notice delete button removal appears twice in all-branch history, then was reverted.

변경 파일·영역:

- `src/components/common/product-switcher.tsx`
  - `src/pages/notice/index.tsx`

커밋 근거:

- `2026-05-15 eb32e38 [작성자 비공개] fix: 제품 전환 링크 도메인 변경`
  - `2026-05-15 8c3ec70 [작성자 비공개] fix: Notice 삭제 버튼 제거`
  - `2026-05-15 ec0721d [작성자 비공개] fix: Notice 삭제 버튼 제거`
  - `2026-06-05 8009fdb [작성자 비공개] Revert "fix: Notice 삭제 버튼 제거"`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Product switcher and Notice delete-button changes`.

## R-f7138e81fca1 오프리메드 · Select Feature navigation and update-schema fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Net API schema shape must be read from final `src/api/data-preprocessing.ts` and type files if needed.

작업 기간:
2026-05-15 to 2026-05-22

원문 작업 설명:

- Select Feature update request schema and handling were changed, partially reverted, then later renewed.
  - Select Feature navigation entry error was documented and fixed through page/store changes.

변경 파일·영역:

- `src/api/data-preprocessing.ts`
  - `src/pages/data-preprocessing/select-feature/index.tsx`
  - `src/types/data-preprocessing/data-preprocessing-types.ts`
  - `src/types/machine-learning/machine-learing-types.ts`
  - `src/zustand/data-store.ts`
  - `doc/SELECT_FEATURE_NAVIGATION_ERROR_CASE_2026-05-21.md`

커밋 근거:

- `2026-05-15 97e95ce [작성자 비공개] fix: Select Feature 업데이트 요청 스키마 반영`
  - `2026-05-15 239fe61 [작성자 비공개] fix: Select Feature 업데이트 요청 처리 보완`
  - `2026-05-15 666f4b0 [작성자 비공개] Revert "fix: Select Feature 업데이트 요청 스키마 반영"`
  - `2026-05-21 53a5956 [작성자 비공개] fix: Select Feature 진입 에러 수정`
  - `2026-05-22 3731cd4 [작성자 비공개] fix: Select Feature 업데이트 스키마 갱신`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Select Feature navigation and update-schema fixes`.

## R-27eae608f92c 오프리메드 · Progress, QA, PR review, and Figma/PDF reference documentation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- These are raw documentation/evidence artifacts, not direct product feature changes unless tied to separate code commits.

작업 기간:
2026-05-22 to 2026-06-08

원문 작업 설명:

- Multiple review, QA, progress, design parity, Swagger, E2E, and Figma/PDF reference docs were added or consolidated.
  - Some PR review docs were added then consolidated/deleted into a smaller set.
  - Figma PDF reference material was committed for data lake, preprocessing, and workspace screens.

변경 파일·영역:

- `doc/NON_FUNCTIONAL_UI_AUDIT_2026-05-26.md`
  - `doc/PR_104_105_ISSUE_REPORT.md`
  - `doc/PR_104_105_REREVIEW_SUMMARY.md`
  - `doc/PR_104_RE_REVIEW_FINDINGS.md`
  - `doc/PR_105_TRIPLE_REVIEW_FINDINGS.md`
  - `doc/PR_SIDE_EFFECT_REVIEW_*`
  - `doc/CRITICAL_QA_LABS_2026-06-04.md`
  - `doc/OPTIVIS_FE_TASK_CODE_REVIEW_2026-06-05.md`
  - `doc/OPTIVIS_FE_TASKS_FROM_GOALS_2026-06-04.md`
  - `doc/OPTIVIS_FE_WORK_ITEMS_2026-06-04.md`
  - `doc/fe-progress/*`
  - `figma-pdf/data-lake/*`
  - `figma-pdf/data-preprocessing/*`
  - `figma-pdf/workspace/*`
  - `sample/*`

커밋 근거:

- `2026-05-22 3c5732f [작성자 비공개] docs: PR 104 105 재검토 결과 정리`
  - `2026-05-22 7ad41a8 [작성자 비공개] docs: consolidate PR review report`
  - `2026-05-26 d61404d [작성자 비공개] docs: 미동작 UI 현황 정리`
  - `2026-06-05 3d860a8 [작성자 비공개] docs: Labs 비기능 UI 현황 최신화`
  - `2026-06-05 5e03fa5 [작성자 비공개] docs: Labs Critical QA 결과 정리`
  - `2026-06-05 1365af3 [작성자 비공개] docs: FE 작업 코드 리뷰 결과 정리`
  - `2026-06-05 e83aca0 [작성자 비공개] docs: FE 작업 코드 리뷰 재검토 반영`
  - `2026-06-05 f395d9c [작성자 비공개] docs: FE 진행도 작업 목록 정리`
  - `2026-06-08 72857ed [작성자 비공개] docs: FE 작업 코드 리뷰 최신화`
  - `2026-06-08 4a01c28 [작성자 비공개] docs: FE 진행도 검증 리포트 추가`
  - `2026-06-08 993a10b [작성자 비공개] docs: Figma PDF 기준 자료 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Progress, QA, PR review, and Figma/PDF reference documentation`.

## R-c4350fc28b02 오프리메드 · Session expiration SDK modal bridge

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm SDK runtime source/config via final `next.config.js` and environment settings.

작업 기간:
2026-05-26

원문 작업 설명:

- Session-expired handling was connected through fetcher/auth/app paths.
  - SDK wrapper and test file were added.

변경 파일·영역:

- `next.config.js`
  - `src/api/fetcher.ts`
  - `src/lib/auth.ts`
  - `src/lib/session-expired-sdk.ts`
  - `src/lib/session-expired-sdk.test.ts`
  - `src/pages/_app.tsx`

커밋 근거:

- `2026-05-26 9b4471c [작성자 비공개] feat: 세션 만료 SDK 모달 연결`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Session expiration SDK modal bridge`.

## R-163e23acb5f9 오프리메드 · Data Lake upload/edit behavior and state/design verification

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether screenshot artifacts are intended to remain in repo history or are only verification residue.

작업 기간:
2026-05-21 to 2026-06-15

원문 작업 설명:

- Data Lake upload filename parsing, upload modal validation/empty state, edit API wiring, failure alert, text/date display, and edit save condition were adjusted.
  - E2E/design parity/local fixture docs and screenshot artifacts were added around DLK work.

변경 파일·영역:

- `src/pages/data-lake/index.tsx`
  - `src/api/data-lake.ts`
  - `src/types/data-lake/index.ts`
  - `src/components/data-lake/edit-file-modal/index.tsx`
  - `src/components/data-lake/data-lake-upload-file-modal/data-lake-upload-file-modal.tsx`
  - `doc/fe-progress/labs-dlk-*`
  - `doc/fe-progress/artifacts/dlk-design-parity-2026-06-11/*`

커밋 근거:

- `2026-05-21 da08fc3 [작성자 비공개] fix: Data Lake 업로드 파일명 분리 복구`
  - `2026-06-11 828e1d0 [작성자 비공개] docs: DLK E2E 검증 결과 정리`
  - `2026-06-11 ce5634b [작성자 비공개] fix: DLK 업로드 유효성 보정`
  - `2026-06-11 1f50d5a [작성자 비공개] docs: DLK 로컬 테스트 데이터 관리 정리`
  - `2026-06-11 f9b2286 [작성자 비공개] fix: DLK 업로드 모달 빈 상태 표시`
  - `2026-06-11 fd8bde1 [작성자 비공개] fix: DLK 데이터 수정 API 연동`
  - `2026-06-11 80e363b [작성자 비공개] fix: DLK 수정 실패 메시지 alert 표시`
  - `2026-06-11 31a20a1 [작성자 비공개] fix: DLK 문구와 날짜 표기 보정`
  - `2026-06-11 2e045bc [작성자 비공개] docs: DLK 상태 복원과 디자인 검증 결과 추가`
  - `2026-06-15 020d697 [작성자 비공개] fix: Data Lake 편집 저장 조건 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Data Lake upload/edit behavior and state/design verification`.

## R-6dc6fcdab648 오프리메드 · Preprocessing and ML validation guards, empty-value checks, and toast/error handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm actual user-visible validation copy and exact blocking conditions from final source if needed.

작업 기간:
2026-06-15

원문 작업 설명:

- Validation guards were added or tightened around preprocessing cleansing, filter direct-route actions, mapping conditions, and ML file upload.
  - Empty task / empty condition cases gained toast or blocking behavior.
  - Browser E2E/validation result docs were updated through several small commits.
  - Browser test artifacts were ignored.

변경 파일·영역:

- `src/components/machine-learning/file-upload-area.tsx`
  - `src/containers/data-preprocessing/cleansing/select-form/index.tsx`
  - `src/containers/data-preprocessing/cleansing/step2-form/index.tsx`
  - `src/pages/data-preprocessing/data-cleansing/index.tsx`
  - `src/pages/data-preprocessing/filter/index2.tsx`
  - `src/components/data-preprocessing/mapping/upload-modal/index.tsx`
  - `src/components/data-preprocessing/select-data/preprocessing-table/tr/index.tsx`
  - `src/pages/data-preprocessing/select-feature/index.tsx`
  - `src/containers/data-preprocessing/mapping/templates/title/condition-setting/modal/index.tsx`
  - `doc/fe-progress/labs-preprocessing-ml-validation-browser-e2e-result-2026-06-15.md`
  - `doc/fe-progress/labs-data-preprocessing-empty-error-loading-gap-report-2026-06-15.md`
  - `.gitignore`

커밋 근거:

- `2026-06-15 63df4a6 [작성자 비공개] docs: 전처리 ML 검증 브라우저 결과 정리`
  - `2026-06-15 c862b02 [작성자 비공개] docs: 검증 결과 판정 분류 추가`
  - `2026-06-15 53c9011 [작성자 비공개] docs: 검증 결과 불필요 분류 제거`
  - `2026-06-15 dc526a8 [작성자 비공개] fix: 전처리 ML 검증 가드 보강`
  - `2026-06-15 cab3636 [작성자 비공개] docs: 검증 가드 수정 반영 기록`
  - `2026-06-15 ade994a [작성자 비공개] docs: 수정 후 E2E 재검토 기록`
  - `2026-06-15 0251dec [작성자 비공개] docs: 테스트 계정 확장 E2E 결과 기록`
  - `2026-06-15 61271f8 [작성자 비공개] fix: 매핑 조건 빈 값 적용 방지`
  - `2026-06-15 2023cff [작성자 비공개] docs: 매핑 조건 검증 수정 결과 기록`
  - `2026-06-15 0fd7e88 [작성자 비공개] fix: guard filter direct route actions`
  - `2026-06-15 6cacfa2 [작성자 비공개] fix: 필터 빈 task 토스트 안내 추가`
  - `2026-06-15 2a8364c [작성자 비공개] fix: 전처리 토스트 에러 처리 보강`
  - `2026-06-15 27df5a2 [작성자 비공개] chore: 브라우저 테스트 산출물 제외`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Preprocessing and ML validation guards, empty-value checks, and toast/error handling`.

## R-cb1bf4c9e7ef 오프리메드 · Workspace list API contract alignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify final API contract against live/backend Swagger only if later requested; this raw extraction only used FE git evidence.

작업 기간:
2026-06-15

원문 작업 설명:

- Workspace list response/typing/util mapping was aligned across API, types, page, table, tab, model, and edit modal paths.
  - New workspace utility file was added.

변경 파일·영역:

- `src/api/work-space.ts`
  - `src/components/work-space/dropdown/modal/edit-form/index.tsx`
  - `src/components/work-space/dropdown/modal/index.tsx`
  - `src/components/work-space/tab.tsx`
  - `src/containers/workspace/model/index.tsx`
  - `src/containers/workspace/table/index.tsx`
  - `src/lib/workspace-utils.ts`
  - `src/pages/work-space/index.tsx`
  - `src/types/work-space/index.ts`

커밋 근거:

- `2026-06-15 16c5168 [작성자 비공개] fix: align workspace list contract`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Workspace list API contract alignment`.

## R-ae2c8e4876f4 오프리메드 · Preprocessing status, Swagger diff, and design/empty/loading audit docs

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Keep code contract alignment separate from audit-document creation in later polished summaries.

작업 기간:
2026-06-15 to 2026-06-19

원문 작업 설명:

- Preprocessing status contract code was changed in filter/notice/types/store paths.
  - Swagger diff, E2E plan/review, design implementation gap, empty/error/loading/validation audit docs were added or updated.

변경 파일·영역:

- `src/pages/data-preprocessing/filter/index2.tsx`
  - `src/pages/notice/index.tsx`
  - `src/types/data-preprocessing/data-preprocessing-types.ts`
  - `src/zustand/scheduler-store.ts`
  - `doc/fe-progress/labs-data-preprocessing-empty-error-loading-gap-report-2026-06-15.md`
  - `doc/fe-progress/labs-design-implementation-gaps-2026-06-15.md`
  - `doc/fe-progress/labs-fe-swagger-schema-diff-2026-06-15.md`
  - `doc/fe-progress/labs-fe-swagger-schema-diff-2026-06-16.md`
  - `doc/fe-progress/labs-ml-full-e2e-test-plan-2026-06-16.md`
  - `doc/fe-progress/labs-pr120-ml-e2e-review-result-2026-06-16.md`
  - `doc/EMPTY_VALUE_AUDIT_2026-06-16.md`
  - `doc/ERROR_HANDLING_AUDIT_2026-06-16.md`
  - `doc/LOADING_HANDLING_AUDIT_2026-06-16.md`
  - `doc/QUALITY_AUDIT_2026-06-16.md`
  - `doc/VALIDATION_GUARD_AUDIT_2026-06-16.md`

커밋 근거:

- `2026-06-15 b13920b [작성자 비공개] docs: 전처리 상태 처리 부족 지점 기록`
  - `2026-06-15 2351e07 [작성자 비공개] docs: 디자인 구현 미흡 항목 기록`
  - `2026-06-15 c287408 [작성자 비공개] docs: FE Swagger 계약 차이 정리`
  - `2026-06-15 a87aec0 [작성자 비공개] docs: 전처리 상태 처리 조사 범위 정리`
  - `2026-06-15 3e57951 [작성자 비공개] docs: 디자인 구현 오류 항목 정리`
  - `2026-06-15 8293140 [작성자 비공개] fix: align preprocessing status contracts`
  - `2026-06-15 1bde1f6 [작성자 비공개] docs: update Swagger diff after low-risk fixes`
  - `2026-06-15 e5b8ccc [작성자 비공개] docs: 전처리 로딩 기준 정리`
  - `2026-06-15 816e519 [작성자 비공개] docs: 전처리 로더 TODO 기준 정리`
  - `2026-06-16 ca2a9c6 [작성자 비공개] docs: 머신러닝 전체 e2e 계획 기록`
  - `2026-06-19 daabcde [작성자 비공개] docs: 품질 감사 문서 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Preprocessing status, Swagger diff, and design/empty/loading audit docs`.

## R-25f9cf313f23 오프리메드 · Filter save/restore API contract and empty-condition handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify final API payload shape if this becomes resume/API-contract material.

작업 기간:
2026-06-17

원문 작업 설명:

- Filter save API contract/types/mapper were added.
  - Filter save/restore was wired through filter logic, modal state, and page flow.
  - Empty filter-condition save case was handled.

변경 파일·영역:

- `src/api/data-preprocessing.ts`
  - `src/components/data-preprocessing/filter/filter-api-mapper.ts`
  - `src/components/data-preprocessing/filter/hooks/use-filter-logic.ts`
  - `src/components/data-preprocessing/filter/new-filter-modal.tsx`
  - `src/components/data-preprocessing/filter/types.ts`
  - `src/pages/data-preprocessing/filter/index2.tsx`
  - `src/types/data-preprocessing/data-preprocessing-types.ts`

커밋 근거:

- `2026-06-17 a96f37c [작성자 비공개] feat: 필터 저장 계약 추가`
  - `2026-06-17 064b968 [작성자 비공개] feat: 필터 저장 복원 연동`
  - `2026-06-17 04bd36d [작성자 비공개] fix: 빈 필터 조건 저장 처리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Filter save/restore API contract and empty-condition handling`.

## R-17ebf412d1f1 오프리메드 · ML data-selection and result UI fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether disabled delete button is temporary, permission-based, or final product behavior.

작업 기간:
2026-06-19

원문 작업 설명:

- ML data-selection table overlap was fixed.
  - ML Result delete button was disabled.

변경 파일·영역:

- `src/containers/machine-learning/data-selection/table/index.tsx`
  - `src/pages/machine-learning/result/index.tsx`

커밋 근거:

- `2026-06-19 71b02eb [작성자 비공개] fix: ML 데이터 선택 테이블 오버랩 수정`
  - `2026-06-19 09a6872 [작성자 비공개] fix: ML Result 삭제 버튼 비활성화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `ML data-selection and result UI fixes`.

## R-73d005edcc62 오프리메드 · Service overview and README project-structure docs

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Treat as documentation artifact unless paired with separate feature implementation commits.

작업 기간:
2026-06-17 to 2026-06-22

원문 작업 설명:

- README project structure explanation was expanded.
  - Service overview docs were added for Data Lake, Data Preprocessing, and Machine Learning.

변경 파일·영역:

- `README.md`
  - `doc/DATA_LAKE_SERVICE_OVERVIEW.md`
  - `doc/DATA_PREPROCESSING_SERVICE_OVERVIEW.md`
  - `doc/MACHINE_LEARNING_SERVICE_OVERVIEW.md`

커밋 근거:

- `2026-06-17 e9387af [작성자 비공개] docs: README 프로젝트 구조 설명 보강`
  - `2026-06-22 0482949 [작성자 비공개] docs: 주요 서비스 개요 문서 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Service overview and README project-structure docs`.

## R-b82bbf883aa5 오프리메드 · FE configuration template and target sync package

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- verify which target repo this configuration was ultimately copied into.

작업 기간:
2026-04-28 to 2026-05-07

원문 작업 설명:

- Config sync package was created with README, sync script, manifest/package settings, editor/lint/prettier/husky/coding convention templates.
  - Template structure moved from `templates/` to `source/`, then simplified into `copy-to-target/`.
  - Setup agent guide and target snapshot were added/updated.

변경 파일·영역:

- `README.md`
  - `SETUP_AGENT_GUIDE.md`
  - `scripts/sync-from-optivis-nexus-fe.sh`
  - `templates/optivis-nexus-fe/*`
  - `source/optivis-nexus-fe/*`
  - `copy-to-target/*`
  - `copy-to-target/.husky/pre-push`
  - `copy-to-target/docs/GIT_BRANCH_STRATEGY.md`
  - `copy-to-target/docs/coding-convention.md`
  - `copy-to-target/manifest.json`
  - `copy-to-target/package-settings.json`

커밋 근거:

- `2026-04-28 9268dcf [작성자 비공개] chore: 설정 동기화 템플릿 추가`
  - `2026-04-28 4a8017a [작성자 비공개] chore: 참조 프로젝트 구조 정리`
  - `2026-04-28 cdaf017 [작성자 비공개] chore: 복사 대상 구조 단순화`
  - `2026-04-28 4a6d608 [작성자 비공개] docs: 설정 적용 에이전트 가이드 추가`
  - `2026-05-07 bec0266 [작성자 비공개] chore: 타겟 설정 스냅샷 갱신`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `FE configuration template and target sync package`.

## R-65a4bd03824f 오프리메드 · Admin FE README rewritten to current project state

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- No source-code behavior evidence in the matching commit; documentation-only from git metadata.

작업 기간:
2026-04-10

원문 작업 설명:

- Admin FE README was rewritten against the current project state.

변경 파일·영역:

- `README.md`

커밋 근거:

- `2026-04-10 20f900a [작성자 비공개] docs: 리드미 현재 프로젝트 기준으로 재작성`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/labs-config-admin-all-branches-raw-work-units.md` · `Admin FE README rewritten to current project state`.

## R-0633a243bd23 오프리메드 · TSI chart primitives and report API wiring

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify which chart components survived later Grafy and shared-chart refactors.

작업 기간:
2026-02-24 to 2026-02-25

원문 작업 설명:

- TSI report/refine/subgroup screens were connected to subgroup API response shapes.
  - Reusable chart components and TSI response sample/schema handling were added around the first TSI workflow implementation.

변경 파일·영역:
`src/components/charts/*`, `src/app/tsi/refine-cutoffs/page.tsx`, `src/app/tsi/subgroup-explain/page.tsx`, `src/app/tsi/subgroup-selection/page.tsx`, `src/services/subgroupService.ts`

커밋 근거:

- `2026-02-24 3c6b11fd [작성자 비공개] feat: 멀티라인에러바 추가`
  - `2026-02-24 4368faa7 [작성자 비공개] feat: chart components 추가`
  - `2026-02-25 f6c7f6b6 [작성자 비공개] feat: Target Subgroup Identification api 적용 및 컷오프 케이스 추가, 컴포넌트 분리, 응답 스키마 정의`
  - `2026-02-25 d6533844 [작성자 비공개] feat: subgroup-explain api적용 및 차트 연결`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TSI chart primitives and report API wiring`.

## R-f123a33693fd 오프리메드 · Home simulation search and action menu

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check later home table rewrites before claiming final user-facing ownership.

작업 기간:
2026-02-27

원문 작업 설명:

- Home simulation list gained search behavior and a more-actions popover.
  - The change touched home table/search UI rather than backend service logic.

변경 파일·영역:
`src/app/page.tsx`, `src/components[로컬 경로 비공개]`, `src/components[로컬 경로 비공개]`, `src/components/ui/popover.tsx`

커밋 근거:

- `2026-02-27 485c63c2 [작성자 비공개] feat: 시뮬레이션 검색 기능 추가`
  - `2026-02-27 0ec0bee2 [작성자 비공개] feat: more action pop-over 컴포넌트 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Home simulation search and action menu`.

## R-ac9799fb265c 오프리메드 · Docker, tar, load, and deployment scripts

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether these scripts were used in production, demo, or only local packaging.

작업 기간:
2026-02-25 to 2026-03-23

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- Added container packaging and local load/deployment helper scripts.
  - README/deployment script edits indicate FE package transfer/deploy support work.

변경 파일·영역:
`Dockerfile`, `.dockerignore`, `create-tar.sh`, `create-tar.bat`, `load.sh`, `load.bat`, `README.md`

커밋 근거:

- `2026-02-25 0ecb8ff8 [작성자 비공개] feat: docker 파일 추가`
  - `2026-02-26 496ccb8f [작성자 비공개] feat: 배포 스크립트 추가`
  - `2026-03-23 519d9587 [작성자 비공개] chore: load.sh 파일 생성`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Docker, tar, load, and deployment scripts`.

## R-89cab7284068 오프리메드 · DRD request schema and default-setting API wiring

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later route-group migration changed file paths; use current paths when describing final architecture.

작업 기간:
2026-03-04 to 2026-03-05

원문 작업 설명:

- DRD default-setting and adjacent setup pages were moved toward service/API schema usage.
  - Query-string and store context were added to carry DRD task/service state across pages.

변경 파일·영역:
`src/app/drd/default-setting/page.tsx`, `src/app/drd/filter/page.tsx`, `src/app/drd/high-risk-subgroup/page.tsx`, `src/services/drd-service.ts`, `src/services/types/drd-service.types.ts`, `src/lib/drd-default-setting-mapper.ts`

커밋 근거:

- `2026-03-04 2b7cdf4d [작성자 비공개] feat: drd api 요청 스키마 정의`
  - `2026-03-04 5d7963b5 [작성자 비공개] feat: /drd/default-setting 페이지 api 연결`
  - `2026-03-05 aa3b3e8a [작성자 비공개] feat: DRD 진입 및 페이지 이동 시 쿼리스트링 컨텍스트 유지`
  - `2026-03-05 fbb6bbcb [작성자 비공개] feat: DRD 파라미터를 쿼리스트링/스토어 기반으로 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD request schema and default-setting API wiring`.

## R-ca1fb09afa74 오프리메드 · DRD SMILES and drug selection UX

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later 동일 기간 후속 commits replaced parts of SMILES rendering and medication metadata handling.

작업 기간:
2026-03-05

원문 작업 설명:

- DRD SMILES response typing and search/loading UI were changed.
  - Simulation-condition drug selection gained duplicate-selection protection and default drug behavior.

변경 파일·영역:
`src/app/drd/smile-setting/page.tsx`, `src/app/drd/simulation-condition/page.tsx`, `src/services/types/drd-service.types.ts`

커밋 근거:

- `2026-03-05 24b52dca [작성자 비공개] feat: SMILES 응답 스키마 확장 및 검색/로딩 UX 개선`
  - `2026-03-05 cacc85ff [작성자 비공개] feat: 스마일식 api 변경 사항 적용`
  - `2026-03-05 de0b486a [작성자 비공개] feat: drug 중복선택 방어 로직 추가, 약품 선택 기본 값 세팅, 스마일 화학구조분자식 이미지 조정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD SMILES and drug selection UX`.

## R-08144d35ef3a 오프리메드 · TSI Grafy design migration across main screens

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-03-06 to 2026-03-10

원문 작업 설명:

- TSI basis/filter/patient summary/subgroup/report screens were restyled toward Grafy screens.
  - Chart layout and report strategy-card proportions were corrected after initial migration.

변경 파일·영역:
`src/app/tsi/basis-selection/page.tsx`, `src/app/tsi/filter/page.tsx`, `src/app/tsi/patients-summary/page.tsx`, `src/app/tsi/subgroup-selection/page.tsx`, `src/app/tsi/subgroup-explain/page.tsx`, `src/app/tsi/refine-cutoffs/page.tsx`, `src/app/tsi/[feature]/report/page.tsx`

커밋 근거:

- `2026-03-06 0fc0b53a [작성자 비공개] feat: TSI basis selection grafy 디자인 이관`
  - `2026-03-06 7a166797 [작성자 비공개] feat: TSI 데이터 설정/필터/환자 요약 grafy 디자인 이관`
  - `2026-03-06 8f105990 [작성자 비공개] feat: TSI subgroup selection grafy 디자인 이관`
  - `2026-03-06 9781ce3d [작성자 비공개] feat: TSI subgroup explain/refine cutoffs grafy 디자인 이관`
  - `2026-03-10 ca1da8fe [작성자 비공개] fix: /tsi report 전략 카드 및 차트 비율 정렬`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TSI Grafy design migration across main screens`.

## R-a30895a3bcd7 오프리메드 · ATS Grafy simulation/report and hypothesis modal alignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later 동일 기간 후속 commits heavily revised ATS again.

작업 기간:
2026-03-06 to 2026-03-15

원문 작업 설명:

- ATS simulation/report pages and side panels were adjusted to Grafy design.
  - Hypothesis type modal structure and copy were changed across QA/design iterations.

변경 파일·영역:
`src/app/ats/simulation/page.tsx`, `src/app/ats/simulation/report/page.tsx`, `src/components/ats/LeftPanel.tsx`, `src/components/ats/RightPanel.tsx`, `src/components/ui/hypothesis-type-modal.tsx`

커밋 근거:

- `2026-03-06 345e26e2 [작성자 비공개] feat: ATS 시뮬레이션/리포트 grafy 디자인 이관`
  - `2026-03-09 625b943c [작성자 비공개] fix: /ats/simulation 가설 유형 modal JSX 전환 및 QA 문구 반영`
  - `2026-03-15 e20d96f9 [작성자 비공개] feat: ATS 가설 타입 안내 모달을 타겟 구조로 정렬`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `ATS Grafy simulation/report and hypothesis modal alignment`.

## R-b2f2d147fbbb 오프리메드 · DRD simulation save/play payload and result mapping

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Mock report wiring appears in the evidence; later fallback-removal commits should be checked before final phrasing.

작업 기간:
2026-03-08 to 2026-03-09

원문 작업 설명:

- DRD simulation-condition save payload and simulation play request path were corrected.
  - DRD simulation-result gained a mapper layer for play result display.

변경 파일·영역:
`src/app/drd/simulation-condition/page.tsx`, `src/app/drd/simulation-setting/page.tsx`, `src/app/drd/simulation-result/page.tsx`, `src/lib/drd-simulation-result-mapper.ts`, `src/services/types/drd-service.types.ts`

커밋 근거:

- `2026-03-08 cd278fb3 [작성자 비공개] fix: DRD simulation condition save payload 스키마 정리`
  - `2026-03-08 c0ee09b3 [작성자 비공개] fix: DRD simulation play 호출 복구`
  - `2026-03-09 75902e35 [작성자 비공개] feat: /drd/simulation-result play 결과 매핑 적용`
  - `2026-03-09 fbdad3f4 [작성자 비공개] feat: /drd/simulation-result grafy 목업 리포트 연결`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD simulation save/play payload and result mapping`.

## R-c7cfd1ea10d6 오프리메드 · DRD workflow task context and setup step persistence

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need API-side confirmation for exact status/task contract semantics.

작업 기간:
2026-03-15 to 2026-03-17

원문 작업 설명:

- DRD workflow carried task context through header/layout and setup pages.
  - Default-setting step save and simulation-setting state/cache handling were added or repaired.

변경 파일·영역:
`src/app/drd/*`, `src/hooks/useDrdQueryContext.ts`, `src/lib/drd-default-setting-mapper.ts`, `src/lib/drd-filter-condition.ts`, `src/store/simulationStore.ts`, layout/header components

커밋 근거:

- `2026-03-15 4fc18553 [작성자 비공개] feat: DRD 워크플로우 task 컨텍스트 및 공용 서비스 추가`
  - `2026-03-15 c26c23cf [작성자 비공개] feat: DRD 기본 설정 단계 저장 연동`
  - `2026-03-15 402882b7 [작성자 비공개] feat: DRD 시뮬레이션 설정 단계 정리`
  - `2026-03-17 f28370b8 [작성자 비공개] fix: DRD 시뮬레이션 설정 충돌 정리 및 쿼리스트링 유지`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD workflow task context and setup step persistence`.

## R-c1904a6a50f1 오프리메드 · TRP service contracts and setup/simulation API wiring

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Duplicate all-branch evidence exists around `8b8dfb29`/similar subject; avoid overcounting feature scope.

작업 기간:
2026-03-18 to 2026-03-20

원문 작업 설명:

- TRP service/type files were introduced.
  - TRP treatment-info and simulation-setting screens were wired to service/API helpers.

변경 파일·영역:
`src/services/trp-service.ts`, `src/services/types/trp-service.types.ts`, `src/app/trp/simulation-setting/page.tsx`, `src/app/trp/treatment-info/page.tsx`, `src/lib/trp-simulation-setting-api.ts`, `src/lib/trp-treatment-info-api.ts`

커밋 근거:

- `2026-03-18 8b8dfb29 [작성자 비공개] feat: trp 타입, 서비스 추가`
  - `2026-03-20 6cf2c5b3 [작성자 비공개] feat: DRD TRP 시뮬레이션 실데이터 연동`
  - `2026-03-20 73d97184 [작성자 비공개] feat: TRP 시뮬레이션 설정 저장 연동`
  - `2026-03-20 20af5f0e [작성자 비공개] feat: TRP 치료 정보와 시뮬레이션 설정 API 연동`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TRP service contracts and setup/simulation API wiring`.

## R-0d10a0538d23 오프리메드 · TSI/DRD filter and data-setting real API connection

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check later criteria/filter shared component revisions for final behavior.

작업 기간:
2026-03-19 to 2026-03-20

원문 작업 설명:

- Common data-setting screen was connected to real disease data loading.
  - TSI and DRD filters moved from mock data toward feature-list API usage.

변경 파일·영역:
`src/app/tsi/filter/page.tsx`, `src/app/drd/filter/page.tsx`, `src/components/common/DataSettingScreen.tsx`, `src/hooks/use-disease-data-setting.ts`, `src/services/common-service.ts`

커밋 근거:

- `2026-03-19 f75d5c26 [작성자 비공개] feat: tsi 필터 화면 구현 및 진입 경로 연결`
  - `2026-03-19 c5f219ca [작성자 비공개] feat: data setting 실데이터 연동`
  - `2026-03-20 4ebdc74b [작성자 비공개] feat: TSI 필터 피처리스트 API 연동`
  - `2026-03-20 698743fa [작성자 비공개] feat: DRD 필터 피처리스트 API 연동`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TSI/DRD filter and data-setting real API connection`.

## R-029dcfdde467 오프리메드 · Screen code mapper and status-detail save contract

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later status-manage router work changed this area substantially.

작업 기간:
2026-03-30

원문 작업 설명:

- Added shared screen-code mapping and per-service route maps.
  - Status detail retrieval/save contract was introduced in the drive/status-related service layer.

변경 파일·영역:
`src/lib/screen-mapper.ts`, `src/lib/drd-map.ts`, `src/lib/trp-map.ts`, `src/lib/tsi-map.ts`, `src/components/layout/header/constants.ts`, `src/services/drive-service.ts`

커밋 근거:

- `2026-03-30 579e690e [작성자 비공개] feat: 공용 화면 코드 매퍼 추가`
  - `2026-03-30 dbdc830f [작성자 비공개] feat: TSI DRD TRP 화면 코드맵 연결`
  - `2026-03-30 3ff52fbe [작성자 비공개] feat: 상태관리 상세 조회와 저장 계약 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Screen code mapper and status-detail save contract`.

## R-3bc16faf5078 오프리메드 · Status-manage cache proxy and TSI resume/stale state

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later May step-router and snapshot-hash commits supersede parts of this cache approach.

작업 기간:
2026-04-01

원문 작업 설명:

- Status-manage service/store contract and fetcher cache proxy were reworked.
  - TSI resume/replay flow and stale task handling for DRD/TRP were adjusted.

변경 파일·영역:
`src/services/status-manage-service.ts`, `src/store/status-manage-store.ts`, `src/lib/status-manage-cache-proxy.ts`, `src/lib/fetcher.ts`, TSI pages, home simulation table

커밋 근거:

- `2026-04-01 5aa41bb8 [작성자 비공개] refactor: status-manage 엔티티와 서비스 계약 정리`
  - `2026-04-01 80d2aa6e [작성자 비공개] feat: status-manage fetcher 캐시 프록시 연결`
  - `2026-04-01 ee340a88 [작성자 비공개] feat: status-manage 캐시와 TSI 흐름 정리`
  - `2026-04-01 af211e6a [작성자 비공개] fix: DRD TRP stale 상태와 task 흐름 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Status-manage cache proxy and TSI resume/stale state`.

## R-19d9d8aafe71 오프리메드 · DRD/TRP shared simulation UI and route-group split

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Some route/file names changed from old non-grouped paths to grouped paths; cite final paths carefully.

작업 기간:
2026-04-01 to 2026-04-02

원문 작업 설명:

- Simulation category cards, medication plans, summary panels, and icons were extracted as shared UI.
  - DRD/TRP setup flows were moved into route groups and layout wrappers.

변경 파일·영역:
`src/components/simulation/*`, `src/components/layout/header/*`, `src/app/drd/(simulation-flow)/*`, `src/app/trp/(simulation-flow)/*`, `src/app/drd/(default-setting-flow)/*`

커밋 근거:

- `2026-04-01 03c863c5 [작성자 비공개] feat: DRD/TRP 시뮬레이션 공통 UI 컴포넌트 분리`
  - `2026-04-01 a092c885 [작성자 비공개] refactor: 헤더 스텝/액션 공통화`
  - `2026-04-02 0f9664e0 [작성자 비공개] feat: split DRD and TRP simulation setup flows`
  - `2026-04-02 8d05dbc1 [작성자 비공개] refactor: DRD 기본설정 플로우 레이아웃 공통화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD/TRP shared simulation UI and route-group split`.

## R-92d2731c572e 오프리메드 · ATS report appendix and fullscreen chart UI

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Codex-assisted and 동일 기간 후속 commits later adjusted ATS fullscreen/report styling.

작업 기간:
2026-04-07

원문 작업 설명:

- ATS report gained appendix content and fullscreen chart portal support.
  - Work is localized to ATS report page plus reusable fullscreen e-chart portal.

변경 파일·영역:
`src/app/ats/simulation/report/page.tsx`, `src/components/ui/fullscreen-echart-portal.tsx`

커밋 근거:

- `2026-04-07 d530263b [작성자 비공개] feat: ATS report appendix와 fullscreen UI 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `ATS report appendix and fullscreen chart UI`.

## R-2525d902ee34 오프리메드 · User-facing English messages

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Distinguish from codex-assisted server-message-first English error handling on the same date.

작업 기간:
2026-04-08

원문 작업 설명:

- User-visible messages across multiple screens were converted or normalized to English.
  - A policy document for user-facing copy was added.

변경 파일·영역:
ATS, DRD, TRP, home, auth-cookie, shared common areas

커밋 근거:

- `2026-04-08 c9005ef6 [작성자 비공개] fix: 사용자 노출 메시지 영문화`
  - `2026-04-08 322d072a [작성자 비공개] docs: 사용자 노출 문구 정책 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `User-facing English messages`.

## R-c8d7762a4a8a 오프리메드 · Status step info hook and submission-complete step save

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-05-13

원문 작업 설명:

- Added a hook/test for status step info retrieval.
  - Submission-complete step saving was wired into multiple service pages.

변경 파일·영역:
`src/hooks/use-status-manage-step-info.ts`, `src/hooks/use-status-manage-step-info.test.ts`, `src/components/layout/header/header-navigation.tsx`, ATS/DRD/SUB/TRP pages

커밋 근거:

- `2026-05-13 6c727afc [작성자 비공개] feat: status step info 조회 훅 추가`
  - `2026-05-13 c3fb56d7 [작성자 비공개] feat: 제출 완료 step 저장 연동`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Status step info hook and submission-complete step save`.

## R-57970617fa49 오프리메드 · DRD left card data-name display

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Inspect surrounding grouped-route file if final wording needs exact component name.

작업 기간:
2026-06-10

원문 작업 설명:

- DRD left-side card data-name display was corrected.
  - This is a small display fix, not a broader workflow change.

변경 파일·영역:
DRD left card/default-setting display area

커밋 근거:

- `2026-06-10 3e4264b1 [작성자 비공개] fix: DRD 좌측 카드 데이터명 표시`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD left card data-name display`.

## R-d8e7c2e8dbc2 오프리메드 · FE design/frame audit documentation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Do not convert to implementation claim without matching code commits.

작업 기간:
2026-06-10 to 2026-06-11

원문 작업 설명:

- Added documentation around Figma frame mapping, TRP/SUB design alignment, and dead-code/fallback investigation.
  - Evidence is documentation-only.

변경 파일·영역:
`docs/*`

커밋 근거:

- `2026-06-10 928306b2 [작성자 비공개] docs: Figma 프레임 맵 및 정합성 보고서 추가`
  - `2026-06-10 c876e353 [작성자 비공개] docs: TRP SUB 디자인 정합성 보고서 추가`
  - `2026-06-11 c0eb8ee2 [작성자 비공개] docs: 데드코드 fallback 조사 보고서 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `FE design/frame audit documentation`.

## R-3ed3453a54a1 오프리메드 · TOP E2E Add Actuals flow and PR gate notes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-06-22

원문 작업 설명:

- TOP deterministic smoke spec gained Add Actuals flow coverage and shared network event recording.
  - Separate docs captured PR gate blockage/exclusion rationale.

변경 파일·영역:
`e2e/top/top-smoke.spec.ts`, `docs/validation/top-deterministic-e2e-runbook-2026-06-16.md`, `docs/validation/top-e2e-pr-gate-blocker-2026-06-22.md`

커밋 근거:

- `2026-06-22 270e7f2a [작성자 비공개] refactor: TOP E2E 네트워크 이벤트 기록 공통화`
  - `2026-06-22 296f81e2 [작성자 비공개] test: TOP E2E Add Actuals 흐름 추가`
  - `2026-06-22 4fe4f062 [작성자 비공개] docs: TOP E2E PR 게이트 차단 원인 정리`
  - `2026-06-22 66490eb1 [작성자 비공개] docs: TOP E2E PR gate 제외 사유 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TOP E2E Add Actuals flow and PR gate notes`.

## R-6c9e0472da30 오프리메드 · Play loading overlay portal and cancel behavior

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-04-02

원문 작업 설명:

- Play loading UI was moved to portal/overlay behavior.
  - DRD/TRP play cancel paths were adjusted to stop loader state immediately.

변경 파일·영역:
`src/components/common/PlayLoading.tsx`, `src/app/drd/(simulation-flow)/simulation-setting/page.tsx`, `src/app/trp/(setup-flow)/view-summary/page.tsx`

커밋 근거:

- `2026-04-02 4d54f176 [작성자 비공개] fix: play 로더 포털 렌더링 적용`
  - `2026-04-02 8d6e0463 [작성자 비공개] fix: play 취소 시 로더 즉시 종료`
  - `2026-04-02 5eaeacd4 [작성자 비공개] chore: 상태 저장 충돌 해결`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Play loading overlay portal and cancel behavior`.

## R-c1fc5c003536 오프리메드 · TSI and DRD criteria template dialogs

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 동일 기간 후속 commits later generalized criteria dialogs across services.

작업 기간:
2026-04-03

원문 작업 설명:

- TSI filter gained template dialog/service/type files.
  - DRD filter page was extended to use the criteria template dialog pattern.

변경 파일·영역:
`src/app/tsi/filter/page.tsx`, `src/app/drd/(default-setting-flow)/filter/page.tsx`, `src/components/tsi/tsi-filter-template-dialog.tsx`, `src/services/filter-service.ts`, `src/services/types/filter-service.type.ts`

커밋 근거:

- `2026-04-03 dc23bfb2 [작성자 비공개] feat: TSI criteria 필터 템플릿 모달 추가`
  - `2026-04-03 7fb3e4ec [작성자 비공개] feat: DRD criteria 필터 템플릿 모달 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TSI and DRD criteria template dialogs`.

## R-94048ee0455d 오프리메드 · TRP setup task identity and input proportions

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later 동일 기간 후속 TRP patient-definition route split superseded several paths.

작업 기간:
2026-04-03 to 2026-04-07

원문 작업 설명:

- TRP setup task identity was aligned with status store.
  - Field proportions, labels, and required-validation UI were adjusted.

변경 파일·영역:
`src/app/trp/(setup-flow)/*`, `src/components/trp/*`, `src/lib/status-manage-save.ts`, `src/lib/trp/group-manage.ts`

커밋 근거:

- `2026-04-03 4e3bb343 [작성자 비공개] fix(trp): align task identity with status store`
  - `2026-04-03 0a897170 [작성자 비공개] fix: TRP 입력 필드 비율 정리`
  - `2026-04-07 57f1c623 [작성자 비공개] fix: TRP 필드 라벨 비율 정리`
  - `2026-04-07 4ef810ef [작성자 비공개] fix: TRP 필수 검증 UI 동기화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TRP setup task identity and input proportions`.

## R-250da4cbc026 오프리메드 · ATS filter flow, service, and status cache

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Validate against later status-router migration before claiming final state-management design.

작업 기간:
2026-04-06 to 2026-04-07

원문 작업 설명:

- ATS filter/patient summary flow and service layer were introduced.
  - Status-manage save/cache behavior and auto task creation were added for ATS.

변경 파일·영역:
`src/app/ats/filter/page.tsx`, `src/app/ats/patients-summary/page.tsx`, `src/app/ats/simulation/page.tsx`, `src/services/ats-service.ts`, `src/services/common-service.ts`, `src/components/common/DataSettingScreen.tsx`

커밋 근거:

- `2026-04-06 db563acd [작성자 비공개] feat: ATS 필터 플로우와 전용 서비스 추가`
  - `2026-04-07 04e014aa [작성자 비공개] fix: ATS 필터 API 용도 정리`
  - `2026-04-07 3e5f73ed [작성자 비공개] feat: ATS status-manage 저장과 캐시 흐름 추가`
  - `2026-04-07 b0b5811d [작성자 비공개] fix: ATS 초기 진입 task 자동 생성`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `ATS filter flow, service, and status cache`.

## R-7b0f5b702e8d 오프리메드 · ATS play contract, report fullscreen, and appendix cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Mock usage should not be described as production integration without later confirmation.

작업 기간:
2026-04-06 to 2026-04-08

원문 작업 설명:

- ATS play API/mock path and study-play proxy were adjusted.
  - ATS report fullscreen chart and appendix UI were refined.

변경 파일·영역:
`src/app/ats/simulation/page.tsx`, `src/app/ats/simulation/report/page.tsx`, `src/app/api/mock/ats-play/route.ts`, `src/app/api/proxy/study-play/route.ts`, `src/components/ui/fullscreen-echart-portal.tsx`

커밋 근거:

- `2026-04-06 f5e63c76 [작성자 비공개] fix: ATS play 계약과 임시 mock 반영`
  - `2026-04-06 b150f9ec [작성자 비공개] fix: ATS play mock 전용 실행 흐름 정리`
  - `2026-04-08 dc62710c [작성자 비공개] fix: ATS fullscreen 차트 레이아웃 정리`
  - `2026-04-08 434b60ad [작성자 비공개] fix: ATS report appendix UI 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `ATS play contract, report fullscreen, and appendix cleanup`.

## R-2260bc9d0fa7 오프리메드 · Shared service helpers, global loader, layout, and current-step URI save

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-04-07 to 2026-04-08

원문 작업 설명:

- Service query-string/common helper handling was cleaned up.
  - Global loader host/overlays and service layout wrappers were refactored.
  - Current step persistence moved toward URI-based storage.

변경 파일·영역:
`src/services/*`, `src/components/common/*Loader*`, `src/app/*/layout.tsx`, ATS/DRD/TRP/TSI pages, `src/lib/status-manage-save.ts`

커밋 근거:

- `2026-04-07 fcaa7c6d [작성자 비공개] refactor: 서비스 공통 헬퍼 정리`
  - `2026-04-07 6b37aa2f [작성자 비공개] refactor: 전역 로더 훅과 레이아웃 구조 정리`
  - `2026-04-07 b27319dd [작성자 비공개] refactor: ATS/DRD/TSI/TRP 공통 레이아웃 정리`
  - `2026-04-08 551996dc [작성자 비공개] refactor: current_step URI 기준 저장으로 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Shared service helpers, global loader, layout, and current-step URI save`.

## R-06f37f31fdee 오프리메드 · English/server error messages, service-type query, and CSV upload extension

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-04-07 to 2026-04-08

원문 작업 설명:

- Error handling preferred server messages and English user text across many pages.
  - ATS base-data request included `service_type`.
  - Data upload accepted/handled `.csv` extension behavior.

변경 파일·영역:
ATS/DRD/TRP/TSI pages, `src/services/common-service.ts`, `src/components/common/DataSettingScreen.tsx`

커밋 근거:

- `2026-04-08 d587c4ef [작성자 비공개] fix: 에러 메시지 영어화 및 서버 message 우선 적용`
  - `2026-04-08 231c47d5 [작성자 비공개] fix: ATS 기본 데이터 조회에 service_type 추가`
  - `2026-04-07 103ca93c [작성자 비공개] fix: 데이터 업로드 csv 확장자 반영`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `English/server error messages, service-type query, and CSV upload extension`.

## R-50d4d2e87521 오프리메드 · ATS apply baseline, cohort warning, power, and report status

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:
2026-04-16 to 2026-04-17

원문 작업 설명:

- ATS apply fingerprint/state logic was centralized.
  - Primary endpoint power save and report status were corrected.
  - Cohort warning overlay and applied baseline behavior were stabilized.

변경 파일·영역:
`src/app/ats/simulation/page.tsx`, `src/app/ats/simulation/report/page.tsx`, `src/components/ats/left-panel.tsx`, `src/components/ui/add-endpoints-modal.tsx`, `src/lib/ats/applied-settings.ts`, `src/store/simulation-store.ts`

커밋 근거:

- `2026-04-16 4c770b4a [작성자 비공개] refactor: centralize ATS apply settings fingerprint`
  - `2026-04-16 69491181 [작성자 비공개] fix: ATS primary별 power 저장과 report status 보정`
  - `2026-04-17 4b5672ef [작성자 비공개] fix: stabilize ATS apply baseline and cohort warning overlay`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `ATS apply baseline, cohort warning, power, and report status`.

## R-e8099f65b07f 오프리메드 · ATS report chart and card layout cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need visual QA evidence to state exact design completion.

작업 기간:
2026-04-14 to 2026-04-17

원문 작업 설명:

- ATS report chart axes/tooltips/layout and step-card structure were adjusted.
  - Report entry button and slider tooltip behavior were corrected.

변경 파일·영역:
`src/app/ats/simulation/report/page.tsx`, `src/app/ats/simulation/report/charts/*`, `src/app/ats/simulation/report/components/step-card.tsx`, ATS chart/modal components

커밋 근거:

- `2026-04-16 643c9ffc [작성자 비공개] fix: ATS 리포트 차트 레이아웃 보정`
  - `2026-04-16 15cd9ff1 [작성자 비공개] fix: ATS variance 차트 축 라벨 추가`
  - `2026-04-16 cd26f77e [작성자 비공개] fix: ATS boxplot tooltip 값 노출 수정`
  - `2026-04-17 885e6765 [작성자 비공개] fix: ATS 리포트 진입 버튼과 슬라이더 툴팁 보정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `ATS report chart and card layout cleanup`.

## R-4e716d7aa9d6 오프리메드 · DRD live SMILES structure and medication dropdown

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Medication metadata work continues in June; do not treat this as final medication handling.

작업 기간:
2026-04-09 to 2026-04-24

원문 작업 설명:

- DRD SMILES screen gained live structure rendering and related dependency/type updates.
  - Medication dropdown/list behavior was adjusted for full API exposure, scroll, autocomplete, and close behavior.

변경 파일·영역:
`src/app/drd/(simulation-flow)/smile-setting/page.tsx`, `src/components/drd/smiles-structure-svg.tsx`, `src/components/drd/simulation-condition/drd-simulation-condition-controller.tsx`, `src/components/simulation/simulation-medication-plan.tsx`, `src/services/types/drd-service.types.ts`

커밋 근거:

- `2026-04-09 10118d60 [작성자 비공개] feat: DRD smile 라이브 구조 렌더 적용`
  - `2026-04-09 6878d664 [작성자 비공개] fix: DRD 약물 드롭다운 API 전체 노출 및 스크롤 추가`
  - `2026-04-24 21b90e6e [작성자 비공개] fix: TSI 메타 약물 자동완성 표시`
  - `2026-04-24 3aafdcf7 [작성자 비공개] fix: DRD 약물 목록 닫힘 처리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD live SMILES structure and medication dropdown`.

## R-04c71fdf1539 오프리메드 · Cross-service criteria feature list and template dialog

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm later SUB filter adoption separately.

작업 기간:
2026-04-20

원문 작업 설명:

- Criteria filter modal and feature-list components were generalized across ATS/DRD/TSI.
  - Styling and successful-save close behavior were corrected.

변경 파일·영역:
`src/app/ats/filter/page.tsx`, `src/app/drd/(default-setting-flow)/filter/page.tsx`, `src/app/tsi/filter/page.tsx`, `src/components/criteria/criteria-feature-list.tsx`, `src/components/criteria/criteria-template-dialogs.tsx`

커밋 근거:

- `2026-04-20 a3991288 [작성자 비공개] feat: Criteria 필터 모달과 Feature List 개편`
  - `2026-04-20 10dfbf87 [작성자 비공개] fix: Feature List 스타일 정렬`
  - `2026-04-24 bd0a1a62 [작성자 비공개] fix: Criteria 저장 성공 후 창 닫힘 처리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Cross-service criteria feature list and template dialog`.

## R-932c25e191c2 오프리메드 · DRD cohort criteria and clinical background APIs

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later June DRD clinical-background medication commits adjust medication-specific handling.

작업 기간:
2026-04-22 to 2026-04-28

원문 작업 설명:

- DRD cohort criteria selection was connected to default-setting store/mapper flow.
  - Patient disease/cohort API spec and clinical background API were wired into DRD setup.

변경 파일·영역:
`src/app/drd/(default-setting-flow)/patient-disease-info/page.tsx`, `src/app/drd/(default-setting-flow)/clinical-background/page.tsx`, `src/lib/drd/default-setting-mapper.ts`, `src/services/drd-service.ts`, `src/services/types/drd-service.types.ts`, `src/store/default-setting-store.ts`

커밋 근거:

- `2026-04-22 3e563914 [작성자 비공개] feat: DRD Cohort Criteria 기준 선택 연동`
  - `2026-04-23 810722ae [작성자 비공개] fix: DRD 코호트 조건 API 스펙 연동`
  - `2026-04-28 6ca1be61 [작성자 비공개] feat: DRD Clinical Background API 연결`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD cohort criteria and clinical background APIs`.

## R-6473c8b98592 오프리메드 · TRP patient-definition routes and Swagger API contracts

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Verify live Swagger contract if using this in final claims.

작업 기간:
2026-04-23 to 2026-04-24

원문 작업 설명:

- TRP setup flow was split into patient-definition subroutes.
  - TRP views/services were aligned to Swagger API contracts.
  - Patient information input fields and data-load mapping changed.

변경 파일·영역:
`src/app/trp/(setup-flow)/patient-definition/*`, `src/components/trp/simulation-setting/trp-simulation-setting-controller.tsx`, `src/lib/trp/*`, `src/services/trp-service.ts`, `src/services/types/trp-service.types.ts`

커밋 근거:

- `2026-04-23 970a7c1f [작성자 비공개] refactor: TRP patient definition 라우팅 정리`
  - `2026-04-23 46d92a1d [작성자 비공개] feat: TRP 환자정보 입력 필드 개편`
  - `2026-04-24 bdd94803 [작성자 비공개] refactor: align trp api contracts to swagger`
  - `2026-04-24 7b841f2d [작성자 비공개] refactor: switch trp views to swagger apis`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TRP patient-definition routes and Swagger API contracts`.

## R-5982e4d7558e 오프리메드 · DRD/TRP play schema, payload, and result parsing fallback removal

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later June fallback-removal commits continue this work.

작업 기간:
2026-04-29 to 2026-04-30

원문 작업 설명:

- DRD/TRP play response schema and payload handling were updated.
  - Fallback payload paths were removed.
  - Result parsing was shared/commonized with tests.

변경 파일·영역:
`src/app/drd/simulation-result/page.tsx`, `src/app/drd/(simulation-flow)/simulation-setting/page.tsx`, `src/app/trp/simulation-result/page.tsx`, `src/app/trp/(simulation-flow)/simulation-setting/view-summary/page.tsx`, `src/lib/drd/*simulation*`, `src/lib/trp/simulation-play-mapper.ts`, `src/lib/simulation-play-analysis.ts`

커밋 근거:

- `2026-04-29 bc5cd7f2 [작성자 비공개] fix: DRD TRP Play 응답 스키마 갱신`
  - `2026-04-30 8bd8ce23 [작성자 비공개] fix: DRD TRP play payload 폴백 제거`
  - `2026-04-30 18e15f4d [작성자 비공개] fix: TRP 결과 화면 play 응답 기준으로 전환`
  - `2026-04-30 51c164e9 [작성자 비공개] refactor: DRD TRP 결과 파싱 공통화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD/TRP play schema, payload, and result parsing fallback removal`.

## R-704cbc450f04 오프리메드 · TRP baseline feature API and medication list handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later validation and timeline hydration fixes should be kept as separate units.

작업 기간:
2026-04-27 to 2026-06-02

원문 작업 설명:

- TRP medication list API and disease-specific medication loading were wired.
  - Baseline feature metadata API and schema/test handling were added.

변경 파일·영역:
`src/app/trp/(setup-flow)/patient-definition/page.tsx`, `src/lib/trp/patient-baseline-feature-metadata.ts`, `src/services/trp-service.ts`, `src/services/types/trp-service.types.ts`, TRP medication/patient list paths

커밋 근거:

- `2026-04-27 a92a7e96 [작성자 비공개] feat: TRP 약물 목록 API 연결`
  - `2026-04-29 d8474777 [작성자 비공개] feat: TRP baseline feature API 연결`
  - `2026-06-01 1760f313 [작성자 비공개] fix: TRP 약물 목록 질환별 조회 반영`
  - `2026-06-02 29579dbb [작성자 비공개] fix: TRP 약물 목록 스키마 타입 보정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TRP baseline feature API and medication list handling`.

## R-c86ea1252841 오프리메드 · Shared select/radio/checkbox/button/icon/toggle component consolidation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- This is 동일 기간 후속 only; also verify remaining legacy components before claiming full design-system completion.

작업 기간:
2026-04-24 to 2026-05-19

원문 작업 설명:

- Reusable UI controls were consolidated: select, radio, checkbox, button, icon button, icon registry, and toggle.
  - Several domain pages were migrated to shared controls.

변경 파일·영역:
`src/components/ui/select.tsx`, `src/components/common/select-control.tsx`, `src/components/ui/icon-button.tsx`, `src/components/ui/icon.tsx`, `src/components/ui/icon.registry.tsx`, `src/components/ui/glass-button.tsx`, `src/components/ui/solid-button.tsx`, criteria/filter pages

커밋 근거:

- `2026-04-29 5c837469 [작성자 비공개] refactor: 라디오 컴포넌트 공통화`
  - `2026-04-29 6976453b [작성자 비공개] refactor: 체크박스 컴포넌트 공통화`
  - `2026-05-08 dfee1b65 [작성자 비공개] refactor: 필터 셀렉트 공통 컴포넌트 적용`
  - `2026-05-08 7b35d2f3 [작성자 비공개] refactor: shadcn 기반 셀렉트로 교체`
  - `2026-05-18 4a8ea1cf [작성자 비공개] feat: 아이콘 버튼 컴포넌트 추가`
  - `2026-05-19 4e35f461 [작성자 비공개] feat: 아이콘 컴포넌트 추가`
  - `2026-05-19 2ce7bbce [작성자 비공개] refactor: align toggle component with figma`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Shared select/radio/checkbox/button/icon/toggle component consolidation`.

## R-02d565d1c19a 오프리메드 · Glass surface/container migration and comparison routes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Visual validation artifacts exist in repo; do not read previous raw work-unit docs for interpretation.

작업 기간:
2026-05-19 to 2026-05-21

원문 작업 설명:

- Glass surface/components and comparison routes were added.
  - A broad migration touched many Nexus service screens and captured validation images.

변경 파일·영역:
`src/components/ui/*glass*`, `src/app/glass*`, `src/app/page.tsx`, service screens, `docs/validation/glass-migration/2026-05-21/*`

커밋 근거:

- `2026-05-19 ee05fb9a [작성자 비공개] feat: 글래스 서페이스 컴포넌트 추가`
  - `2026-05-20 390a3d0e [작성자 비공개] feat: 글래스 이펙트 비교 라우트 추가`
  - `2026-05-21 66b01a7c [작성자 비공개] refactor: Nexus 글래스 컨테이너 마이그레이션`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Glass surface/container migration and comparison routes`.

## R-0829a284d246 오프리메드 · Breadcrumb rail and service header navigation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Later route-step registry commits also affect header navigation; keep separate.

작업 기간:
2026-05-22 to 2026-05-28

원문 작업 설명:

- Shared breadcrumb rail component was added and used in service header navigation.
  - Header responsive classes/positioning were adjusted.

변경 파일·영역:
`src/components/common/breadcrumb-rail.tsx`, `src/components/layout/header/constants.ts`, `src/components/layout/header/header-navigation.tsx`

커밋 근거:

- `2026-05-22 bf7fc7c3 [작성자 비공개] feat: breadcrumb 공통 컴포넌트 추가`
  - `2026-05-22 2f1ce729 [작성자 비공개] feat: use breadcrumb rail in service header`
  - `2026-05-22 f80194a7 [작성자 비공개] refactor: 헤더 반응형 클래스 정리`
  - `2026-05-28 07f62488 [작성자 비공개] fix: 헤더 브레드크럼 반응형 위치 고정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Breadcrumb rail and service header navigation`.

## R-73aa8dc5dd11 오프리메드 · Status manage current-step router and step-flow registry

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm whether current-step source is backend, URI, local store, or merged behavior in final code.

작업 기간:
2026-05-06 to 2026-05-13

원문 작업 설명:

- Current-step save API and router hook were added.
  - Header navigation gained service-specific step route registry/flow management.
  - Multiple service pages were touched to use the router/registry model.

변경 파일·영역:
`src/services/status-manage-service.ts`, `src/hooks/use-status-manage-router.ts`, `src/components/layout/header/*`, `src/lib/service-header-routing/*`, ATS/DRD/SUB/TRP route pages

커밋 근거:

- `2026-05-06 77077daf [작성자 비공개] feat: status manage 현재 단계 저장 API 추가`
  - `2026-05-06 cde0f8e6 [작성자 비공개] feat: status manage 라우터 전환`
  - `2026-05-13 d38c8f1e [작성자 비공개] feat: 헤더 step route registry 추가`
  - `2026-05-13 e3c1695b [작성자 비공개] refactor: 서비스 step flow 경로 관리 통합`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Status manage current-step router and step-flow registry`.

## R-513e80332c40 오프리메드 · Status mutation snapshot hash and duplicate-save guards

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Needs backend contract check for exact `snapshot_hash` semantics.

작업 기간:
2026-05-14 to 2026-06-22

원문 작업 설명:

- Snapshot-hash based status mutation detection was added.
  - Duplicate status-step saving and restore-field persistence were patched.

변경 파일·영역:
`src/hooks/use-status-manage-router.ts`, `src/hooks/use-status-manage-step-info.ts`, `src/lib/status-manage-save.ts`, DRD/ATS/SUB/TRP pages, tests

커밋 근거:

- `2026-05-14 e1877328 [작성자 비공개] fix: status mutation snapshot 해시 구조 적용`
  - `2026-05-14 cf5b7037 [작성자 비공개] fix: status step snapshot_hash 스키마 적용`
  - `2026-06-22 c5e83ec0 [작성자 비공개] fix: status step 중복 저장 방지`
  - `2026-06-22 ebe6d906 [작성자 비공개] fix: status step 복원 필드 저장 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Status mutation snapshot hash and duplicate-save guards`.

## R-32a65b805792 오프리메드 · Runtime numeric, frequency, and filter validation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need to verify which validation errors are user-facing vs silent guards.

작업 기간:
2026-05-07 to 2026-06-08

원문 작업 설명:

- Runtime min/max validation was added for filter feature values.
  - Simulation drug frequency validation and decimal handling were added.
  - ATS simulation setting validation got a dedicated validation module/test.

변경 파일·영역:
`src/lib/group-manage-feature-validation.ts`, `src/lib/simulation-drug-frequency.ts`, `src/app/ats/filter/page.tsx`, `src/app/drd/(default-setting-flow)/filter/page.tsx`, `src/app/sub/filter/page.tsx`, `src/app/ats/simulation/page.tsx`, `src/lib/ats/simulation-settings-validation.ts`

커밋 근거:

- `2026-05-07 273c8561 [작성자 비공개] feat: 필터 값 런타임 범위 검증 추가`
  - `2026-05-07 4e532cd7 [작성자 비공개] feat: 시뮬레이션 frequency 런타임 범위 보정 추가`
  - `2026-05-14 8b2b3c37 [작성자 비공개] fix: 필터 숫자 입력 정규화`
  - `2026-06-08 060c6eb4 [작성자 비공개] feat: ATS 시뮬레이션 입력 검증 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Runtime numeric, frequency, and filter validation`.

## R-fa30b97597f5 오프리메드 · SUB treatment info and report v2

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- SUB report v1 removal and later styling fixes should be separately traced if needed.

작업 기간:
2026-05-07 to 2026-06-11

원문 작업 설명:

- SUB treatment info API/default restore behavior was added.
  - SUB report v2 page content, sections, chart panel, and contract functions were connected.

변경 파일·영역:
`src/app/sub/*`, `src/components/sub/report/*`, `src/components/charts/sub-report/*`, `src/services/subgroup-service.ts`, `src/services/types/subgroup-service.types.ts`

커밋 근거:

- `2026-05-07 f88c63d0 [작성자 비공개] feat: SUB treatment info API 추가`
  - `2026-05-07 597cf5cc [작성자 비공개] feat: SUB treatment info 초기값 복원`
  - `2026-06-11 23f6cd75 [작성자 비공개] fix: SUB report v2 계약 함수 추가`
  - `2026-06-11 112cc744 [작성자 비공개] feat: SUB report v2 화면 연결`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `SUB treatment info and report v2`.

## R-d57126e4d318 오프리메드 · Shared API/server error modal handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm error modal behavior in browser before claiming UX completion.

작업 기간:
2026-05-15 to 2026-05-29

원문 작업 설명:

- Shared error modal and global error host were added.
  - 500/API error display paths were patched across service screens.
  - API error handling policy documentation was added.

변경 파일·영역:
`src/components/ui/error-modal.tsx`, `src/components/common/global-error-modal-host.tsx`, `src/app/layout.tsx`, ATS/DRD/SUB pages, error policy docs

커밋 근거:

- `2026-05-15 4195b5fe [작성자 비공개] feat: add shared error modal handling`
  - `2026-05-15 9c1cacf9 [작성자 비공개] fix: API 에러 표시 누락 보완`
  - `2026-05-28 a283292d [작성자 비공개] fix: 500 에러 전역 모달 처리`
  - `2026-05-29 3a5bf3ab [작성자 비공개] docs: API 에러 처리 정책 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Shared API/server error modal handling`.

## R-2af734eed0ff 오프리메드 · DRD to SUB bootstrap and Enrichment navigation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Need BE contract validation for bootstrap semantics.

작업 기간:
2026-05-28 to 2026-05-29

원문 작업 설명:

- DRD-to-SUB bootstrap API and enrichment navigation flow were added.
  - SUB simulation cancel path was connected to kill API.
  - Bootstrap contract handling was revised.

변경 파일·영역:
`src/services/drd-service.ts`, `src/services/types/drd-service.types.ts`, `src/components/drd/simulation-result/page-content.tsx`, `src/components/simulation-result/simulation-result-dashboard.tsx`, SUB cancel/loader paths

커밋 근거:

- `2026-05-28 9085d64c [작성자 비공개] feat: DRD SUB 부트스트랩 API 추가`
  - `2026-05-28 79fa9ee2 [작성자 비공개] feat: DRD 최적화 Enrichment 이동 흐름 연결`
  - `2026-05-28 66196fbe [작성자 비공개] fix: SUB simulation cancel kill API 연결`
  - `2026-05-29 935476b2 [작성자 비공개] fix: DRD to SUB 부트스트랩 계약 반영`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD to SUB bootstrap and Enrichment navigation`.

## R-b57fbf36ee55 오프리메드 · DRD/TRP play overview response and result overview text

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm exact source fields in current type definitions before wording final impact.

작업 기간:
2026-05-29 to 2026-06-01

원문 작업 설명:

- Simulation result dashboard began rendering overview text from play responses.
  - DRD/TRP mappers and response types were updated for overview response fields.

변경 파일·영역:
`src/components/simulation-result/simulation-result-dashboard.tsx`, `src/lib/drd/simulation-result-mapper.ts`, `src/lib/trp/simulation-play-mapper.ts`, `src/services/types/simulation-play-service.types.ts`

커밋 근거:

- `2026-05-29 432136b0 [작성자 비공개] feat: 시뮬레이션 결과 오버뷰 텍스트 표시`
  - `2026-05-29 e14ee2ac [작성자 비공개] fix: 결과 오버뷰 텍스트 표시 정리`
  - `2026-06-01 d4efd01e [작성자 비공개] feat: DRD TRP play 오버뷰 응답 반영`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD/TRP play overview response and result overview text`.

## R-0774b6c7cafd 오프리메드 · TOP namespace, app shell, and workflow bootstrap

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- TOP is a new workflow area; keep separate from older TSI/DRD/TRP work.

작업 기간:
2026-06-02

원문 작업 설명:

- Twin Outcome workflow was moved under TOP namespace.
  - TOP app shell/layout and main workflow pages were added.
  - Input flow and validation scaffolding were introduced.

변경 파일·영역:
`src/app/top/*`, `src/components/top/*`, `src/lib/top/*`, home route

커밋 근거:

- `2026-06-02 512e69ac [작성자 비공개] feat: Twin Outcome 데이터 경계 추가`
  - `2026-06-02 6cba016d [작성자 비공개] feat: Twin Outcome 화면 흐름 추가`
  - `2026-06-02 b4c9a72e [작성자 비공개] refactor: move Twin Outcome workflow under TOP namespace`
  - `2026-06-02 d865301a [작성자 비공개] fix: add TOP app shell layout`
  - `2026-06-02 9f31e5ef [작성자 비공개] feat: TOP 입력 흐름과 검증 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TOP namespace, app shell, and workflow bootstrap`.

## R-eced9bc4c5d0 오프리메드 · TOP actual Excel import and feature contract files

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Check test-file provenance and expected upload templates before external description.

작업 기간:
2026-06-02 to 2026-06-04

원문 작업 설명:

- TOP actual/baseline Excel import paths and sample test files were added.
  - Feature contract and month mapping for actual Excel data were corrected.

변경 파일·영역:
`public/top/assessment-data-entry/test-files/*`, `public/top/simulation-setting/test-files/*`, `src/app/top/assessment-data-entry/page.tsx`, `src/lib/top/*excel*`, `src/components/top/top-import-modal.tsx`

커밋 근거:

- `2026-06-02 f1b85124 [작성자 비공개] feat: TOP actual 엑셀 import 처리 추가`
  - `2026-06-04 035fea8d [작성자 비공개] feat: TOP feature contract 정리`
  - `2026-06-04 3ac40f97 [작성자 비공개] test: TOP baseline import 샘플 추가`
  - `2026-06-15 0f022e1f [작성자 비공개] fix: TOP actual Excel month 매핑 정합화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TOP actual Excel import and feature contract files`.

## R-5d6582b08fba 오프리메드 · TOP API integration, mock removal, and Swagger schema alignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Live Swagger verification is needed before making contract-compliance claims.

작업 기간:
2026-06-04 to 2026-06-15

원문 작업 설명:

- TOP pages were wired to API/service flow and loader behavior.
  - Mock API route was removed.
  - Swagger schema, service types, adapter, run policy, and response handling were corrected.

변경 파일·영역:
`src/services/top-service.ts`, `src/services/types/top-service.types.ts`, `src/lib/top/top-api-adapter.ts`, TOP route pages, `docs/top-swagger-api-contract-2026-06-09.md`

커밋 근거:

- `2026-06-04 0ccf8e9f [작성자 비공개] feat: TOP 페이지 API와 loader 흐름 정리`
  - `2026-06-09 e1fbf3a1 [작성자 비공개] feat: TOP API 연동 및 목업 제거`
  - `2026-06-10 bb570f39 [작성자 비공개] fix: TOP Swagger 스키마 사용처 갱신`
  - `2026-06-11 4ded9991 [작성자 비공개] fix: TOP Run 조건과 play payload 정합화`
  - `2026-06-15 61023b65 [작성자 비공개] fix: TOP API 응답 기준 정합화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TOP API integration, mock removal, and Swagger schema alignment`.

## R-b8089890bf88 오프리메드 · TOP result PDF preview and result display mapping

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Confirm PDF output rendering separately if needed.

작업 기간:
2026-06-04

원문 작업 설명:

- TOP result page gained PDF preview/report component and download reinforcement.
  - Result table/view mappings and visual table color handling were corrected.

변경 파일·영역:
`src/app/top/simulation-result/pdf-preview/page.tsx`, `src/components/top/top-pdf-report.tsx`, `src/components/top/top-result-table.tsx`, `src/components/top/top-result-view.tsx`

커밋 근거:

- `2026-06-04 881d36c5 [작성자 비공개] feat: TOP simulation result PDF 미리보기 추가`
  - `2026-06-04 a189f0ea [작성자 비공개] feat: TOP 결과 PDF 다운로드 보강`
  - `2026-06-04 2cf6b6a3 [작성자 비공개] fix: TOP actual 결과 표시 매핑 보정`
  - `2026-06-04 3a78db01 [작성자 비공개] fix: TOP 결과 테이블 색상 피그마 반영`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TOP result PDF preview and result display mapping`.

## R-9aff65ade6a8 오프리메드 · TOP hydration, disease/bootstrap consistency, and run validation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Some evidence overlaps with API integration unit; use this one for hydration/run-policy details only.

작업 기간:
2026-06-09 to 2026-06-11

원문 작업 설명:

- TOP disease/bootstrap consistency and disease id transmission were fixed.
  - Imported values were protected from hydrate overwrite.
  - Run button/required-value policy was aligned to API payload requirements.

변경 파일·영역:
`src/app/top/simulation-setting/page.tsx`, `src/app/top/assessment-data-entry/page.tsx`, `src/lib/top/top-simulation-run-policy.ts`, `src/lib/top/top-api-adapter.ts`, `src/services/top-service.ts`

커밋 근거:

- `2026-06-09 e1fbf3a1 [작성자 비공개] feat: TOP API 연동 및 목업 제거`
  - `2026-06-09 63a3dbe8 [작성자 비공개] fix: TOP disease bootstrap consistency`
  - `2026-06-10 bdb142e5 [작성자 비공개] fix: TOP play disease id 전송`
  - `2026-06-10 cf5084c8 [작성자 비공개] fix: TOP import 값 hydrate 덮어쓰기 방지`
  - `2026-06-11 9da757b1 [작성자 비공개] fix: TOP Run 조건 필수값 기준 정합화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TOP hydration, disease/bootstrap consistency, and run validation`.

## R-cc715c8ef223 오프리메드 · TOP deterministic E2E harness and PR gate workflow

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Workflow was later removed in 동일 기간 후속 commits; mention removal if describing final CI state.
  - Actual PR gate operation should be verified from GitHub Actions logs before claiming sustained CI operation.

작업 기간:
2026-06-16 to 2026-06-18

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- TOP deterministic E2E CLI, smoke spec, strict result handling, and GitHub workflow were added.
  - PR comment/failure reporting and preview validation were introduced.

변경 파일·영역:
`e2e/top/top-smoke.spec.ts`, `scripts/e2e/top-e2e.sh`, `scripts/e2e/run-top-deterministic.mjs`, `.github/workflows/top-e2e.yml`, `docs/validation/top-*`

커밋 근거:

- `2026-06-16 6f689020 [작성자 비공개] test: TOP E2E 통합 CLI 추가`
  - `2026-06-16 e2793b2c [작성자 비공개] test: TOP deterministic full smoke 구현`
  - `2026-06-17 9d8ddd57 [작성자 비공개] fix: TOP E2E strict 판정 보강`
  - `2026-06-18 37e34a80 [작성자 비공개] ci: TOP E2E preview 검증 추가`
  - `2026-06-18 b6bf1e2a [작성자 비공개] ci: TOP E2E PR 실패 코멘트 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TOP deterministic E2E harness and PR gate workflow`.

## R-99a578210f25 오프리메드 · ATS severity API, input validation, and sample-size comparison

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Needs API contract verification for severity list source.

작업 기간:
2026-06-08 to 2026-06-18

원문 작업 설명:

- ATS simulation validation module/test was added.
  - Disease severity list API hook and restore path were added.
  - Sample Size Control comparison logic/chart basis was corrected.

변경 파일·영역:
`src/app/ats/simulation/page.tsx`, `src/components/ats/left-panel.tsx`, `src/components/ats/right-panel.tsx`, `src/hooks/use-disease-severity-list-query.ts`, `src/lib/ats/simulation-settings-validation.ts`, ATS chart components

커밋 근거:

- `2026-06-08 060c6eb4 [작성자 비공개] feat: ATS 시뮬레이션 입력 검증 추가`
  - `2026-06-18 9fb3d0d9 [작성자 비공개] feat: ATS 질병 중증도 API 연동`
  - `2026-06-18 b3109c73 [작성자 비공개] fix: ATS severity 복원 경로 보강`
  - `2026-06-18 20766553 [작성자 비공개] fix: ATS Sample Size Control 비교 기준 수정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `ATS severity API, input validation, and sample-size comparison`.

## R-b94c17d47c7e 오프리메드 · TRP timeline validation and hydration fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Exact affected file names need a narrower `git show` if converting to implementation detail.

작업 기간:
2026-06-09 to 2026-06-11

원문 작업 설명:

- TRP simulation validation criteria and treatment timeline normalization were changed.
  - Validation/hydration rules for treatment timeline were relaxed.

변경 파일·영역:
TRP treatment timeline/setup validation components and docs

커밋 근거:

- `2026-06-09 7d595155 [작성자 비공개] fix: TRP 시뮬레이션 검증 기준 통합`
  - `2026-06-10 ab7249c2 [작성자 비공개] fix: TRP treatment timeline 정규화`
  - `2026-06-11 246467a2 [작성자 비공개] fix: TRP treatment timeline 검증 완화`
  - `2026-06-11 a3faef7c [작성자 비공개] fix: TRP treatment timeline hydration 완화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `TRP timeline validation and hydration fixes`.

## R-838fe0c1af60 오프리메드 · Fallback removal and Swagger contract cleanup across services

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Use live contract verification before asserting all fallbacks were removed.

작업 기간:
2026-06-16 to 2026-06-17

원문 작업 설명:

- Removed fallback paths from DRD task/payload and ATS/SUB response handling.
  - Swagger response type consistency was tightened.

변경 파일·영역:
`src/services/*`, `src/services/types/*`, DRD/ATS/SUB route pages, Swagger-aligned adapters

커밋 근거:

- `2026-06-16 c27470a1 [작성자 비공개] refactor: DRD task fallback 제거`
  - `2026-06-16 487712c2 [작성자 비공개] fix: DRD payload fallback 제거`
  - `2026-06-16 0fd94bca [작성자 비공개] fix: ATS/SUB 응답 fallback 제거`
  - `2026-06-17 d31425fc [작성자 비공개] refactor: 스웨거 응답 타입 정합성 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Fallback removal and Swagger contract cleanup across services`.

## R-ed22e55bd902 오프리메드 · DRD clinical-background medication warning and status restore

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Medication metadata contract is explicitly TODO-level in evidence.

작업 기간:
2026-06-22

원문 작업 설명:

- DRD clinical-background medication warning restore/rendering was patched.
  - Medication metadata contract TODO was added.
  - Status-step restore fields were reinforced in hook/test code.

변경 파일·영역:
`src/app/drd/(default-setting-flow)/clinical-background/page.tsx`, `src/lib/drd/clinical-background-medications.ts`, `src/lib/drd/clinical-background-medications.test.ts`, status router tests/hooks

커밋 근거:

- `2026-06-22 b01db52e [작성자 비공개] fix: DRD 약물 경고 상태 복원`
  - `2026-06-22 184ead86 [작성자 비공개] fix: DRD 약물 경고 렌더링 보강`
  - `2026-06-22 6be6f1b7 [작성자 비공개] chore: DRD 약물 메타데이터 계약 TODO 추가`
  - `2026-06-22 ebe6d906 [작성자 비공개] fix: status step 복원 필드 저장 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `DRD clinical-background medication warning and status restore`.

## R-fba70d860e14 오프리메드 · Design/QA/check-task documentation and audit trail

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Documentation-only evidence should stay separate from implementation units.

작업 기간:
2026-05-20 to 2026-06-22

원문 작업 설명:

- Added/updated design QA, validation, UX audit, and check-task documents.
  - Later commit ignored check-task directories and removed generated work-output directories.

변경 파일·영역:
`docs/*`, `docs/validation/*`, `plan/*`, `check-tasks/*`, `.gitignore`

커밋 근거:

- `2026-05-20 9606eb3b [작성자 비공개] docs: DRD 측정 항목 검증 결과 정리`
  - `2026-05-28 40480da5 [작성자 비공개] docs: DRD TRP QA 처리 결과 정리`
  - `2026-06-08 dfe4b826 [작성자 비공개] docs: check-tasks 개요 문서 추가`
  - `2026-06-18 886bdeea [작성자 비공개] docs: Nexus UX 감사 문서 추가`
  - `2026-06-22 68b0bfaf [작성자 비공개] chore: check-tasks 디렉토리 ignore 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md` · `Design/QA/check-task documentation and audit trail`.

## R-e8fcb435f150 오프리메드 · Portal login gate shell and brand entry

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 실제 화면/브랜딩 품질은 커밋 파일 근거만으로 확정하지 말고 별도 화면 확인 필요.

작업 기간:

- 2026-03-24

원문 작업 설명:

- Vite/React 기반 포털에 로그인 게이트 화면과 브랜드 표시 컴포넌트를 붙인 초기 FE 작업.
  - 외부 vendor 스크립트와 로고 자산을 추가하고, 참고 zip 레퍼런스는 제거함.

변경 파일·영역:

- `index.html`, `package.json`, `public/vendor/unicornStudio.umd.v2.0.5.js`
  - `src/App.tsx`, `src/components/brand-logo.tsx`, `src/components/login-view.tsx`
  - `src/assets/oprimed-logo.png`, `.ref/zip/*`

커밋 근거:

- `2026-03-24 bb4a502 [작성자 비공개] feat: 로그인 게이트 포털 추가`
  - `2026-03-24 17ac4c2 [작성자 비공개] chore: 로고 이미지 추가`
  - `2026-03-24 e11a1e7 [작성자 비공개] chore: 참고 zip 레퍼런스 제거`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal login gate shell and brand entry`.

## R-56cef621f842 오프리메드 · Portal routing, auth context, and auth service wiring

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 백엔드 인증 계약과 실제 cookie/redirect 동작은 FE 커밋만으로 최종 확정 불가.

작업 기간:

- 2026-03-24 to 2026-03-26

원문 작업 설명:

- 로그인/포털 화면을 route 단위로 분리하고 auth context, API client, auth service를 연결한 작업.
  - 로그인 리다이렉트, 세션 복원, portal 재노출 흐름을 반복 보정함.
  - 인증 쿠키 동작 문서를 repo 내부 문서로 추가함.

변경 파일·영역:

- `src/App.tsx`, `src/components/app-shell.tsx`, `src/components/portal-view.tsx`
  - `src/pages/login-page.tsx`, `src/pages/portal-page.tsx`
  - `src/contexts/auth-context.tsx`, `src/contexts/use-auth.ts`
  - `src/services/auth-schema.ts`, `src/services/auth-service.ts`, `src/lib/api-client.ts`
  - `docs/AUTH_COOKIE_NOTES.md`

커밋 근거:

- `2026-03-24 ec287e1 [작성자 비공개] build: 라우터와 API 설정 추가`
  - `2026-03-24 3533700 [작성자 비공개] feat: 포털 라우팅과 로그인 연동 적용`
  - `2026-03-24 97a4d60 [작성자 비공개] fix: 로그인 리다이렉트 처리 보완`
  - `2026-03-25 a087214 [작성자 비공개] fix: 로컬 로그인 리다이렉트 흐름 조정`
  - `2026-03-25 a327e61 [작성자 비공개] docs: 인증 쿠키 동작 문서 추가`
  - `2026-03-26 3bbc31f [작성자 비공개] fix: 로그인 테스트 흐름과 응답 처리 보완`
  - `2026-03-26 0c90e1c [작성자 비공개] fix: 로그인 세션 복원과 포털 재노출 처리 보완`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal routing, auth context, and auth service wiring`.

## R-068397fdddc5 오프리메드 · Portal Docker tar deployment, HTTPS dev setup, and Next app-router migration

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 실제 production/demo 배포 성공 로그는 repo commit만으로 확인 불가.

작업 기간:

- 2026-03-24 to 2026-04-17

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- Portal 배포를 Docker tar/standalone 런타임 흐름으로 정리하고, demo/prod nginx/env 구성을 추가함.
  - Vite 구조를 Next.js app router 구조로 옮기면서 `src/app`, `src/features`, Next config, dev HTTPS 스크립트를 추가함.
  - health check route와 standalone start/static asset 경로를 배포 검증용으로 보강함.

변경 파일·영역:

- `.env`, `.env.demo`, `.dockerignore`, `Dockerfile`, `Dockerfile.demo`
  - `create-tar.sh`, `demo-create-tar.sh`, `load.sh`, `demo-load.sh`
  - `deploy/nginx/*`, `scripts/run-next-dev.mjs`, `scripts/setup-dev-https.*`
  - `next.config.ts`, `postcss.config.mjs`, `src/app/*`, `src/features/*`
  - `PORTAL_3007_DEPLOY_MANUAL.md`, `README.md`, `src/app/healthz/route.ts`

커밋 근거:

- `2026-03-24 b64fd89 [작성자 비공개] build: 도커 tar 배포 워크플로 추가`
  - `2026-03-24 1089947 [작성자 비공개] docs: 포털 배포 가이드 추가`
  - `2026-03-27 afe04b4 [작성자 비공개] chore: hosts 세팅`
  - `2026-03-27 5225442 [작성자 비공개] build: mkcert 기반 로컬 https 개발환경 추가`
  - `2026-03-29 766b8b2 [작성자 비공개] chore: 프로젝트명 optivis-portal로 통일`
  - `2026-03-30 593923b [작성자 비공개] build: Next.js 앱 라우터와 HTTPS 개발환경 전환`
  - `2026-03-31 f605991 [작성자 비공개] build: Next standalone 배포 런타임 전환`
  - `2026-03-31 9598a72 [작성자 비공개] build: 배포 스크립트 헬스체크 보강`
  - `2026-04-08 e48982c [작성자 비공개] build: demo API base URL 설정 추가`
  - `2026-04-17 4496417 [작성자 비공개] build: 레거시 env 정리와 패키징 스크립트 권한 추가`
  - `2026-04-17 00643fc [작성자 비공개] fix: standalone E2E 정적 자산 경로 보정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal Docker tar deployment, HTTPS dev setup, and Next app-router migration`.

## R-0e920b0ba14e 오프리메드 · Portal login UI polish and login help modal

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 도움말 모달의 최종 UX 문구와 디자인 승인 여부는 git evidence만으로 확인 불가.

작업 기간:

- 2026-03-26 to 2026-03-27

원문 작업 설명:

- 로그인 화면 자산과 레이아웃을 정리하고, 로그인 도움말 모달을 추가한 UI 작업.

변경 파일·영역:

- `src/components/login-view.tsx`
  - `src/assets/optivis-symbol.svg`

커밋 근거:

- `2026-03-26 716d188 [작성자 비공개] feat: 로그인 화면 디자인 정리`
  - `2026-03-27 b7e5ee6 [작성자 비공개] feat: 로그인 도움말 모달 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal login UI polish and login help modal`.

## R-7f1b8f62d1dc 오프리메드 · Portal mobile-only 안내 page and non-mobile guard

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- device 판정 로직의 production 환경 정확도는 브라우저/서버 헤더 조건으로 별도 확인 필요.

작업 기간:

- 2026-03-31 to 2026-04-17

원문 작업 설명:

- desktop route group과 mobile 안내 page를 분리하고, device/request 기반 접근 제한을 추가함.
  - 모바일 안내 카드 디자인과 font/spec 차이를 보정함.

변경 파일·영역:

- `src/app/mobile/page.tsx`, `src/app/(desktop)/*`
  - `src/lib/mobile-request.ts`
  - `src/components/background-shell.tsx`, `src/components/service-card.tsx`
  - `src/features/login-page.tsx`, `src/features/portal-page.tsx`

커밋 근거:

- `2026-03-31 fe8f64c [작성자 비공개] feat: 모바일 전용 안내 페이지 추가`
  - `2026-04-01 8b69135 [작성자 비공개] fix: 모바일 안내 카드 디자인 조정`
  - `2026-04-06 dfc8442 [작성자 비공개] fix: 모바일 외 접근시 메인으로 리다이렉트`
  - `2026-04-06 9b5423e [작성자 비공개] fix: 비모바일에서 모바일 페이지 접근 차단`
  - `2026-04-17 d1af2ad [작성자 비공개] fix: Inter 웹폰트 로드와 모바일 안내 스펙 보정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal mobile-only 안내 page and non-mobile guard`.

## R-7c809d6c1df3 오프리메드 · Portal Playwright and Vitest regression coverage

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 실제 CI에서 지속 실행됐는지 확인 필요.

작업 기간:

- 2026-04-13 to 2026-06-01

원문 작업 설명:

- Portal smoke E2E와 auth/API 단위 테스트 기반을 추가함.
  - 로그인 submit 안정화와 standalone 서버 실행 경로를 테스트 스크립트에서 보정함.

변경 파일·영역:

- `.playwright/cli.config.json`, `playwright.config.ts`
  - `scripts/run-e2e-server.mjs`, `scripts/run-playwright-cli.mjs`, `scripts/run-standalone-start.mjs`
  - `tests/e2e/portal-smoke.spec.ts`
  - `src/lib/api-client.test.ts`, `src/lib/session-expired-client.test.ts`
  - `src/services/auth-service.test.ts`, `vitest.config.ts`

커밋 근거:

- `2026-04-13 ba56462 [작성자 비공개] test: Playwright 로컬 테스트 환경 추가`
  - `2026-04-28 b0bff75 [작성자 비공개] test: stabilize login submission in e2e`
  - `2026-06-01 2f874e2 [작성자 비공개] test: 인증 및 API 테스트 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal Playwright and Vitest regression coverage`.

## R-7832183118d8 오프리메드 · Portal auth API client fetch refactor and contract/schema alignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- live Swagger 기준과 실제 commit 당시 API 계약은 별도 재검증 필요.

작업 기간:

- 2026-04-14 to 2026-05-08

원문 작업 설명:

- auth API client를 fetch 기반으로 전환하고 Swagger 기준 auth schema/service type을 정리함.
  - auth 상태 판정을 context/service/page에서 단일화하는 보정이 있음.

변경 파일·영역:

- `src/lib/api-client.ts`
  - `src/services/auth-service.ts`, `src/services/auth-schema.ts`, `src/services/auth-service.type.ts`
  - `src/services/popup-service.ts`, `src/services/popup-schema.ts`, `src/services/popup-service.type.ts`
  - `src/contexts/auth-context.tsx`, `src/features/portal-page.tsx`

커밋 근거:

- `2026-04-14 fc869fd [작성자 비공개] refactor: 인증 API 클라이언트를 fetch로 전환`
  - `2026-04-27 515f8a5 [작성자 비공개] feat: sync auth contracts with swagger`
  - `2026-04-28 a41ff44 [작성자 비공개] refactor: rename service schema files`
  - `2026-05-08 0de331f [작성자 비공개] fix: 인증 상태 판정 단일화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal auth API client fetch refactor and contract/schema alignment`.

## R-66211bcd55f2 오프리메드 · Portal self-hosted deploy workflows and legacy container handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- self-hosted runner 운영 주체와 실제 배포 성공 로그는 repo commit만으로 확인 불가.

작업 기간:

- 2026-04-27

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- GitHub Actions deploy/demo deploy workflow와 self-hosted runner sample을 추가/조정함.
  - legacy portal container 처리 로직을 deploy scripts에 반영함.
  - 같은 날짜 UI/login support 변경도 함께 들어 있어 deploy-only로 단정하면 안 됨.

변경 파일·영역:

- `.github/workflows/deploy.yml`, `.github/workflows/demo-deploy.yml`
  - `scripts/deploy-release-common.sh`, `scripts/deploy-release.sh`, `scripts/demo-deploy-release.sh`
  - `git-runner-sample/*`, `Dockerfile`, `Dockerfile.demo`
  - `README.md`, `src/components/login-support-dialog.tsx`

커밋 근거:

- `2026-04-27 9f5855e [작성자 비공개] feat: align portal UI and deploy workflows`
  - `2026-04-27 7061a21 [작성자 비공개] ci: target portal self-hosted runner`
  - `2026-04-27 70b5c47 [작성자 비공개] ci: use any self-hosted runner`
  - `2026-04-27 6f60f1e [작성자 비공개] ci: handle legacy portal containers`
  - `2026-04-27 f09674b [작성자 비공개] chore: commit remaining workspace changes`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal self-hosted deploy workflows and legacy container handling`.

## R-7b27335d731a 오프리메드 · Portal post-login fullscreen recommendation and popup persistence

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- resume 소재로 쓰려면 "추가했다"가 아니라 "실험/도입 후 제거된 흐름"임을 명확히 해야 함.

작업 기간:

- 2026-04-27 to 2026-05-21

원문 작업 설명:

- 로그인 이후 fullscreen recommendation dialog를 추가하고 popup dismiss 상태를 API로 저장하도록 연결함.
  - 같은 기능은 2026-05-21에 제거되어, 최종 제품 기능이라기보다 시도/철회된 UI 흐름으로 기록해야 함.

변경 파일·영역:

- `src/components/fullscreen-recommendation-dialog.tsx`
  - `src/components/ui/dialog.tsx`
  - `src/lib/fullscreen-recommendation-dialog.ts`
  - `src/services/popup-service.ts`, `src/services/popup-schema.ts`
  - `src/features/login-page.tsx`, `src/features/portal-page.tsx`
  - `public/images/browser-*.png`, `tests/e2e/portal-smoke.spec.ts`

커밋 근거:

- `2026-04-27 3a70a85 [작성자 비공개] feat: add post-login fullscreen recommendation dialog`
  - `2026-04-27 55b6d8f [작성자 비공개] feat: add responsive portal cards and login popup gating`
  - `2026-04-27 e2529b6 [작성자 비공개] feat: persist popup dismiss state via api`
  - `2026-05-21 2fbe391 [작성자 비공개] refactor: 전체화면 권장 모달 제거`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal post-login fullscreen recommendation and popup persistence`.

## R-e8872281432f 오프리메드 · Portal coding convention, FE config, and dependency/security patch line

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 보안 취약점 해결 여부는 lockfile diff와 advisory 확인 전에는 단정 금지.

작업 기간:

- 2026-04-10 to 2026-05-12

사용자 확인:
2026-06-23, project version alignment is confirmed as user's work for dependency/security patch items.

원문 작업 설명:

- formatting/config/husky/coding convention과 package security patch 계열 작업.
  - 일부 package patch commits are duplicated across branch history; all-branch 기준이라 중복성 가능성이 있음.

변경 파일·영역:

- `.editorconfig`, `.prettierrc.json`, `.prettierignore`
  - `.husky/pre-commit`, `.husky/pre-push`, `eslint.config.mjs`
  - `docs/coding-convention.md`, `docs/GIT_BRANCH_STRATEGY.md`
  - `package.json`, `package-lock.json`, `postcss.config.mjs`
  - many `src/*` formatting-only changes

커밋 근거:

- `2026-04-10 ccd080c [작성자 비공개] build: Next 보안 패치와 허스키 훅 추가`
  - `2026-04-28 d8e6cf8 [작성자 비공개] chore: fe-config 프로젝트 설정 적용`
  - `2026-04-28 efa95bb [작성자 비공개] refactor: 코딩 컨벤션 정리`
  - `2026-05-08 5ffafb7 [작성자 비공개] chore: fe-config 최신 설정 반영`
  - `2026-05-08 09cdedf [작성자 비공개] style: 코딩 컨벤션 포맷 정렬`
  - `2026-05-08 8f9620b [작성자 비공개] chore: Next와 React 보안 패치 반영`
  - `2026-05-08 7fe42d0 [작성자 비공개] chore: Next 패치 버전 갱신`
  - `2026-05-08 da4289a [작성자 비공개] chore: Next와 React 보안 패치 반영`
  - `2026-05-08 10778e6 [작성자 비공개] chore: Next 패치 버전 갱신`
  - `2026-05-12 10ddd83 [작성자 비공개] chore: PostCSS 보안 패치 고정`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal coding convention, FE config, and dependency/security patch line`.

## R-d68aebbd4a6b 오프리메드 · Portal session-expired CDN SDK and integration docs

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- SDK가 외부 FE에서 실제 사용됐는지와 versioning 정책은 별도 확인 필요.

작업 기간:

- 2026-05-26 to 2026-06-12

원문 작업 설명:

- Portal에서 session-expired CDN SDK route, client, referrer helper, tests, usage docs를 추가함.
  - session-expired modal height 보정과 shared flow notes/docx 자료 추가가 이어짐.

변경 파일·영역:

- `src/app/sdk/session-expired/v1.js/route.ts`
  - `src/lib/auth-referrer.ts`, `src/lib/session-expired-client.ts`, `src/lib/session-expired-sdk.ts`
  - `src/contexts/auth-context.tsx`
  - `src/lib/auth-referrer.test.ts`, `src/lib/session-expired-sdk.test.ts`
  - `docs/session-expired-sdk-usage.md`, `docs/session-expired-sdk-integration.md`
  - `docs/auth-session-expired-shared-flow-notes.md`

커밋 근거:

- `2026-05-26 ce4e38c [작성자 비공개] docs: add auth CDN SDK design`
  - `2026-05-26 41641d6 [작성자 비공개] feat: 세션 만료 CDN SDK 추가`
  - `2026-05-26 878f4e3 [작성자 비공개] docs: 세션 만료 SDK 사용 문서 추가`
  - `2026-05-26 53aa490 [작성자 비공개] fix: 세션 만료 모달 높이 보정`
  - `2026-06-12 8e4c5b9 [작성자 비공개] chore: 2026-06-12 데이터 수집 전 변경사항 저장`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal session-expired CDN SDK and integration docs`.

## R-4ae974495842 오프리메드 · Portal CSP header and project documentation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- CSP header의 구체 policy 범위와 runtime 영향은 `next.config.ts` 내용 기준 추가 확인 필요.

작업 기간:

- 2026-04-08 to 2026-06-17

원문 작업 설명:

- Portal README/AGENTS 문서와 Next config의 CSP response header가 추가됨.
  - 문서 보강과 runtime security header 작업이 섞인 작은 유지보수 단위.

변경 파일·영역:

- `README.md`, `AGENTS.md`, `next.config.ts`

커밋 근거:

- `2026-04-08 160b82e [작성자 비공개] docs: README를 현재 런타임 기준으로 정리`
  - `2026-04-17 8275830 [작성자 비공개] docs: AGENTS 작업 가이드 추가`
  - `2026-06-01 8ba56ca [작성자 비공개] feat: CSP 응답 헤더 추가`
  - `2026-06-17 65b05b3 [작성자 비공개] docs: README 프로젝트 구조 설명 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Portal CSP header and project documentation`.

## R-3e50b7cc8c6d 오프리메드 · Trial FE deploy workflow and local runtime setup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- all-branch 중복 커밋은 실제 mainline 반영 이력과 별도로 해석 필요.

작업 기간:

- 2026-03-23 to 2026-04-10

사용자 확인:
2026-06-23, Oprimed FE CI/CD/deploy setup is confirmed as user's work.

원문 작업 설명:

- Trial FE release/deploy workflow, deploy scripts, local domain, mkcert HTTPS dev setup을 정리함.
  - 같은 내용의 deploy script split commit이 all-branch 기준에서 두 번 관측됨.

변경 파일·영역:

- `.github/workflows/release-deploy.yml`, `.github/workflows/deploy.yml`, `.github/workflows/demo-deploy.yml`
  - `scripts/deploy-release.sh`, `scripts/demo-deploy-release.sh`, `scripts/deploy-release-common.sh`
  - `.env.deploy`, `.dockerignore`, `create-tar.sh`
  - `next.config.ts`, `scripts/dev-https.mjs`, `README.md`

커밋 근거:

- `2026-03-23 ce7124a [작성자 비공개] chore: 깃액선 추가 및 배포 스크립트 추가`
  - `2026-03-26 46eebd7 [작성자 비공개] chore: 배포 흐름 수정`
  - `2026-03-27 d91cc15 [작성자 비공개] chore: 배포 흐름 수정`
  - `2026-03-27 4df5191 [작성자 비공개] chore: 로컬 도메인 개발 설정 정리`
  - `2026-03-27 b363c9f [작성자 비공개] chore: mkcert 기반 로컬 HTTPS 개발환경 정리`
  - `2026-04-10 6565445 [작성자 비공개] chore: 공통 배포 스크립트 분리 및 demo 배포 추가`
  - `2026-04-10 8da87b8 [작성자 비공개] chore: 공통 배포 스크립트 분리 및 demo 배포 추가`
  - `2026-04-10 0f01fff [작성자 비공개] chore: 개발 도메인 origin 설정 유연화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial FE deploy workflow and local runtime setup`.

## R-2b5c38b73b7c 오프리메드 · Trial FE auth gate, common fetcher, token refresh, and redirect handling

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- security posture는 FE commit만으로 평가 금지. cookie/session backend behavior 확인 필요.

작업 기간:

- 2026-03-26 to 2026-04-13

원문 작업 설명:

- app-level auth gate와 fetcher, auth store, token refresh handling을 추가함.
  - refresh failure status handling and referrer redirect behavior were adjusted repeatedly.
  - access token storage moved to memory-only management.

변경 파일·영역:

- `src/components/auth/auth-gate.tsx`
  - `src/services/fetcher.ts`, `src/services/auth-service.ts`, `src/services/auth-service.type.ts`
  - `src/services/auth-redirect.ts`
  - `src/stores/use-auth-store.ts`, `src/stores/useApiStore.ts`

커밋 근거:

- `2026-03-26 1d0cca8 [작성자 비공개] feat: 인증 게이트와 공통 fetcher 추가`
  - `2026-03-26 d30b65a [작성자 비공개] fix: 401 응답시 토큰 재발급 처리`
  - `2026-04-09 8fa6642 [작성자 비공개] fix: 액세스 토큰 메모리 전용 관리로 변경`
  - `2026-04-10 6830754 [작성자 비공개] fix: refresh 401 응답만 로그인으로 리다이렉트`
  - `2026-04-13 a036157 [작성자 비공개] fix: refresh 400 응답도 referrer와 함께 로그인 리다이렉트`
  - `2026-04-13 9bc9e3f [작성자 비공개] refactor: 인증 리다이렉트 헬퍼 단순화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial FE auth gate, common fetcher, token refresh, and redirect handling`.

## R-6db8d993b0ed 오프리메드 · Trial FE mobile API base URL split

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 모바일 판정 기준과 실제 환경변수 값은 runtime env 확인 필요.

작업 기간:

- 2026-04-01

원문 작업 설명:

- mobile device detection에 따라 API base URL을 분기하고 deploy env/docs에 mobile URL을 추가함.

변경 파일·영역:

- `src/constants/device.ts`, `src/hooks/use-mobile.ts`
  - `src/services/api-base-url.ts`, `src/services/api.ts`
  - `src/stores/useApiStore.ts`
  - `.env.deploy`, `.github/workflows/deploy.yml`, `README.md`

커밋 근거:

- `2026-04-01 fddfe84 [작성자 비공개] feat: 모바일 API URL 분기 추가`
  - `2026-04-01 f7c9d6e [작성자 비공개] chore: 배포 환경변수에 모바일 URL 추가`
  - `2026-04-01 3d4833f [작성자 비공개] docs: 모바일 URL 환경변수 문서 반영`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial FE mobile API base URL split`.

## R-c0c56182dd58 오프리메드 · Trial FE project formatting, hooks, browser-test tooling, and package maintenance

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- package patch/security effect should be checked against lockfile diff and installed dependency tree.

작업 기간:

- 2026-03-26 to 2026-06-22

사용자 확인:
2026-06-23, project version alignment is confirmed as user's work for package upgrade/patch items.

원문 작업 설명:

- formatter/lint/husky setup, Playwright browser-test environment, package upgrades, dependency cleanup, output ignore rules.
  - Next/React patch commits appear duplicated in all-branch history.

변경 파일·영역:

- `.prettierignore`, `.prettierrc.json`, `.editorconfig`
  - `.husky/pre-commit`, `.husky/pre-push`, `eslint.config.mjs`
  - `package.json`, `package-lock.json`
  - `.gitignore`, browser test/playwright output patterns

커밋 근거:

- `2026-03-26 2e4373c [작성자 비공개] chore: 프리티어 설정 추가 및 린트 스크립트 정리`
  - `2026-04-10 d2feaa7 [작성자 비공개] chore: Playwright 브라우저 테스트 환경 추가`
  - `2026-04-10 e824bc6 [작성자 비공개] build: Next 15.5.15 업그레이드`
  - `2026-04-10 333539a [작성자 비공개] build: Next 15.5.15 업그레이드`
  - `2026-04-28 e3a995b [작성자 비공개] chore: 에이전트 개발 설정 추가`
  - `2026-04-15 7f6abfb [작성자 비공개] chore: axios 직접 의존 제거`
  - `2026-04-15 1d82d02 [작성자 비공개] chore: 미사용 코드와 의존성 제거`
  - `2026-05-08 f72a8d2 [작성자 비공개] chore: React와 Next.js 보안 패치 적용`
  - `2026-05-08 2ddd91c [작성자 비공개] chore: Next.js 패치 버전 업데이트`
  - `2026-05-08 6009a18 [작성자 비공개] chore: React와 Next.js 보안 패치 적용`
  - `2026-05-08 d958617 [작성자 비공개] chore: Next.js 패치 버전 업데이트`
  - `2026-06-22 cd6f58f [작성자 비공개] chore: Playwright CLI 출력 제외`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial FE project formatting, hooks, browser-test tooling, and package maintenance`.

## R-10327b493711 오프리메드 · Trial FE service module split and Swagger contract typing

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Swagger diff docs were not treated as external truth here; live API status needs separate contract sync.

작업 기간:

- 2026-04-10 to 2026-06-10

원문 작업 설명:

- monolithic `src/services/api.ts` and shared API types were split into system-specific service/type modules.
  - Later commits record live Swagger contract differences and adjust low-risk type mismatches/response fields.

변경 파일·영역:

- `src/services/drive-service.ts`, `src/services/info-service.ts`
  - `src/services/insight-service.ts`, `src/services/simulation-service.ts`
  - `src/services/trial-studio-service.ts`
  - `src/services/*-service.type.ts`
  - `src/app/*/page.tsx`, `src/app/*/handlers.ts`, `src/stores/useApiStore.ts`
  - `check-tasks/trial-fe-live-swagger-contract-diff-2026-06-10.md`

커밋 근거:

- `2026-04-10 85d3e28 [작성자 비공개] refactor: 시스템별 서비스와 타입 모듈 분리`
  - `2026-04-24 424960a [작성자 비공개] fix: 트라이얼 API 스키마와 위치 선택 동기화`
  - `2026-06-10 2ac2eb2 [작성자 비공개] docs: 트라이얼 스웨거 계약 차이 문서화`
  - `2026-06-10 34d812e [작성자 비공개] refactor: 스웨거 기준 낮은 타입 차이 정리`
  - `2026-06-10 e2034f1 [작성자 비공개] refactor: 스웨거 응답 타입 필드 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial FE service module split and Swagger contract typing`.

## R-4465ce2e5649 오프리메드 · Insights multi-drug criteria and search schema

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:

- 2026-04-09 to 2026-04-30

원문 작업 설명:

- Insights search criteria was changed to support multi-drug criteria and richer criteria fields.
  - API request payload was normalized around `drug_list`; later schema updates and healthy-volunteer checkbox adjustment followed.
- similar noreply `sangmin` commits were not counted.

변경 파일·영역:

- `src/app/insights/page.tsx`, `src/app/insights/results/page.tsx`
  - `src/components/forms/expanded-fields.tsx`, `src/components/forms/multi-select-field.tsx`
  - `src/components/forms/select-field.tsx`, `src/components/modals/insights-full-pdf-preview-modal.tsx`
  - `src/services/insight-service.type.ts`, `src/services/insight-service.ts`
  - `src/utils/insights-drug-utils.ts`, `src/utils/search-utils.ts`
  - `docs/TRI-100_INSIGHTS_SEARCH_CRITERIA_SPEC.md`, `tasks/insight/planing-docs/*`

커밋 근거:

- `2026-04-09 00715d1 [작성자 비공개] feat(insights): support multi-drug criteria`
  - `2026-04-13 b83c29e [작성자 비공개] feat: 인사이트 화면 기획 정합성 반영`
  - `2026-04-13 620808d [작성자 비공개] fix: drug_list 기준으로 약물 요청 정리`
  - `2026-05-11 d92edfb [작성자 비공개] fix: 인사이트 검색 API 스키마 갱신`
  - `2026-04-30 14c82d6 [작성자 비공개] fix: use checkbox for healthy volunteers in insights`
  - `2026-04-28 eb960f2 [작성자 비공개] feat: sync insights add more fields with figma`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Insights multi-drug criteria and search schema`.

## R-a208ec29b428 오프리메드 · Insights Data Explorer selection and handoff modal

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Handoff destinations and final accepted payload contract require runtime/API verification.

작업 기간:

- 2026-04-10 to 2026-05-13

원문 작업 설명:

- Data Explorer result cards gained selection behavior and a handoff modal for passing selected studies into Studio/other flows.
  - Handoff payload normalization and field alignment were revisited in May.

변경 파일·영역:

- `src/app/insights/results/page.tsx`
  - `src/components/insights/data-explorer-selection-bar.tsx`
  - `src/components/insights/scrap-study-card.tsx`
  - `src/components/modals/data-explorer-handoff-modal.tsx`
  - `docs/TRI-110_DATA_EXPLORER_CARD_INTERACTION_SPEC.md`
  - `docs/TRI-110_DATA_EXPLORER_SELECTION_HANDOFF_SPEC.md`

커밋 근거:

- `2026-04-10 87b08cd [작성자 비공개] feat: Data Explorer 카드 인터랙션과 handoff 정리`
  - `2026-05-13 3a11638 [작성자 비공개] fix: 인사이트 핸드오프 배열 문자열 정규화`
  - `2026-05-13 a3660d4 [작성자 비공개] fix: 인사이트 스튜디오 전환 모달 피그마 정렬`
  - `2026-05-13 134d549 [작성자 비공개] fix: 트라이얼 스튜디오 핸드오프 필드 정렬`
  - `2026-05-13 28c5492 [작성자 비공개] fix: 스튜디오 expanded access 페이로드 정규화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Insights Data Explorer selection and handoff modal`.

## R-51fe18a89fa8 오프리메드 · Trial Studio TRI-200 input and result contract stabilization

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- TRI number mapping and final product language should be checked against product specs before resume rewrite.

작업 기간:

- 2026-04-10 to 2026-05-13

원문 작업 설명:

- Trial Studio TRI-200 input UI, TRI-210/310/340 result presentation, dashboard/report/table contract handling were iteratively stabilized.
  - Validation utilities were extracted/commonized for handoff and form handling.
  - Figma alignment commits touched result page/sidebar/view inputs modal.

변경 파일·영역:

- `src/app/trial-studio/page.tsx`, `src/app/trial-studio/results/page.tsx`
  - `src/app/trial-studio/components/results/dashboard-results.tsx`
  - `src/app/trial-studio/components/results/report-results.tsx`
  - `src/app/trial-studio/components/results/results-table.tsx`
  - `src/app/trial-studio/components/results/results-view.tsx`
  - `src/components/forms/*`, `src/components/modals/full-pdf-preview-modal.tsx`
  - `src/components/modals/view-inputs-modal.tsx`, `src/utils/trial-studio-form.ts`

커밋 근거:

- `2026-04-10 636e1ec [작성자 비공개] feat: TRI-200 기준 입력 UI 정리`
  - `2026-04-10 9087405 [작성자 비공개] fix: TRI-210 평균 비교 기준 정리`
  - `2026-04-10 0f23bfd [작성자 비공개] fix: dose 비교값 null 렌더링 방어`
  - `2026-04-10 26f26c3 [작성자 비공개] fix: Trial Studio 계약과 렌더 안정성 정리`
  - `2026-04-13 444c4fd [작성자 비공개] feat: 트라이얼 스튜디오 화면 기획 정합성 반영`
  - `2026-04-13 78b773e [작성자 비공개] fix: TRI-310/340 결과 화면 스펙 정리`
  - `2026-04-24 70332e0 [작성자 비공개] refactor: 트라이얼 스튜디오 검증 공통화`
  - `2026-04-24 4797884 [작성자 비공개] fix: 트라이얼 스튜디오 핸드오프 검증 정리`
  - `2026-04-30 1b2c70e [작성자 비공개] fix: 트라이얼 스튜디오 입력 필드 배치 조정`
  - `2026-05-12 32b3746 [작성자 비공개] fix: 트라이얼 스튜디오 결과 화면 피그마 정렬`
  - `2026-05-13 c911f56 [작성자 비공개] fix: 트라이얼 스튜디오 결과 리포트 배치 정렬`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial Studio TRI-200 input and result contract stabilization`.

## R-6f28f440440b 오프리메드 · Simulation TRI-300 screen rebuild and results alignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- This unit contains reversals/restorations; final state should be checked before claiming shipped feature scope.

작업 기간:

- 2026-04-13 to 2026-04-15

원문 작업 설명:

- Simulation TRI-300 screen was rebuilt around a target criteria UI, then adjusted across input ranges, result screens, report defaults, legends, View Parameter modal, and Drive load UI.
  - 2026-04-15 commit restored simulation screen to demo baseline, so some earlier screen rebuild details may have been superseded.

변경 파일·영역:

- `src/app/simulation/constants.ts`, `src/app/simulation/handlers.ts`
  - `src/app/simulation/page.tsx`, `src/app/simulation/tri300-ui.tsx`
  - `src/app/simulation/results/page.tsx`
  - `src/app/simulation/results/simulation-dashboard-results.tsx`
  - `src/app/simulation/results/simulation-report-results.tsx`
  - `src/app/simulation/results/simulation-table-view.tsx`
  - `src/components/charts/simulation-charts.tsx`
  - `src/components/modals/simulation-full-pdf-preview-modal.tsx`

커밋 근거:

- `2026-04-13 f562619 [작성자 비공개] feat: 시뮬레이션 TRI-300 화면 정합성 반영`
  - `2026-04-13 c663cff [작성자 비공개] feat: 시뮬레이션 TRI-300 기준 화면으로 개편`
  - `2026-04-13 137052e [작성자 비공개] fix: TRI-310/320 결과 화면 정렬과 입력 범위 정리`
  - `2026-04-13 50ee2cb [작성자 비공개] fix: TRI-340 View parameter 모달 구조 정리`
  - `2026-04-13 9ea938f [작성자 비공개] fix: TRI-330 Report 기본 상태와 범례 정리`
  - `2026-04-13 19698e9 [작성자 비공개] fix: TRI-300/330/340 문서 범위 정리`
  - `2026-04-13 7f3c951 [작성자 비공개] feat: 시뮬레이션 TRI-300 입력과 Drive 로드 UI 개편`
  - `2026-04-14 2396b08 [작성자 비공개] feat: 인사이트와 시뮬레이션 잔여 기획 정합성 반영`
  - `2026-04-14 9d89a70 [작성자 비공개] fix: 시뮬레이션과 스튜디오 검증 흐름 정리`
  - `2026-04-14 fcabf81 [작성자 비공개] fix: 시뮬레이션 결과 기준과 입력 계약 정리`
  - `2026-04-15 67dc2ff [작성자 비공개] fix: 시뮬레이션 화면을 demo 기준으로 복원`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Simulation TRI-300 screen rebuild and results alignment`.

## R-408cebae9c55 오프리메드 · Simulation multi-drug selection and View Parameter display

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- API request/response shape for multi-drug simulation should be verified against service layer and backend contract.

작업 기간:

- 2026-04-20

원문 작업 설명:

- Simulation form/results flow gained multi-drug selection and View Parameter modal display linkage.

변경 파일·영역:

- `src/app/simulation/constants.ts`, `src/app/simulation/handlers.ts`
  - `src/app/simulation/page.tsx`, `src/app/simulation/results/page.tsx`
  - `src/components/forms/multi-select-field.tsx`
  - `src/components/modals/simulation-full-pdf-preview-modal.tsx`
  - `src/components/modals/view-inputs-modal.tsx`
  - `docs/simulation-multi-drug-work.md`

커밋 근거:

- `2026-04-20 146a27a [작성자 비공개] feat: 시뮬레이션 다중 약물 선택 적용`
  - `2026-04-20 26765c4 [작성자 비공개] fix: View parameter 다중 약물 표시 연결`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Simulation multi-drug selection and View Parameter display`.

## R-999fa2fcd53d 오프리메드 · Trial FE request value, load-state, and state-sync fixes

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- These are targeted fixes, not one broad feature; preserve as maintenance/stabilization material unless further evidence groups them.

작업 기간:

- 2026-04-07 to 2026-04-15

원문 작업 설명:

- Simulation/Trial Studio/Insights flows had several request-value and state-sync fixes around `study_type`, intervention method mapping, drug search retention, loader behavior, preset flow, and Drive load transitions.

변경 파일·영역:

- `src/services/api.ts`, `src/services/simulation-service.ts`
  - `src/app/simulation/handlers.ts`, `src/app/simulation/page.tsx`
  - `src/app/trial-studio/page.tsx`
  - `src/app/insights/page.tsx`
  - `src/components/modals/data-explorer-handoff-modal.tsx`
  - `src/components/modals/drive-modal.tsx`
  - `src/stores/useApiStore.ts`

커밋 근거:

- `2026-04-07 cf14c9f [작성자 비공개] fix: 시뮬레이션 study_type 요청값 보정`
  - `2026-04-14 e718268 [작성자 비공개] fix: 시뮬레이션 study_type 요청값 보정`
  - `2026-04-14 b818642 [작성자 비공개] fix: intervention method 로드 매핑 정리`
  - `2026-04-14 a0442a4 [작성자 비공개] fix: Trial Studio drug 검색 결과 초기화 방지`
  - `2026-04-14 3225274 [작성자 비공개] fix: Trial Studio 진입 로더 해제`
  - `2026-04-14 8a59d08 [작성자 비공개] fix: 시뮬레이션 케이스 프리셋 흐름 복구`
  - `2026-04-14 8e49d65 [작성자 비공개] fix: 시뮬레이션 복귀 상태 동기화 정리`
  - `2026-04-15 a81a442 [작성자 비공개] fix: 시뮬레이션 설정 드라이브 전환 구조 정리`
  - `2026-04-15 4e80950 [작성자 비공개] fix: 인사이트 드라이브 로드 검색 상태 동기화`
  - `2026-04-14 93064f0 [작성자 비공개] fix: 인사이트 드라이브 로드 검색 비활성화 해소`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial FE request value, load-state, and state-sync fixes`.

## R-7d89d762e4be 오프리메드 · Common loader, modal layering, sidebar, select, and date controls

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- For resume material, distinguish durable UI infra changes from reverted modal-layer experiment.

작업 기간:

- 2026-04-10 to 2026-04-16

원문 작업 설명:

- Global loader context, MUI date picker replacement, modal portal/layer experiments and revert, sidebar z-index, select arrow alignment, and card header accessory rendering were adjusted.
  - Modal portal change was reverted, so final state is not the same as the initial fix commit.

변경 파일·영역:

- `src/components/common/loader-provider.tsx`, `src/hooks/use-loader.ts`
  - `src/components/forms/date-field.tsx`, `src/components/forms/select-field.tsx`
  - `src/components/layout/sidebar.tsx`
  - `src/components/modals/*`
  - `src/components/ui/dialog.tsx`, `src/components/common/mui-provider.tsx`

커밋 근거:

- `2026-04-10 2cab2ee [작성자 비공개] fix: 로더 렌더를 전역 컨텍스트로 통합`
  - `2026-04-15 f4cb017 [작성자 비공개] feat: 공통 데이트피커 라이브러리 기반으로 교체`
  - `2026-04-16 971e7af [작성자 비공개] fix: 데이트피커 월 선택 후 일 선택 흐름 복구`
  - `2026-04-15 1a26674 [작성자 비공개] fix: 모달 portal 레이어 정리`
  - `2026-04-15 a334f3b [작성자 비공개] Revert "fix: 모달 portal 레이어 정리"`
  - `2026-04-15 7cf64f1 [작성자 비공개] fix: 사이드바 z-index 조정`
  - `2026-04-15 f9ca948 [작성자 비공개] fix: 공통 셀렉트 화살표 정렬 수정`
  - `2026-04-15 ec5cea1 [작성자 비공개] refactor: 카드 헤더 액세서리 렌더링 구조 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Common loader, modal layering, sidebar, select, and date controls`.

## R-a94e4c5d7a0a 오프리메드 · Insight, Trial Studio, Simulation chart and Figma visual alignment

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Figma source itself was not inspected; "Figma alignment" is from commit/file evidence only.

작업 기간:

- 2026-04-14 to 2026-05-13

원문 작업 설명:

- Multiple UI parity fixes against Figma/design target across Insights search/results, dashboard charts, Trial Studio results, Simulation handoff modal, and View Parameter modal.
  - Includes both style alignment and small behavior changes such as tab switching/action icon restoration.

변경 파일·영역:

- `src/app/insights/page.tsx`, `src/app/insights/results/page.tsx`
  - `src/app/trial-studio/components/results/dashboard-results.tsx`
  - `src/app/trial-studio/components/results/report-results.tsx`
  - `src/app/trial-studio/results/page.tsx`
  - `src/components/charts/analytics-dashboard.tsx`, `src/components/charts/chart-card.tsx`
  - `src/components/modals/chart-detail-modal.tsx`, `src/components/modals/view-inputs-modal.tsx`
  - `src/components/forms/*`, `src/components/icons/*`, `src/components/layout/sidebar.tsx`

커밋 근거:

- `2026-04-14 d1c7c1d [작성자 비공개] fix: 차트카드 phase 셀렉트 제거`
  - `2026-04-14 fa6bc38 [작성자 비공개] fix: 대시보드 차트 전체화면 동작 정리`
  - `2026-04-14 9f226d1 [작성자 비공개] fix: basis 최대 선택 동작 정리`
  - `2026-04-28 11035f3 [작성자 비공개] fix: 인사이트 결과 대시보드 피그마 정렬`
  - `2026-04-28 16fbb29 [작성자 비공개] fix: 시뮬레이션 핸드오프 모달 피그마 정렬`
  - `2026-05-12 b7cd33c [작성자 비공개] fix: 인사이트 검색 조건 화면 피그마 정렬`
  - `2026-05-12 1fedd9e [작성자 비공개] fix: 인사이트 검색 조건 스타일 피그마 정렬`
  - `2026-05-12 2bd9ef8 [작성자 비공개] fix: 인사이트 결과 디자인 피그마 정렬`
  - `2026-05-12 caa063a [작성자 비공개] fix: 인사이트 결과 차트 스타일 피그마 정렬`
  - `2026-05-12 e3662cf [작성자 비공개] fix: 인사이트 질병 입력 화살표 제거`
  - `2026-05-12 92d48a0 [작성자 비공개] fix: 인사이트 검색 조건 액션 아이콘 복구`
  - `2026-05-13 6bdca5a [작성자 비공개] fix: 인사이트 대시보드 카드 폭 정렬`
  - `2026-05-13 f536f11 [작성자 비공개] fix: 차트 전체화면 라벨 피그마 정렬`
  - `2026-05-13 e31adec [작성자 비공개] fix: 인사이트 뷰 파라미터 탭 전환 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Insight, Trial Studio, Simulation chart and Figma visual alignment`.

## R-7f8307563664 오프리메드 · Insights result persistence and Drive-load resume behavior

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Persistence behavior should be tested across refresh/back navigation and Drive-origin transitions.

작업 기간:

- 2026-04-14 to 2026-05-15

원문 작업 설명:

- Insights results persistence/recovery was added around IndexedDB/use-api-store/route watcher.
  - Drive load behavior was adjusted per benchmark and infinite render prevention was added.

변경 파일·영역:

- `src/app/insights/page.tsx`, `src/app/insights/results/page.tsx`
  - `src/app/drive/page.tsx`, `src/app/page.tsx`
  - `src/components/layout/route-watcher.tsx`
  - `src/components/modals/drive-modal.tsx`
  - `src/stores/use-api-store.ts`
  - `src/utils/insights-search-result-storage.ts`

커밋 근거:

- `2026-04-14 5776fb4 [작성자 비공개] fix: 인사이트 결과 무한 렌더링 방지`
  - `2026-05-13 6ba70aa [작성자 비공개] fix: 인사이트 결과 IndexedDB 복원`
  - `2026-05-13 9d6e7df [작성자 비공개] fix: 인사이트 결과 보존 옵션 추가`
  - `2026-05-15 869a478 [작성자 비공개] fix: 인사이트 벤치마크별 드라이브 로드 처리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Insights result persistence and Drive-load resume behavior`.

## R-db03b98764b0 오프리메드 · Drive tab hash, product switch links, and broad Drive/UI cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Broad cleanup commits should not be over-interpreted as feature work.

작업 기간:

- 2026-05-08 to 2026-05-29

원문 작업 설명:

- Drive page tab state was moved/kept via hash and then normalized.
  - Product switcher link domains were updated for Labs/Nexus.
  - Unused code and console logs were cleaned across many page/component/service files.

변경 파일·영역:

- `src/app/drive/constants.ts`, `src/app/drive/handlers.ts`, `src/app/drive/page.tsx`
  - `src/app/page.tsx`
  - `src/components/common/product-switcher.tsx`
  - `src/components/drive/*`, `src/components/common/drive-folder-tree.tsx`
  - multiple page/component files touched by console-log cleanup

커밋 근거:

- `2026-05-14 db18e28 [작성자 비공개] feat: 드라이브 탭 해시 유지`
  - `2026-05-14 f0ff50e [작성자 비공개] fix: 드라이브 탭 해시 기준 정리`
  - `2026-05-14 ea48768 [작성자 비공개] fix: 랩스 링크 도메인 변경`
  - `2026-05-14 6d0aefb [작성자 비공개] fix: 넥서스 링크 도메인 변경`
  - `2026-04-29 6b1d3a5 [작성자 비공개] chore: 미사용 코드 제거`
  - `2026-05-29 9d67f56 [작성자 비공개] chore: 불필요 콘솔 로그 제거`
  - `2026-05-13 5f3dbf0 [작성자 비공개] fix: 사이드바 활성 메뉴 URL 기준 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Drive tab hash, product switch links, and broad Drive/UI cleanup`.

## R-dd35f3ffd425 오프리메드 · STU/SIM date, age, and recruitment validation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
구현 범위·실제 운영·현재 상태는 원본 기록만으로 확정하지 않는다.

작업 기간:

- 2026-06-11 to 2026-06-12

원문 작업 설명:

- STU/SIM forms gained date and age range validation, then recruitment count validation before execution.
  - Unit tests were added for form validation and trial-studio-form logic.

변경 파일·영역:

- `src/app/simulation/handlers.ts`, `src/app/simulation/page.tsx`
  - `src/app/trial-studio/page.tsx`
  - `src/utils/form-validation.ts`, `src/utils/form-validation.test.ts`
  - `src/utils/trial-studio-form.ts`, `src/utils/trial-studio-form.test.ts`
  - `check-tasks/trial-fe-stu-sim-confirmed-issues-2026-06-11.md`
  - `check-tasks/trial-fe-stu-sim-problem-verification-e2e-test-cases-2026-06-11.md`

커밋 근거:

- `2026-06-11 c53cb59 [작성자 비공개] fix: STU/SIM 날짜 및 나이 범위 검증 추가`
  - `2026-06-12 191940f [작성자 비공개] fix: STU/SIM 모집 수 실행 전 검증 추가`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `STU/SIM date, age, and recruitment validation`.

## R-57ac8506c93f 오프리메드 · Error toast handling and PDF preview safeguards

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- UX copy and toast severity policy require product/design confirmation.

작업 기간:

- 2026-06-12

원문 작업 설명:

- Error toast handling was centralized/normalized across Drive, Insights, Simulation, Trial Studio, and PDF modal flows.
  - PDF save duplicate execution, Insights PDF Preview entry condition, and empty Simulation result actions were guarded.

변경 파일·영역:

- `src/app/drive/handlers.ts`, `src/app/drive/page.tsx`
  - `src/app/insights/page.tsx`, `src/app/insights/results/page.tsx`
  - `src/app/simulation/handlers.ts`, `src/app/simulation/results/page.tsx`
  - `src/app/trial-studio/page.tsx`, `src/app/trial-studio/results/page.tsx`
  - `src/components/modals/*pdf*`, `src/components/modals/drive-modal.tsx`
  - `src/services/drive-service.ts`, `src/services/info-service.ts`, `src/utils/pdf-utils.ts`
  - `docs/error-toast-handling-changes-2026-06-12.md`

커밋 근거:

- `2026-06-12 fc13fa3 [작성자 비공개] fix: 에러 알림 토스트 처리 통일`
  - `2026-06-12 d575bd9 [작성자 비공개] fix: Drive 오류 토스트 보강`
  - `2026-06-12 b79267b [작성자 비공개] docs: 에러 토스트 변경 구간 정리`
  - `2026-06-12 fc7a0d6 [작성자 비공개] docs: 에러 토스트 문서 한글화`
  - `2026-06-12 6daa349 [작성자 비공개] fix: PDF 저장 중복 실행 방지`
  - `2026-06-12 5107ebf [작성자 비공개] fix: Insights PDF Preview 진입 조건 정리`
  - `2026-06-12 2948708 [작성자 비공개] fix: 시뮬레이션 결과 빈 데이터 액션 비활성화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Error toast handling and PDF preview safeguards`.

## R-cb563eaa4f2a 오프리메드 · Trial FE session-expired SDK integration

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Cross-repo SDK contract and exact runtime dependency on Portal CDN route need separate verification.

작업 기간:

- 2026-05-26

원문 작업 설명:

- Trial FE integrated session-expired handling with auth gate/fetcher/auth redirect and added tests.
  - This appears related to the Portal session-expired SDK work but is separate Trial FE integration evidence.

변경 파일·영역:

- `src/components/auth/auth-gate.tsx`
  - `src/services/auth-redirect.ts`, `src/services/fetcher.ts`
  - `src/services/session-expired.ts`, `src/services/session-expired.test.ts`
  - `src/services/fetcher.test.ts`
  - `docs/session-expired-sdk-trial-work.md`

커밋 근거:

- `2026-05-26 9838fff [작성자 비공개] feat: 세션 만료 SDK 연동`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Trial FE session-expired SDK integration`.

## R-2b2ede201a97 오프리메드 · File naming, casing, common-function cleanup, and FE config updates

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Treat as codebase hygiene/refactor; avoid presenting as user-facing feature unless tied to specific behavior.

작업 기간:

- 2026-05-07 to 2026-05-08

원문 작업 설명:

- Large mechanical rename/casing/kebab-case refactor across app, components, services, stores, utils, docs.
  - Also includes FE config update, unused resource cleanup, and repeated-function commonization.

변경 파일·영역:

- many `src/app/*`, `src/components/*`, `src/constants/*`, `src/hooks/*`, `src/services/*`, `src/stores/*`, `src/types/*`, `src/utils/*`
  - `API_INTEGRATION.md`, `docs/*`, `tasks/refactor/planing-docs/commonize-lib-plan.md`
  - component filename casing changes and kebab-case renames

커밋 근거:

- `2026-05-07 4b3fdee [작성자 비공개] chore: 미사용 리소스 정리`
  - `2026-05-08 dda507a [작성자 비공개] chore: fe-config 설정 업데이트`
  - `2026-05-08 bf827cf [작성자 비공개] refactor: 반복 함수 공통화`
  - `2026-05-08 abe4972 [작성자 비공개] refactor: 파일명 케밥케이스 적용`
  - `2026-05-08 8603617 [작성자 비공개] fix: 컴포넌트 파일명 대소문자 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `File naming, casing, common-function cleanup, and FE config updates`.

## R-db5a49e27887 오프리메드 · Planning, audit, browser-test, and service overview documentation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Documentation commits are evidence of analysis/process artifacts; do not convert into shipped feature claims without code evidence.

작업 기간:

- 2026-04-13 to 2026-06-22

원문 작업 설명:

- Repo-internal docs were added/updated for TRI result screens, E2E validation plans, nonfunctional UI action audit, API/Drive docs, progress checklists, STU/SIM verification, browser-test concept, and service overviews.
  - Some docs were later removed or reorganized.

변경 파일·영역:

- `README.md`, `API_INTEGRATION.md`
  - `docs/browser-test-concept.md`
  - `docs/nonfunctional-ui-action-audit.md`
  - `docs/trial-studio-service-overview.md`
  - `docs/simulation-service-overview.md`
  - `docs/insights-service-overview.md`
  - `docs/trial-studio-results/*`, `docs/simulation-*`
  - `check-tasks/*`
  - `tasks/*`

커밋 근거:

- `2026-04-13 b4d4e45 [작성자 비공개] docs: TRI 결과 화면 기준 자료와 스펙 문서 추가`
  - `2026-04-13 10b8205 [작성자 비공개] docs: TRI 결과 작업 문서 추가`
  - `2026-04-14 14b4d44 [작성자 비공개] docs: e2e 검증 계획서 추가`
  - `2026-04-14 1425d14 [작성자 비공개] docs: planing-docs TC 문서 추가`
  - `2026-04-14 1d3fd97 [작성자 비공개] docs: 인사이트 대시보드 TC 문구 정정`
  - `2026-05-26 11bacd6 [작성자 비공개] docs: 비동작 UI 액션 감사 문서 추가`
  - `2026-05-19 a8ee96c [작성자 비공개] docs: e2e 관련 문서 제거`
  - `2026-06-08 0f23f88 [작성자 비공개] docs: 프로젝트 API 드라이브 문서 갱신`
  - `2026-06-08 c6f8f5c [작성자 비공개] docs: 시뮬레이션 상태 문서 갱신`
  - `2026-06-08 7862307 [작성자 비공개] docs: 트라이얼 스튜디오 결과 문서 갱신`
  - `2026-06-08 45d74b3 [작성자 비공개] docs: 비동작 UI 감사 현황 갱신`
  - `2026-06-08 f2cf924 [작성자 비공개] docs: FE 진행 점검 산출물 추가`
  - `2026-06-11 121ce89 [작성자 비공개] docs: STU/SIM 문제 검증 문서 추가`
  - `2026-06-11 803729b [작성자 비공개] docs: STU/SIM 문제 문서 혼선 표현 정리`
  - `2026-06-11 6b344c1 [작성자 비공개] docs: STU/SIM E2E 판정 표현 정리`
  - `2026-06-22 07c6f14 [작성자 비공개] docs: 브라우저 테스트 컨셉 문서 추가`
  - `2026-06-22 b9c5b36 [작성자 비공개] docs: Insights 서비스 구조 문서화`
  - `2026-06-22 0152136 [작성자 비공개] docs: Simulation 서비스 구조 문서화`
  - `2026-06-22 fb5dad5 [작성자 비공개] docs: Trial Studio 서비스 구조 문서화`
  - `2026-06-17 0ec4f79 [작성자 비공개] docs: 프로젝트 구조 설명 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Planning, audit, browser-test, and service overview documentation`.

## R-f2125114f95b 오프리메드 · Task/reference asset cleanup and revert cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- Revert scope should be compared against final tree before using any affected code changes as accomplishments.

작업 기간:

- 2026-04-09 to 2026-04-15

원문 작업 설명:

- Design/task reference images and planning docs were added, moved, deleted, or cleaned up during branch work.
  - Includes explicit revert commits; these should be treated as history cleanup/reversal evidence, not product feature evidence.

변경 파일·영역:

- `docs/TRI-100_INSIGHTS_SEARCH_CRITERIA_SPEC.md`
  - `docs/TRI-110_*`, `docs/TRIAL_STUDIO_RESULTS_*`
  - `improvement-insight/*`
  - `tasks/*`, `reference/*`, `AGENTS.md`
  - broad revert touch set across `src/app/*`, `src/components/*`, `src/services/*`, `src/utils/*`

커밋 근거:

- `2026-04-09 67129cd [작성자 비공개] chore: TRI-100 시안 이미지 정리`
  - `2026-04-10 351d01c [작성자 비공개] docs: TRI-110 작업 문서 제거`
  - `2026-04-13 ac90220 [작성자 비공개] docs: 배포 참고 자료 추가`
  - `2026-04-13 a24794d [작성자 비공개] chore: 작업 지침과 브라우저 테스트 문서 추가`
  - `2026-04-14 96fc1b3 [작성자 비공개] chore: tri 작업 리소스 정리`
  - `2026-04-14 42767b1 [작성자 비공개] chore: tri 작업 문서 제거`
  - `2026-04-14 f7ea646 [작성자 비공개] revert: 이번 작업 코드 변경 제거`
  - `2026-04-15 cbbb82f [작성자 비공개] Revert "Merge remote-tracking branch 'origin/main' into demo"`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md` · `Task/reference asset cleanup and revert cleanup`.

## R-92f3c81ad374 오프리메드 · TOP deterministic E2E runner, PR gate, and auth/preflight hardening

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Workflow add/remove history should be checked against PR context if later synthesis needs final shipped CI state.

작업 기간:
2026-06-16 to 2026-06-22

원문 작업 설명:

- Built and iterated the TOP Playwright deterministic smoke flow, including CLI entry points and report rendering scripts.
  - Added auth-state setup, target URL preflight, browser/container diagnostics, and failure reporting to reduce false-green E2E results.
  - Added and later removed or disabled PR-gate workflow pieces, with documentation for why the PR gate was blocked or excluded.
- `[작성자 비공개]` commits are documentation-only.

변경 파일·영역:
`e2e/top/top-smoke.spec.ts`, `e2e/top/auth.setup.ts`, `e2e/top/playwright.config.ts`, `scripts/e2e/top-e2e.sh`, `scripts/e2e/run-top-deterministic.mjs`, `scripts/e2e/render-top-deterministic-report.mjs`, `.github/workflows/top-e2e.yml`, `docs/validation/top-deterministic-e2e-runbook-2026-06-16.md`, `docs/validation/top-e2e-pr-gate-blocker-2026-06-22.md`

커밋 근거:

- `2026-06-16 6f689020 [작성자 비공개] test: TOP E2E 통합 CLI 추가`
  - `2026-06-16 e2793b2c [작성자 비공개] test: TOP deterministic full smoke 구현`
  - `2026-06-16 8d3297d1 [작성자 비공개] test: TOP E2E 인증 state setup 추가`
  - `2026-06-18 37e34a80 [작성자 비공개] ci: TOP E2E preview 검증 추가`
  - `2026-06-18 4d8c2b77 [작성자 비공개] test: TOP E2E auth fallback 보완`
  - `2026-06-18 88f59cb5 [작성자 비공개] fix: TOP E2E false green 방지`
  - `2026-06-18 a8f038b5 [작성자 비공개] ci: TOP E2E 워크플로우 제거`
  - `2026-06-22 270e7f2a [작성자 비공개] refactor: TOP E2E 네트워크 이벤트 기록 공통화`
  - `2026-06-22 296f81e2 [작성자 비공개] test: TOP E2E Add Actuals 흐름 추가`
  - `2026-06-22 4fe4f062 [작성자 비공개] docs: TOP E2E PR 게이트 차단 원인 정리`
  - `2026-06-22 66490eb1 [작성자 비공개] docs: TOP E2E PR gate 제외 사유 추가`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `TOP deterministic E2E runner, PR gate, and auth/preflight hardening`.

## R-f7167f832761 오프리메드 · TOP API integration, Swagger contract alignment, and mock removal

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Confirm whether final TOP API surface was accepted by backend Swagger after 2026-06-15.
  - 동일 기간 후속 ownership caveat applies.

작업 기간:
2026-06-04 to 2026-06-15

원문 작업 설명:

- Replaced or reduced mock-based TOP paths and wired TOP pages/components to service/API contracts.
  - Added contract docs and updated service/types around TOP Swagger schemas.
  - Touched baseline input, assessment-data entry, simulation-result, PDF preview, task bootstrap, result mapping, and route context.
  - Added tests around API adapter, baseline, Excel template, result, screen routes, and task bootstrap.

변경 파일·영역:
`src/app/top/*`, `src/components/top/*`, `src/hooks/use-top-task-route-context.ts`, `src/lib/top/top-api-adapter.ts`, `src/lib/top/top-baseline.ts`, `src/lib/top/top-result.ts`, `src/services/top-service.ts`, `src/services/types/top-service.types.ts`, `src/services/mock/top-api.mock-server.ts`, `docs/top-swagger-api-contract-2026-06-09.md`

커밋 근거:

- `2026-06-04 035fea8d [작성자 비공개] feat: TOP feature contract 정리`
  - `2026-06-04 0ccf8e9f [작성자 비공개] feat: TOP 페이지 API와 loader 흐름 정리`
  - `2026-06-09 e1fbf3a1 [작성자 비공개] feat: TOP API 연동 및 목업 제거`
  - `2026-06-09 fb997f0e [작성자 비공개] fix: TOP API validation 계약 적용`
  - `2026-06-10 bb570f39 [작성자 비공개] fix: TOP Swagger 스키마 사용처 갱신`
  - `2026-06-11 bc1f0659 [작성자 비공개] fix: TOP Swagger 계약 타입 정합화`
  - `2026-06-11 4ded9991 [작성자 비공개] fix: TOP Run 조건과 play payload 정합화`
  - `2026-06-15 61023b65 [작성자 비공개] fix: TOP API 응답 기준 정합화`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `TOP API integration, Swagger contract alignment, and mock removal`.

## R-b08341557b68 오프리메드 · TOP Excel baseline/actual import, template validation, and sample files

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Check exact final Excel validation behavior against backend or product requirements if synthesizing as shipped capability.

작업 기간:
2026-06-02 to 2026-06-15

원문 작업 설명:

- Added TOP Excel import handling for baseline and actual data.
  - Maintained valid and invalid `.xlsx` sample sets for assessment-data entry and simulation setting.
  - Added/remediated validation tests for feature keys, patient profile fields, month mapping, and template structure.
  - Removed fallback behavior from TOP Excel sample/template code.

변경 파일·영역:
`public/top/assessment-data-entry/test-files/*.xlsx`, `public/top/simulation-setting/test-files/*.xlsx`, `src/lib/top/top-excel-template.ts`, `src/lib/top/top-excel-template-validation.ts`, `src/lib/top/top-excel-sample-files.ts`, `src/components/top/top-test-file-download-floating.tsx`, `src/services/top-service.test.ts`

커밋 근거:

- `2026-06-02 f1b85124 [작성자 비공개] feat: TOP actual 엑셀 import 처리 추가`
  - `2026-06-04 3ac40f97 [작성자 비공개] test: TOP baseline import 샘플 추가`
  - `2026-06-04 70abf0eb [작성자 비공개] refactor: TOP Excel 샘플 파일 생성 방식 전환`
  - `2026-06-09 d64d6654 [작성자 비공개] fix: TOP Excel fallback 제거`
  - `2026-06-09 165e8454 [작성자 비공개] test: TOP Excel fallback 제거 검증 갱신`
  - `2026-06-10 365c7376 [작성자 비공개] fix: TOP Excel 환자 프로필 import 보정`
  - `2026-06-15 0f022e1f [작성자 비공개] fix: TOP actual Excel month 매핑 정합화`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `TOP Excel baseline/actual import, template validation, and sample files`.

## R-ee385732861e 오프리메드 · TOP PDF/report/result presentation and evidence generation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Verify whether PDF generation used browser print, custom renderer, or service download before polishing.

작업 기간:
2026-06-02 to 2026-06-16

원문 작업 설명:

- Added TOP result PDF preview and download code.
  - Adjusted result table/view behavior, including prediction interval highlighting and user email display in PDF.
  - Added scripts/docs to generate PDF evidence from Playwright CLI runs.
  - Evidence overlaps with TOP E2E because PDF evidence was part of deterministic validation.

변경 파일·영역:
`src/app/top/simulation-result/page.tsx`, `src/app/top/simulation-result/pdf-preview/page.tsx`, `src/components/top/top-pdf-report.tsx`, `src/components/top/top-result-view.tsx`, `src/components/top/top-result-table.tsx`, `src/lib/top/top-pdf-download.ts`, `scripts/e2e/top-playwright-cli-pdf-evidence.mjs`, `scripts/e2e/render-top-playwright-cli-report.mjs`

커밋 근거:

- `2026-06-02 b63a506a [작성자 비공개] feat: TOP simulation result 화면 정리`
  - `2026-06-04 881d36c5 [작성자 비공개] feat: TOP simulation result PDF 미리보기 추가`
  - `2026-06-04 a189f0ea [작성자 비공개] feat: TOP 결과 PDF 다운로드 보강`
  - `2026-06-04 3ae95014 [작성자 비공개] fix: TOP PDF 유저 이메일 표시`
  - `2026-06-10 68473c33 [작성자 비공개] fix: TOP 결과 예측 구간 이탈 강조`
  - `2026-06-16 78ec3b74 [작성자 비공개] test: TOP PDF evidence 보강`
  - `2026-06-18 b1005a17 [작성자 비공개] test: TOP deterministic 리포트 문구 현지화`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `TOP PDF/report/result presentation and evidence generation`.

## R-1c57fd45fa2f 오프리메드 · DRD default-setting, cohort criteria, and API schema wiring

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies for April/June evidence.

작업 기간:
2026-03-04 to 2026-06-10

원문 작업 설명:

- Added DRD request/response schemas and connected default-setting pages to DRD APIs.
  - Added cohort criteria and disease measurement-boundary API usage.
  - Updated mapper/store/sidebar handling for default-setting cards and left-card data names.
  - File paths moved from earlier flat DRD routes to grouped default-setting-flow routes over time.

변경 파일·영역:
historical `src/app/drd/default-setting/page.tsx`, `src/app/drd/filter/page.tsx`, `src/app/drd/high-risk-subgroup/page.tsx`, later `src/app/drd/(default-setting-flow)/*`, `src/services/drd-service.ts`, `src/services/types/drd-service.types.ts`, `src/lib/drd/default-setting-mapper.ts`, `src/store/default-setting-store.ts`, `src/components/drd/drd-default-setting-sidebar.tsx`

커밋 근거:

- `2026-03-04 2b7cdf4d [작성자 비공개] feat: drd api 요청 스키마 정의`
  - `2026-03-04 5d7963b5 [작성자 비공개] feat: /drd/default-setting 페이지 api 연결`
  - `2026-03-20 698743fa [작성자 비공개] feat: DRD 필터 피처리스트 API 연동`
  - `2026-04-20 5289cfbf [작성자 비공개] feat: 질환 측정 경계 API 추가`
  - `2026-04-22 3e563914 [작성자 비공개] feat: DRD Cohort Criteria 기준 선택 연동`
  - `2026-04-22 810722ae [작성자 비공개] fix: DRD 코호트 조건 API 스펙 연동`
  - `2026-06-10 3e4264b1 [작성자 비공개] fix: DRD 좌측 카드 데이터명 표시`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `DRD default-setting, cohort criteria, and API schema wiring`.

## R-555ce29f0617 오프리메드 · DRD clinical background, current medications, SMILES, and medication warnings

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Check backend medication metadata contract before synthesizing final responsibility.

작업 기간:
2026-03-05 to 2026-06-22

원문 작업 설명:

- Added SMILES search/result handling, duplicate drug selection guards, and molecule image handling.
  - Connected DRD clinical background and current-medications fields to service/common APIs.
  - Added medication-warning restore/rendering behavior with tests in `src/lib/drd/clinical-background-medications.test.ts`.
  - Left a contract TODO around DRD medication metadata.

변경 파일·영역:
`src/app/drd/(default-setting-flow)/clinical-background/page.tsx`, `src/app/drd/(simulation-flow)/smile-setting/page.tsx`, `src/lib/drd/clinical-background-config.ts`, `src/lib/drd/clinical-background-medications.ts`, `src/services/common-service.ts`, `src/services/drd-service.ts`, `src/services/types/common-service.type.ts`, `src/services/types/drd-service.types.ts`

커밋 근거:

- `2026-03-05 24b52dca [작성자 비공개] feat: SMILES 응답 스키마 확장 및 검색/로딩 UX 개선`
  - `2026-03-05 cacc85ff [작성자 비공개] feat: 스마일식 api 변경 사항 적용`
  - `2026-03-05 de0b486a [작성자 비공개] feat: drug 중복선택 방어 로직 추가, 약품 선택 기본 값 세팅, 스마일 화학구조분자식 이미지 조정`
  - `2026-04-21 84fb8003 [작성자 비공개] feat: SMILES 설정 저장 API 연동`
  - `2026-04-21 ccbf750d [작성자 비공개] feat: Clinical Background 현재 약물 API 연결`
  - `2026-04-28 6ca1be61 [작성자 비공개] feat: DRD Clinical Background API 연결`
  - `2026-06-22 6be6f1b7 [작성자 비공개] chore: DRD 약물 메타데이터 계약 TODO 추가`
  - `2026-06-22 b01db52e [작성자 비공개] fix: DRD 약물 경고 상태 복원`
  - `2026-06-22 184ead86 [작성자 비공개] fix: DRD 약물 경고 렌더링 보강`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `DRD clinical background, current medications, SMILES, and medication warnings`.

## R-17b578fa8ddf 오프리메드 · DRD simulation condition, play payload, and result dashboard mapping

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies.
  - Need diff check if later synthesis distinguishes DRD-only work from shared DRD/TRP result code.

작업 기간:
2026-03-08 to 2026-06-16

원문 작업 설명:

- Worked on DRD simulation condition save payloads and play request/response shape.
  - Mapped DRD/TRP play overview responses into shared simulation-result dashboard components.
  - Removed fallback behavior from DRD payload generation.
  - Added tests for simulation-condition payload and result mappers.

변경 파일·영역:
`src/components/drd/simulation-condition/drd-simulation-condition-controller.tsx`, `src/components/drd/simulation-result/page-content.tsx`, `src/lib/drd/simulation-condition-payload.ts`, `src/lib/drd/simulation-result-mapper.ts`, `src/services/drd-service.ts`, `src/services/types/simulation-play-service.types.ts`, `src/components/simulation-result/simulation-result-dashboard.tsx`

커밋 근거:

- `2026-03-08 ce9f4644 [작성자 비공개] fix: DRD simulation play request 스키마 정리`
  - `2026-03-08 cd278fb3 [작성자 비공개] fix: DRD simulation condition save payload 스키마 정리`
  - `2026-03-08 c0ee09b3 [작성자 비공개] fix: DRD simulation play 호출 복구`
  - `2026-03-20 6cf2c5b3 [작성자 비공개] feat: DRD TRP 시뮬레이션 실데이터 연동`
  - `2026-04-22 dd11b749 [작성자 비공개] fix: DRD 시뮬레이션 ML 페이로드 연동`
  - `2026-04-22 831574a9 [작성자 비공개] fix: DRD play 응답 스키마 갱신`
  - `2026-06-01 d4efd01e [작성자 비공개] feat: DRD TRP play 오버뷰 응답 반영`
  - `2026-06-16 487712c2 [작성자 비공개] fix: DRD payload fallback 제거`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `DRD simulation condition, play payload, and result dashboard mapping`.

## R-b7b0cc19f579 오프리메드 · DRD high-risk subgroup, refine cutoffs, and subgroup table behavior

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies.
  - Some duplicated/reapplied commits exist around March subgroup work; avoid double counting in later synthesis.

작업 기간:
2026-03-04 to 2026-06-12

원문 작업 설명:

- Added and iterated DRD high-risk subgroup data list/save behavior.
  - Adjusted cutoff rendering, payload schema, table display, and missing `set_name` response handling.
  - Added refine-cutoff page behavior in DRD flow.
  - Multiple commits are UI alignment fixes rather than new service functions.

변경 파일·영역:
`src/app/drd/high-risk-subgroup/page.tsx`, `src/app/drd/(default-setting-flow)/high-risk-subgroup/page.tsx`, `src/components/refine-cutoffs/refine-cutoffs-page-content.tsx`, `src/components/drd/*`, `src/lib/drd/*`, `src/services/drd-service.ts`, `src/services/types/drd-service.types.ts`

커밋 근거:

- `2026-03-04 a7a0b998 [작성자 비공개] feat: drd/high-risk-subgroup 페이지 데이터 리스트 적용`
  - `2026-03-06 6fd79cf4 [작성자 비공개] feat: high-risk-subgroup 저장 api 호출 복구`
  - `2026-03-06 e89e32e8 [작성자 비공개] fix: high-risk-subgroup cutoff 렌더링 및 payload 스키마 보정`
  - `2026-03-19 25c09ef6 [작성자 비공개] fix: drd high-risk subgroup grafy UI 동기화`
  - `2026-04-21 fb29c739 [작성자 비공개] feat: DRD 서브그룹 설정 UI 정리`
  - `2026-04-21 8c415207 [작성자 비공개] feat: DRD 서브그룹 목록 응답 반영`
  - `2026-04-21 90621c4d [작성자 비공개] feat: DRD 리파인 컷오프 페이지 추가`
  - `2026-06-12 5399abd5 [작성자 비공개] fix: DRD subgroup set_name 누락 응답 처리`
  - `2026-06-12 7d0ff801 [작성자 비공개] fix: DRD subgroup 테이블 비율 정렬`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `DRD high-risk subgroup, refine cutoffs, and subgroup table behavior`.

## R-c47ccb1ba6da 오프리메드 · TRP patient definition, baseline features, treatment info, and Swagger APIs

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies.
  - Later resume pass should separate patient-definition work from simulation-setting work if space allows.

작업 기간:
2026-03-20 to 2026-06-11

원문 작업 설명:

- Connected TRP patient list, patient info, treatment info, medication list, baseline feature metadata, and simulation-setting API paths.
  - Refactored TRP views and service types to Swagger-aligned contracts.
  - Added tests around baseline feature metadata and treatment timeline hydration.
  - Adjusted disease-specific baseline/medication behavior after initial API wiring.

변경 파일·영역:
`src/app/trp/(setup-flow)/patient-definition/page.tsx`, `src/app/trp/(setup-flow)/patient-definition/medications/page.tsx`, `src/app/trp/(setup-flow)/patient-definition/treatment-info/page.tsx`, `src/components/trp/trp-data-load-modal.tsx`, `src/lib/trp/patient-baseline-feature-metadata.ts`, `src/lib/trp/medication-info-api.ts`, `src/lib/trp/treatment-info-api.ts`, `src/services/trp-service.ts`, `src/services/types/trp-service.types.ts`

커밋 근거:

- `2026-03-20 614da1f1 [작성자 비공개] feat: TRP 환자 목록과 환자 정보 저장 연동`
  - `2026-03-20 acb2b173 [작성자 비공개] feat: TRP 치료 정보와 시뮬레이션 설정 API 연동`
  - `2026-04-24 7b841f2d [작성자 비공개] refactor: switch trp views to swagger apis`
  - `2026-04-24 bdd94803 [작성자 비공개] refactor: align trp api contracts to swagger`
  - `2026-04-27 a92a7e96 [작성자 비공개] feat: TRP 약물 목록 API 연결`
  - `2026-04-29 d8474777 [작성자 비공개] feat: TRP baseline feature API 연결`
  - `2026-05-29 60577a4e [작성자 비공개] fix: TRP baseline feature 질병 ID 요청 반영`
  - `2026-06-11 a3faef7c [작성자 비공개] fix: TRP treatment timeline hydration 완화`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `TRP patient definition, baseline features, treatment info, and Swagger APIs`.

## R-9c41c4adf322 오프리메드 · TRP simulation setting, play/result mapping, and state restoration

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies.
  - Check whether fallback introduced on 2026-03-20 was fully removed later before presenting as final behavior.

작업 기간:
2026-03-20 to 2026-06-11

원문 작업 설명:

- Added TRP simulation setting save flow and validation logic.
  - Moved TRP result display toward play-response-based mapping and outcome ordering.
  - Worked on treatment timeline normalization/hydration and state restoration.
- later 동일 기간 후속 commits include no-fallback/API-response alignment.

변경 파일·영역:
`src/app/trp/(simulation-flow)/simulation-setting/view-summary/page.tsx`, `src/components/trp/simulation-setting/trp-simulation-setting-controller.tsx`, `src/lib/trp/simulation-setting-api.ts`, `src/lib/trp/simulation-play-mapper.ts`, `src/lib/trp/status-manage.ts`, `src/services/types/trp-dashboard.types.ts`, `src/components/simulation-result/simulation-result-dashboard.tsx`

커밋 근거:

- `2026-03-20 28f8b07e [작성자 비공개] feat: TRP 시뮬레이션 설정 저장 연동`
  - `2026-03-20 c695f7c9 [작성자 비공개] feat: TRP 시뮬레이션 설정 화면 DRD 스타일 반영`
  - `2026-03-20 d3aedc0c [작성자 비공개] feat: TRP 시뮬레이션 결과 fallback 처리`
  - `2026-03-24 a9eb243e [작성자 비공개] fix: TRP 시뮬레이션 설정 검증 조건 정리`
  - `2026-04-30 18e15f4d [작성자 비공개] fix: TRP 결과 화면 play 응답 기준으로 전환`
  - `2026-04-30 a8296eb8 [작성자 비공개] fix: TRP 결과 outcome 기준 응답으로 정렬`
  - `2026-06-01 d4efd01e [작성자 비공개] feat: DRD TRP play 오버뷰 응답 반영`
  - `2026-06-09 7d595155 [작성자 비공개] fix: TRP 시뮬레이션 검증 기준 통합`
  - `2026-06-10 ab7249c2 [작성자 비공개] fix: TRP treatment timeline 정규화`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `TRP simulation setting, play/result mapping, and state restoration`.

## R-5947c0dc28b1 오프리메드 · SUB report v2, DRD-to-SUB bootstrap, and SUB fallback cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Confirm exact ownership for design-gap docs versus code changes.

작업 기간:
2026-05-28 to 2026-06-18

원문 작업 설명:

- Added DRD-to-SUB bootstrap service contract and wired SUB report v2 service/mapper/page components.
  - Removed remaining SUB report v1 code.
  - Removed ATS/SUB response fallback behavior in shared fallback audit work.
  - Updated SUB route CTA/button consistency and added design-gap docs for TRP/SUB.

변경 파일·영역:
`src/app/sub/[feature]/report/page.tsx`, `src/app/sub/subgroup-selection/page.tsx`, `src/app/sub/subgroup-explain/page.tsx`, `src/app/sub/subgroup-setting/page.tsx`, `src/components/sub/report/*`, `src/lib/sub-report-v2.ts`, `src/services/subgroup-service.ts`, `src/services/types/subgroup-service.types.ts`, `src/services/drd-service.ts`, `src/services/types/drd-service.types.ts`

커밋 근거:

- `2026-05-28 9085d64c [작성자 비공개] feat: DRD SUB 부트스트랩 API 추가`
  - `2026-05-29 935476b2 [작성자 비공개] fix: DRD to SUB 부트스트랩 계약 반영`
  - `2026-06-11 23f6cd75 [작성자 비공개] fix: SUB report v2 계약 함수 추가`
  - `2026-06-11 3aad8333 [작성자 비공개] fix: SUB report v2 매퍼 추가`
  - `2026-06-11 112cc744 [작성자 비공개] feat: SUB report v2 화면 연결`
  - `2026-06-11 08c397ea [작성자 비공개] refactor: SUB report v1 잔여 코드 제거`
  - `2026-06-16 0fd94bca [작성자 비공개] fix: ATS/SUB 응답 fallback 제거`
  - `2026-06-18 24544f14 [작성자 비공개] fix: SUB 하단 CTA 버튼 통일`
  - `2026-06-10 c876e353 [작성자 비공개] docs: TRP SUB 디자인 정합성 보고서 추가`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `SUB report v2, DRD-to-SUB bootstrap, and SUB fallback cleanup`.

## R-eae14d5f92f1 오프리메드 · ATS filter flow, status-managed simulation setup, and disease severity API

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Separate codex-assisted versus 동일 기간 후속 claims in final synthesis.
  - 동일 기간 후속 ownership caveat applies.

작업 기간:
2026-04-06 to 2026-06-18

원문 작업 설명:

- Added ATS filter flow, service types, simulation setup validation, and status-managed cache/save behavior.
  - Added disease severity list query and preserved/restored severity values in ATS flow.
  - Codex-assisted commits are prominent in the early ATS filter/service setup.
  - 동일 기간 후속 commits later split step-flow responsibilities and added validation/severity fixes.

변경 파일·영역:
`src/app/ats/filter/page.tsx`, `src/app/ats/patients-summary/page.tsx`, `src/app/ats/simulation/page.tsx`, `src/components/ats/left-panel.tsx`, `src/components/ats/right-panel.tsx`, `src/hooks/use-disease-severity-list-query.ts`, `src/lib/ats/constants.ts`, `src/lib/ats/simulation-settings-validation.ts`, `src/services/ats-service.ts`, `src/services/common-service.ts`, `src/services/types/ats-service.types.ts`

커밋 근거:

- `2026-04-06 db563acd [작성자 비공개] feat: ATS 필터 플로우와 전용 서비스 추가`
  - `2026-04-07 3e5f73ed [작성자 비공개] feat: ATS status-manage 저장과 캐시 흐름 추가`
  - `2026-04-08 b0418486 [작성자 비공개] feat: ATS 3군 설계 옵션 추가`
  - `2026-04-08 231c47d5 [작성자 비공개] fix: ATS 기본 데이터 조회에 service_type 추가`
  - `2026-05-13 3ed105c1 [작성자 비공개] refactor: ATS step flow 역할별 분리`
  - `2026-06-08 060c6eb4 [작성자 비공개] feat: ATS 시뮬레이션 입력 검증 추가`
  - `2026-06-18 9fb3d0d9 [작성자 비공개] feat: ATS 질병 중증도 API 연동`
  - `2026-06-18 1bf229cb [작성자 비공개] fix: ATS severity 저장값 보존`
  - `2026-06-18 b3109c73 [작성자 비공개] fix: ATS severity 복원 경로 보강`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `ATS filter flow, status-managed simulation setup, and disease severity API`.

## R-37ae4d4975e0 오프리메드 · ATS report charts, fullscreen UI, file download, and sample-size display

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies.
  - If later synthesis claims charting expertise, inspect final chart implementations for exact library usage.

작업 기간:
2026-03-06 to 2026-06-18

원문 작업 설명:

- Migrated ATS simulation/report UI toward Grafy/Figma design references.
  - Added report appendix, fullscreen chart portal/modal behavior, and file download linkage.
  - Adjusted chart tooltips, toggles, sample-size comparison basis, and chart components shared with ATS report.
  - Some chart files were historical route-local files and later moved into shared chart components.

변경 파일·영역:
`src/app/ats/simulation/report/page.tsx`, historical `src/app/ats/simulation/report/charts/*`, `src/components/charts/*`, `src/components/ui/fullscreen-echart-portal.tsx`, `src/components/ui/fullscreen-chart-modal.tsx`, `src/components/ats/right-panel.tsx`

커밋 근거:

- `2026-03-06 345e26e2 [작성자 비공개] feat: ATS 시뮬레이션/리포트 grafy 디자인 이관`
  - `2026-04-07 d530263b [작성자 비공개] feat: ATS report appendix와 fullscreen UI 추가`
  - `2026-04-08 dc62710c [작성자 비공개] fix: ATS fullscreen 차트 레이아웃 정리`
  - `2026-04-08 434b60ad [작성자 비공개] fix: ATS report appendix UI 정리`
  - `2026-04-24 907ef33a [작성자 비공개] fix: ATS 리포트 파일 다운로드 연결`
  - `2026-05-18 aa7bf237 [작성자 비공개] fix: ATS 결과 차트와 토글 정합화`
  - `2026-06-11 395b6808 [작성자 비공개] fix: ATS 차트 툴팁 피그마 정합화`
  - `2026-06-18 20766553 [작성자 비공개] fix: ATS Sample Size Control 비교 기준 수정`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `ATS report charts, fullscreen UI, file download, and sample-size display`.

## R-9da7ffdd0882 오프리메드 · TSI report, subgroup explain/selection, refine cutoffs, and chart API wiring

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 appears in later mapping fixes.
  - Check old `subgroupService.ts` naming versus later `subgroup-service.ts` if normalizing paths.

작업 기간:
2026-02-24 to 2026-04-10

원문 작업 설명:

- Initial TSI work connected report, subgroup explain/selection, refine-cutoffs, and chart components to APIs and mock-to-real data paths.
  - Added response schema handling and chart component splits for TSI report panels.
  - Migrated multiple TSI screens to Grafy layout/design references.
  - Later 동일 기간 후속 commits generalized TSI report mapping behavior.

변경 파일·영역:
`src/app/tsi/[feature]/report/page.tsx`, `src/app/tsi/refine-cutoffs/page.tsx`, `src/app/tsi/subgroup-explain/page.tsx`, `src/app/tsi/subgroup-selection/page.tsx`, `src/components/charts/*`, `src/components/charts/tsi-report/*`, `src/services/subgroupService.ts`, `src/lib/fetcher.ts`

커밋 근거:

- `2026-02-24 400a666b [작성자 비공개] feat: report mock data 생성 및 report page chart에 적용`
  - `2026-02-24 4368faa7 [작성자 비공개] feat: chart components 추가`
  - `2026-02-25 f6c7f6b6 [작성자 비공개] feat: Target Subgroup Identification api 적용 및 컷오프 케이스 추가, 컴포넌트 분리, 응답 스키마 정의`
  - `2026-02-25 d6533844 [작성자 비공개] feat: subgroup-explain api적용 및 차트 연결`
  - `2026-02-26 6389f712 [작성자 비공개] feat: report 페이지 데이터 연결`
  - `2026-02-26 ba009284 [작성자 비공개] feat: report 페이지 상수값 정리 내부 컴포넌트 분리`
  - `2026-03-06 7a166797 [작성자 비공개] feat: TSI 데이터 설정/필터/환자 요약 grafy 디자인 이관`
  - `2026-03-06 9781ce3d [작성자 비공개] feat: TSI subgroup explain/refine cutoffs grafy 디자인 이관`
  - `2026-03-07 40216457 [작성자 비공개] fix: TSI report grafy 레이아웃과 차트 표현 정렬`
  - `2026-04-10 2df0ee29 [작성자 비공개] refactor: TSI 리포트 overview 섹션 탐색 일반화`
  - `2026-04-10 658e2a10 [작성자 비공개] fix: TSI 리포트 리스크 차트 매핑 일반화`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `TSI report, subgroup explain/selection, refine cutoffs, and chart API wiring`.

## R-6dd68ecf5855 오프리메드 · Status-manage cache, current step, saved simulation resume, and step save hooks

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies for 2026-06-22 router fixes.

작업 기간:
2026-03-30 to 2026-06-22

원문 작업 설명:

- Added status-manage service contracts, store/cache helpers, fetcher cache proxy, and current-step URI normalization.
  - Wired status saving and step info into ATS/DRD/SUB/TRP/TSI routes and report-entry flows.
  - Added hooks/tests for step info and status-manage router behavior.
  - Later commits fixed restore-field persistence and duplicate save prevention.

변경 파일·영역:
`src/services/status-manage-service.ts`, `src/services/types/status-manage-service.types.ts`, `src/store/status-manage-store.ts`, `src/lib/status-manage-cache-proxy.ts`, `src/lib/status-manage-current-step.ts`, `src/lib/status-manage-save.ts`, `src/hooks/use-status-manage-step-info.ts`, `src/hooks/use-status-manage-router.ts`, multiple `src/app/{ats,drd,sub,trp,tsi}/...` pages

커밋 근거:

- `2026-03-30 3ff52fbe [작성자 비공개] feat: 상태관리 상세 조회와 저장 계약 추가`
  - `2026-04-01 5aa41bb8 [작성자 비공개] refactor: status-manage 엔티티와 서비스 계약 정리`
  - `2026-04-01 e263c3e7 [작성자 비공개] refactor: status-manage 캐시 헬퍼 추가`
  - `2026-04-01 80d2aa6e [작성자 비공개] feat: status-manage fetcher 캐시 프록시 연결`
  - `2026-04-01 ee340a88 [작성자 비공개] feat: status-manage 캐시와 TSI 흐름 정리`
  - `2026-04-02 b9547f01 [작성자 비공개] feat: report 진입 전 status-manage 저장 보장`
  - `2026-04-08 551996dc [작성자 비공개] refactor: current_step URI 기준 저장으로 정리`
  - `2026-05-13 c3fb56d7 [작성자 비공개] feat: 제출 완료 step 저장 연동`
  - `2026-05-13 6c727afc [작성자 비공개] feat: status step info 조회 훅 추가`
  - `2026-06-22 ebe6d906 [작성자 비공개] fix: status step 복원 필드 저장 보강`
  - `2026-06-22 c5e83ec0 [작성자 비공개] fix: status step 중복 저장 방지`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Status-manage cache, current step, saved simulation resume, and step save hooks`.

## R-f58f2c755519 오프리메드 · Auth/session bootstrap, local auth environment, HTTPS, and mobile redirect

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Verify whether auth code originated from a separate feature branch with other contributors.
  - 동일 기간 후속 ownership caveat applies for TOP E2E auth fallback.

작업 기간:
2026-03-26 to 2026-04-08

원문 작업 설명:

- Merged auth bootstrap, JWT/fetcher/auth-service/store changes from a login feature branch.
  - Added local auth-cookie/dev environment setup and local HTTPS scripts/docs.
  - Adjusted mobile redirect URL behavior and dev logging/output.
  - Auth also reappears later in TOP E2E setup as test harness fallback/preflight work.

변경 파일·영역:
`src/components/auth/AuthBootstrap.tsx`, `src/lib/auth-jwt.ts`, `src/lib/auth-api-url.ts`, `src/lib/fetcher.ts`, `src/services/auth-service.ts`, `src/services/types/auth-service.types.ts`, `src/store/auth-store.ts`, `src/app/dev/auth-cookie/page.tsx`, `src/app/layout.tsx`, `README.md`, `scripts/setup-local-https.ps1`

커밋 근거:

- `2026-03-26 dadf9d4b [작성자 비공개] feat: merge auth flow updates from feature login`
  - `2026-03-27 513155b5 [작성자 비공개] chore: 로컬 인증 환경 설정 정리`
  - `2026-03-27 d5185f3e [작성자 비공개] chore: 로컬 HTTPS 실행 환경 추가`
  - `2026-04-01 233f68ee [작성자 비공개] fix: 모바일 리다이렉트 URL 분기 변경`
  - `2026-04-02 f39a07b8 [작성자 비공개] refactor: 모바일 리다이렉트와 dev 출력 설정 정리`
  - `2026-04-08 d587c4ef [작성자 비공개] fix: 에러 메시지 영어화 및 서버 message 우선 적용`
  - `2026-06-18 4d8c2b77 [작성자 비공개] test: TOP E2E auth fallback 보완`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Auth/session bootstrap, local auth environment, HTTPS, and mobile redirect`.

## R-ea411791333c 오프리메드 · Deployment, self-hosted runner, demo deploy, Docker/tar load, and dependency hygiene

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies for April deploy commits.
  - Check whether workflows targeted `main`, `dev`, or demo branches before final wording.

작업 기간:
2026-02-25 to 2026-04-14

원문 작업 설명:

- Added Docker/deploy/load scripts, GitHub Actions deploy workflow changes, and self-hosted runner documentation.
  - Added demo deploy workflow/scripts and tar/env handling.
  - Added pre-push build hook and Next.js security patch commit.
  - Work overlaps with local HTTPS/auth setup but is deploy/release oriented.

변경 파일·영역:
`Dockerfile`, `.dockerignore`, `create-tar.sh`, `load.sh`, `demo-load.sh`, `scripts/deploy-release.sh`, `scripts/deploy-release-common.sh`, `scripts/demo-deploy-release.sh`, `.github/workflows/deploy.yml`, `.github/workflows/demo-deploy.yml`, `docs/SELF_HOSTED_RUNNER_DEPLOY_SETUP.md`, `.husky/pre-push`, `package.json`, `package-lock.json`

커밋 근거:

- `2026-02-25 0ecb8ff8 [작성자 비공개] feat: docker 파일 추가`
  - `2026-02-26 496ccb8f [작성자 비공개] feat: 배포 스크립트 추가`
  - `2026-02-27 7bc5c4e2 [작성자 비공개] fix: load 배포 스크립트 수정`
  - `2026-03-23 519d9587 [작성자 비공개] chore: load.sh 파일 생성`
  - `2026-03-23 6bc18c47 [작성자 비공개] chore: 깃 액션 단계 분할`
  - `2026-03-27 d4ce10d1 [작성자 비공개] chore: main 배포 워크플로와 브랜치 전략 정리`
  - `2026-03-31 66900189 [작성자 비공개] chore: 배포 스크립트와 self-hosted runner 문서 정리`
  - `2026-04-09 c7fdccba [작성자 비공개] ci: demo self-hosted 배포 추가`
  - `2026-04-08 00eb7c17 [작성자 비공개] fix: demo tar 배포 env 전달 정리`
  - `2026-04-10 c621230c [작성자 비공개] chore: Next.js 15.5.15 보안 패치 반영`
  - `2026-04-14 58528045 [작성자 비공개] chore: pre-push 빌드 훅 추가`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Deployment, self-hosted runner, demo deploy, Docker/tar load, and dependency hygiene`.

## R-6cad73bc99f8 오프리메드 · Cross-service API contract, Swagger, and no-fallback hardening

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Check backend Swagger versions/dates if later synthesis mentions contract synchronization.

작업 기간:
2026-04-13 to 2026-06-16

원문 작업 설명:

- Audited fallback/dead-code behavior and removed fallback paths across DRD, ATS, SUB, and TOP.
  - Aligned TRP, DRD/SUB, and TOP code with Swagger/API contracts.
  - Added or updated tests for fallback removal in TOP Excel, DRD payloads, ATS result display, and SUB report v2.
- most code removals are 동일 기간 후속.

변경 파일·영역:
`src/app/ats/simulation/page.tsx`, `src/app/drd/(default-setting-flow)/*`, `src/app/trp/(setup-flow)/*`, `src/components/drd/simulation-condition/drd-simulation-condition-controller.tsx`, `src/components/sub/report/page-content.tsx`, `src/lib/ats/simulation-result-display.ts`, `src/lib/drd/simulation-condition-payload.ts`, `src/lib/sub-report-v2.ts`, `src/lib/top/*`, `src/services/types/*`, `plan/dead-code-fallback-audit-*.md`

커밋 근거:

- `2026-04-13 52d9c9bf [작성자 비공개] fix: API fallback 계약 확인 포인트 정리`
  - `2026-04-24 bdd94803 [작성자 비공개] refactor: align trp api contracts to swagger`
  - `2026-06-09 e1fbf3a1 [작성자 비공개] feat: TOP API 연동 및 목업 제거`
  - `2026-06-09 d64d6654 [작성자 비공개] fix: TOP Excel fallback 제거`
  - `2026-06-10 8d417397 [작성자 비공개] fix: DRD SUB 스웨거 계약 갱신`
  - `2026-06-11 c0eb8ee2 [작성자 비공개] docs: 데드코드 fallback 조사 보고서 추가`
  - `2026-06-16 c27470a1 [작성자 비공개] refactor: DRD task fallback 제거`
  - `2026-06-16 487712c2 [작성자 비공개] fix: DRD payload fallback 제거`
  - `2026-06-16 0fd94bca [작성자 비공개] fix: ATS/SUB 응답 fallback 제거`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Cross-service API contract, Swagger, and no-fallback hardening`.

## R-58166855fd21 오프리메드 · Home/data setting/group-manage task routing and shared screen mapping

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies for later home display commit.
  - Later code may have renamed `subgroupService.ts`/screen files; use historical paths carefully.

작업 기간:
2026-03-19 to 2026-04-20

원문 작업 설명:

- Connected data-setting screens to real data and common disease/group-manage services.
  - Added shared screen-code mapping for TSI/DRD/TRP and task routing/resume behavior from the home simulation table.
  - Scoped disease data lists by service type.
  - Cleaned data-setting flow structure and shared screen libraries.

변경 파일·영역:
`src/components[로컬 경로 비공개]`, `src/components/common/DataSettingScreen.tsx`, `src/services/common-service.ts`, `src/services/group-service.ts`, `src/lib/group-manage-use-data.ts`, `src/lib/screen/*`, `src/lib/trp/screen.ts`, `src/lib/tsi/screen.ts`, `src/app/page.tsx`

커밋 근거:

- `2026-03-19 c5f219ca [작성자 비공개] feat: data setting 실데이터 연동`
  - `2026-03-19 70dcfdc1 [작성자 비공개] refactor: DRD 질환 공통 조회를 common-service로 정리`
  - `2026-03-27 ead4b3af [작성자 비공개] fix: 데이터 선택 시 group-manage task 생성 적용`
  - `2026-03-30 579e690e [작성자 비공개] feat: 공용 화면 코드 매퍼 추가`
  - `2026-03-30 dbdc830f [작성자 비공개] feat: TSI DRD TRP 화면 코드맵 연결`
  - `2026-03-31 512e66c3 [작성자 비공개] refactor: 데이터 설정 흐름과 screen lib 구조 정리`
  - `2026-03-31 ce063b69 [작성자 비공개] fix: 홈 시뮬레이션 시작과 재개 흐름 정리`
  - `2026-04-01 619b99f8 [작성자 비공개] feat: scope disease data list by service type`
  - `2026-04-20 858a474d [작성자 비공개] feat: 홈 메인 화면 서비스 표시 정리`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Home/data setting/group-manage task routing and shared screen mapping`.

## R-503c6c6aa0d5 오프리메드 · Common layout, header, buttons, glass UI, and design-system style consolidation

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 ownership caveat applies.
  - Some button commonization was reverted/reapplied; inspect final diff before using as a major claim.

작업 기간:
2026-03-01 to 2026-06-18

원문 작업 설명:

- Standardized shared buttons, header step/action behavior, layout components, and common simulation UI.
  - Consolidated DRD/TRP/SUB CTA/button styling and glass-icon button patterns.
  - Applied common UI components to TOP after the TOP namespace/workflow was added.
  - Codex-assisted commits participated in cross-service layout cleanup.

변경 파일·영역:
`src/components/layout/*`, `src/components/layout/header/*`, `src/components/ui/*`, `src/components/common/*`, `src/components/drd/*`, `src/components/trp/*`, `src/app/glass-effect-comparison/*`, `src/app/globals.css`, `public/assets/*`

커밋 근거:

- `2026-03-01 fab7a6b8 [작성자 비공개] refactor: 공통 button을 shadcn 패턴(cva/slot)으로 전환`
  - `2026-03-01 b74f44af [작성자 비공개] refactor: 버튼 컴포넌트 적용`
  - `2026-04-01 a092c885 [작성자 비공개] refactor: 헤더 스텝/액션 공통화`
  - `2026-04-01 03c863c5 [작성자 비공개] feat: DRD/TRP 시뮬레이션 공통 UI 컴포넌트 분리`
  - `2026-04-07 b27319dd [작성자 비공개] refactor: ATS/DRD/TSI/TRP 공통 레이아웃 정리`
  - `2026-04-13 733bf4fb [작성자 비공개] refactor: 버튼 공통화 1차 흡수`
  - `2026-04-17 5e206081 [작성자 비공개] refactor: DRD 글래스 아이콘 버튼 공통화`
  - `2026-06-04 610f94d7 [작성자 비공개] refactor: TOP 공통 UI 컴포넌트 적용`
  - `2026-06-18 4c9c13e3 [작성자 비공개] fix: DRD TRP 하단 CTA 버튼 통일`
  - `2026-06-18 24544f14 [작성자 비공개] fix: SUB 하단 CTA 버튼 통일`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Common layout, header, buttons, glass UI, and design-system style consolidation`.

## R-acfec9d46d9f 오프리메드 · Validation docs, Figma mapping, QA reports, and check-task artifacts

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Docs are raw evidence; check whether reports were internal notes or deliverables before resume wording.
  - 동일 기간 후속 ownership caveat applies.

작업 기간:
2026-03-07 to 2026-06-22

원문 작업 설명:

- Produced validation plans/results, Figma route/page mapping, design-gap reports, Grafy migration notes, and E2E runbooks.
  - `49e99912` added saved-simulation E2E results for ATS, DRD, SUB, TOP, and TRP plus TOP E2E script changes.
  - `639656ef` removed `check-tasks` artifacts after earlier check-task/data collection work.
  - Documentation spans planning, validation evidence, design comparison, and task-management cleanup.

변경 파일·영역:
`docs/validation/*`, `docs/*figma-page-link-map-structure-*.md`, `plan/figma-code-gap-audit/*`, `docs/ats-simulation-e2e-*.md`, `docs/trp-patient-definition-validation-test-cases-2026-06-02.md`, `check-tasks/*`, `plan/*`, `docs/superpowers/*`

커밋 근거:

- `2026-03-07 f1ac35be [작성자 비공개] docs: grafy 디자인 이관 작업 규칙 문서 정리`
  - `2026-03-31 d033eb86 [작성자 비공개] docs: grafy QA 결과와 진행 현황 반영`
  - `2026-06-04 79054b71 [작성자 비공개] docs: FE 캐시와 TRP 검증 문서 추가`
  - `2026-06-08 0d36c890 [작성자 비공개] docs: ATS 시뮬레이션 E2E 결과 정리`
  - `2026-06-09 ea5aed5c [작성자 비공개] docs: ATS validation 계획 추가`
  - `2026-06-10 928306b2 [작성자 비공개] docs: Figma 프레임 맵 및 정합성 보고서 추가`
  - `2026-06-10 c876e353 [작성자 비공개] docs: TRP SUB 디자인 정합성 보고서 추가`
  - `2026-06-17 88914d05 [작성자 비공개] docs: TOP deterministic E2E 완료 결과 정리`
  - `2026-06-19 49e99912 [작성자 비공개] chore: 2026-06-19 데이터 수집 전 변경사항 저장`
  - `2026-06-22 4fe4f062 [작성자 비공개] docs: TOP E2E PR 게이트 차단 원인 정리`
  - `2026-06-22 66490eb1 [작성자 비공개] docs: TOP E2E PR gate 제외 사유 추가`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Validation docs, Figma mapping, QA reports, and check-task artifacts`.

## R-09a5e344a1d4 오프리메드 · Codex-assisted cross-service copy/error/status/layout cleanup

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- Treat as assistant-generated or assistant-assisted unless there is external evidence of manual ownership.
  - Some codex-assisted changes are also included in mixed service units above.

작업 기간:
2026-04-02 to 2026-04-08

원문 작업 설명:

- Codex-assisted commits touched cross-service layout, loader, status/current-step, error-message, and service-helper cleanup.
  - `d587c4ef` is broad and touches many routes/services/stores to prefer server messages and English user-facing errors.

변경 파일·영역:
`src/app/ats/*`, `src/app/drd/*`, `src/app/trp/*`, `src/app/tsi/*`, `src/components/common/DataSettingScreen.tsx`, `src/components[로컬 경로 비공개]`, `src/components/layout/header/*`, `src/lib/fetcher.ts`, `src/lib/parse-fetcher-error.ts`, `src/lib/status-manage-save.ts`, `src/services/*`, `src/store/*`

커밋 근거:

- `2026-04-02 5eaeacd4 [작성자 비공개] chore: 상태 저장 충돌 해결`
  - `2026-04-02 4d54f176 [작성자 비공개] fix: play 로더 포털 렌더링 적용`
  - `2026-04-02 8d6e0463 [작성자 비공개] fix: play 취소 시 로더 즉시 종료`
  - `2026-04-07 b27319dd [작성자 비공개] refactor: ATS/DRD/TSI/TRP 공통 레이아웃 정리`
  - `2026-04-07 fcaa7c6d [작성자 비공개] refactor: 서비스 공통 헬퍼 정리`
  - `2026-04-08 551996dc [작성자 비공개] refactor: current_step URI 기준 저장으로 정리`
  - `2026-04-08 d587c4ef [작성자 비공개] fix: 에러 메시지 영어화 및 서버 message 우선 적용`
  - `2026-04-08 9037d371 [작성자 비공개] fix: 업데이트 날짜 문구 표기 통일`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Codex-assisted cross-service copy/error/status/layout cleanup`.

## R-66df3115ee95 오프리메드 · Code hygiene, unused artifact removal, package/security cleanup, and worktree hygiene

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이전 수집본의 추가 커밋·세부 설명이며 all-branches 작업과 겹친다. 별도 성과로 합산하지 않는다.

- 동일 기간 후속 and codex-assisted ownership caveats apply.
  - Do not frame artifact removal as product feature work.

작업 기간:
2026-03-02 to 2026-06-22

원문 작업 설명:

- Removed unused libraries, images, docs, app API proxies, packages, and generated/check-task artifacts.
  - Added ignore handling for check-task output.
  - Added type-safety cleanup around `any` removal and package/security version updates.
  - Overlaps with fallback audit and deployment/package hygiene.

변경 파일·영역:
`.gitignore`, `package.json`, `package-lock.json`, `.husky/pre-push`, `check-tasks/*`, `issue/*`, `public/assets/*`, `docs/*`, route/component files affected by dead-code cleanup

커밋 근거:

- `2026-03-02 0d3e23ff [작성자 비공개] chore: any 타입 강제 제거`
  - `2026-03-02 908aa0a6 [작성자 비공개] refactor: 미사용 라이브러리 정리 및 보안 사항 안전 버전으로 업데이트`
  - `2026-04-07 b4979f93 [작성자 비공개] chore: 미사용 app api 프록시 정리`
  - `2026-04-07 abb5fe7f [작성자 비공개] chore: 미사용 이미지 리소스 정리`
  - `2026-04-10 40c37611 [작성자 비공개] chore: 미사용 이미지와 플랜 문서 정리`
  - `2026-04-15 efa7e947 [작성자 비공개] chore: 미사용 코드와 패키지 정리`
  - `2026-06-11 c0eb8ee2 [작성자 비공개] docs: 데드코드 fallback 조사 보고서 추가`
  - `2026-06-22 68b0bfaf [작성자 비공개] chore: check-tasks 디렉토리 ignore 추가`
  - `2026-06-22 639656ef [작성자 비공개] chore: 작업 산출물 디렉토리 제거`

원본: `docs/raw/oprimed-work-units-2026-06-23/optivis-nexus-fe-raw-work-units.md` · `Code hygiene, unused artifact removal, package/security cleanup, and worktree hygiene`.

## R-a15b36eb936d 오프리메드 · Build-time static image generation, validation, and conditional pre-push gate

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 공개 이력서의 상한값 96.7%와 committed size report의 96.8%는 측정 snapshot이 다르므로, 다음 이력서 갱신 때 같은 manifest 기준으로 다시 계산한다.
  - network scenario는 실제 사용자 전체 전송량이 아니라 viewport와 DPR에 따라 선택될 후보를 가정한 추정치다.

작업 기간:
2026-06-24 to 2026-07-09

원문 작업 설명:

- 수작업 WebP 변환이 아니라 후보 발견, 선별, 생성, 증분 재생성, 사용 규칙, push, Docker 배포 검증을 하나의 빌드 흐름으로 연결했다.
  - 작은 이미지까지 무조건 변환하지 않고 원본 크기와 예상 절감량을 기준으로 제외할 수 있게 했다.

원문 결과와 측정 조건:

- committed size report 기준 후보 원본 12개 중 10개를 WebP 대상으로 선택하고 19개 산출물을 생성했다.
  - network scenario는 원본 4.12 MB 대비 136.0-228.1 KB로 추정되어 94.6-96.8% 절감으로 기록됐다.
  - 입력과 정책이 같으면 기존 WebP를 재사용하고, artifact key 또는 output hash가 달라진 파일만 다시 생성한다.
  - 이미지 파일·사용처·정책 변경이 있을 때만 pre-push에서 이미지 검증을 실행한다.
  - Docker 배포 스크립트는 새 이미지 안의 생성 산출물과 hash를 확인한 뒤 컨테이너 교체를 진행한다.

변경 파일·영역:

- `scripts/generate-static-images.mjs`
  - `scripts/static-image-artifact-state.mjs`
  - `scripts/check-static-image-usage.mjs`
  - `scripts/report-static-image-savings.mjs`
  - `scripts/deploy-release-common.sh`
  - `src/lib/static-images/*`
  - `.husky/pre-push`
  - `package.json`

근거 파일:

- `oprimed/optivis-nexus-fe/docs/validation/build-time-image-optimization-size-report-2026-06-23.md`
  - `oprimed/data/llm-wiki/Projects/optivis-nexus-fe/decisions/2026-06-23-build-time-image-optimization-policy.md`

커밋 근거:

- `2026-06-24 87756a9c [작성자 비공개] feat: WebP 산출물 hash metadata 검증 추가`
  - `2026-06-25 71566596 [작성자 비공개] docs: WebP 구현 결과 문서 추가`
  - `2026-06-29 99474102 [작성자 비공개] fix: 이미지 최적화 명령 흐름 명확화`
  - `2026-07-09 be9f321b [작성자 비공개] ci: 이미지 검증을 프리푸시 조건부 실행`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-incremental-and-quantified-evidence-2026-07-13.md` · `Build-time static image generation, validation, and conditional pre-push gate`.

## R-15f3a72319b7 오프리메드 · ATS real API migration, task-keyed cache, and result restoration

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 실제 API 전환 범위와 이후 제거된 fallback을 최종 브랜치에서 다시 대조한 뒤 공개 문장으로 승격한다.
  - 화면 구현이나 API 연결 자체보다 작업 간 데이터 격리와 재진입 복구를 경력기술서 근거로 사용한다.

작업 기간:
2026-06-27

원문 작업 설명:

- 목업 중심 분석 화면을 실제 API 응답과 요청 schema에 연결했다.
  - 다른 분석 작업의 데이터가 섞이지 않도록 캐시와 복구 기준을 task identity에 맞췄다.
  - 새로고침 후에도 결과 데이터와 적용한 분석 조건을 다시 복원하도록 result/report 경로를 보강했다.
  - 조건 파싱과 적용 기준을 별도 함수와 테스트로 분리했다.

변경 파일·영역:

- `src/app/ats/simulation/page.tsx`
  - `src/app/ats/simulation/result/page.tsx`
  - `src/app/ats/simulation/report/page.tsx`
  - `src/app/ats/filter/page.tsx`
  - `src/services/ats-service.ts`
  - `src/services/types/ats-service.types.ts`
  - `src/store/simulation-store.ts`
  - `src/lib/ats/*`

커밋 근거:

- `2026-06-27 7b0d3abc [작성자 비공개] feat: ATS v1 API 연동`
  - `2026-06-27 b198d6eb [작성자 비공개] fix: ATS 결과 새로고침 데이터 복구`
  - `2026-06-27 5526e571 [작성자 비공개] fix: ATS API 캐시 task 기준 갱신`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-incremental-and-quantified-evidence-2026-07-13.md` · `ATS real API migration, task-keyed cache, and result restoration`.

## R-daeceb1252e9 오프리메드 · Shared HTML-to-PDF download module

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 테스트 코드 줄 수는 성과 수치로 사용하지 않는다.
  - 공개 이력서보다 경력기술서의 공통 출력 기능 사례로 적합하다.

작업 기간:
2026-07-06

원문 작업 설명:

- 분석 서비스마다 중복된 HTML 캡처와 PDF 다운로드 처리를 공통 모듈로 이동했다.
  - 서비스별 모듈은 대상과 파일명 설정만 맡고, 이미지 변환·페이지 분할·다운로드 처리는 공통 경로가 담당하게 했다.
  - 공통 모듈에 245줄 규모의 단위 테스트 파일을 추가했다.

변경 파일·영역:

- `src/lib/html2pdf.ts`
  - `src/lib/html2pdf.test.ts`
  - `src/lib/ats/ats-pdf-download.ts`
  - `src/lib/top/top-pdf-download.ts`

커밋 근거:

- `2026-07-06 807d50ff [작성자 비공개] refactor: HTML PDF 다운로드 공통화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-incremental-and-quantified-evidence-2026-07-13.md` · `Shared HTML-to-PDF download module`.

## R-8c7e83573c7a 오프리메드 · Shared data-setting upload panel

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 공통화된 실제 제품 화면 수를 최종 브랜치 기준으로 확인하기 전에는 정량 성과로 쓰지 않는다.
  - 단독 대표 항목보다 공통 UI 전환의 하위 근거로 사용한다.

작업 기간:
2026-07-09

원문 작업 설명:

- 기존 데이터 설정 화면 내부에 있던 업로드 UI와 동작을 공통 패널로 분리했다.
  - 새 분석 서비스 화면에서 같은 업로드 경로를 재사용할 수 있게 하고, 기존 화면의 중복 구현을 줄였다.

변경 파일·영역:

- `src/components/common/data-setting-upload-panel.tsx`
  - `src/components/common/data-setting-screen.tsx`
  - `src/components[로컬 경로 비공개]`
  - shared select/radio/checkbox/tooltip primitives

커밋 근거:

- `2026-07-09 1314448a [작성자 비공개] refactor: 데이터 설정 업로드 패널 공통화`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-incremental-and-quantified-evidence-2026-07-13.md` · `Shared data-setting upload panel`.

## R-6eb47cb0bbee 오프리메드 · Shared unexpected-server-error parsing and regression coverage

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 일반적인 에러 처리 작업이므로 단독 대표 항목으로 사용하지 않는다.
  - 여러 분석 화면에서 같은 실패 정책을 사용한다는 근거가 필요할 때만 하위 사례로 연결한다.

작업 기간:
2026-06-29

원문 작업 설명:

- fetcher와 화면마다 달라질 수 있던 예상 밖 서버 응답의 파싱과 사용자 메시지를 공통 경로로 모았다.
  - JSON이 아닌 응답, 예상하지 못한 shape와 우회 경로를 테스트에 추가했다.

변경 파일·영역:

- `src/lib/fetcher.ts`
  - `src/lib/parse-fetcher-error.ts`
  - `src/lib/unexpected-server-error.ts`
  - `src/components/ui/error-modal.tsx`
  - related tests

커밋 근거:

- `2026-06-29 08fae4de [작성자 비공개] fix: 예기치 못한 오류 문구 공통화`
  - `2026-06-29 fc7550e9 [작성자 비공개] test: 예기치 못한 오류 응답 케이스 보강`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-incremental-and-quantified-evidence-2026-07-13.md` · `Shared unexpected-server-error parsing and regression coverage`.

## R-82a6bf2ae85d 오프리메드 · Shared UI primitives and styling migration

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 색상 전환은 exact-match 중심의 1차 작업이며 차트, 복합 SVG와 non-exact 색상은 남았다.
  - Lighthouse 비교는 서로 다른 배포 환경의 사용자 제공 캡처이므로 동일 환경 반복 측정은 아니다.
  - UI 관련 여러 수치를 한 이력서 문장에 모두 나열하지 않고, 지원 포지션에 맞는 한두 개만 선택한다.

원문 작업 설명:
기존 작업의 보강 근거이며 독립 성과로 중복 합산하지 않는다.

원문 결과와 측정 조건:

- direct hex 색상 사용 529건을 기존 Tailwind token utility로 전환했다.
  - public/src의 정적 SVG 파일 34개를 제거하고 코드 기반 `Icon` registry로 전환했다.
  - legacy button import 25건과 broad reference 69건을 제거했다.
  - 제품 화면 5곳의 토글을 공통 `Toggle` 경로로 옮기고 중복 구현 3개를 제거·흡수했다.
  - 이미지 기반 glass frame 3개와 322,141 bytes의 runtime PNG payload를 제거했다.
  - 사용자 제공 Lighthouse 비교 기준 Performance 88에서 98, LCP 1.3초에서 1.0초, Speed Index 3.4초에서 0.7초로 기록됐다.

근거 파일:

- `oprimed/data/llm-wiki/Projects/optivis-nexus-fe/result-reports/2026-05-19-color-code-refactor.md`
  - `oprimed/data/llm-wiki/Projects/optivis-nexus-fe/result-reports/2026-05-19-icon-component-unification.md`
  - `oprimed/data/llm-wiki/Projects/optivis-nexus-fe/result-reports/2026-05-19-button-unification.md`
  - `oprimed/data/llm-wiki/Projects/optivis-nexus-fe/result-reports/2026-05-19-toggle-unification.md`
  - `oprimed/data/llm-wiki/Projects/optivis-nexus-fe/result-reports/2026-05-22-glass-container-migration.md`

연결 작업:

- `Shared select/radio/checkbox/button/icon/toggle component consolidation`
  - `Glass surface/container migration and comparison routes`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-incremental-and-quantified-evidence-2026-07-13.md` · `Shared UI primitives and styling migration`.

## R-cca889d12063 코드크레용 · Subtitle translation operating impact

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 성과 수치는 운영 로그나 별도 측정 파일이 아니라 사용자 확인에 근거한다.
  - `90%`, `10배`, `6-8개`는 서로 다른 성과를 중복 합산한 수치가 아니며 같은 운영 변화의 다른 관점이다.

원문 작업 설명:
기존 작업의 보강 근거이며 독립 성과로 중복 합산하지 않는다.

사용자 확인 결과:

- 반복 번역 업무에 투입되는 팀 리소스를 90% 이상 줄였다.
  - 기존 작업 대비 생산성을 약 10배 높였다.
  - 운영자가 하루 6-8개 작품을 처리할 수 있는 흐름을 만들었다.

Git 근거 구현:

- 자막을 청크로 나누고 병렬로 요청했다.
  - 실패 재요청과 반복 횟수 제한을 적용했다.
  - 자막 개수, 누락, 시간축과 결과 shape를 검증했다.
  - CLI 작업을 파일 업로드, 프롬프트, 캐릭터 매칭, 검수와 VTT 다운로드가 가능한 웹 도구로 확장했다.

연결 작업:

- `Converter Bedrock AI subtitle translator`
  - `AI subtitle translation validation and iteration controls`
  - `Advanced subtitle translation UI and direct VTT download`
  - `Chunked prompt generation and fixed JSON output shape`
  - `Parallel batch processing and retry loop tuning`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/code-crayon-evidence-supplement-2026-07-13.md` · `Subtitle translation operating impact`.

## R-9c893e857df4 코드크레용 · Freebooting search operating impact

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 시간 절감 수치는 사용자 확인에 근거한다.
  - 봇 차단을 우회했다고 표현하지 않고, 브라우저 직접 호출을 서버 실행 구조로 옮긴 사실만 사용한다.

원문 작업 설명:
기존 작업의 보강 근거이며 독립 성과로 중복 합산하지 않는다.

사용자 확인 결과:

- 매일 약 50분 걸리던 무단 도용 콘텐츠 확인을 10분 이내로 줄였다.
  - Bilibili TV, Bilibili와 Dailymotion 3개 플랫폼을 한 화면에서 확인했다.

Git 근거 구현:

- 브라우저에서 직접 호출할 때 발생한 차단과 실행 제약을 피하기 위해 Express/Node.js 서버에서 검색했다.
  - 키워드를 묶어 요청하고 유사 제목을 필터링했다.
  - Vercel Serverless Functions 배포 구조로 전환했다.

연결 작업:

- `Express crawler/API/UI scaffold for freebooting search`
  - `Dailymotion crawler API and crawler documentation cleanup`
  - `Search API filtering and keyword batching`
  - `Browser UI for platform tabs, keyword storage, and result display`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/code-crayon-evidence-supplement-2026-07-13.md` · `Freebooting search operating impact`.

## R-a48142ea8acd 코드크레용 · Mobile WebView browser compatibility and lifecycle handling

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- WebKit fallback, safe area와 lifecycle 처리는 코드로 확인된다.
  - Samsung Internet 테마와 Safari 포커스 대응의 구체적인 수정 커밋은 현재 검색으로 분리하지 못했으므로 사용자 확인 범위로 유지한다.

원문 작업 설명:
기존 작업의 보강 근거이며 독립 성과로 중복 합산하지 않는다.

코드 근거 구현:

- `env(safe-area-inset-bottom)`과 WebKit user-select/touch-callout 처리를 적용했다.
  - Web Audio API에서 `webkitAudioContext` fallback을 사용했다.
  - `visibilitychange`에서 화면 이탈 시 오디오와 게임 상태를 멈추거나 초기화하고 복귀 시 상태를 다시 맞췄다.
  - `window.flutter_inappwebview.callHandler`로 공유, 알림, 화면 이동, 광고, 진동과 프로필 갱신 이벤트를 앱에 전달했다.

사용자 확인 맥락:

- Samsung Internet의 다크모드·테마 차이를 대응했다.
  - Safari의 CSS, 오디오 확장자·사용자 상호작용 정책과 포커스 차이를 대응했다.
  - Chrome, Safari와 Samsung Internet을 실제 테스트 대상으로 사용했다.

근거 파일:

- `code-crayon/shortime-playground/src/app/globals.css`
  - `code-crayon/shortime-playground/src/hooks/use-audio.ts`
  - `code-crayon/shortime-playground/src/utils/flutter-method.ts`
  - `code-crayon/shortime-playground/src/domains/games/fly-pop/container/fly-pop.tsx`
  - `code-crayon/shortime-playground/src/domains/games/open-sesame/container/open-sesame.tsx`

연결 작업:

- `Next.js playground bootstrap with shared primitives`
  - `Mobile webview UI shell adjustments`
  - `Fly Pop audio, lifecycle, difficulty, and abuse-prevention tuning`
  - `Open Sesame audio, ad-state, daily-mission, and repeated-click state tuning`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/code-crayon-evidence-supplement-2026-07-13.md` · `Mobile WebView browser compatibility and lifecycle handling`.

## R-da3e1a16430c 코드크레용 · Commerce behavior analytics instrumentation

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 실제 분석 대시보드 활용과 지표 개선 결과는 확인되지 않았으므로 전환율 성과로 확대하지 않는다.

원문 작업 설명:

- 단순 화면 구현 외에 주요 사용자 행동을 제품 지표로 남길 수 있도록 이벤트 taxonomy와 호출 지점을 제품 흐름에 적용했다.

확인 범위:

- 첫 도입 커밋에서 23개 파일을 변경하고 이벤트 모델과 GA4/GTM helper를 추가했다.
  - 상품 조회, 찜, 공유, 검색, 회원가입, 로그인, 구매와 환불 이벤트를 정의했다.
  - 후속 커밋에서 구매 금액, 이벤트 발생 시점과 오류 상태에서의 중복·잘못된 전송을 보정했다.

커밋 근거:

- `2023-08-09 e4719d7c [작성자 비공개] GA4 이벤트 추가 (#163)`
  - `2023-09-14 44e4c5a4 [작성자 비공개] [FIX-565] ga4 금액 차이 수정 (#259)`
  - `2023-09-22 69b301e4 [작성자 비공개] 에러코드 가 없을 때만 ga4 viewItem 추가되도록 수정 (#270)`
  - `2023-11-29 85298a40 [작성자 비공개] gtag 회원가입 클릭 시점 변경 (#366)`

연결 작업:
`GA4 event instrumentation`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/code-crayon-evidence-supplement-2026-07-13.md` · `Commerce behavior analytics instrumentation`.

## R-966eeb97ec08 코드크레용 · Product-card design system and sale-type variants

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 변경 파일 수와 코드 증감은 작업 규모 근거일 뿐 사용자 성과 수치로 사용하지 않는다.

원문 작업 설명:

- 상품별 상태와 판매 방식 차이는 유지하면서 반복 카드 UI와 타이머·라벨 정책을 공통 구조로 옮겼다.

확인 범위:

- 첫 전환에서 28개 파일을 변경해 상품 이미지, 정보, 라벨, 타이머와 provider 구조를 추가했다.
  - 기존 상품 목록, 찜 목록과 셀러샵의 카드 구현을 공통 상품 카드 경로로 옮겼다.
  - 이후 일반 판매, 선착순과 드로우처럼 판매 방식이 다른 카드와 목록을 분리했다.

커밋 근거:

- `2024-01-26 39f75ca0 [작성자 비공개] 상품 카드 디자인 시스템 (#411)`
  - `2024-04-09 e5a9dca7 [작성자 비공개] 판매유형 별 상품 카드 (#520)`

연결 작업:

- `Product card design system`
  - `Sale-type-specific product cards and product listings`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/code-crayon-evidence-supplement-2026-07-13.md` · `Product-card design system and sale-type variants`.

## R-5693162c03fb 코드크레용 · Game bridge, score integrity, and duplicate-input control

원본 기준일: 2026-07-13. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 서버의 점수 검증 알고리즘을 구현한 것으로 표현하지 않는다.
  - 프론트엔드에서 중복 입력과 비정상 응답 이후 상태 전이를 통제한 범위로 한정한다.

원문 작업 설명:
기존 작업의 보강 근거이며 독립 성과로 중복 합산하지 않는다.

확인 범위:

- Phaser 게임 이벤트를 Next.js 화면으로 전달해 점수 제출, 사용자 기록, 주간 랭킹과 보상 상태를 갱신했다.
  - 결과 제출 중에는 중복 입력을 차단하고, 서버가 허용하지 않은 점수 응답에서 화면 상태가 잘못 이어지지 않게 보정했다.
  - Flutter WebView의 광고·진동·화면 이동과 Airbridge 딥링크를 게임·초대 흐름에 연결했다.

커밋 근거:

- `2025-02-17 d56d161 [작성자 비공개] 어뷰징하여 시도 하여 점수 취득시 시 동작 수정`
  - `2025-02-26 b04b8ae [작성자 비공개] 통신하는 동안, 게임 터치 이벤트 무효`
  - `2024-12-11 6151c87 [작성자 비공개] 에어브릿지 적용`
  - `2024-12-12 09e4906 [작성자 비공개] 친구 초대 og 설정`

연결 작업:

- `Fly Pop Phaser game bridge, result submission, ranking, and responsive layout`
  - `Fly Pop audio, lifecycle, difficulty, and abuse-prevention tuning`
  - `Game entry and reward-ad event bridge updates`

원본: `docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/code-crayon-evidence-supplement-2026-07-13.md` · `Game bridge, score integrity, and duplicate-input control`.

## R-37ab82c8d4a2 오프리메드 · AI-assisted development workflow and team engineering standards

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 실제 팀원 사용 횟수, 적용 프로젝트 수, 문서 수, PR review 감소 효과는 별도 확인 전에는 수치로 쓰지 않는다.
  - `AI workflow`는 채용 문서에서는 `AI-assisted development workflow`, `프로젝트 컨텍스트 문서화`, `팀 개발 기준 문서화`로 풀어 쓰는 것이 안전하다.
  - GitHub Actions/PR gate가 지속 운영되었다는 표현은 Actions 로그 확인 전에는 쓰지 않는다.

작업 기간:

- 2026-04-13 to 2026-06-22

사용자 확인:
2026-06-29, Oprimed에서 AI 오인 방지와 팀 재사용을 위한 프로젝트 컨텍스트/개발 기준 문서화를 수행했다고 확인.

원문 작업 설명:

- 도메인 복잡도가 높은 제품에서 AI 기반 개발 보조 도구가 프로젝트 맥락을 오해하거나 잘못된 구현을 제안할 수 있는 문제를 인식했다.
  - 프로젝트별 컨셉 지침, 구현 원칙, 코딩 컨벤션, Pull Request 검토 기준, GitHub 설정/검증 흐름을 문서화했다.
  - 개인 단위의 AI 활용을 팀원이 재사용할 수 있는 개발 보조 워크플로로 확장하는 기반을 만들었다.
  - AI가 만든 결과를 그대로 수용하는 방식이 아니라, 팀 기준과 자동 검증, PR review 기준 안에서 검토할 수 있게 했다.

변경 파일·영역:

- `AGENTS.md`
  - `README.md`
  - `doc/coding-convention.md`
  - `docs/coding-convention.md`
  - `doc/GIT_BRANCH_STRATEGY.md`
  - `docs/GIT_BRANCH_STRATEGY.md`
  - `SETUP_AGENT_GUIDE.md`
  - `.husky/pre-commit`
  - `.husky/pre-push`
  - `.github/workflows/*`
  - `docs/validation/*`
  - `doc/PR_*`
  - `doc/PR_SIDE_EFFECT_REVIEW_*`

커밋 근거:

- `2026-04-13 5c663b1 [작성자 비공개] docs: 구현 원칙 가이드 추가`
  - `2026-04-17 8275830 [작성자 비공개] docs: AGENTS 작업 가이드 추가`
  - `2026-04-28 9268dcf [작성자 비공개] chore: 설정 동기화 템플릿 추가`
  - `2026-04-28 4a6d608 [작성자 비공개] docs: 설정 적용 에이전트 가이드 추가`
  - `2026-04-28 efa95bb [작성자 비공개] refactor: 코딩 컨벤션 정리`
  - `2026-05-08 09cdedf [작성자 비공개] style: 코딩 컨벤션 포맷 정렬`
  - `2026-05-22 3c5732f [작성자 비공개] docs: PR 104 105 재검토 결과 정리`
  - `2026-05-22 7ad41a8 [작성자 비공개] docs: consolidate PR review report`
  - `2026-06-05 258c8c4 [작성자 비공개] docs: 작업공간 경계 규칙 추가`
  - `2026-06-16 6f689020 [작성자 비공개] test: TOP E2E 통합 CLI 추가`
  - `2026-06-18 37e34a80 [작성자 비공개] ci: TOP E2E preview 검증 추가`
  - `2026-06-18 b6bf1e2a [작성자 비공개] ci: TOP E2E PR 실패 코멘트 추가`
  - `2026-06-22 1ecb20b [작성자 비공개] chore: Husky 푸시 훅 빌드 검증으로 정리`

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-ai-workflow-confirmed-work.md` · `AI-assisted development workflow and team engineering standards`.

## R-e32f1417681f 오프리메드 · CI/CD·배포 작업의 사용자 확인 범위

원본 기준일: 2026-06-23. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:

- 실제 production/demo 배포 성공 로그는 repo commit만으로 확인하지 않았다.
- self-hosted runner의 물리 운영 주체와 runner 상태는 git history만으로 단정하지 않는다.
- all-branch raw data에는 같은 주제의 중복 commit이 있을 수 있으므로 최종 resume 숫자에는 commit count를 직접 쓰지 않는다.
- BE repo는 계속 제외한다.

- GitHub Actions release/deploy/demo-deploy workflow
- PR gate, E2E workflow, Playwright/standalone 실행 스크립트
- Dockerfile, tar packaging, load/deploy shell script
- Next.js standalone 배포 런타임, health check, static asset path 보정
- Next.js/React package patch, PostCSS security pin, Docker node runtime alignment
- self-hosted runner 대상 설정, legacy container 처리, runner sample/guide
- mkcert 로컬 HTTPS, 로컬 도메인, env 정리
- Husky prepare/pre-push, typecheck/build처럼 배포 전 검증과 연결되는 작업

원본: `docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-cicd-confirmed-work.md` · `CI/CD·배포 작업의 사용자 확인 범위`.

## R-da563493fba9 개인 개발 환경 · 1. Codex hook orchestration

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence files:
  - `[로컬 경로 비공개]`
  - `[로컬 경로 비공개]`
- trigger points:
  - `SessionStart`
  - `PreToolUse`
  - `PostToolUse`
  - `UserPromptSubmit`
- connected hook scripts:
  - `session_start_logger.py`
  - `session_start.py`
  - `pre_tool_use_guard.py`
  - `post_tool_use_review.py`
  - `user_prompt_submit_secret_scan.py`
  - `figma_mcp_policy.py`
  - `review_check_only_policy.py`
- raw interpretation:
  - Codex 작업 흐름을 단순 프롬프트 입력이 아니라 세션 시작, 사용자 요청 제출, 도구 실행 전, 도구 실행 후 단계로 나누어 제어했다.
  - 각 단계마다 필요한 안전장치와 컨텍스트 주입을 hook으로 분리했다.
  - AI 에이전트가 작업을 수행하기 전에 위험 명령, 비밀값, 검토 전용 요청, Figma MCP 정책 같은 조건을 점검하도록 만들었다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `1. Codex hook orchestration`.

## R-97f5fd474508 개인 개발 환경 · 2. Shell safety guard

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence file:
  - `[로컬 경로 비공개]`
- blocked patterns:
  - `git reset --hard`
  - destructive `git checkout --`
  - forced `git clean`
  - `sudo`
  - `curl|wget | sh|bash|zsh`
  - raw disk write with `dd of=/dev/...`
  - `mkfs`
  - high-risk `rm -rf` targets
- additional behavior:
  - heredoc body 안의 예시 텍스트는 실행 명령으로 오인하지 않도록 제외
  - git repository changed files를 읽어 UI-only 변경인지 판정
  - UI-only 변경에서 heavy validation 대신 focused validation을 권고
- verification:
  - `test_pre_tool_use_guard.py`: 3 tests passed
- raw interpretation:
  - AI 에이전트가 shell을 실행할 때 가장 위험한 파괴적 명령을 사전에 차단했다.
  - 변경 범위가 가벼운 UI 작업일 때 전체 build/test를 무조건 강제하지 않고, 검증 비용과 변경 위험도에 맞는 검증을 권고하도록 했다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `2. Shell safety guard`.

## R-10697263f36e 개인 개발 환경 · 3. Prompt-level secret scan

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence file:
  - `[로컬 경로 비공개]`
- detected patterns:
  - OpenAI-style `sk-*`
  - GitHub classic token `ghp_*`
  - GitHub fine-grained token `github_pat_*`
  - AWS access key `AKIA*`
- raw interpretation:
  - 사용자가 실수로 prompt에 credential/token을 포함하는 경우 제출을 중단하도록 했다.
  - AI 활용 중 비밀값 유출 가능성을 줄이는 prompt submission 단계의 방어막이다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `3. Prompt-level secret scan`.

## R-6d4aa51ca039 개인 개발 환경 · 4. Tool-result review guard

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence file:
  - `[로컬 경로 비공개]`
- behavior:
  - shell command 결과의 `exit_code`와 `stderr`를 확인
  - 실패나 stderr가 있으면 성공으로 취급하지 말라는 additional context를 주입
- raw interpretation:
  - AI 에이전트가 명령 실행 결과를 낙관적으로 해석하는 문제를 줄이기 위한 후처리 hook이다.
  - "명령을 실행했다"와 "성공했다"를 분리하는 검증 기준이다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `4. Tool-result review guard`.

## R-6e9db173c29f 개인 개발 환경 · 5. Figma MCP strict policy

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence files:
  - `[로컬 경로 비공개]`
  - `[로컬 경로 비공개]`
- behavior:
  - Figma/Figma MCP 관련 요청을 영어·한국어·figma.com URL 기준으로 탐지
  - Figma MCP가 필요한 요청에서는 browser screenshot, image inference, REST API, exported assets, cached design data, manual reconstruction 같은 우회 방법을 금지
  - Figma MCP unavailable 응답을 감지하면 같은 정책을 다시 주입
- verification:
  - `test_figma_mcp_policy.py`: 7 tests passed
- raw interpretation:
  - 디자인 관련 작업에서 AI가 편한 우회 경로를 선택해 정확도를 떨어뜨리는 문제를 정책 hook으로 막았다.
  - 특정 도구가 신뢰 경계인 작업에서는 허용된 도구만 쓰도록 강제했다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `5. Figma MCP strict policy`.

## R-74c73dc1ceeb 개인 개발 환경 · 6. Review-only request policy

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence files:
  - `[로컬 경로 비공개]`
  - `[로컬 경로 비공개]`
- behavior:
  - `검토만`, `확인만`, `리뷰만`, `수정하지 말고`, `코드 리뷰`, `PR 리뷰` 같은 요청을 탐지
  - 해당 요청에서는 구현, 파일 수정, 커밋, push, PR 생성, dependency 변경, server startup 같은 mutating work를 하지 말라는 context를 주입
- verification:
  - `test_review_check_only_policy.py`: 6 tests passed
- raw interpretation:
  - 사용자가 리뷰만 원할 때 AI가 임의로 수정까지 진행하는 문제를 줄이는 정책이다.
  - 사용자 의도와 에이전트 행동 범위를 맞추는 workflow guard로 볼 수 있다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `6. Review-only request policy`.

## R-41fccb2d38a2 개인 개발 환경 · 7. Session-start engineering context and LLM Wiki integration

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence files:
  - `[로컬 경로 비공개]`
  - `[로컬 경로 비공개]`
- behavior:
  - 세션 시작 시 cwd를 확인
  - LLM Wiki `WorklogSources`와 현재 repository를 매칭
  - 관련 프로젝트 context가 있으면 `llm-wiki-consult`, `llm-wiki-capture` 사용 지침을 추가
  - harness-style engineering, deterministic validation, verified/unverified reporting 지침을 세션에 주입
  - session start log를 기록
- raw interpretation:
  - AI 에이전트가 매번 프로젝트 맥락을 새로 추론하지 않도록, 장기 지식 저장소와 현재 작업 디렉터리를 연결했다.
  - 검증 가능한 작업 방식, 확인된 것과 미확인된 것을 분리해 보고하는 기준을 세션 시작 단계에서 주입했다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `7. Session-start engineering context and LLM Wiki integration`.

## R-c0afe05332a3 개인 개발 환경 · 8. Personal skill library for repeatable agent work

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence directory:
  - `[로컬 경로 비공개]`
- skill count:
  - 21 personal `SKILL.md` files
- notable skills:
  - `api-no-mock-fallback`: real API integration에서 mock fallback 제거 기준
  - `swagger-contract-sync`, `nexus-swagger-contract-sync`: Swagger/OpenAPI 계약 동기화 기준
  - `pr-review-assistant`: PR review 관점과 위험도 기준
  - `github-pr-assistant`: PR 작성/검증/요약 기준
  - `llm-wiki-consult`, `llm-wiki-capture`: 장기 프로젝트 지식 조회/기록 기준
  - `optivis-browser-test-auth`: Oprimed Trial FE 인증 브라우저 테스트 기준
  - `reuse-shared-ui-components`: shared UI 우선 재사용 기준
  - `match-existing-ui-style`: 기존 UI 스타일 준수 기준
  - `figma-code-parity-review`, `figma-designer-double-check`: Figma/code parity 검토 기준
  - `playwright`: real browser automation 기준
  - `spec-first-execution`: spec 범위 밖 구현 방지 기준
- raw interpretation:
  - 반복되는 에이전트 작업을 prompt ad-hoc 방식으로 처리하지 않고, 작업 유형별 skill로 분리했다.
  - API 연동, Swagger 계약, PR review, UI 재사용, Figma parity, browser auth, project knowledge capture처럼 실무 오류가 잦은 영역을 표준 workflow로 만들었다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `8. Personal skill library for repeatable agent work`.

## R-e9b05eb91faf 개인 개발 환경 · 9. MCP/plugin and trusted project configuration

원본 기준일: 2026-06-29. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
개인 설정 snapshot의 기록이다. 테스트 통과 수는 당시 기록이며 이번 재실행 결과가 아니다. 회사 전체 도입·정량 생산성·현재 도구 정책을 뜻하지 않는다.

- evidence file:
  - `[로컬 경로 비공개]`
- enabled capabilities:
  - `codex_hooks = true`
  - `multi_agent = true`
  - MCP servers: `playwright`, `figma`, `stitch`, `node_repl`
  - plugins: Figma, Notion, Expo, Documents, Spreadsheets, Presentations, Superpowers, Computer Use, PDF, Browser, Chrome, Template Creator
  - trusted projects include `oprimed`, `optivis-nexus-fe`, `optivis-trial-fe`, `resume`
- raw interpretation:
  - Codex를 단일 채팅 도구가 아니라 browser, Chrome, Figma, Playwright, Node REPL, 문서 생성, multi-agent를 연결한 작업 환경으로 구성했다.
  - 프로젝트별 trust boundary를 설정해 에이전트가 자동화 가능한 범위를 명시했다.

원본: `docs/raw/codex-agent-workflow-raw-data-2026-06-29.md` · `9. MCP/plugin and trusted project configuration`.

## R-87d8722a814d 오프리메드 · 도메인 온보딩 MCP · 1. 작업을 시작하기 전 상태

원본 기준일: 2026-07-30. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
사용자 기억으로 확인한 범위이며 MCP 코드·Git·설정은 재검증하지 못했다. 실제 디자이너 사용·온보딩 단축·전사 도입·검색 정확도·권한 보장은 미확인이다.

**개발자 온보딩**

- 의료·임상 도메인은 용어와 제품 흐름이 어려웠다.
- 개발자에게는 코드와 저장소를 읽을 수 있다는 전제가 있었다.
- 프로젝트에 코드 수준의 지침, 제품 concept 문서, 작업별 Skill과 실행 Hook을 남겨 AI가 같은 맥락을 참고하도록 했다.
- 사용자는 이 기준이 신규 개발자의 도메인 이해와 온보딩에 도움이 됐고, 신규 개발자가 비교적 빠르게 업무에 들어왔다고 기억한다.
- 온보딩 기간, 비교 대상, 인원 수, 독립 작업 시작 시점은 측정하지 않았다.

**디자이너 온보딩**

- 이후 팀에 디자이너가 추가됐지만 의료·임상 도메인의 난도는 그대로였다.
- 디자이너는 코드 수준의 지침과 구현을 직접 읽기 어려워 개발자보다 도메인 이해와 온보딩이 느렸다.
- 해당 디자이너는 Claude를 업무에 사용하고 있었다.
- 개발자용 저장소 문서와 AI workflow만으로는 코드 밖 직군에게 같은 맥락을 전달하기 어렵다는 차이가 드러났다.

원본: `docs/raw/oprimed-domain-onboarding-mcp-raw-data-v1-2026-07-30.md` · `도메인 온보딩 MCP · 1. 작업을 시작하기 전 상태`.

## R-bb957a8f61db 오프리메드 · 도메인 온보딩 MCP · 2. 판단

원본 기준일: 2026-07-30. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
사용자 기억으로 확인한 범위이며 MCP 코드·Git·설정은 재검증하지 못했다. 실제 디자이너 사용·온보딩 단축·전사 도입·검색 정확도·권한 보장은 미확인이다.

- 문제를 문서 부족만으로 보지 않고, 직군마다 접근할 수 있는 지식 경로가 다르다는 문제로 봤다.
- 이미 회사 PC에서 로컬 LLM Wiki를 운영하고 있었기 때문에, 별도 SaaS를 새로 도입하기보다 기존 기획·히스토리 문서를 AI가 조회할 수 있는 형태로 바꾸는 방법을 떠올렸다.
- 개발자와 디자이너가 서로 다른 AI 도구를 사용하더라도 같은 도메인 문서를 참고하게 하는 연결 지점으로 MCP를 선택했다.
- MCP의 역할은 도메인 지식을 새로 만들어내는 것이 아니라, 기존 문서를 Codex와 Claude가 같은 기준으로 조회할 수 있게 하는 데 있었다.

원본: `docs/raw/oprimed-domain-onboarding-mcp-raw-data-v1-2026-07-30.md` · `도메인 온보딩 MCP · 2. 판단`.

## R-aeafda8e315f 오프리메드 · 도메인 온보딩 MCP · 3. 직접 한 일

원본 기준일: 2026-07-30. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
사용자 기억으로 확인한 범위이며 MCP 코드·Git·설정은 재검증하지 못했다. 실제 디자이너 사용·온보딩 단축·전사 도입·검색 정확도·권한 보장은 미확인이다.

1. 회사 PC에서 로컬 LLM Wiki를 운영했다.
2. 기존 기획 문서와 의사결정·작업 히스토리 문서를 Markdown으로 옮겼다.
3. Markdown 문서를 기준으로 의료·임상 도메인 이해를 돕는 MCP 서버를 구축했다.
4. 같은 MCP를 Codex와 Claude에서 사용할 수 있게 각각 연결했다.
5. 기존 개발자용 concept·Agent Rules·Skill·Hook과, 직군 공통으로 조회할 수 있는 LLM Wiki·MCP를 서로 다른 지식 전달 경로로 사용했다.

원본: `docs/raw/oprimed-domain-onboarding-mcp-raw-data-v1-2026-07-30.md` · `도메인 온보딩 MCP · 3. 직접 한 일`.

## R-d83408028411 오프리메드 · 도메인 온보딩 MCP · 4. 협업과 적용 대상

원본 기준일: 2026-07-30. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
사용자 기억으로 확인한 범위이며 MCP 코드·Git·설정은 재검증하지 못했다. 실제 디자이너 사용·온보딩 단축·전사 도입·검색 정확도·권한 보장은 미확인이다.

- 개발자는 코드, 저장소 지침, concept 문서, Skill과 Hook을 함께 참고할 수 있었다.
- 디자이너는 코드 대신 자신이 사용하던 Claude에서 문서 기반 도메인 맥락에 접근할 수 있도록 하는 대상이었다.
- Codex와 Claude 양쪽에 연결한 사실은 사용자 기억으로 확인됐다.
- 디자이너가 MCP를 실제로 얼마나 사용했는지, 어떤 질문을 했는지, 결과를 어떻게 평가했는지는 현재 확인하지 못했다.

원본: `docs/raw/oprimed-domain-onboarding-mcp-raw-data-v1-2026-07-30.md` · `도메인 온보딩 MCP · 4. 협업과 적용 대상`.

## R-89fbdd43d3e0 오프리메드 · 도메인 온보딩 MCP · 5. 결과와 검증 상태

원본 기준일: 2026-07-30. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
사용자 기억으로 확인한 범위이며 MCP 코드·Git·설정은 재검증하지 못했다. 실제 디자이너 사용·온보딩 단축·전사 도입·검색 정확도·권한 보장은 미확인이다.

**확인된 결과**

- 기존 코드 수준의 문서와 AI workflow가 신규 개발자의 온보딩에 도움이 됐다는 사용자 경험이 있다.
- 기획·히스토리 문서를 Markdown으로 옮기고, 로컬 LLM Wiki를 기반으로 도메인 이해용 MCP 서버를 구축했다.
- MCP를 Codex와 Claude 양쪽에서 사용할 수 있게 구성했다.

**아직 확인하지 못한 결과**

- 디자이너의 온보딩 기간이 실제로 얼마나 줄었는지
- MCP 도입 전후 질문 수, 독립 작업 시작 시점, 문서 탐색 시간
- 디자이너와 개발자의 지속 사용 여부와 사용 빈도
- MCP 응답 정확도, 검색 품질, 잘못된 답변의 검증 방식
- 팀 전체 또는 회사 전체 적용 여부
- 로컬 LLM Wiki와 MCP의 백업·권한·보안·가용성 운영 기준

원본: `docs/raw/oprimed-domain-onboarding-mcp-raw-data-v1-2026-07-30.md` · `도메인 온보딩 MCP · 5. 결과와 검증 상태`.

## R-97c42ebca125 오프리메드 · OPR-AUG12-01 Nexus ML 비동기 실행 상태와 실행별 식별자

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
상태 제어 구현까지 확인. 운영 장애 감소율·처리량·실제 운영 전환 시점은 확인하지 않았다.

문제 상황: 큐·worker·DB가 서로 다른 상태를 갖거나 이전 실행의 응답이 현재 실행을 덮는 상황을 다룬다.

확인 사실: 비동기 실행 repository/service/task와 상태 전이를 도입하고 task_id·job_id·run_version으로 실행을 구분했다. 큐 등록 실패와 등록 후 metadata 저장 실패를 구분하는 코드, 기대 상태를 지정한 전이 호출이 현재 main에 있다.

검증 수준: 현재 main 실행 서비스 코드와 상태·repository 테스트 파일 변경을 확인했다. 테스트를 이번에 실행하지 않았다.

커밋 근거: 48048a7f, e444b39d, 90b9d462, 4066bfd6, 8f917599

원문 발췌: E02

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-01 Nexus ML 비동기 실행 상태와 실행별 식별자`.

## R-a127683bf450 오프리메드 · OPR-AUG12-02 ML 재전달 중복 실행 방지와 정확한 실행 취소

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
테스트는 가짜 실행 환경을 이용한 계약 검증이다. 실제 GPU 서버 실행·운영 중복 발생률은 재검증하지 않았다.

문제 상황: 메시지 재전달·취소 경쟁에서 중복 실행하거나 다른 실행을 중단하는 상황을 다룬다.

확인 사실: remote_execution_ref 기반 실행 계약, 멱등 시작, cancel CAS와 복구 검증 이력이 있다. 현재 lifecycle 테스트는 같은 실행의 재전달 시 docker run 1회, 다른 실행 유지, 취소된 실행의 재시작 차단을 검증하도록 작성돼 있다.

검증 수준: 현재 테스트 본문을 발췌했다. runner 계약 문서는 목표 설계이며 문서의 모든 항목을 배포 완료로 보지 않는다.

커밋 근거: bb989a0c, 233635c8, b499dd57, 9c514533, 538f96a3, b84651d3, f4f0293f

원문 발췌: E03, E14

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-02 ML 재전달 중복 실행 방지와 정확한 실행 취소`.

## R-15c31875f38f 오프리메드 · OPR-AUG12-03 Nexus FE 실행 수명주기와 공유 polling

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
요청 수 감소율·서버 부하 절감·사용자 대기시간 개선 수치로 확대하지 않는다. polling delay는 코드 설정값이다.

문제 상황: 여러 소비자의 중복 조회, 이전 실행의 늦은 응답, 화면 복귀·취소 시 상태 혼선을 다룬다.

확인 사실: 실행 수명주기 hook, 적응형 polling, 동일 실행의 진행 중 요청 공유, 응답 식별자 검사, 복원·취소 경합 처리 이력이 있다. 현재 polling 코드에 Retry-After·429 backoff와 hidden 탭 pause 연결이 있다.

검증 수준: 현재 polling 구현을 발췌하고 lifecycle 테스트 변경 경로를 확보했다.

커밋 근거: b8d1a4e0, 8f34489d, a59a7be4, 55165c63, 18857cd3, a2d38377, bc8ebf7a, c284d3a4

원문 발췌: E01

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-03 Nexus FE 실행 수명주기와 공유 polling`.

## R-6c3dc1638cff 오프리메드 · OPR-AUG12-04 ML 입력 snapshot·성공 결과 수락·모듈 확장

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
ML 모델 개발·모델 성능 향상으로 표현하지 않는다. 01~03과 같은 실행 제어 경험의 하위 근거로 우선 사용한다.

문제 상황: 실행 중 입력이 바뀌거나 다른 실행의 결과·입력이 섞이는 상황을 다룬다.

확인 사실: ATS·DRD·TRP 실행 adapter와 FE 비동기 연결, 고정 도메인 성공 POST, SUB/SGI 단계별 결과, 실행별 입력 JSON 분리, task lock·입력 snapshot 보존 이력이 있다.

검증 수준: 커밋·변경 파일 및 현재 성공 수락 코드 일부 확인. 개별 모듈의 실제 ML 결과는 검증하지 않았다.

커밋 근거: 83625198, 54de7f88, 37c2837e, 6dac937c, eff40806, e51689dc, f13ac9df, a1a56e3c, db11a78f, b36eab50, ffdab65f

원문 발췌: E02

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-04 ML 입력 snapshot·성공 결과 수락·모듈 확장`.

## R-ea9172c1779e 오프리메드 · OPR-AUG12-05 여러 제품에서 공통 사용자 흐름 SDK 수집

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
실제 수집률·분석 활용도·리텐션 개선은 확인 불가. 재제출 계측은 이후 revert가 있어 최초 기능을 현재 적용 상태로 단정하지 않는다.

문제 상황: 제품별 사용자 행동을 일관된 이벤트·전송 방식으로 수집하는 작업이다.

확인 사실: Portal CDN SDK, 직렬 전송 queue·요청 크기 제한·background flush·page enter/exit 이력이 있다. Labs FE·Nexus FE·Trial FE에 계측 및 중복 제어·시나리오 검증 변경이 이어졌다.

검증 수준: SDK 소스·route·테스트·결과 문서의 Git 변경과 제품별 연결 커밋을 보존했다. 이번에는 브라우저 전송을 실행하지 않았다.

커밋 근거: 2bd3672e, b7bd32c0, 15d1b6fc, 29d9b10c, f27e8026, 2129db6a, e411a426, 4249ed77, db94ad33, 55070ef2, 37e8da49, 2aa34dec, b5ba1fb9, f91daa1d

원문 발췌: E17

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-05 여러 제품에서 공통 사용자 흐름 SDK 수집`.

## R-522d19970e57 오프리메드 · OPR-AUG12-06 사용자 흐름 bulk 적재와 OLAD 집계 기준

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
retention 지표 구현은 retention 상승 실적이 아니다. 적재 성능 수치는 측정하지 않았다.

문제 상황: 다수 이벤트 적재와 완료·이탈·재방문 지표의 분모·시간 기준을 다룬다.

확인 사실: 이벤트 bulk 적재, 작업·모듈 요약, retention 집계, 완료율의 시작 시점 기준, funnel·page 집계와 보고서 API 분리 이력이 있다. 현재 적재 코드는 로그 DB transaction에서 이벤트와 작업 집계를 처리한다.

검증 수준: 현재 store_user_flow_events 코드 발췌와 집계 테스트 변경 이력을 확보했다.

커밋 근거: 07af774b, b5721dde, 41f19c33, cc31cce4, 88186922, 5551d9ec, dd30a315, b4bbf27d, c47d86e8, 9245ebe6, 65c5f049

원문 발췌: E07

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-06 사용자 흐름 bulk 적재와 OLAD 집계 기준`.

## R-cbdaf994c1be 오프리메드 · OPR-AUG12-07 OLAD 보고서 화면·응답 정규화

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
화면·API 연결만으로 독립 대표 항목에 올리지 않고 05~06의 제품 관측 경험과 함께 검토한다.

문제 상황: 집계 응답을 관리자가 비교·조회할 수 있는 화면으로 연결했다.

확인 사실: Admin 보고서 API 연결, 응답 정규화와 chart, 보고서 화면 구성 및 mock 제거 변경이 있다.

검증 수준: Git 변경과 파일 목록 확인. 실제 데이터로 운영 화면을 재검증하지 않았다.

커밋 근거: 842c2633, 91a93f57, 2a773dbb, a0a88b8a, c8083f87

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-07 OLAD 보고서 화면·응답 정규화`.

## R-ae863d260000 오프리메드 · OPR-AUG12-08 서비스 DB 분리와 배포 전 연결·권한 검증

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
무중단 이관·데이터 무손실·실제 배포 성공을 Git만으로 단정하지 않는다. Insights 고정 테이블 변경은 revert 이력이 있다.

문제 상황: 잘못된 DB 연결·누락된 테이블·권한 상태로 새 버전을 배포하는 상황을 다룬다.

확인 사실: Admin·Common·Labs·Trial DB 라우팅 분리 및 Nexus 사용자 조회 경로 변경이 있다. 현재 preflight는 read-only transaction으로 실제 DB명·port, 필수 테이블, partition, 테이블·sequence 권한을 확인하고 rollback한다.

검증 수준: preflight 코드, deploy workflow 변경 및 연결·라우팅 테스트 파일 확인.

커밋 근거: c10e3952, 1d2847dd, 72b21501, 3217b17b, 18a4661c, 39ee330a, 5a9bae45, 1daf2824, 743a9e68, 4b59e8ec, 41ffbbf6, 54620d79

원문 발췌: E06

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-08 서비스 DB 분리와 배포 전 연결·권한 검증`.

## R-46a2b7227deb 오프리메드 · OPR-AUG12-09 고객사 생성 시 서비스 데이터·ML 테이블 준비

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
현재 문서에 운영 계정·설정 미확정으로 배포 보류가 명시돼 있다. 신규 고객사 실제 적용·설정 시간 단축은 주장하지 않는다.

문제 상황: 회사 레코드만 생성되고 첫 사용에 필요한 데이터·테이블이 준비되지 않는 상황을 다룬다.

확인 사실: 고객사 생성에 데이터·기본값·원본 권한·ML 테이블 준비를 연결한 구현과 테스트가 있다. 설계 문서는 준비 검증 후 성공 응답, 기존 타 고객사 데이터 복제 금지, 다중 DB 실패·보상·재시도 경계를 명시한다.

검증 수준: 구현·PostgreSQL 테스트 변경 경로와 현재 계획 문서 확인. partition 부모 잠금 완화·검증 보고서는 별도 branch 이력이다.

커밋 근거: 0aef7f75, a228d37b, 15096e25, 5546afa0, 7abfab0b, 60881ab3, 02e526bf

원문 발췌: E09

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-09 고객사 생성 시 서비스 데이터·ML 테이블 준비`.

## R-31b0e51d350f 오프리메드 · OPR-AUG12-10 단일 세션 전환 확인과 제품별 인증 경계

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
인증 방식에는 직접 Redis 검증 도입 후 Admin 검증 복원 이력이 있다. 중간 아키텍처를 현재 시스템으로 쓰지 않는다. 운영 보안 수준·장애 감소 수치는 확인하지 않았다.

문제 상황: 동시 로그인 전환과 제품 간 인증 상태 간섭을 다룬다.

확인 사실: 기존 세션 종료 전 확인 절차, Keycloak·Redis 세션 처리, Admin/Portal cookie·세션 key 분리, 재로그인·브라우저 재사용 처리 이력이 있다. 현재 Admin 코드에 제품별 cookie와 session store account 구분이 있다.

검증 수준: 현재 인증 코드 일부 및 session switch·오류 코드 테스트 파일 변경 확인.

커밋 근거: a8e7497c, 84d3d798, 6976b7ae, d530e6ed, b6faf718, 196dbf24, 92302b03, 0f0429b6

원문 발췌: E08

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-10 단일 세션 전환 확인과 제품별 인증 경계`.

## R-fb14104067a4 오프리메드 · OPR-AUG12-11 공통 인증 dialog·탭 복귀·토큰 refresh 경합

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
10번 인증 경험의 FE 근거로 검토한다. 각 제품의 main/dev 포함 여부는 커밋별로 다르다.

문제 상황: 탭·화면 생명주기와 인증 요청이 겹칠 때 반복 요청·잘못된 로그아웃 상태를 다룬다.

확인 사실: Portal dialog CDN SDK 호환 처리, 활성화 시점 세션 확인, 로그아웃 실패 시 상태 보존, Trial 공유 refresh의 호출자 취소와 root watcher, BFCache 복귀 중복 확인 방지 이력이 있다.

검증 수준: Git 변경·테스트 경로 확인. 실제 브라우저와 인증 서버를 실행해 확인하지 않았다.

커밋 근거: 32a6e0ad, b7950659, 51216f86, 476e0b91, 22165867, 141c3545, 9e29444b, 1469dbfd, db4b4e26, 91fd58b9, 9a171244, 428e0a2f

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-11 공통 인증 dialog·탭 복귀·토큰 refresh 경합`.

## R-b0e48e7d5f07 오프리메드 · OPR-AUG12-12 오류·서버 로그 수집의 민감정보 및 실패 경계

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
민감정보 유출이 없다는 보증이나 전 제품 관측 완료로 표현하지 않는다. branch 작업은 운영 반영과 구분한다.

문제 상황: 진단 자료 수집 시 민감한 요청 정보를 보내거나 로그 DB 실패가 요청 처리에 반복 영향을 주는 상황을 다룬다.

확인 사실: Portal URL/referrer 검증, FE 오류 보고 민감정보 제거, Nexus authorization 제거, API 실패 로그 보존·로그 DB 실패 backoff 변경이 있다. 로그 dashboard·Labs queue 수집의 추가 작업은 별도 branch에 있다.

검증 수준: 관련 Git 변경과 파일 목록 확인. 로그 전수 점검·보안 감사는 수행하지 않았다.

커밋 근거: 59c6aaea, b109c0af, d102a980, e38ccb43, 6708f10b, a5f82c8c, 7256a996, fbcd3444, 3254818c, 3f9d4e56, 183886ed

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-12 오류·서버 로그 수집의 민감정보 및 실패 경계`.

## R-d80577aab67a 오프리메드 · OPR-AUG12-13 공통 디자인 시스템·공개 소비 계약

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
팀 전체 채택률·개발시간 단축·Figma 일치율 수치는 없다. 패키지 버전 이력과 실제 모든 소비 제품 배포는 구분한다.

문제 상황: 디자인 기준과 여러 소비 제품에서 사용할 component·type·package 경계를 다룬다.

확인 사실: Figma token·Storybook, foundation/ui package, public API·consumer type 계약, asset·공개 진입점 정비 및 v1.x 배포 이력이 있다. Base UI 전환과 기존 Radix 제거, 브라우저 계약 검증 변경이 이어졌다.

검증 수준: token·package·consumer test·브라우저 검증 파일의 Git 이력과 현재 검사 구조를 확인했다.

커밋 근거: d1299e49, dd195297, f447f558, c8c5a33c, 24ceca8e, 6fff666f, ba21e412, 9971fc6d, ba925e7a, 13b5191c, ea733222, ea8ce74d, 50c4d480, 925863b0

원문 발췌: E04, E05

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-13 공통 디자인 시스템·공개 소비 계약`.

## R-09cbfbd8c0e0 오프리메드 · OPR-AUG12-14 공통 UI 접근성·semantic table·상호작용 계약

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
접근성 인증이나 전체 WCAG 준수로 표현하지 않는다. 13번의 구체적인 품질 근거로 사용한다.

문제 상황: 공통 component 변경이 소비 화면의 의미·상호작용을 깨뜨리는 상황을 다룬다.

확인 사실: semantic table·행 클릭·키보드/접근성, slider 상호작용과 browser 검증 이력이 있다. 공통 component 계약·audit 기록도 보존돼 있다.

검증 수준: 변경 파일 및 검증 스크립트 이력 확인. 브라우저·보조공학 장치로 재실행하지 않았다.

커밋 근거: a8313b84, 25669c0e, 79b301ac, c2514c55, b85456f7, e5027876, dc186501, ee02ed63, c6ae0470, d71ed078

원문 발췌: E04

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-14 공통 UI 접근성·semantic table·상호작용 계약`.

## R-0d6ecbcdbfd6 오프리메드 · OPR-AUG12-15 디자인 시스템 로컬 검사·release gate와 Storybook 배포

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
로컬 hook은 우회 가능하며 현재 PR 필수 status CI로 주장할 수 없다. 이번에 release·실제 서버 배포를 실행하지 않았다.

문제 상황: 저장소 문서에는 GitHub billing 문제로 job이 시작하지 않는 조건에서 검사·배포 경로를 옮긴 이유가 기록돼 있다.

확인 사실: 10월 14일 GitHub verify/publish workflow를 로컬 pre-push·release script로 전환했다. 현재 gate는 lifecycle script 검사, verify, pack dry-run, 조건부 slider browser test를 수행한다. push 대상 SHA와 HEAD·작업 트리 상태 검사 및 self-hosted Storybook 배포 이력이 있다.

검증 수준: 현재 실행 스크립트와 배포 정책 문서 원문 확인.

커밋 근거: 515dd817, 1de68851, 00aae6d3, 91bb9d9c

원문 발췌: E04, E05

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-15 디자인 시스템 로컬 검사·release gate와 Storybook 배포`.

## R-1df210647018 오프리메드 · OPR-AUG12-16 디자인 시스템 소비 전환과 Docker package 인증

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
모든 제품의 전체 component 전환 완료나 비밀값 잔존이 전혀 없다는 감사 결과로 쓰지 않는다.

문제 상황: 공통 package를 실제 제품에 적용하고 비공개 패키지를 빌드 환경에서 설치하는 경계를 다룬다.

확인 사실: Labs FE token/control 적용, Admin 공통 디자인 시스템 관리 layout 전환, private package 설치용 Docker BuildKit 인증·CI 전달·빌드 테스트 변경이 있다.

검증 수준: Git 적용 이력 및 Docker 인증 방식 문서 확인.

커밋 근거: 1fb8028c, 3bc005c3, 13e4887b, 33b77102, 53e96e16, 97b52e9f, 9fed44ac, ad75dbe0

원문 발췌: E15

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-16 디자인 시스템 소비 전환과 Docker package 인증`.

## R-268dab8f0299 오프리메드 · OPR-AUG12-17 FE TypeScript·App Router 마이그레이션

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
마이그레이션 범위는 저장소별로 구분한다. 성능 개선·오류 감소·무중단 전환 수치는 확인하지 않았다.

문제 상황: 기존 화면을 유지하면서 실행·라우팅·타입 검사 기준을 옮기는 작업이다. 동시 dev/build 산출물 경계도 다룬다.

확인 사실: Admin TypeScript 및 Next 15 App Router 전환, Axios→Fetch 변경, Labs App Router 경로 이관 이력이 있다. dev/build 출력 분리 변경이 여러 FE 저장소에 있다.

검증 수준: 변경 커밋·전체 파일 경로를 확보했다. 전환 전후 전 화면 동등성·build 성공을 이번에 재실행하지 않았다.

커밋 근거: 51fd64b4, 98a45c6e, eb74fdc1, fda7a249, 0a521a40, d0d50b5d, 1c05c8c7, ac801b6b

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-17 FE TypeScript·App Router 마이그레이션`.

## R-a875ed3d6650 오프리메드 · OPR-AUG12-18 여러 제품의 repository gate·self-hosted 실행

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
commit 제목의 우회 방지를 서버 차원의 강제 차단으로 확대하지 않는다. 현재 모든 저장소가 동일 CI 정책을 쓴다고 묶지 않는다.

문제 상황: 제품별 검증 누락과 실행 환경 차이를 다루는 변경이다.

확인 사실: Portal prepare-commit-msg·repository gate, Trial/Nexus/Labs FE의 우회 방지 관련 변경, Portal 및 Labs BE self-hosted 실행·Docker CI 이력이 있다.

검증 수준: hook·workflow·script·테스트 변경 파일 및 커밋별 main/dev 포함 여부를 보존했다.

커밋 근거: 6bcfc59c, 5334464c, 1fb18fde, 5652b302, e4992a9a, 5caf4170, 92e0a8de, 4a01619a

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-18 여러 제품의 repository gate·self-hosted 실행`.

## R-a51ec2bfb8b4 오프리메드 · OPR-AUG12-19 Labs v2 평가·회차·Run·Drive 제품 흐름

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
전체 운영 연동 완료나 ML 검증 성공으로 표현하지 않는다. 단순 화면 목록보다 확정·잠금·복원 통제점을 검토한다.

문제 상황: 평가 기준 확정과 실행 단계의 상태·사용자 선택을 일관되게 이어주는 작업이다.

확인 사실: 프로젝트·평가 설정부터 회차별 data/model/run, report·Final Test·Drive·Activity로 이어지는 화면과 상태 흐름의 변경이 있다. 확정 후 평가 잠금·다른 탭 확정 상태 동기화·이전 상태로의 복귀 방지 이력이 있다.

검증 수준: Git 이력과 현재 Mock/API 경계 문서를 확인했다. 일부 최근 상태 수정은 branch에만 있다.

커밋 근거: b88dbe16, 35c82f6f, 81ccdf1c, c3f4dc05, d1c80ffb, 5aadef06, fe23e294

원문 발췌: E10

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-19 Labs v2 평가·회차·Run·Drive 제품 흐름`.

## R-9a2f9313c499 오프리메드 · OPR-AUG12-20 Labs v2 명시적 Mock/API 모드 분리

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
Mock을 제거한 제품이라고 표현하지 않는다. mock의 합성 결과·preview·persisted=false를 실제 저장·ML 성과로 쓰지 않는다.

문제 상황: 시연 데이터와 API 결과를 사용자가 구분하고 실행 중 모드가 섞이지 않도록 하는 경계다.

확인 사실: full mock core·execution/store·service.api/mock 분리 및 테스트가 있다. 현재 문서는 기본 Mock, 탭 session 모드, 전환 시 화면 재로딩·진행 상태 초기화, API 오류 시 mock fallback 금지를 명시한다.

검증 수준: 구현 파일 목록과 현재 모드 설명 문서를 확보했다.

커밋 근거: 31b7fc4c, c3f4dc05

원문 발췌: E10

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-20 Labs v2 명시적 Mock/API 모드 분리`.

## R-57cf965ed54d 오프리메드 · OPR-AUG12-21 Labs FastAPI·PostgreSQL 서비스 계약과 안정적 Run 식별

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
ML 연산은 별도 서비스 계약이다. 개발용 simulation은 production에서 거부되는 명시적 설정이며 실제 모델 결과가 아니다.

문제 상황: preview 메모리 상태와 실제 저장 API가 섞이거나 Run 표시 순번이 실행 식별을 바꾸는 상황을 다룬다.

확인 사실: FastAPI 전환, PostgreSQL 공통 서비스 API, 운영 entry 정리·필수 schema 사전 검사·catalog 저장·Drive export/audit 변경이 있다. 현재 계약은 UUID run_id와 저장된 run_no를 구분하며 외부 ML 결과를 접수한다.

검증 수준: 관련 구현·테스트 변경 및 현재 서비스 계약 문서 확인.

커밋 근거: 3e7c9ec9, f623e0e0, 6476b4c1, 421b00b8, 5fa4d955, 3316675c, 55714acb, e83b8a29

원문 발췌: E11

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-21 Labs FastAPI·PostgreSQL 서비스 계약과 안정적 Run 식별`.

## R-cc72ec328a47 오프리메드 · OPR-AUG12-22 관리자 ML 작업 queue 조회와 상태별 모니터

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
실제 운영팀 사용·장애 발견 시간 단축은 확인하지 않았다. read-only 조회를 실행 제어 기능으로 쓰지 않는다.

문제 상황: ML 작업의 상태·시간 범위를 운영 화면에서 확인하는 기능이다.

확인 사실: read-only 작업 queue API와 기존 BE DB 연결 활용, 상태별 card·kanban·시간 preset·pagination·전체 집계 기준 변경이 있다.

검증 수준: API·repository·계약·PostgreSQL 테스트 경로와 FE 커밋 확인. 도입→revert→재도입 순서를 보존했다.

커밋 근거: 3133af70, 0303dbad, 6a24331a, bd12c100, b2d1d318, 617a4e26

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-22 관리자 ML 작업 queue 조회와 상태별 모니터`.

## R-1a2c42d3c1c5 오프리메드 · OPR-AUG12-23 CRF 검수 UI·OpenAPI 생성 계약

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이관 저장소의 동일 SHA를 별도 경험으로 중복 집계하지 않는다. 실제 검수 정확도·처리시간 향상 수치는 없다.

문제 상황: OCR 변환 결과를 검토하는 UI와 API/모의 응답 계약을 맞추는 작업이다.

확인 사실: QC·전체 검수·이미지/통계/출력 흐름, 키보드·scroll·confidence 재계산, OpenAPI 생성 pipeline·API-contract workflow·MSW 계약 공개 이력이 있다. 서버 연결·dataset archive 변경은 별도 branch에 있다.

검증 수준: 3개 CRF 저장소의 커밋과 생성 파일·workflow 경로를 확보했다.

커밋 근거: 7c71f9b8, 919420a6, f5fc29fa, 6caf8155, a4315d97, b7044508, af221c8c, 6694e74b, ebcf3099, 91080c4b

원문 발췌: E16, E18

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-23 CRF 검수 UI·OpenAPI 생성 계약`.

## R-68a3c01f2578 오프리메드 · OPR-AUG12-24 OCR queue·GPU/CPU 처리 단계 분리

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
이 저장소는 origin main/dev/master/demo가 없으므로 feature 이력이라는 이유로 미사용을 단정하지 않는다. concurrency=24는 설정값이며 처리량·속도 개선 수치가 아니다.

문제 상황: OCR와 후처리 단계의 자원·작업 경계를 나누는 작업이다.

확인 사실: DB queue와 GPU worker 구성, CPU 후처리 단계 분리·통합 검사·적재 trigger 변경 및 concurrency 설정 이력이 있다.

검증 수준: Image_process의 feature ref와 코드·검증 문서 변경 경로를 수집했다.

커밋 근거: 2c7cced3, f111f1ad, 54cc95dd, 160699a3, 7434c7f5, 5229fecd, dc637efc, c9ad8d75, 6f2c8717

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-24 OCR queue·GPU/CPU 처리 단계 분리`.

## R-4034b20d06bc 오프리메드 · OPR-AUG12-25 OCR 적재 묶음 검증 후 활성화

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
도입 시점 코드이며 현재 배포 서버에서 같은 코드가 실행되는지 확인하지 않았다. 실제 데이터 손실 방지 횟수·정확도 개선은 주장하지 않는다.

문제 상황: 불완전한 적재 데이터 노출과 검수된 데이터의 무조건 교체를 통제하는 작업이다.

확인 사실: ocr_load_id 묶음의 scope·연속 batch·정답 통계를 확인한 뒤 활성화하는 코드와 테스트가 있다. 활성화 시 advisory transaction lock, 이미 검수된 활성 행 교체 차단, 이전 묶음 상태 전환을 수행한다.

검증 수준: 도입 커밋의 활성화 코드 원문·단위/통합 테스트 경로 확보.

커밋 근거: db4176e4, 2d8e8529, 7f566a0e, 35839934

원문 발췌: E13

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-25 OCR 적재 묶음 검증 후 활성화`.

## R-ce71452bfa87 오프리메드 · OPR-AUG12-26 요구사항·검증 근거를 연결하는 업무관리 프로토타입

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
Git·CI·배포 연결과 role은 모의 동작을 포함한다. 실제 팀 사용·영구 저장·자동 검증 운영 성과로 쓰지 않는다. mock 작업에 적힌 Nexus/Labs 지표를 실제 실적으로 옮기지 않는다.

문제 상황: 업무 상태뿐 아니라 어떤 기준과 증거로 완료하는지를 검토할 수 있는 기획 프로토타입이다.

확인 사실: 요구사항 coverage·테스트 누락·blocker 탐색, 기준별 CI·ML 검증 파일 연결, N/A 분모 처리, 완료 보류·재개·변경 이력, 브라우저/self-check 이력이 있다.

검증 수준: 현재 project-stage 문서가 기획 초안=프로토타입을 명시한다. 도메인 model·self-check·E2E 변경을 수집했다.

커밋 근거: afec3bd2, 59b78a85, 5ca5e66f, 17ea88ab, 2679f8cf, cbc1b41d, 1c5dbdf0, 7ac43a66, 8fcbba2b, 9b17e4b5, 5c42f9a0, f956a67b, 213b26a4, 715f67a1

원문 발췌: E12

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-26 요구사항·검증 근거를 연결하는 업무관리 프로토타입`.

## R-5d6441621585 오프리메드 · OPR-AUG12-27 Swagger 기준선·오류 응답 계약 검사

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
현재 배포 API와 Swagger 전체의 일치 여부는 재조회하지 않았다. 계약 검사를 전 API 완전 보증으로 쓰지 않는다.

문제 상황: 호출자와 서버 문서·오류 코드의 변경 차이를 검사하는 작업이다.

확인 사실: Nexus Swagger baseline CI gate·baseline 테스트·응답 schema, Admin 인증 오류 코드 schema·catalog 생성 변경이 있다.

검증 수준: 관련 workflow·schema·생성 파일·테스트의 Git 변경 확인.

커밋 근거: eec09e80, 2e656589, 54858c89, e3610f9f, a8e7497c

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-27 Swagger 기준선·오류 응답 계약 검사`.

## R-67df69387be3 오프리메드 · OPR-AUG12-28 Nexus 저장 흐름 복원·진단·데모 분기

원본 기준일: 2026-10-15. 경력 근거 기록이며 현재 배포·성과를 보증하지 않는다.

확인 한계:
진단 panel·최근 실패 로그는 branch 범위, TOP 질환은 demo 및 후속 숨김/비활성화가 있어 현재 운영 기능으로 단정하지 않는다.

문제 상황: 저장된 작업 복원과 비동기 실패 원인 확인, 시연 흐름을 다룬다.

확인 사실: SGI 저장 workflow 복원과 실패 이유 로그, 개발용 진단 panel, TOP 질환 demo 입력 변경 이력이 있다.

검증 수준: main/dev/demo/기타 branch 포함 여부와 후속 비활성화 커밋을 수집했다.

커밋 근거: 89046641, 72847717, fc8a28a4, b1fe9361, a06eae2b, b0370165, 7ceca8dc, 7a694ae1, b8bd6d48, 204809c2, a2527976, 4016d96e, d0ab90b3

원문 발췌: 별도 발췌 없음; Git 변경 경로 근거

원본: `docs/raw/oprimed-2026-08-12-to-2026-10-15-v1/work-units.json` · `OPR-AUG12-28 Nexus 저장 흐름 복원·진단·데모 분기`.
