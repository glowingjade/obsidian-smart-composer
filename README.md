<h1 align="center">Smart Composer</h1>

<p align="center">
  <a href="https://github.com/glowingjade/obsidian-smart-composer/wiki">문서(Documentation)</a>
  ·
  <a href="https://github.com/glowingjade/obsidian-smart-composer/issues">버그 제보</a>
  ·
  <a href="https://github.com/glowingjade/obsidian-smart-composer/discussions">토론(Discussions)</a>
</p>

> [!NOTE]
> **최근 업데이트**
>
> - **v1.2.8** — Gemini 계정 연결 지원
> - **v1.2.7** — Claude / OpenAI 계정을 API Key 없이 연결 지원
> - **v1.2.6** — GPT-5.2, Opus 4.5, Gemini 3, Grok 4.1 지원
> - **🔌 MCP 지원** — [Model Context Protocol](https://modelcontextprotocol.io) 기반 외부 도구/데이터 연동

> [!WARNING]
> **⚠️ 유지보수 안내**
>
> 현재 플러그인은 1인 개발자가 유지보수하고 있으며, **활발한 신규 개발 단계는 아닙니다.**
> 간헐적 업데이트와 버그 수정은 가능하지만, **이슈/기능 요청 반영이 지연될 수 있습니다.**
>
> 커뮤니티 포크 목록은 [Community Fork Collection](https://github.com/glowingjade/obsidian-smart-composer/discussions/496)에서 확인할 수 있습니다.

> [!WARNING]
> **Claude 구독 연결 관련 위험 안내**
>
> 2026년 1월 기준 Anthropic은 서드파티 OAuth 접근을 약관 위반 사유로 제한한 이력이 있습니다.
> Smart Composer의 구독 연결은 OAuth 스타일 흐름을 사용하며, 일부 서드파티 클라이언트 사용 사례에서 **계정 제한/정지 보고**가 있습니다.
>
> OpenAI(ChatGPT), Google(Gemini)은 동일 수준의 제재 보고가 상대적으로 적지만, 공식 API와 동일한 보장을 제공하지는 않습니다.
>
> **반드시 사용자 책임 하에 사용**하고, 자동화보다는 개인 대화형 용도로 제한하는 것을 권장합니다.

![SC1_Title.gif](https://github.com/user-attachments/assets/a50a1f80-39ff-4eba-8090-e3d75e7be98c)

Smart Composer는 **Obsidian에서 노트 문맥을 그대로 활용해 AI와 작성·수정·검색을 통합**할 수 있도록 설계된 플러그인입니다.
Cursor AI의 문맥 선택 방식과 ChatGPT Canvas의 편집 흐름에서 영감을 받아, “노트 정리”와 “AI 작업” 사이 전환 비용을 줄이는 데 집중합니다.

---

## 1) 코드 분석 요약 (서비스 역할 관점)

### 서비스의 핵심 역할

Smart Composer는 Obsidian 안에서 다음 4가지 역할을 수행합니다.

1. **대화 허브(Chat Hub)**: 노트 문맥/외부 문맥을 결합해 AI 질의·응답을 관리
2. **편집 실행기(Apply Engine)**: AI가 제안한 변경사항을 문서에 안전하게 적용
3. **지식 검색기(RAG Engine)**: 볼트 전체 인덱싱 후 관련 문서를 의미 기반 검색
4. **도구 오케스트레이터(MCP)**: 외부 MCP 서버 도구를 채팅 흐름에 통합

### 구조 관점에서 본 주요 모듈

- `src/main.ts`
  - 플러그인 엔트리 포인트
  - Chat/Apply View 등록, 명령(Command) 등록, 설정 로드/저장, RAG 인덱스 재구축·업데이트 트리거
- `src/core/llm/*`
  - OpenAI, Anthropic, Gemini, Ollama 등 다양한 제공자(Provider) 어댑터와 메시지 변환기
- `src/core/rag/*`
  - 임베딩 생성 및 볼트 인덱싱/검색 로직
- `src/core/mcp/*`
  - MCP 서버 연동 및 도구 호출 관리
- `src/database/*` 및 `src/database/json/*`
  - 벡터/템플릿/채팅 데이터 저장 계층과 JSON 마이그레이션 경로
- `src/components/*`, `src/contexts/*`
  - 채팅 UI, 설정 UI, 상태 공유 컨텍스트

즉, 이 서비스는 단순 채팅 플러그인이 아니라, **“Obsidian 기반 AI 작업 운영체제”**에 가깝습니다.

---

## 2) 주요 기능

### 2.1 문맥 기반 채팅 (Contextual Chat)

![SC2_ContextChat.gif](https://github.com/user-attachments/assets/8da4c189-399a-450a-9591-95f1c9af1bc8)

일반 AI 챗처럼 단일 프롬프트만 보내는 방식이 아니라, Obsidian 볼트의 특정 파일/폴더를 선택해 정확한 문맥으로 대화할 수 있습니다.

- `@파일명` 형태로 문맥 대상 지정
- 선택한 문서 기반으로 답변 생성
- 반복 설명(배경 프롬프트) 부담 감소

#### 멀티미디어 문맥

<img src="https://github.com/user-attachments/assets/b22175d4-80a2-4122-8555-2b9dd4987f93" alt="SC2-2_MultiContext.png" width="360"/>

텍스트 문서 외에도 웹/이미지/유튜브 링크를 문맥으로 추가할 수 있습니다.

- 웹페이지 본문 자동 추출
- 이미지 입력(업로드, 드래그 앤 드롭, 클립보드 붙여넣기)
- 유튜브 링크 자막 추출 후 문맥 반영

### 2.2 Apply Edit (AI 제안 수정 적용)

![SC3_ApplyEdit.gif](https://github.com/user-attachments/assets/35ee03ff-4a61-4d08-8032-ca61fb37dcf1)

AI가 제안한 변경점을 검토 후 한 번에 적용할 수 있습니다.

- 문서 변경 제안 생성
- 클릭 기반 즉시 반영
- 생성과 편집 사이의 작업 단절 최소화

### 2.3 Vault Search (RAG)

![SC4_RAG-ezgif.com-crop-video.gif](https://github.com/user-attachments/assets/91c3ab8d-56d7-43b8-bb4a-1e73615a40ec)

볼트 전체를 의미 기반으로 검색해 관련 노트를 자동 보강 문맥으로 활용합니다.

- `Cmd/Ctrl + Shift + Enter`로 검색 기반 응답 실행
- 유사도 기반 문서 탐색으로 답변 품질 향상

### 2.4 MCP (Model Context Protocol) 연동

![mcp_demo](https://github.com/user-attachments/assets/4c80a1af-4cbf-4aa4-90d2-457499553357)

외부 MCP 서버를 연결해 채팅 중 외부 도구/데이터를 호출할 수 있습니다.

- 사내 도구, API, 데이터 소스 확장 가능
- “대화 + 도구 실행” 통합 워크플로우 구현

### 2.5 모델/프롬프트/템플릿 확장

- 다양한 모델 제공자 지원 (OpenAI, Anthropic, Gemini, xAI, DeepSeek, Mistral, Perplexity, OpenRouter, Ollama, LM Studio, Azure OpenAI, OpenAI 호환 등)
- 로컬 모델(Ollama/LM Studio) 지원
- 시스템 프롬프트 커스터마이징
- `/` 기반 프롬프트 템플릿 생성/재사용

---

## 3) 이 서비스가 해결하는 문제

Smart Composer는 아래 문제를 해결하는 데 초점을 둡니다.

- 매 질문마다 배경 문맥을 다시 설명해야 하는 비효율
- “노트 앱 ↔ AI 서비스” 전환으로 생기는 집중력 저하
- 검색/작성/수정 도구가 분리되어 발생하는 워크플로우 단절

결과적으로, 사용자는 Obsidian 안에서 **아이디어 정리 → 조사 → 작성 → 편집**을 연속적으로 수행할 수 있습니다.

---

## 4) 설치 및 시작

> [!IMPORTANT]
> **Installer 버전 주의**
>
> 플러그인이 정상 로드되지 않으면 Obsidian 앱 자체 설치 프로그램(Installer)을 최신 버전으로 갱신해야 할 수 있습니다.
>
> 1. `Settings > General > Check for updates`로 일반 업데이트 수행
> 2. 문제가 지속되면 [Obsidian 다운로드 페이지](https://obsidian.md/download)에서 설치 파일 재설치

1. Obsidian 설정 열기
2. `Community plugins` > `Browse` 이동
3. `Smart Composer` 검색 후 설치
4. 플러그인 활성화
5. `Settings > Smart Composer`에서 연결 설정
   - **구독 연결(무 API Key)**: Claude/OpenAI 계정 연결
   - **API 제공자 연결(사용량 과금)**: 각 제공자 API Key 입력

> [!TIP]
> 무료 옵션이 필요하다면, Smart Composer 사용 사례에서 Gemini 무료 API 조합이 상대적으로 실용적입니다.
> 단, 민감 정보 전송 전에는 반드시 제공자 개인정보 처리정책을 확인하세요.

상세 문서는 [공식 Documentation](https://github.com/glowingjade/obsidian-smart-composer/wiki)에서 확인할 수 있습니다.

---

## 5) 로드맵

진행 현황은 [GitHub Projects 보드](https://github.com/glowingjade/obsidian-smart-composer/projects?query=is%3Aopen)에서 확인할 수 있습니다.

예정 항목:

- 외부 파일(PDF, DOCX 등) 문맥 지원 확장
- 태그/메타데이터 기반 멘션 개선

---

## 6) 피드백 및 기여

- 버그 제보: [Issues](https://github.com/glowingjade/obsidian-smart-composer/issues)
- 기능 제안: [Discussions - Ideas & Feature Requests](https://github.com/glowingjade/obsidian-smart-composer/discussions/categories/ideas-feature-requests)
- 사용 사례 공유: [Discussions - Smart Composer Showcase](https://github.com/glowingjade/obsidian-smart-composer/discussions/categories/smart-composer-showcase)

기여 전에는 [CONTRIBUTING.md](CONTRIBUTING.md)를 확인해 주세요.

---

## Contributors

### Core Team

**[@glowingjade](https://github.com/glowingjade)** ([Twitter](https://x.com/andy_suh_)), **[@kevin-on](https://github.com/kevin-on)**, **[@realsnoopso](https://github.com/realsnoopso)** ([Twitter](https://twitter.com/RealSnoopSo) · [LinkedIn](https://linkedin.com/in/realsnoopso)), **[@woosukji](https://github.com/woosukji)**

### Additional Contributors

프로젝트 개선에 기여해주신 모든 분들께 감사드립니다.

## License

본 프로젝트는 [MIT License](LICENSE)를 따릅니다.

## Support the Project

<a href="https://www.buymeacoffee.com/kevin.on" target="_blank">
  <img src="https://github.com/user-attachments/assets/e794767d-b7dd-40eb-9132-e48ae7088000" alt="Buy Me A Coffee" width="180">
</a>

업데이트 소식: [@andy_suh_](https://x.com/andy_suh_)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=glowingjade/obsidian-smart-composer&type=Date)](https://star-history.com/#glowingjade/obsidian-smart-composer&Date)
