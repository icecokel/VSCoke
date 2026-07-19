export type PokeLoungeLocale = "ko-KR" | "en-US" | "ja-JP";

export interface PokeLoungeCopy {
  locale: PokeLoungeLocale;
  unknownTrainer: string;
  volumeMuted: string;
  volumeLabel(percent: number): string;
  volumeAriaLabel(percent: number): string;
  uiLarge: string;
  uiNormal: string;
  connectionConnected: string;
  connectionConnecting: string;
  connectionDisconnected: string;
  autosaveLocal: string;
  autosaveLocalFallback: string;
  autosaveSaving: string;
  autosaveError: string;
  autosavePending: string;
  autosaveSaved: string;
  autosaveReady: string;
  gameRegionLabel: string;
  gameCanvasLabel: string;
  gameCanvasFallback: string;
  settingsOpenLabel: string;
  fullscreenOn: string;
  fullscreenOff: string;
  statusRailLabel: string;
  hydrationLoading: string;
  hydrationLocalFallback: string;
  hydrationRetry: string;
  hydrationRetrying: string;
  hydrationRetryAfterRoom: string;
  hydrationConflictTitle: string;
  hydrationConflictDescription: string;
  hydrationUseServer: string;
  hydrationUseLocal: string;
  hydrationDecideLater: string;
  hydrationIdentityError: string;
  noticeConfirm: string;
  settingsTitle: string;
  settingsDescription: string;
  settingsFullscreen: string;
  settingsUiSizeAria: string;
  settingsShare: string;
  settingsLocalShare: string;
  settingsShareCopied: string;
  settingsShareFailed: string;
  settingsSolo: string;
  settingsRankingTitle: string;
  settingsRankingCaption: string;
  settingsRankingLoading: string;
  settingsRankingError: string;
  settingsRankingRetry: string;
  settingsRankingEmpty: string;
  settingsClose: string;
  leaveTitle: string;
  leaveDescription: string;
  leaveContinue: string;
  leaveConfirm: string;
  resultEyebrow: string;
  resultPlayTime(seconds: number): string;
  resultUnranked: string;
  resultSaving: string;
  resultSave: string;
  resultRetry: string;
  resultRoomEntry: string;
  resultLobby: string;
  resultAuthRequired: string;
  resultSubmitting: string;
  resultSaved: string;
  resultSaveFailed: string;
  accessibleHelp: string;
  startup: {
    title: string;
    description: string;
    retry: string;
    retrying: string;
    lobby: string;
  };
  roomEntry: {
    title: string;
    fanNotice: string;
    soloTitle: string;
    soloDescription: string;
    continue: string;
    newGame: string;
    tournamentSettings: string;
    tournamentSettingsDescription: string;
    localTitle: string;
    localDescription: string;
    localCreate: string;
    roomCodePlaceholder: string;
    localJoin: string;
    localCodeLabel: string;
    serverTitle: string;
    serverDescription: string;
    serverCreate: string;
    serverCodePlaceholder: string;
    serverJoin: string;
    serverCodeLabel: string;
    serverDisabled: string;
    serverInviteRequiresLogin: string;
    invitePlaceholder: string;
    inviteDescription: string;
    inviteLabel: string;
    localCodeRequired: string;
    serverCodeRequired: string;
    preparing: string;
    newGameTitle: string;
    newGameDescription: string;
    cancel: string;
    resetAndStart: string;
    preparationTime: string;
    durationMinutes(minutes: number): string;
    freshSession: string;
    leaveTournamentTitle: string;
    leaveTournamentDescription: string;
    leaveRoomTitle: string;
    leaveRoomDescription: string;
    leaveRoom: string;
  };
}

const KOREAN_COPY: PokeLoungeCopy = {
  locale: "ko-KR",
  unknownTrainer: "이름 없는 트레이너",
  volumeMuted: "소리 꺼짐",
  volumeLabel: percent => `소리 ${percent}%`,
  volumeAriaLabel: percent => (percent === 0 ? "소리 음소거" : `소리 볼륨 ${percent}퍼센트`),
  uiLarge: "UI 크게",
  uiNormal: "UI 보통",
  connectionConnected: "방 연결됨",
  connectionConnecting: "방 연결 중",
  connectionDisconnected: "방 연결 끊김",
  autosaveLocal: "현재 탭에 자동 저장",
  autosaveLocalFallback: "계정 저장 중지 · 현재 탭에 저장",
  autosaveSaving: "계정에 저장 중",
  autosaveError: "저장 실패 · 재시도 대기",
  autosavePending: "변경사항 저장 대기",
  autosaveSaved: "계정에 저장됨",
  autosaveReady: "계정 저장 준비됨",
  gameRegionLabel: "Poke Lounge 게임 화면",
  gameCanvasLabel: "Poke Lounge 대화형 게임 캔버스",
  gameCanvasFallback: "게임 화면을 표시할 수 없으면 아래의 실시간 게임 상태 요약을 확인해 주세요.",
  settingsOpenLabel: "Poke Lounge 설정 열기",
  fullscreenOn: "전체화면 켜기",
  fullscreenOff: "전체화면 끄기",
  statusRailLabel: "게임 저장과 연결 상태",
  hydrationLoading: "저장된 모험을 불러오는 중입니다.",
  hydrationLocalFallback:
    "계정 저장을 불러오지 못해 현재 탭의 로컬 상태로 시작했습니다. 다시 연결하면 현재 탭의 진행을 유지한 채 계정 저장을 재개합니다.",
  hydrationRetry: "계정 저장 다시 연결",
  hydrationRetrying: "계정 저장 연결 중",
  hydrationRetryAfterRoom: "방을 나간 뒤 다시 연결",
  hydrationConflictTitle: "저장 진행을 선택해 주세요",
  hydrationConflictDescription:
    "계정과 현재 탭에 서로 다른 진행이 있습니다. 계정 저장을 사용하면 현재 탭 진행이 바뀌고, 현재 탭 진행을 저장하면 계정 저장을 덮어씁니다.",
  hydrationUseServer: "계정 저장 사용",
  hydrationUseLocal: "현재 탭 진행 저장",
  hydrationDecideLater: "나중에 결정",
  hydrationIdentityError: "계정 저장 식별 정보를 확인하지 못했습니다. 다시 로그인해 주세요.",
  noticeConfirm: "확인",
  settingsTitle: "설정과 검증 랭킹",
  settingsDescription: "화면과 소리를 조절하고 현재 방·저장 상태를 확인합니다.",
  settingsFullscreen: "전체화면",
  settingsUiSizeAria: "UI 사이즈 2단계",
  settingsShare: "링크 공유",
  settingsLocalShare: "같은 기기 다른 탭용 링크 복사",
  settingsShareCopied: "링크 복사됨",
  settingsShareFailed: "복사 실패",
  settingsSolo: "솔로 플레이",
  settingsRankingTitle: "검증된 1:1 랭킹",
  settingsRankingCaption: "서버 검증 결과만 반영",
  settingsRankingLoading: "랭킹을 불러오는 중입니다.",
  settingsRankingError: "랭킹을 불러오지 못했습니다.",
  settingsRankingRetry: "다시 시도",
  settingsRankingEmpty: "아직 검증된 기록이 없습니다.",
  settingsClose: "닫기",
  leaveTitle: "방에서 나갈까요?",
  leaveDescription: "현재 방 연결이 해제됩니다.",
  leaveContinue: "계속 플레이",
  leaveConfirm: "방 나가기",
  resultEyebrow: "플레이 결과",
  resultPlayTime: seconds => `플레이 시간 ${seconds}초`,
  resultUnranked: "일반 플레이 기록 · 공개 검증 랭킹 미반영",
  resultSaving: "기록 중",
  resultSave: "일반 기록 저장",
  resultRetry: "다시 플레이",
  resultRoomEntry: "새 방 선택",
  resultLobby: "게임 로비로",
  resultAuthRequired:
    "로그인 상태를 확인할 수 없어 이 결과는 저장할 수 없습니다. 다음 기록을 저장하려면 플레이 전에 로그인해 주세요.",
  resultSubmitting: "점수를 기록하는 중입니다.",
  resultSaved: "Poke Lounge 점수가 기록되었습니다.",
  resultSaveFailed: "점수 기록에 실패했습니다.",
  accessibleHelp: "게임 조작 도움말은 H 키 또는 물음표 버튼으로 열 수 있습니다.",
  startup: {
    title: "게임을 시작하지 못했습니다",
    description:
      "필요한 게임 데이터나 화면 코드를 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.",
    retry: "다시 시도",
    retrying: "다시 불러오는 중...",
    lobby: "입장 화면으로 돌아가기",
  },
  roomEntry: {
    title: "플레이 방식 선택",
    fanNotice:
      "Poke Lounge는 친구들과 함께 즐기기 위해 만든 비공식 팬 게임입니다. Pokémon 관련 권리는 각 권리자에게 있습니다.",
    soloTitle: "혼자 플레이",
    soloDescription: "저장된 모험이 있으면 이어서 하고, 없으면 새 모험을 시작합니다.",
    continue: "이어하기",
    newGame: "새 게임",
    tournamentSettings: "대회 설정",
    tournamentSettingsDescription: "로컬 방과 서버 방을 만들 때 공통으로 적용됩니다.",
    localTitle: "로컬 멀티플레이",
    localDescription:
      "같은 기기의 같은 브라우저 프로필에서 연 다른 탭끼리만 연결됩니다. 다른 기기나 브라우저 프로필에서는 참가할 수 없습니다.",
    localCreate: "로컬 방 만들기",
    roomCodePlaceholder: "방 코드",
    localJoin: "코드로 입장",
    localCodeLabel: "로컬 방 코드",
    serverTitle: "서버 경쟁전",
    serverDescription:
      "로그인한 플레이어 전용입니다. 고정 Lv.50 대전용 파티로 2인은 랭킹전, 3~6인은 비랭킹 토너먼트를 진행합니다.",
    serverCreate: "서버 방 만들기",
    serverCodePlaceholder: "서버 방 코드",
    serverJoin: "서버 코드로 입장",
    serverCodeLabel: "서버 방 코드",
    serverDisabled:
      "서버 경쟁전은 로그인한 플레이어만 이용할 수 있습니다. 로그인 후 다시 열어 주세요.",
    serverInviteRequiresLogin: "서버 경쟁전 초대는 로그인 후 참가할 수 있습니다.",
    invitePlaceholder: "방을 선택하면 초대 링크가 표시됩니다.",
    inviteDescription:
      "로컬 링크는 같은 기기의 같은 브라우저 프로필에서 연 다른 탭에서만 사용할 수 있습니다. 서버 링크는 로그인한 다른 기기에서도 사용할 수 있습니다.",
    inviteLabel: "초대 링크",
    localCodeRequired: "로컬 방 코드를 입력해 주세요.",
    serverCodeRequired: "서버 방 코드를 입력해 주세요.",
    preparing: "준비 중...",
    newGameTitle: "새 게임을 시작할까요?",
    newGameDescription:
      "현재 브라우저에 저장된 모험과 세션 진행 상황이 초기화됩니다. 로그인 상태라면 계정 저장에도 초기화된 상태가 반영될 수 있으며, 이 작업은 되돌릴 수 없습니다.",
    cancel: "취소",
    resetAndStart: "초기화 후 시작",
    preparationTime: "대회 시작 전 준비 시간",
    durationMinutes: minutes => `${minutes}분`,
    freshSession:
      "방 연결 정보가 만료되어 입장 화면으로 돌아왔습니다. 방 코드를 다시 확인해 주세요.",
    leaveTournamentTitle: "경기에서 나갈까요?",
    leaveTournamentDescription: "지금 나가면 진행 중인 경기가 기권 처리될 수 있습니다.",
    leaveRoomTitle: "방에서 나갈까요?",
    leaveRoomDescription: "현재 준비 상태와 방 연결이 해제됩니다.",
    leaveRoom: "방 나가기",
  },
};

const ENGLISH_COPY: PokeLoungeCopy = {
  ...KOREAN_COPY,
  locale: "en-US",
  unknownTrainer: "Unnamed Trainer",
  volumeMuted: "Muted",
  volumeLabel: percent => `Volume ${percent}%`,
  volumeAriaLabel: percent => (percent === 0 ? "Mute sound" : `Sound volume ${percent} percent`),
  uiLarge: "Large UI",
  uiNormal: "Normal UI",
  connectionConnected: "Room connected",
  connectionConnecting: "Connecting to room",
  connectionDisconnected: "Room disconnected",
  autosaveLocal: "Autosaved in this tab",
  autosaveLocalFallback: "Account save paused · saved in this tab",
  autosaveSaving: "Saving to account",
  autosaveError: "Save failed · waiting to retry",
  autosavePending: "Changes waiting to save",
  autosaveSaved: "Saved to account",
  autosaveReady: "Account save ready",
  gameRegionLabel: "Poke Lounge game screen",
  gameCanvasLabel: "Interactive Poke Lounge game canvas",
  gameCanvasFallback: "If the game canvas is unavailable, use the live game summary below.",
  settingsOpenLabel: "Open Poke Lounge settings",
  fullscreenOn: "Enter fullscreen",
  fullscreenOff: "Exit fullscreen",
  statusRailLabel: "Game save and connection status",
  hydrationLoading: "Loading your saved adventure.",
  hydrationLocalFallback:
    "We couldn't load your account save, so the game started with local data in this tab. Reconnecting resumes account saves while keeping this tab's progress.",
  hydrationRetry: "Reconnect account save",
  hydrationRetrying: "Reconnecting account save",
  hydrationRetryAfterRoom: "Reconnect after leaving the room",
  hydrationConflictTitle: "Choose which progress to keep",
  hydrationConflictDescription:
    "Your account and this tab contain different progress. Using the account save changes this tab; saving this tab overwrites the account save.",
  hydrationUseServer: "Use account save",
  hydrationUseLocal: "Save this tab's progress",
  hydrationDecideLater: "Decide later",
  hydrationIdentityError: "We could not verify the account save identity. Sign in again.",
  noticeConfirm: "OK",
  settingsTitle: "Settings and verified ranking",
  settingsDescription: "Adjust the display and sound, and check the current room and save status.",
  settingsFullscreen: "Fullscreen",
  settingsUiSizeAria: "Two-step UI size",
  settingsShare: "Copy invite link",
  settingsLocalShare: "Copy link for another tab on this device",
  settingsShareCopied: "Link copied",
  settingsShareFailed: "Copy failed",
  settingsSolo: "Solo play",
  settingsRankingTitle: "Verified 1v1 ranking",
  settingsRankingCaption: "Verified server results only",
  settingsRankingLoading: "Loading ranking.",
  settingsRankingError: "Could not load the ranking.",
  settingsRankingRetry: "Try again",
  settingsRankingEmpty: "No verified records yet.",
  settingsClose: "Close",
  leaveTitle: "Leave the room?",
  leaveDescription: "Your current room connection will end.",
  leaveContinue: "Keep playing",
  leaveConfirm: "Leave room",
  resultEyebrow: "Play result",
  resultPlayTime: seconds => `Play time ${seconds}s`,
  resultUnranked: "Standard play record · not included in the public verified ranking",
  resultSaving: "Saving",
  resultSave: "Save standard record",
  resultRetry: "Play again",
  resultRoomEntry: "Choose another room",
  resultLobby: "Game lobby",
  resultAuthRequired:
    "This result cannot be saved because your sign-in could not be verified. Sign in before playing to save your next result.",
  resultSubmitting: "Saving your score.",
  resultSaved: "Your Poke Lounge score was saved.",
  resultSaveFailed: "Could not save the score.",
  accessibleHelp: "Open the controls guide with H or the question-mark button.",
  startup: {
    title: "Could not start the game",
    description:
      "Required game data or screen code could not be loaded. Check your connection and try again.",
    retry: "Try again",
    retrying: "Loading again...",
    lobby: "Back to play selection",
  },
  roomEntry: {
    title: "Choose how to play",
    fanNotice:
      "Poke Lounge is an unofficial fan game made for playing with friends. Pokémon rights belong to their respective owners.",
    soloTitle: "Solo play",
    soloDescription: "Continue a saved adventure, or start a new one if no save exists.",
    continue: "Continue",
    newGame: "New game",
    tournamentSettings: "Tournament settings",
    tournamentSettingsDescription: "Used when creating both local and server rooms.",
    localTitle: "Local multiplayer",
    localDescription:
      "Only tabs opened in the same browser profile on this device can connect. Other devices and browser profiles cannot join.",
    localCreate: "Create local room",
    roomCodePlaceholder: "Room code",
    localJoin: "Join by code",
    localCodeLabel: "Local room code",
    serverTitle: "Server competition",
    serverDescription:
      "Signed-in players use fixed Lv.50 battle parties. Two players are ranked; three to six play an unranked tournament.",
    serverCreate: "Create server room",
    serverCodePlaceholder: "Server room code",
    serverJoin: "Join server room",
    serverCodeLabel: "Server room code",
    serverDisabled:
      "Server competition is available to signed-in players. Sign in and reopen this page.",
    serverInviteRequiresLogin: "Sign in before joining a server competition invite.",
    invitePlaceholder: "Choose a room to show its invite link.",
    inviteDescription:
      "Local links work only in another tab in the same browser profile on this device. Server links work on other signed-in devices.",
    inviteLabel: "Invite link",
    localCodeRequired: "Enter a local room code.",
    serverCodeRequired: "Enter a server room code.",
    preparing: "Preparing...",
    newGameTitle: "Start a new game?",
    newGameDescription:
      "This clears the adventure and session progress stored in this browser. If you are signed in, the reset state may also be saved to your account. This cannot be undone.",
    cancel: "Cancel",
    resetAndStart: "Reset and start",
    preparationTime: "Preparation time before the tournament",
    durationMinutes: minutes => `${minutes} min`,
    freshSession:
      "The room session expired, so you were returned to play selection. Check the room code and try again.",
    leaveTournamentTitle: "Leave the match?",
    leaveTournamentDescription: "Leaving now may count as forfeiting the active match.",
    leaveRoomTitle: "Leave the room?",
    leaveRoomDescription: "Your ready state and room connection will be cleared.",
    leaveRoom: "Leave room",
  },
};

const JAPANESE_COPY: PokeLoungeCopy = {
  ...KOREAN_COPY,
  locale: "ja-JP",
  unknownTrainer: "名前のないトレーナー",
  volumeMuted: "ミュート",
  volumeLabel: percent => `音量 ${percent}%`,
  volumeAriaLabel: percent => (percent === 0 ? "音をミュート" : `音量 ${percent}パーセント`),
  uiLarge: "UIを大きく",
  uiNormal: "UIを標準に",
  connectionConnected: "ルーム接続済み",
  connectionConnecting: "ルーム接続中",
  connectionDisconnected: "ルーム切断",
  autosaveLocal: "このタブに自動保存",
  autosaveLocalFallback: "アカウント保存を停止中・このタブに保存",
  autosaveSaving: "アカウントに保存中",
  autosaveError: "保存失敗・再試行待ち",
  autosavePending: "変更の保存待ち",
  autosaveSaved: "アカウントに保存済み",
  autosaveReady: "アカウント保存の準備完了",
  gameRegionLabel: "ポケラウンジのゲーム画面",
  gameCanvasLabel: "操作可能なポケラウンジのゲームキャンバス",
  gameCanvasFallback: "ゲーム画面を表示できない場合は、下のリアルタイム状況を確認してください。",
  settingsOpenLabel: "ポケラウンジの設定を開く",
  fullscreenOn: "全画面表示にする",
  fullscreenOff: "全画面表示を終了",
  statusRailLabel: "ゲームの保存と接続状況",
  hydrationLoading: "保存された冒険を読み込んでいます。",
  hydrationLocalFallback:
    "アカウントのセーブデータを読み込めなかったため、このタブのローカルデータで開始しました。再接続すると、このタブの進行を維持したままアカウント保存を再開します。",
  hydrationRetry: "アカウント保存を再接続",
  hydrationRetrying: "アカウント保存に再接続中",
  hydrationRetryAfterRoom: "ルーム退出後に再接続",
  hydrationConflictTitle: "残す進行を選んでください",
  hydrationConflictDescription:
    "アカウントとこのタブに異なる進行があります。アカウント保存を使うとこのタブが変わり、このタブの進行を保存するとアカウント保存を上書きします。",
  hydrationUseServer: "アカウント保存を使用",
  hydrationUseLocal: "このタブの進行を保存",
  hydrationDecideLater: "あとで決める",
  hydrationIdentityError:
    "アカウント保存の識別情報を確認できません。もう一度ログインしてください。",
  noticeConfirm: "確認",
  settingsTitle: "設定と検証済みランキング",
  settingsDescription: "画面と音を調整し、現在のルームと保存状況を確認します。",
  settingsFullscreen: "全画面表示",
  settingsUiSizeAria: "2段階のUIサイズ",
  settingsShare: "招待リンクをコピー",
  settingsLocalShare: "この端末の別タブ用リンクをコピー",
  settingsShareCopied: "リンクをコピーしました",
  settingsShareFailed: "コピーに失敗しました",
  settingsSolo: "ソロプレイ",
  settingsRankingTitle: "検証済み1対1ランキング",
  settingsRankingCaption: "サーバー検証済み結果のみ",
  settingsRankingLoading: "ランキングを読み込んでいます。",
  settingsRankingError: "ランキングを読み込めませんでした。",
  settingsRankingRetry: "再試行",
  settingsRankingEmpty: "検証済み記録はまだありません。",
  settingsClose: "閉じる",
  leaveTitle: "ルームから退出しますか？",
  leaveDescription: "現在のルーム接続が終了します。",
  leaveContinue: "プレイを続ける",
  leaveConfirm: "ルームを退出",
  resultEyebrow: "プレイ結果",
  resultPlayTime: seconds => `プレイ時間 ${seconds}秒`,
  resultUnranked: "通常プレイ記録・公開検証ランキング対象外",
  resultSaving: "記録中",
  resultSave: "通常記録を保存",
  resultRetry: "もう一度プレイ",
  resultRoomEntry: "別のルームを選ぶ",
  resultLobby: "ゲームロビーへ",
  resultAuthRequired:
    "ログイン状態を確認できないため、この結果は保存できません。次の結果を保存するには、プレイ前にログインしてください。",
  resultSubmitting: "スコアを記録しています。",
  resultSaved: "ポケラウンジのスコアを記録しました。",
  resultSaveFailed: "スコアを記録できませんでした。",
  accessibleHelp: "Hキーまたは「？」ボタンで操作ガイドを開けます。",
  startup: {
    title: "ゲームを開始できませんでした",
    description:
      "必要なゲームデータまたは画面コードを読み込めませんでした。接続を確認して再試行してください。",
    retry: "再試行",
    retrying: "再読み込み中...",
    lobby: "プレイ選択に戻る",
  },
  roomEntry: {
    title: "プレイ方法を選択",
    fanNotice:
      "ポケラウンジは友達と楽しむための非公式ファンゲームです。Pokémonに関する権利は各権利者に帰属します。",
    soloTitle: "ソロプレイ",
    soloDescription: "保存された冒険があれば続きから、なければ新しい冒険を始めます。",
    continue: "続きから",
    newGame: "ニューゲーム",
    tournamentSettings: "大会設定",
    tournamentSettingsDescription: "ローカルルームとサーバールームの作成時に共通で使用します。",
    localTitle: "ローカルマルチプレイ",
    localDescription:
      "この端末の同じブラウザプロファイルで開いた別タブ同士だけが接続できます。他の端末やプロファイルからは参加できません。",
    localCreate: "ローカルルームを作成",
    roomCodePlaceholder: "ルームコード",
    localJoin: "コードで参加",
    localCodeLabel: "ローカルルームコード",
    serverTitle: "サーバー対戦",
    serverDescription:
      "ログイン済みプレイヤーは固定Lv.50パーティを使用します。2人はランク戦、3〜6人は非ランクトーナメントです。",
    serverCreate: "サーバールームを作成",
    serverCodePlaceholder: "サーバールームコード",
    serverJoin: "サーバールームに参加",
    serverCodeLabel: "サーバールームコード",
    serverDisabled:
      "サーバー対戦はログイン済みプレイヤー専用です。ログイン後にページを開き直してください。",
    serverInviteRequiresLogin: "サーバー対戦の招待に参加するにはログインしてください。",
    invitePlaceholder: "ルームを選ぶと招待リンクが表示されます。",
    inviteDescription:
      "ローカルリンクは、この端末の同じブラウザプロファイルで開いた別タブだけで使えます。サーバーリンクはログイン済みの別端末でも使えます。",
    inviteLabel: "招待リンク",
    localCodeRequired: "ローカルルームコードを入力してください。",
    serverCodeRequired: "サーバールームコードを入力してください。",
    preparing: "準備中...",
    newGameTitle: "ニューゲームを始めますか？",
    newGameDescription:
      "このブラウザに保存された冒険とセッション進行状況が初期化されます。ログイン中は初期化状態がアカウントにも保存される場合があります。この操作は元に戻せません。",
    cancel: "キャンセル",
    resetAndStart: "初期化して開始",
    preparationTime: "大会開始前の準備時間",
    durationMinutes: minutes => `${minutes}分`,
    freshSession:
      "ルーム接続情報の期限が切れたため、プレイ選択に戻りました。ルームコードを確認してください。",
    leaveTournamentTitle: "試合から退出しますか？",
    leaveTournamentDescription: "今退出すると、進行中の試合が棄権扱いになる場合があります。",
    leaveRoomTitle: "ルームから退出しますか？",
    leaveRoomDescription: "準備状態とルーム接続が解除されます。",
    leaveRoom: "ルームを退出",
  },
};

const COPY_BY_LOCALE: Record<PokeLoungeLocale, PokeLoungeCopy> = {
  "ko-KR": KOREAN_COPY,
  "en-US": ENGLISH_COPY,
  "ja-JP": JAPANESE_COPY,
};

export function resolvePokeLoungeLocale(locale: string | null | undefined): PokeLoungeLocale {
  if (locale?.toLowerCase().startsWith("en")) {
    return "en-US";
  }

  if (locale?.toLowerCase().startsWith("ja")) {
    return "ja-JP";
  }

  return "ko-KR";
}

export function resolvePokeLoungeLocaleFromUrl(url: URL): PokeLoungeLocale {
  const routeLocale = url.pathname.split("/").filter(Boolean)[0];
  return resolvePokeLoungeLocale(routeLocale);
}

export function getPokeLoungeCopy(locale: string | null | undefined): PokeLoungeCopy {
  return COPY_BY_LOCALE[resolvePokeLoungeLocale(locale)];
}

export function getPokeLoungeCopyForUrl(url: URL): PokeLoungeCopy {
  return COPY_BY_LOCALE[resolvePokeLoungeLocaleFromUrl(url)];
}
