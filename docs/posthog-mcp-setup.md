# PostHog MCP 서버 설정 가이드

이 가이드는 PostHog MCP (Model Context Protocol) 서버를 설정하여 Cursor나 Claude Desktop에서 PostHog 대시보드를 생성하고 관리할 수 있도록 하는 방법을 설명합니다.

## 1. PostHog Personal API Key 발급

1. [PostHog 웹사이트](https://app.posthog.com)에 로그인합니다.
2. 우측 상단의 프로필 아이콘을 클릭합니다.
3. "Personal API Keys" 메뉴를 선택합니다.
4. "Create Personal API Key" 버튼을 클릭합니다.
5. 키 이름을 입력하고 (예: "MCP Server Key") 생성합니다.
6. **생성된 API Key를 안전한 곳에 복사해두세요.** (한 번만 표시됩니다)

## 2. Cursor 설정

### 2.1 설정 파일 위치

Cursor의 설정 파일은 다음 위치에 있습니다:
- Windows: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Linux: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### 2.2 설정 파일 편집

설정 파일을 열고 다음 내용을 추가합니다:

```json
{
  "mcpServers": {
    "posthog": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.posthog.com/sse",
        "--header",
        "Authorization: Bearer YOUR_POSTHOG_API_KEY_HERE"
      ]
    }
  }
}
```

**중요**: `YOUR_POSTHOG_API_KEY_HERE`를 1단계에서 발급받은 Personal API Key로 교체하세요.

### 2.3 Cursor 재시작

설정 파일을 저장한 후 Cursor를 완전히 종료하고 다시 시작합니다.

## 3. Claude Desktop 설정

### 3.1 설정 파일 위치

Claude Desktop의 설정 파일은 다음 위치에 있습니다:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

### 3.2 설정 파일 편집

설정 파일을 열고 다음 내용을 추가합니다:

```json
{
  "mcpServers": {
    "posthog": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.posthog.com/sse",
        "--header",
        "Authorization: Bearer YOUR_POSTHOG_API_KEY_HERE"
      ]
    }
  }
}
```

**중요**: `YOUR_POSTHOG_API_KEY_HERE`를 1단계에서 발급받은 Personal API Key로 교체하세요.

### 3.3 Claude Desktop 재시작

설정 파일을 저장한 후 Claude Desktop을 완전히 종료하고 다시 시작합니다.

## 4. 환경 변수 설정 (선택사항)

환경 변수를 사용하여 API Key를 관리할 수도 있습니다:

### Windows (PowerShell)
```powershell
$env:POSTHOG_AUTH_HEADER = "Bearer YOUR_POSTHOG_API_KEY_HERE"
```

### macOS/Linux
```bash
export POSTHOG_AUTH_HEADER="Bearer YOUR_POSTHOG_API_KEY_HERE"
```

그리고 설정 파일에서:
```json
{
  "mcpServers": {
    "posthog": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.posthog.com/sse",
        "--header",
        "Authorization:${POSTHOG_AUTH_HEADER}"
      ],
      "env": {
        "POSTHOG_AUTH_HEADER": "Bearer YOUR_POSTHOG_API_KEY_HERE"
      }
    }
  }
}
```

## 5. 연결 확인

MCP 서버가 제대로 연결되었는지 확인하려면:

1. Cursor/Claude Desktop에서 AI 어시스턴트에게 "PostHog MCP 서버가 연결되어 있나요?"라고 물어봅니다.
2. 또는 "PostHog 대시보드를 생성해줘"라고 요청해봅니다.

## 6. 문제 해결

### MCP 서버가 연결되지 않는 경우

1. **API Key 확인**: API Key가 올바르게 입력되었는지 확인하세요.
2. **설정 파일 형식 확인**: JSON 형식이 올바른지 확인하세요 (쉼표, 따옴표 등).
3. **재시작**: Cursor/Claude Desktop을 완전히 종료하고 다시 시작하세요.
4. **네트워크 확인**: 인터넷 연결이 정상인지 확인하세요.
5. **로그 확인**: Cursor/Claude Desktop의 개발자 콘솔에서 에러 메시지를 확인하세요.

### API Key 권한 문제

PostHog Personal API Key는 다음 권한이 필요합니다:
- 대시보드 읽기/쓰기
- 인사이트 읽기/쓰기
- 이벤트 읽기

PostHog 설정에서 API Key의 권한을 확인하세요.

## 7. 보안 주의사항

- **절대 API Key를 Git에 커밋하지 마세요.**
- `.gitignore`에 설정 파일을 추가하는 것을 고려하세요.
- 환경 변수를 사용하는 것이 더 안전합니다.
- API Key를 정기적으로 갱신하는 것을 권장합니다.

## 8. 추가 리소스

- [PostHog MCP 공식 문서](https://posthog.com/docs/model-context-protocol)
- [PostHog API 문서](https://posthog.com/docs/api)
- [MCP 프로토콜 문서](https://modelcontextprotocol.io)

## 9. 다음 단계

MCP 서버가 설정되면 다음을 수행할 수 있습니다:

1. PostHog 대시보드 생성
2. 인사이트 생성
3. 이벤트 쿼리
4. 세그먼트 생성
5. 코호트 분석

AI 어시스턴트에게 "UTM 파라미터별 퍼널 전환 분석 대시보드를 생성해줘"라고 요청하면 자동으로 대시보드가 생성됩니다.

