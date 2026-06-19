# Agent Runtime Phase 1 Implementation Plan

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通第一条可运行闭环，让前端通过 Java 实时消费 Python 输出的标准 Agent 事件流。

**Architecture:** 这一阶段只做最小可运行链路：Python 负责输出统一 `agent-event` 协议；Java Gateway 新增一个代理型 SSE 接口，负责把登录用户请求转发给 Python 并将事件原样透传给前端；前端 `EditorPage` 改为消费标准事件对象并按 `message / think / tool / skill / mcp` 渲染。PostgreSQL、RabbitMQ 和历史回放在后续阶段接入，本阶段先把协议、代理和 UI 状态模型稳定下来。

**Tech Stack:** FastAPI, Spring Cloud Gateway WebFlux, Jackson, React 18, TypeScript, Vite

---

## File Structure

### Python

- Create: `python-ai/app/runtime/events.py`
  - 定义标准事件 envelope、事件构造函数和 SSE 编码函数。
- Modify: `python-ai/app/models/schemas.py`
  - 增加 Java -> Python 的流式请求模型。
- Modify: `python-ai/app/agents/novel_agent.py`
  - 从零散 SSE 字符串改为输出标准事件字典。
- Modify: `python-ai/app/api/routes.py`
  - `/agent/chat/stream` 改为统一输出 `agent-event` / `stream-end`。
- Test: `python-ai/tests/test_agent_stream_events.py`
  - 验证事件顺序、事件类型和 SSE 编码。

### Java

- Modify: `legacy/novel-agent/agent-gateway/pom.xml`
  - 增加 WebFlux 客户端与测试依赖。
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/AgentStreamRequest.java`
  - 接收前端请求。
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/PythonAgentRequest.java`
  - 发给 Python 的结构化请求体。
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/AgentStreamEvent.java`
  - Java 透传的事件载体。
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/AgentContextAssembler.java`
  - 组装第一阶段最小上下文。
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/PythonAgentClient.java`
  - 使用 `WebClient` 调 Python SSE。
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/AgentGatewayService.java`
  - 负责转发与透传。
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/controller/AgentStreamController.java`
  - 提供 `/api/agent/chat/stream`。
- Test: `legacy/novel-agent/agent-gateway/src/test/java/com/novelai/gateway/service/AgentGatewayServiceTest.java`
  - 验证 Java 能把 Python 事件流转成前端 SSE。

### Frontend

- Create: `frontend/src/types/agent.ts`
  - 定义事件类型、步骤状态和运行时视图模型。
- Modify: `frontend/src/utils/api.ts`
  - 增加 Java Agent SSE 入口构造。
- Modify: `frontend/src/pages/EditorPage.tsx`
  - 从直连 Python 改为消费 Java SSE，并按事件模型更新 UI。
- Test: `frontend/src/pages/EditorPage.stream.test.tsx`
  - 验证事件序列映射到页面状态。

## Scope Note

本计划只覆盖 Phase 1 最小闭环，不包含 RabbitMQ、PostgreSQL 持久化、历史回放和 DLQ。原因是这些属于后续独立可交付阶段，先稳定协议和实时代理可以显著降低后续返工风险。

### Task 1: Python Standard Event Stream

**Files:**
- Create: `python-ai/app/runtime/events.py`
- Modify: `python-ai/app/models/schemas.py`
- Modify: `python-ai/app/agents/novel_agent.py`
- Modify: `python-ai/app/api/routes.py`
- Test: `python-ai/tests/test_agent_stream_events.py`

- [ ] **Step 1: Write the failing Python tests**

```python
from app.runtime.events import build_event, encode_sse


def test_build_event_sets_required_fields():
    event = build_event(
        event_type="message.delta",
        run_id="run-1",
        session_id="session-1",
        message_id="message-1",
        step_id="step-1",
        sequence=3,
        payload={"text": "hello"},
    )

    assert event["type"] == "message.delta"
    assert event["run_id"] == "run-1"
    assert event["sequence"] == 3
    assert event["payload"]["text"] == "hello"
    assert event["persist"] is True


def test_encode_sse_wraps_agent_event():
    raw = encode_sse("agent-event", {"type": "run.started", "run_id": "run-1"})

    assert raw.startswith("event: agent-event\n")
    assert '\"type\": \"run.started\"' in raw
    assert raw.endswith("\n\n")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest python-ai/tests/test_agent_stream_events.py -v`  
Expected: FAIL with `ModuleNotFoundError: No module named 'app.runtime.events'`

- [ ] **Step 3: Write minimal event model and SSE encoder**

```python
# python-ai/app/runtime/events.py
from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any
from uuid import uuid4


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_event(
    event_type: str,
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    sequence: int,
    payload: dict[str, Any],
    *,
    parent_step_id: str | None = None,
    source: str = "runtime",
    persist: bool = True,
) -> dict[str, Any]:
    return {
        "event_id": f"evt_{uuid4().hex}",
        "run_id": run_id,
        "session_id": session_id,
        "message_id": message_id,
        "step_id": step_id,
        "parent_step_id": parent_step_id,
        "sequence": sequence,
        "timestamp": _utc_now(),
        "type": event_type,
        "source": source,
        "persist": persist,
        "payload": payload,
    }


def encode_sse(event_name: str, data: dict[str, Any]) -> str:
    return f"event: {event_name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
```

- [ ] **Step 4: Extend Python request schema for Java gateway**

```python
# python-ai/app/models/schemas.py
class AgentTraceOptions(BaseModel):
    emit_think: bool = True
    emit_tool: bool = True
    emit_skill: bool = True
    emit_mcp: bool = True


class AgentUserContext(BaseModel):
    id: int
    roles: list[str] = Field(default_factory=list)


class AgentInputPayload(BaseModel):
    message: str
    mode: str = "continue"


class AgentExecutionRequest(BaseModel):
    run_id: str
    session_id: str
    message_id: str
    user: AgentUserContext
    input: AgentInputPayload
    context: dict = Field(default_factory=dict)
    trace: AgentTraceOptions = Field(default_factory=AgentTraceOptions)
```

- [ ] **Step 5: Refactor `novel_agent.py` to yield structured events**

```python
# inside python-ai/app/agents/novel_agent.py
from uuid import uuid4

from app.runtime.events import build_event


async def chat_stream(
    self,
    run_id: str,
    session_id: str,
    message_id: str,
    message: str,
    context: Optional[dict] = None,
) -> AsyncIterator[dict]:
    sequence = 1
    think_step_id = f"step_{uuid4().hex}"

    yield build_event(
        event_type="think.started",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=think_step_id,
        sequence=sequence,
        payload={"title": "分析请求"},
    )
    sequence += 1

    yield build_event(
        event_type="think.delta",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=think_step_id,
        sequence=sequence,
        payload={"text": "正在分析用户的写作意图"},
    )
    sequence += 1

    message_step_id = f"step_{uuid4().hex}"
    yield build_event(
        event_type="message.started",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=message_step_id,
        sequence=sequence,
        payload={"role": "assistant"},
    )
    sequence += 1

    # existing streaming logic should yield message.delta events
```

- [ ] **Step 6: Convert `/agent/chat/stream` to emit only standardized SSE**

```python
# inside python-ai/app/api/routes.py
from app.runtime.events import encode_sse


@router.post("/agent/chat/stream")
async def agent_chat_stream(request: AgentExecutionRequest):
    async def event_generator():
        start_event = {
            "run_id": request.run_id,
            "session_id": request.session_id,
            "message_id": request.message_id,
            "type": "run.started",
        }
        yield encode_sse("agent-event", start_event)

        async for event in novel_agent.chat_stream(
            run_id=request.run_id,
            session_id=request.session_id,
            message_id=request.message_id,
            message=request.input.message,
            context=request.context,
        ):
            yield encode_sse("agent-event", event)

        yield "event: stream-end\ndata: done\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

- [ ] **Step 7: Run Python tests to verify they pass**

Run: `python -m pytest python-ai/tests/test_agent_stream_events.py -v`  
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add python-ai/app/runtime/events.py python-ai/app/models/schemas.py python-ai/app/agents/novel_agent.py python-ai/app/api/routes.py python-ai/tests/test_agent_stream_events.py
git commit -m "feat: standardize python agent event stream"
```

### Task 2: Java Gateway Stream Proxy

**Files:**
- Modify: `legacy/novel-agent/agent-gateway/pom.xml`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/AgentStreamRequest.java`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/PythonAgentRequest.java`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/AgentStreamEvent.java`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/AgentContextAssembler.java`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/PythonAgentClient.java`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/AgentGatewayService.java`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/controller/AgentStreamController.java`
- Test: `legacy/novel-agent/agent-gateway/src/test/java/com/novelai/gateway/service/AgentGatewayServiceTest.java`

- [ ] **Step 1: Add the failing Java test**

```java
package com.novelai.gateway.service;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

class AgentGatewayServiceTest {

    @Test
    void shouldProxyPythonEventsAsServerSentEvents() {
        PythonAgentClient pythonAgentClient = request -> Flux.just(
            "event: agent-event\ndata: {\"type\":\"message.delta\",\"sequence\":1}\n\n",
            "event: stream-end\ndata: done\n\n"
        );
        AgentContextAssembler assembler = (userId, request) -> new java.util.HashMap<>();

        AgentGatewayService service = new AgentGatewayService(pythonAgentClient, assembler);

        StepVerifier.create(service.stream(1L, new com.novelai.gateway.dto.agent.AgentStreamRequest("hello", "continue")))
            .expectNextMatches(raw -> raw.contains("\"type\":\"message.delta\""))
            .expectNext("event: stream-end\ndata: done\n\n")
            .verifyComplete();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn -pl legacy/novel-agent/agent-gateway test -Dtest=AgentGatewayServiceTest`  
Expected: FAIL with compilation errors for missing DTOs and services

- [ ] **Step 3: Add Java dependencies required for WebFlux client and tests**

```xml
<!-- inside legacy/novel-agent/agent-gateway/pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.projectreactor</groupId>
    <artifactId>reactor-test</artifactId>
    <scope>test</scope>
</dependency>
```

- [ ] **Step 4: Create request and event DTOs**

```java
// AgentStreamRequest.java
package com.novelai.gateway.dto.agent;

import jakarta.validation.constraints.NotBlank;

public record AgentStreamRequest(
    @NotBlank String message,
    String mode
) {}
```

```java
// PythonAgentRequest.java
package com.novelai.gateway.dto.agent;

import java.util.List;
import java.util.Map;

public record PythonAgentRequest(
    String runId,
    String sessionId,
    String messageId,
    UserContext user,
    InputPayload input,
    Map<String, Object> context,
    TraceOptions trace
) {
    public record UserContext(Long id, List<String> roles) {}
    public record InputPayload(String message, String mode) {}
    public record TraceOptions(boolean emitThink, boolean emitTool, boolean emitSkill, boolean emitMcp) {}
}
```

```java
// AgentStreamEvent.java
package com.novelai.gateway.dto.agent;

public record AgentStreamEvent(
    String event,
    String data
) {}
```

- [ ] **Step 5: Create minimal context assembler**

```java
package com.novelai.gateway.service;

import com.novelai.gateway.dto.agent.AgentStreamRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AgentContextAssembler {

    public Map<String, Object> assemble(Long userId, AgentStreamRequest request) {
        Map<String, Object> context = new HashMap<>();
        context.put("project", Map.of());
        context.put("chapter", Map.of());
        context.put("recent_messages", List.of());
        context.put("preferences", Map.of("mode", request.mode() == null ? "continue" : request.mode()));
        return context;
    }
}
```

- [ ] **Step 6: Create Python WebClient adapter and gateway service**

```java
package com.novelai.gateway.service;

import com.novelai.gateway.dto.agent.PythonAgentRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Component
public class PythonAgentClient {

    private final WebClient webClient;

    public PythonAgentClient(@Value("${agent.python.base-url:http://localhost:8000}") String baseUrl) {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
    }

    public Flux<String> stream(PythonAgentRequest request) {
        return webClient.post()
            .uri("/api/agent/chat/stream")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(String.class);
    }
}
```

```java
package com.novelai.gateway.service;

import com.novelai.gateway.dto.agent.AgentStreamRequest;
import com.novelai.gateway.dto.agent.PythonAgentRequest;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

@Service
public class AgentGatewayService {

    private final PythonAgentClient pythonAgentClient;
    private final AgentContextAssembler contextAssembler;

    public AgentGatewayService(PythonAgentClient pythonAgentClient, AgentContextAssembler contextAssembler) {
        this.pythonAgentClient = pythonAgentClient;
        this.contextAssembler = contextAssembler;
    }

    public Flux<String> stream(Long userId, AgentStreamRequest request) {
        PythonAgentRequest payload = new PythonAgentRequest(
            "run_" + UUID.randomUUID(),
            "session_" + UUID.randomUUID(),
            "message_" + UUID.randomUUID(),
            new PythonAgentRequest.UserContext(userId, List.of("writer")),
            new PythonAgentRequest.InputPayload(request.message(), request.mode() == null ? "continue" : request.mode()),
            contextAssembler.assemble(userId, request),
            new PythonAgentRequest.TraceOptions(true, true, true, true)
        );
        return pythonAgentClient.stream(payload);
    }
}
```

- [ ] **Step 7: Expose the Java SSE endpoint**

```java
package com.novelai.gateway.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.novelai.gateway.dto.agent.AgentStreamRequest;
import com.novelai.gateway.service.AgentGatewayService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/agent")
public class AgentStreamController {

    private final AgentGatewayService agentGatewayService;

    public AgentStreamController(AgentGatewayService agentGatewayService) {
        this.agentGatewayService = agentGatewayService;
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> stream(@Valid @RequestBody AgentStreamRequest request) {
        Long userId = StpUtil.getLoginIdAsLong();
        return agentGatewayService.stream(userId, request);
    }
}
```

- [ ] **Step 8: Run the Java test to verify it passes**

Run: `mvn -pl legacy/novel-agent/agent-gateway test -Dtest=AgentGatewayServiceTest`  
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add legacy/novel-agent/agent-gateway/pom.xml legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/AgentStreamRequest.java legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/PythonAgentRequest.java legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/dto/agent/AgentStreamEvent.java legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/AgentContextAssembler.java legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/PythonAgentClient.java legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/service/AgentGatewayService.java legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/controller/AgentStreamController.java legacy/novel-agent/agent-gateway/src/test/java/com/novelai/gateway/service/AgentGatewayServiceTest.java
git commit -m "feat: proxy python agent stream through gateway"
```

### Task 3: Frontend Event-Driven Editor

**Files:**
- Create: `frontend/src/types/agent.ts`
- Modify: `frontend/src/utils/api.ts`
- Modify: `frontend/src/pages/EditorPage.tsx`
- Test: `frontend/src/pages/EditorPage.stream.test.tsx`

- [ ] **Step 1: Write the failing frontend test**

```tsx
import { render, screen } from '@testing-library/react'
import EditorPage from './EditorPage'

test('renders tool and think updates from standard agent events', async () => {
  render(<EditorPage />)

  expect(await screen.findByText('执行中...')).toBeInTheDocument()
  expect(await screen.findByText('正在分析用户的写作意图')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- EditorPage.stream.test.tsx`  
Expected: FAIL because there is no agent event parsing entry and no test runner setup

- [ ] **Step 3: Add agent event types**

```ts
// frontend/src/types/agent.ts
export interface AgentEventEnvelope {
  event_id?: string
  run_id?: string
  session_id?: string
  message_id?: string
  step_id?: string
  parent_step_id?: string | null
  sequence?: number
  timestamp?: string
  type: string
  source?: string
  persist?: boolean
  payload: Record<string, any>
}

export interface AgentStepState {
  stepId: string
  parentStepId?: string | null
  type: string
  status: 'started' | 'completed' | 'failed'
  title: string
  detail?: string
}
```

- [ ] **Step 4: Add Java SSE request helper**

```ts
// inside frontend/src/utils/api.ts
export async function openAgentStream(
  body: { message: string; mode: string },
  onEvent: (event: string, data: string) => void,
) {
  const response = await fetch('/api/agent/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok || !response.body) {
    throw new Error(`Agent stream error: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const lines = part.split('\n')
      const eventLine = lines.find(line => line.startsWith('event: '))
      const dataLine = lines.find(line => line.startsWith('data: '))
      if (eventLine && dataLine) {
        onEvent(eventLine.slice(7).trim(), dataLine.slice(6))
      }
    }
  }
}
```

- [ ] **Step 5: Refactor `EditorPage` to consume event envelopes**

```tsx
// inside frontend/src/pages/EditorPage.tsx
import { AgentEventEnvelope, AgentStepState } from '../types/agent'
import { openAgentStream } from '../utils/api'

const [thinkText, setThinkText] = useState('')
const [stepStates, setStepStates] = useState<AgentStepState[]>([])

const handleAgentEvent = (eventName: string, rawData: string) => {
  if (eventName === 'stream-end') {
    setIsLoading(false)
    return
  }
  if (eventName !== 'agent-event') {
    return
  }

  const event: AgentEventEnvelope = JSON.parse(rawData)

  if (event.type === 'think.delta') {
    setThinkText(prev => `${prev}${event.payload.text}\n`)
  }

  if (event.type === 'message.delta') {
    contentBuffer += event.payload.text ?? ''
    setMessages(prev => prev.map(msg =>
      msg.id === assistantMessageId ? { ...msg, content: contentBuffer } : msg
    ))
  }

  if (event.type.endsWith('.started') || event.type.endsWith('.completed') || event.type.endsWith('.failed')) {
    setStepStates(prev => [
      ...prev.filter(item => item.stepId !== event.step_id),
      {
        stepId: event.step_id ?? crypto.randomUUID(),
        parentStepId: event.parent_step_id,
        type: event.type.split('.')[0],
        status: event.type.endsWith('.failed') ? 'failed' : event.type.endsWith('.completed') ? 'completed' : 'started',
        title: event.payload.display_name ?? event.payload.name ?? event.type,
        detail: event.payload.text ?? event.payload.summary,
      },
    ])
  }
}

await openAgentStream(
  { message: inputValue, mode: activeMode },
  handleAgentEvent,
)
```

- [ ] **Step 6: Render dedicated think and execution tracking sections**

```tsx
{thinkText && (
  <ToolsSection>
    <ToolsSectionLabel>
      <Icon.MessageCircle />
      <span>思考</span>
    </ToolsSectionLabel>
    <MainContent>
      {thinkText.split('\n').filter(Boolean).map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </MainContent>
  </ToolsSection>
)}

{stepStates.length > 0 && (
  <ToolsSection>
    <ToolsSectionLabel>
      <Icon.Settings />
      <span>执行追踪</span>
    </ToolsSectionLabel>
    {stepStates.map(step => (
      <ToolItem key={step.stepId}>
        <span className={`status ${step.status === 'started' ? 'pending' : ''}`} />
        <span>{step.title}</span>
        <span style={{ marginLeft: 'auto' }}>
          {step.status === 'started' ? '执行中...' : step.status === 'completed' ? '完成' : '失败'}
        </span>
      </ToolItem>
    ))}
  </ToolsSection>
)}
```

- [ ] **Step 7: Run the frontend test to verify it passes**

Run: `npm test -- EditorPage.stream.test.tsx`  
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/agent.ts frontend/src/utils/api.ts frontend/src/pages/EditorPage.tsx frontend/src/pages/EditorPage.stream.test.tsx
git commit -m "feat: render agent events in editor stream"
```

### Task 4: Manual End-to-End Verification

**Files:**
- Modify: `python-ai/app/api/routes.py`
- Modify: `legacy/novel-agent/agent-gateway/src/main/java/com/novelai/gateway/controller/AgentStreamController.java`
- Modify: `frontend/src/pages/EditorPage.tsx`

- [ ] **Step 1: Start the Python service**

Run: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`  
Working directory: `python-ai`  
Expected: server starts and `/docs` is reachable

- [ ] **Step 2: Start the Java gateway**

Run: `mvn -pl agent-gateway spring-boot:run`  
Working directory: `novel-agent`  
Expected: gateway starts and exposes `/api/agent/chat/stream`

- [ ] **Step 3: Start the frontend**

Run: `npm run dev`  
Working directory: `frontend`  
Expected: Vite starts and app loads in browser

- [ ] **Step 4: Verify the new end-to-end stream manually**

Send a message in the editor such as `帮我续写一个雨夜重逢场景` and confirm:

- 前端请求发往 Java `/api/agent/chat/stream`
- Java 转发给 Python `/api/agent/chat/stream`
- 页面出现“思考”区并展示 `think.delta`
- 页面出现“执行追踪”区并展示工具或技能步骤
- 正文区域持续收到 `message.delta`
- 流结束时收到 `stream-end`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify agent runtime phase 1 streaming flow"
```
