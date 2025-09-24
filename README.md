# 스타레일 디스코드 봇

붕괴: 스타레일 게임 정보를 제공하는 Discord 봇입니다.
Node.js 학습을 위해 진행하였습니다.

## 주요 기능

### 슬래시 명령어
- `/워프정보` - 현재 진행중인 캐릭터 이벤트 워프 정보를 크롤링하여 제공합니다.
- `이벤트등록: True` 옵션을 통해 Discord 서버 이벤트 자동 생성이 가능합니다.
- `/캐릭터정보 [닉네임]` - 지정된 캐릭터의 간단한 정보를 조회합니다.
- `/ping` - 봇 응답 상태를 확인합니다.

## 기술 스택

- **Node.js** - 런타임 환경
- **Discord.js v14** - Discord API 래퍼
- **djs-commander** - 명령어 핸들링
- **Axios** - HTTP 요청 처리
- **Cheerio** - HTML 파싱 및 웹 크롤링
- **dotenv** - 환경변수 관리

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.example` 파일을 참조하여 `.env` 파일 생성:
```env
TOKEN = "your_discord_bot_token"
```

### 3. 봇 실행
```bash
nodemon index.js
```

## 기능 상세

### 자동 크롤링
- 나무위키에서 실시간으로 워프 정보 수집
- 워프 이미지, 기간, 메인 캐릭터 정보 제공
- 진행중/종료된 워프 자동 구분

### Discord 이벤트 연동
- `/워프정보 이벤트등록:True` 사용 시 자동으로 서버 이벤트 생성
- 워프 이미지를 이벤트 커버로 설정
- 중복 이벤트 방지 기능
- 이벤트 시간 자동 조정 (과거 날짜 처리)

## 필요한 봇 권한

- `Send Messages` - 메시지 전송
- `Use Slash Commands` - 슬래시 명령어 사용
- `Embed Links` - 임베드 메시지 전송
- `Attach Files` - 파일 첨부
- `Manage Events` - 서버 이벤트 생성/관리 (워프 이벤트 등록 기능용)

## 프로젝트 구조

```
hsr_discord-bot-v2/
├── commands/
│   ├── charinfo.js      # 캐릭터 정보 명령어
│   ├── ping.js          # 핑 명령어
│   └── warp.js          # 워프 정보 명령어
├── events/
│   └── clientReady/
│       ├── console-log.js   # 봇 시작 로그
│       └── setState.js      # 봇 활동 상태 설정
├── index.js             # 메인 실행 파일
├── package.json         # 의존성 관리
└── .env.example         # 환경변수 예시
```

## 봇 상태

봇이 온라인 상태일 때 "「완·매」와 창조물 제작" 활동을 표시합니다.

## 주의사항

- 워프 정보는 나무위키 크롤링을 통해 제공되므로, 사이트 구조 변경 시 일시적으로 작동하지 않을 수 있습니다.
- Discord 이벤트 생성 기능 사용 시 봇에 `Manage Events` 권한이 필요합니다.
- 과도한 요청을 방지하기 위해 적절한 사용을 권장합니다.

## 라이선스

이 프로젝트는 개인 사용 목적으로 제작되었습니다.
