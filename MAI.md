# MAI.IX 수정 및 보완 사항 리포트

> **대상:** `MAI.IX` v0.6.0 (net48 단일 어셈블리)  
> **작성 기준:** [`MAI.IX_COMPREHENSIVE_REPORT.md`](MAI.IX_COMPREHENSIVE_REPORT.md), Gateway 실사용 피드백, OmniView 연동 검증 (2026-06-17)  
> **범위:** MAI.IX 라이브러리만 (OmniView 앱 자체 수정은 본 문서 범위 외, 단 Core.Process 소비 계약은 포함)

---

## [수정 사항]

### 전체 요약

MAI.IX는 `OperationResult`·Retry Decorator·Status Provider 패턴이 잘 갖춰진 **phase1 수준의 실전형 라이브러리**입니다. 다만 **파일/DB 동기-only I/O**, **Security 운영 기본값(fail-open)**, **public API 문서 부재**, **Core.Process API 불일치(bool 반환·orphan 파일 로그)** 가 상용 운영·확장 시 가장 큰 리스크입니다.

본 문서는 코드 변경이 필요한 항목을 **모듈 → 클래스 → 수정 요약 → 현재/제안 코드** 순으로 정리합니다. 우선순위는 **P0(즉시) / P1(다음 스프린트) / P2(중기)** 입니다.

### 수정 항목 리스트업

| ID | 우선순위 | 모듈 폴더 | 클래스 | 요약 |
|---|---|---|---|---|
| M-01 | P0 | `Security/Auditing` | `SecurityAuditOptions` | 감사 실패 시 fail-open 기본값 → 운영 프로파일 fail-closed |
| M-02 | P0 | `Security/Permissions` | `PermissionAdministrationService` | sessionStore 없을 때 세션 무효화 0건 성공 → 운영 모드 실패 |
| M-03 | P0 | `Core/Process` | `ProcessingLogFileStore` | `ReadAll(maxCount<=0)` 무제한 적재 → hard cap |
| M-04 | P1 | `Core/Logging` | `AsyncLogWriter`, `FileLogSink` | Flush 폴링/no-op → 완료 신호·실제 flush |
| M-05 | P1 | `Core/Configuration` | `FileConfigurationStore<T>` | CreateIfMissing 시 디스크 미생성·구버전 무시 완화 |
| M-06 | P1 | `Core` (신규) | `ISecretProtector`, `DpapiSecretProtector` | Password 평문 보관 → DPAPI 래퍼 |
| M-07 | P1 | `Database` | `IDatabaseClient`, `AdoNetDatabaseClient` | 동기-only → `*Async` + CancellationToken |
| M-08 | P1 | `Data/Files` | `IFileService`, `FileService` | 동기-only → `IAsyncFileService` 또는 `*Async` 오버로드 |
| M-09 | P1 | `Network/Http` | `HttpFileClient`, `HttpTextClient` | sync-over-async 래퍼 위험 문서화·Obsoletes 검토 |
| M-10 | P1 | `Network/Sftp` | `SftpClientAdapter` | connection-per-call → session reuse 옵션 |
| M-11 | P1 | `Core/Process` | `MccmsNodeAgent`, `MonitoringIpcPublisher` | `bool` API → `OperationResult`, Dispose 레이스 수정 |
| M-12 | P1 | `Core/Process` (신규) | `NodeRuntimeHost`, `NodeSourceKeyHelper` | WCF+IPC 통합 façade, sourceKey 중복 제거 |
| M-13 | P2 | `Security/Storage` | `DatabaseSecurityStore` | God class 분할(schema/repo/migration) |
| M-14 | P2 | `Security/Deployment` | `SecurityDeploymentProfile` | 정책 선언 → bootstrap 런타임 강제 |
| M-15 | P2 | `Core/Messaging` | `InMemoryMessageBus` | handler 순차·예외 무시 → timeout/격리 |
| M-16 | P2 | `UI/WinForms` | `IXForm`, `IXLogViewer` | SetBusy stub·RichTextBox 성능 |
| M-17 | P2 | `MAI.IX.csproj` + 전 모듈 | public API 전반 | `GenerateDocumentationFile` + XML 주석 |
| M-18 | P2 | `Data` + `Network` (신규) | `Integration.FileTransfer` | 파일 감시·배치 결과 DTO 파이프라인 |
| M-19 | P2 | `Core/Process` | `ProcessingLogFileStore`, DTO | orphan 정리·IPC/파일 DTO 매퍼 |
| M-20 | P3 | `MAI.IX.csproj` | 어셈블리 구조 | 논리 모듈 → 물리 DLL 분리 검토 |

---

## [세부]

---

### 1. 수정 모듈 폴더: `MAI.IX/Core/Logging`

#### 2-1. 클래스: `AsyncLogWriter`

**3-1. 수정 사항 요약**
- `Flush()`가 `queue.Count` 폴링 + `Thread.Sleep(10)`으로 대기. timeout 시 큐 잔여 항목 **복구 불가**.
- dispatcher 완료 신호(`ManualResetEventSlim` 등)로 교체 필요.

**4-1. 현재 코드 vs 수정 코드 예시**

현재 (`AsyncLogWriter.cs`):

```csharp
public OperationResult Flush(TimeSpan timeout)
{
    DateTime deadline = DateTime.UtcNow.Add(timeout <= TimeSpan.Zero ? options.FlushTimeout : timeout);

    while (queue.Count > 0 && DateTime.UtcNow < deadline)
    {
        Thread.Sleep(10);
    }

    if (queue.Count > 0)
    {
        return OperationResult.CreateFailure("IX-CORE-LOG-007", "Log writer flush timed out.");
    }
    // ...
}
```

수정 제안:

```csharp
// dispatcher 루프 종료 시점에 drainCompleted.Set() 호출
private readonly ManualResetEventSlim drainCompleted = new ManualResetEventSlim(true);

public OperationResult Flush(TimeSpan timeout)
{
    drainCompleted.Reset();
    // 마지막 항목 처리를 유도하기 위해 sentinel 또는 CompleteAdding 후
    if (!drainCompleted.Wait(timeout <= TimeSpan.Zero ? options.FlushTimeout : timeout))
    {
        return OperationResult.CreateFailure("IX-CORE-LOG-007", "Log writer flush timed out.");
    }
    return sink.Flush(remaining);
}
```

설명: `queue.Count`는 동시성 환경에서 근사치이며, sink I/O 지연 시 busy-wait만 반복합니다. **완료 이벤트 기반**으로 바꾸면 timeout 의미가 명확해지고, 실패 시 `droppedCount`/EmergencyBuffer 상태를 `OperationError.Metadata`에 포함할 수 있습니다.

---

#### 2-2. 클래스: `FileLogSink`

**3-2. 수정 사항 요약**
- `Flush(TimeSpan)`가 즉시 `Success` 반환(no-op). `AsyncLogWriter`가 sink flush에 위임하지만 실제 flush 없음.

**4-2. 현재 코드 vs 수정 코드 예시**

현재:

```csharp
public OperationResult Flush(TimeSpan timeout)
{
    return OperationResult.CreateSuccess();
}
```

수정 제안:

```csharp
public OperationResult Flush(TimeSpan timeout)
{
    lock (gate)
    {
        // StreamWriter/파일 핸들이 있다면 Flush(true) 호출
        // timeout 내 완료 보장, 실패 시 IX-CORE-LOG-0xx 반환
    }
    return OperationResult.CreateSuccess();
}
```

설명: API 계약과 실제 동작을 일치시켜야 장애 분석·종료 시퀀스(앱 shutdown)에서 로그 유실을 줄일 수 있습니다.

---

### 1. 수정 모듈 폴더: `MAI.IX/Core/Configuration`

#### 2-1. 클래스: `FileConfigurationStore<T>`

**3-1. 수정 사항 요약**
- `CreateIfMissing=true`일 때 메모리 default만 반환하고 **디스크 파일을 생성하지 않음**.
- `Older` + `migrator == null`일 때 버전 불일치를 실패 없이 통과.

**4-1. 현재 코드 vs 수정 코드 예시**

현재 (`Load()` 일부):

```csharp
if (!File.Exists(options.FilePath))
{
    if (!options.CreateIfMissing)
        return OperationResult<...>.CreateFailure("IX-CORE-CONFIG-005", "...");
    TConfiguration createdConfiguration = new TConfiguration();
    // Save() 호출 없음 — 디스크에 파일 없음
    return OperationResult<...>.CreateSuccess(createdResult);
}
```

수정 제안:

```csharp
if (!File.Exists(options.FilePath))
{
    if (!options.CreateIfMissing)
        return OperationResult<...>.CreateFailure("IX-CORE-CONFIG-005", "...");
    TConfiguration createdConfiguration = new TConfiguration();
    if (options.PersistOnCreateIfMissing) // 신규 옵션
    {
        OperationResult<ConfigurationSaveResult> saveResult = Save(createdConfiguration);
        if (saveResult.IsFailure)
            return OperationResult<...>.CreateFailure(saveResult.Error);
    }
    return OperationResult<...>.CreateSuccess(createdResult);
}
```

설명: Gateway·OmniView 등에서 “첫 실행 시 설정 파일 자동 생성” 기대와 실제 동작이 어긋납니다. `PersistOnCreateIfMissing` 기본값은 `false`로 두고 문서화하면 기존 호환 유지 가능합니다.

---

#### 2-2. 클래스: `JsonConfigurationSerializer`

**3-2. 수정 사항 요약**
- `System.Web.Extensions`(`JavaScriptSerializer`) 의존. 타입 안전성·이식성 제약.
- P2에서 `System.Text.Json`(net48 backport) 또는 Newtonsoft 검토 — **NuGet 추가는 사전 합의 필수**.

**4-2. 수정 방향 (코드 예시는 설계 수준)**

```csharp
// 장기: IConfigurationSerializer 구현체 추가
public sealed class NewtonsoftConfigurationSerializer : IConfigurationSerializer { ... }
// FileConfigurationStore 옵션으로 serializer 주입 (이미 패턴 존재 시 확장)
```

---

### 1. 수정 모듈 폴더: `MAI.IX/Core` (신규 — 비밀값 보호)

#### 2-1. 클래스: `ISecretProtector` (신규), `DpapiSecretProtector` (신규)

**3-1. 수정 사항 요약**
- Network `SftpConnectionOptions.Password`, 공유폴더 자격증명, 설정 JSON 내 민감 필드가 **평문 string**.
- BCL `ProtectedData`(DPAPI) 래퍼를 Core에 두고 Network/Configuration에서 선택 사용.

**4-1. 수정 코드 예시 (신규)**

```csharp
namespace MAI.IX.Core.Security
{
    public interface ISecretProtector
    {
        OperationResult<string> Protect(string plainText);
        OperationResult<string> Unprotect(string protectedText);
    }

    public sealed class DpapiSecretProtector : ISecretProtector
    {
        public OperationResult<string> Protect(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return OperationResult<string>.CreateSuccess(string.Empty);
            byte[] bytes = Encoding.UTF8.GetBytes(plainText);
            byte[] protectedBytes = ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
            return OperationResult<string>.CreateSuccess(Convert.ToBase64String(protectedBytes));
        }
        // Unprotect 동일 패턴
    }
}
```

`SftpConnectionOptions` 사용 예:

```csharp
// 현재
public string Password { get; set; }

// 제안: 저장 시 ProtectedPassword, 런타임에만 Unprotect
public string ProtectedPassword { get; set; }
public OperationResult<string> ResolvePassword(ISecretProtector protector) { ... }
```

설명: Gateway 피드백 3.4(비밀값 공통화) 직접 대응. 앱마다 DPAPI 재구현을 막습니다.

---

### 1. 수정 모듈 폴더: `MAI.IX/Core/Messaging`

#### 2-1. 클래스: `InMemoryMessageBus`

**3-1. 수정 사항 요약**
- handler **순차 실행**, 느린 handler가 전체 publish 지연.
- handler 예외가 publish 결과에만 수집되고 **호출자/로그에 격리 부족**.

**4-1. 수정 제안 (옵션 확장)**

```csharp
public sealed class MessageBusOptions
{
    public TimeSpan HandlerTimeout { get; set; } = TimeSpan.FromSeconds(5);
    public bool IsolateHandlerFailures { get; set; } = true;
}

// Publish 시 CancellationTokenSource(handlerTimeout) per handler
```

---

### 1. 수정 모듈 폴더: `MAI.IX/Database`

#### 2-1. 클래스: `IDatabaseClient`

**3-1. 수정 사항 요약**
- public API **전부 동기** (`TestConnection`, `ExecuteQuery`, `ExecuteNonQuery`, `BeginTransaction`).
- Security store·고빈도 호출 시 UI/백그라운드 스레드 블로킹.

**4-1. 현재 코드 vs 수정 코드 예시**

현재 (`IDatabaseClient.cs`):

```csharp
public interface IDatabaseClient
{
    OperationResult TestConnection();
    OperationResult<int> ExecuteNonQuery(DatabaseCommand command);
    OperationResult<IXDatabaseQueryResult> ExecuteQuery(DatabaseCommand command);
    OperationResult<IDatabaseTransaction> BeginTransaction(...);
}
```

수정 제안 (기존 메서드 유지 + 추가):

```csharp
public interface IDatabaseClient
{
    // 기존 동기 API 유지 (하위 호환)
    OperationResult TestConnection();
    // ...

    // 신규 async 계열
    Task<OperationResult> TestConnectionAsync(CancellationToken cancellationToken = default);
    Task<OperationResult<int>> ExecuteNonQueryAsync(DatabaseCommand command, CancellationToken cancellationToken = default);
    Task<OperationResult<IXDatabaseQueryResult>> ExecuteQueryAsync(DatabaseCommand command, CancellationToken cancellationToken = default);
}
```

---

#### 2-2. 클래스: `AdoNetDatabaseClient`

**3-2. 수정 사항 요약**
- **Connection-per-operation** — 매 호출마다 `OpenConnection()` → `connection.Open()`.
- SQLite는 tolerable, SQL Server/MySQL 고빈도 시 overhead.

**4-2. 현재 코드 vs 수정 코드 예시**

현재:

```csharp
private OperationResult<DbConnection> OpenConnection()
{
    connection.ConnectionString = connectionOptions.ConnectionString;
    connection.Open();
    return OperationResult<DbConnection>.CreateSuccess(connection);
}
```

수정 제안 (lease 패턴):

```csharp
public sealed class DatabaseConnectionLease : IDisposable
{
    internal DbConnection Connection { get; }
    // using (var lease = client.OpenConnectionLease()) { ... 여러 command ... }
}

public OperationResult<DatabaseConnectionLease> OpenConnectionLease();
```

설명: 한 트랜잭션/배치 단위로 연결 재사용. `RetryDatabaseClient`는 lease 경계 밖 재시도 정책을 문서화해야 합니다.

---

#### 2-3. 클래스: `RetryDatabaseClient`

**3-3. 수정 사항 요약**
- `BeginTransaction()`은 재시도 없음 — 의도적일 수 있으나 **XML 주석·문서 없음**.
- async 추가 시 decorator도 `*Async` 구현 필요.

---

### 1. 수정 모듈 폴더: `MAI.IX/Data/Files`

#### 2-1. 클래스: `IFileService`, `FileService`

**3-1. 수정 사항 요약**
- **파일 I/O public API 100% 동기** (`ReadAllText`, `WriteAllBytes`, `ListFiles` 등).
- 대용량·네트워크 드라이브·recursive 목록 시 메모리 적재 + 호출 스레드 블로킹.

**4-1. 현재 코드 vs 수정 코드 예시**

현재 (`IFileService.cs`):

```csharp
OperationResult<FileReadResult> ReadAllText(string filePath, FileReadOptions options = null);
OperationResult<FileOperationResult> WriteAllText(string filePath, string text, FileWriteOptions options = null);
OperationResult<DirectoryFileSearchResult> ListFiles(string directoryPath, DirectoryFileSearchOptions options = null);
// Async 없음
```

수정 제안:

```csharp
// 옵션 A: 별도 인터페이스
public interface IAsyncFileService
{
    Task<OperationResult<FileReadResult>> ReadAllTextAsync(string filePath, FileReadOptions options = null, CancellationToken cancellationToken = default);
    Task<OperationResult<FileOperationResult>> WriteAllTextAsync(...);
    IAsyncEnumerable<FileMetadata> EnumerateFilesAsync(string directoryPath, DirectoryFileSearchOptions options, CancellationToken cancellationToken = default);
}

// 옵션 B: IFileService에 *Async 오버로드 추가 (FileService가 동기+비동기 모두 구현)
```

구현 스케치 (`FileService`):

```csharp
public async Task<OperationResult<FileReadResult>> ReadAllTextAsync(...)
{
    return await Task.Run(() => ReadAllText(filePath, options), cancellationToken).ConfigureAwait(false);
    // 장기: FileStream.ReadAsync + MemoryPool<byte> 스트리밍
}
```

설명: .NET 4.8에서도 `Task.Run` 기반 offload는 1단계로 충분합니다. 2단계에서 `EnumerateFilesAsync`로 **전체 목록 메모리 적재**를 제거합니다.

---

#### 2-2. 클래스: `StableFileChecker`, `IStableFileChecker`

**3-2. 수정 사항 요약**
- 동기 `WaitUntilStable()`는 `Thread.Sleep` 폴링.
- `WaitUntilStableAsync()`는 **이미 존재** — 동기 버전이 내부적으로 async를 blocking하는지 경로 통일 필요.

**4-2. 수정 제안**

```csharp
public OperationResult<FileStabilityWaitResult> WaitUntilStable(...)
{
    return WaitUntilStableAsync(..., CancellationToken.None).GetAwaiter().GetResult();
    // 또는 Obsolete + 문서: UI 스레드에서 동기 호출 금지
}
```

---

#### 2-3. 클래스: (신규) `TransferRunSummary`, `TransferItemResult`

**3-3. 수정 사항 요약**
- Gateway가 앱 로컬에 배치 결과 DTO를 직접 정의. 라이브러리 공용 모델 부재 (피드백 3.5).

**4-3. 신규 DTO 예시**

```csharp
namespace MAI.IX.Data.Integration
{
    public sealed class TransferRunSummary
    {
        public int TotalCount { get; set; }
        public int SuccessCount { get; set; }
        public int SkippedCount { get; set; }
        public int FailedCount { get; set; }
        public IReadOnlyList<TransferItemResult> Items { get; set; }
    }
}
```

---

### 1. 수정 모듈 폴더: `MAI.IX/Network/Http`

#### 2-1. 클래스: `HttpFileClient`

**3-1. 수정 사항 요약**
- `DownloadFile`/`UploadFile` 동기 API가 `GetAwaiter().GetResult()` — **sync-over-async**, UI 교착 위험.
- `DownloadFileAsync`/`UploadFileAsync`는 이미 구현됨 → **소비자는 async 우선**.

**4-1. 현재 코드 vs 수정 코드 예시**

현재:

```csharp
public OperationResult<HttpFileTransferResult> DownloadFile(...)
{
    return DownloadFileAsync(request, options).GetAwaiter().GetResult();
}
```

수정 제안:

```csharp
[Obsolete("UI 스레드에서 사용 금지. DownloadFileAsync를 사용하세요.")]
public OperationResult<HttpFileTransferResult> DownloadFile(...) { ... }

// 또는 ConfigureAwait(false)만으로는 WinForms SyncContext 교착이 해결되지 않으므로
// 동기 API 제거는 major 버전에서 검토
```

---

#### 2-2. 클래스: `HttpTextClient`

**3-2. 수정 사항 요약**
- `Send()` 동기 래퍼 동일 패턴. `SendAsync` 사용 권장·문서화.

---

### 1. 수정 모듈 폴더: `MAI.IX/Network/Sftp`

#### 2-1. 클래스: `SftpClientAdapter`

**3-1. 수정 사항 요약**
- 호출마다 connect/dispose — 대량 전송 시 **connection churn**.
- `SftpConnectionOptions.Password` 평문 (M-06 `ISecretProtector` 연동).

**4-1. 수정 제안**

```csharp
public sealed class SftpSessionPoolOptions
{
    public TimeSpan IdleTimeout { get; set; } = TimeSpan.FromMinutes(5);
    public int MaxSessions { get; set; } = 4;
}

// SftpClientAdapter 또는 RetrySftpClient에 optional pool 주입
```

---

#### 2-2. 클래스: (신규) `IRemotePathMapper`

**3-2. 수정 사항 요약**
- local → remote 경로 템플릿(`{FileName}`, `{Date:yyyyMMdd}`) 앱마다 중복 (Gateway 피드백 4.3).

**4-2. 신규 인터페이스 예시**

```csharp
public interface IRemotePathMapper
{
    OperationResult<string> Map(FileMetadata metadata, string template, string remoteRoot);
}
```

---

### 1. 수정 모듈 폴더: `MAI.IX/Network/SharedFolders`

#### 2-1. 클래스: `SharedFolderFileService`, `NetworkShareConnectionOptions`

**3-1. 수정 사항 요약**
- public API가 `MAI.IX.Data.Files` 타입 직접 노출 — Network 소비자가 Data 계약에 결합.
- SMB 자격증명 평문.

**4-1. 수정 방향**
- Network 전용 DTO(`NetworkFileSearchOptions`)로 어댑트 레이어 추가.
- `ProtectedPassword` + `ISecretProtector` (M-06).

---

### 1. 수정 모듈 폴더: `MAI.IX/Security/Auditing`

#### 2-1. 클래스: `SecurityAuditOptions`

**3-1. 수정 사항 요약 (P0)**
- `FailOperationOnAuditFailure = false` 기본 → 감사 저장소 장애 시 로그인/권한 변경이 **성공 처리**될 수 있음.

**4-1. 현재 코드 vs 수정 코드 예시**

현재:

```csharp
public SecurityAuditOptions()
{
    Enabled = true;
    FailOperationOnAuditFailure = false;
}
```

수정 제안 (운영/개발 프로파일 분리):

```csharp
public static SecurityAuditOptions ForProduction()
{
    return new SecurityAuditOptions
    {
        Enabled = true,
        FailOperationOnAuditFailure = true
    };
}

// UserAuthenticationOptions 기본을 ForProduction()으로 변경하거나
// UserAuthenticator.Create() 시 프로파일 인자 추가
public static OperationResult<UserAuthenticator> Create(
    SecurityAuditOptions auditOptions = null)
{
    auditOptions = auditOptions ?? SecurityAuditOptions.ForProduction();
}
```

설명: `Default` fail-open은 **개발 편의**로 유지하고, `Create()` 진입점에서 운영 기본값을 강제하는 방식이 기존 테스트 호환에 유리합니다.

---

#### 2-2. 클래스: `SecurityAuditDispatcher`

**3-2. 수정 사항 요약**
- `FailOperationOnAuditFailure=false`일 때 감사 실패를 Success로 반환 — 동작은 의도적이나 **호출자가 옵션을 모르면 위험**.

**4-2. 수정 제안**
- 감사 실패 시 `OperationError.Metadata["AuditFailed"]=true` 추가 (fail-open이어도 관측 가능).

---

### 1. 수정 모듈 폴더: `MAI.IX/Security/Permissions`

#### 2-1. 클래스: `PermissionAdministrationService`

**3-1. 수정 사항 요약 (P0)**
- `sessionStore == null` + `RevokeTargetActiveSessionsWhenSupported` → **0건 성공**, 기존 세션 유지.

**4-1. 현재 코드 vs 수정 코드 예시**

현재:

```csharp
if (sessionStore == null)
{
    if (options.SessionInvalidationMode == PermissionChangeSessionInvalidationMode.RequireRevokeTargetActiveSessions)
        return OperationResult<int>.CreateFailure("IX-SEC-ADMIN-010", "...");
    return OperationResult<int>.CreateSuccess(0);  // 위험
}
```

수정 제안:

```csharp
if (sessionStore == null)
{
    if (options.SessionInvalidationMode != PermissionChangeSessionInvalidationMode.None)
    {
        return OperationResult<int>.CreateFailure(
            "IX-SEC-ADMIN-010",
            "Session invalidation store is required for this invalidation mode.");
    }
    return OperationResult<int>.CreateSuccess(0);
}
```

설명: “지원되면 revoke” 모드에서 store 없음은 **성공이 아니라 구성 오류**로 처리해야 권한 회수 후 세션 잔존 사고를 막습니다.

---

### 1. 수정 모듈 폴더: `MAI.IX/Security/Storage/Database`

#### 2-1. 클래스: `DatabaseSecurityStore`

**3-1. 수정 사항 요약 (P2)**
- ~1,600줄 God class — schema, migration, CRUD, audit, login atomicity 혼재.
- 단위 테스트·변경 영향도 큼.

**4-1. 분할 제안 (신규 클래스)**

```
Security/Storage/Database/
  DatabaseSecuritySchema.cs      -- DDL/migration only
  DatabaseSecurityRepository.cs  -- IUserAccountStore 등 구현
  DatabaseSecurityStore.cs       -- thin façade (기존 public API 유지)
```

설명: public `DatabaseSecurityStore` API는 유지하고 내부만 분리하면 소비 앱 breaking change를 최소화합니다.

---

### 1. 수정 모듈 폴더: `MAI.IX/Security/Deployment`

#### 2-1. 클래스: `SecurityDeploymentProfile`

**3-1. 수정 사항 요약**
- `RequiresServerAuthorization`, `AllowsDirectDatabaseAccess` 등 **선언만 있고 런타임 강제 없음**.

**4-1. 수정 제안**

```csharp
public sealed class SecurityBootstrapGuard
{
    public OperationResult Validate(SecurityDeploymentProfile profile, ISecurityStore store)
    {
        if (profile.RequiresServerAuthorization && store is DirectDatabaseSecurityStore)
            return OperationResult.CreateFailure("IX-SEC-DEPLOY-001", "RemoteClient cannot use direct DB store.");
        return OperationResult.CreateSuccess();
    }
}
```

`UserAuthenticator.Create()` / 앱 startup에서 호출.

---

### 1. 수정 모듈 폴더: `MAI.IX/Security/Cryptography`

#### 2-1. 클래스: `LegacyAesTextProtector`

**3-1. 수정 사항 요약**
- legacy 호환용. 신규 코드 사용 시 알고리즘/키 관리 **문서·Obsoletes** 필요.

**4-1. 수정 제안**

```csharp
[Obsolete("신규 코드는 ISecretProtector(DPAPI) 또는 PBKDF2 기반 보호를 사용하세요.")]
public sealed class LegacyAesTextProtector { ... }
```

---

### 1. 수정 모듈 폴더: `MAI.IX/Core/Process`

#### 2-1. 클래스: `ProcessingLogFileStore`

**3-1. 수정 사항 요약 (P0)**
- `ReadAll(maxCount<=0)` → `int.MaxValue` tail 버퍼 → 대용량 로그 **commitment limit** 위험.
- `Append` 동시성 lock 없음, rotation 없음.
- 현재 코드베이스에서 **호출처 없음**(orphan).

**4-1. 현재 코드 vs 수정 코드 예시**

현재:

```csharp
int boundedCount = maxCount <= 0 ? int.MaxValue : maxCount;
```

수정 제안:

```csharp
private const int DefaultMaxReadCount = 10_000;
private const int AbsoluteMaxReadCount = 50_000;

public static List<ProcessingLogEntry> ReadAll(string directoryPath, string sourceKey, int maxCount)
{
    int boundedCount = maxCount <= 0 ? DefaultMaxReadCount : maxCount;
    if (boundedCount > AbsoluteMaxReadCount)
        boundedCount = AbsoluteMaxReadCount;
    // ...
}

public static void Append(string directoryPath, ProcessingLogEntry entry)
{
    lock (GetFileLock(filePath))  // per-file lock
    {
        File.AppendAllText(filePath, line + Environment.NewLine, Encoding.UTF8);
    }
}
```

설명: IPC 전용 모니터링으로 전환 중이라면 `[Obsolete]` + `NodeProcessingEventDto` 매퍼만 남기는 선택도 가능합니다.

---

#### 2-2. 클래스: `MccmsNodeAgent`

**3-2. 수정 사항 요약**
- `OpenAgent(int port)` → `bool`만 반환, 실패 원인 없음 (`OperationResult` 불일치).
- `Dispose()`에서 `disposed` 플래그가 `gate` 밖 — `ConcurrencyMode.Multiple`과 레이스 가능.
- `RemoteControl(KILL)` 감사/확인 없음.

**4-2. 현재 코드 vs 수정 코드 예시**

현재:

```csharp
public bool OpenAgent(int port)
{
    if (port < 1 || port > 65535)
        return false;
    // ...
}

public void Dispose()
{
    if (disposed) return;
    disposed = true;  // gate 밖
    CloseAgent();
}
```

수정 제안:

```csharp
public OperationResult OpenAgent(int port)
{
    if (port < 1 || port > 65535)
        return OperationResult.CreateFailure("IX-PROC-001", "Invalid port.");
    lock (gate)
    {
        ThrowIfDisposed();
        // Open 실패 시 FromException
    }
    return OperationResult.CreateSuccess();
}

public void Dispose()
{
    lock (gate)
    {
        if (disposed) return;
        disposed = true;
        CloseAgentUnsafe();
    }
}
```

---

#### 2-3. 클래스: `MonitoringIpcPublisher`

**3-3. 수정 사항 요약**
- `PublishHeartbeat`/`PublishProcessingEvent` → `bool` 반환.
- `lock` 안에서 WCF 호출 — 동시 publish 직렬 blocking.
- 재연결 backoff 없음.

**4-3. 수정 제안**

```csharp
public OperationResult PublishHeartbeat(NodeHeartbeatDto heartbeat)
{
    lock (gate)
    {
        OperationResult connectResult = EnsureConnected();
        if (connectResult.IsFailure) return connectResult;
        try { channel.PublishHeartbeat(heartbeat); return OperationResult.CreateSuccess(); }
        catch (Exception ex) { AbortUnsafe(); return OperationResult.FromException("IX-PROC-IPC-001", "...", ex); }
    }
}
```

---

#### 2-4. 클래스: (신규) `NodeSourceKeyHelper`, `NodeRuntimeHost`

**3-4. 수정 사항 요약**
- `"port-" + port` 문자열이 OmniView·TestProgram에 중복.
- WCF Open + IPC Publish 생명주기를 앱마다 반복.

**4-4. 신규 façade 예시**

```csharp
public sealed class NodeRuntimeHost : IDisposable
{
    private readonly MccmsNodeAgent agent;
    private readonly MonitoringIpcPublisher ipcPublisher;

    public OperationResult Start(int wcfPort, string ipcEndpoint)
    {
        OperationResult open = agent.OpenAgent(wcfPort);
        if (open.IsFailure) return open;
        return OperationResult.CreateSuccess();
    }

    public OperationResult PublishProcessingEvent(NodeProcessingEventDto dto)
        => ipcPublisher.PublishProcessingEvent(dto); // OperationResult 버전
}
```

---

#### 2-5. 클래스: `ProcessingLogEntry`, `NodeProcessingEventDto` (매퍼)

**3-5. 수정 사항 요약**
- 파일 로그 엔트리와 IPC DTO가 병렬 모델 — 변환 계층 없음.

**4-5. 매퍼 예시**

```csharp
public static class ProcessingEventMapper
{
    public static NodeProcessingEventDto ToIpcDto(ProcessingLogEntry entry) { ... }
    public static ProcessingLogEntry FromIpcDto(NodeProcessingEventDto dto) { ... }
}
```

---

### 1. 수정 모듈 폴더: `MAI.IX/UI/WinForms`

#### 2-1. 클래스: `IXForm`

**3-1. 수정 사항 요약**
- `SetBusy`/`SetStatusText` virtual stub — 파생 폼 없으면 UX hook 없음.

**4-1. 현재 vs 수정**

현재:

```csharp
public virtual OperationResult SetBusy(bool isBusy, string message = null)
{
    return OperationResult.CreateSuccess();
}
```

수정 제안:

```csharp
public virtual OperationResult SetBusy(bool isBusy, string message = null)
{
    if (busyOverlay != null)
    {
        busyOverlay.Visible = isBusy;
        busyOverlay.Message = message;
    }
    return OperationResult.CreateSuccess();
}
```

또는 `IXBusyIndicator` 인터페이스 주입.

---

#### 2-2. 클래스: `IXLogViewer`

**3-2. 수정 사항 요약**
- RichTextBox append — 대량 로그 시 UI 성능 저하.
- ListView virtual mode 또는 ring buffer 권장 (P2).

---

#### 2-3. 클래스: `WinFormsLogSink`

**3-3. 수정 사항 요약**
- `Dispose` 후 queue 잔여 entry flush 없음.

---

### 1. 수정 모듈 폴더: `MAI.IX` (프로젝트·횡단)

#### 2-1. 대상: `MAI.IX.csproj`, public API 전반

**3-1. 수정 사항 요약 (P2)**
- `GenerateDocumentationFile` 미설정 — Core.Process 외 XML 주석 ~3%.
- CS1591 통과 불가 상태 (CommonFramework 규칙과 불일치).
- `docs/PUBLIC-API.md`, `CHANGELOG.md` 부재.

**4-1. csproj 수정 예시**

```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);1591</NoWarn> <!-- 단계적: 0 목표 시 NoWarn 제거 -->
</PropertyGroup>
```

설명: 1단계 Core + Database + Security public API부터 XML 추가, 2단계 전 모듈.

---

#### 2-2. 대상: 멀티타겟 (P2, Gateway 피드백)

**3-2. 수정 사항 요약**
- `net48` 단일 — 신규 앱이 프레임워크 downgrade 필요.

**4-2. 수정 방향**

```xml
<TargetFrameworks>net48;net8.0-windows</TargetFrameworks>
```

조건부 컴파일: `System.Web.Extensions` vs `System.Text.Json` 등 — **별도 설계 문서 필요**.

---

## 부록 A. 수정하지 않는 항목 (의도적 유지)

| 항목 | 사유 |
|---|---|
| `OperationResult` 3상태 모델 | 전 모듈 일관성 확보, 변경 비용 대비 이점 낮음 |
| 단일 DLL 구조 (P3 전) | OmniView/Gateway가 단일 참조로 단순 |
| WCF `SecurityMode.None` (로컬 net.tcp/pipe) | 내부망 전제 — 외부 노출 시 별도 TLS 설계 |
| `LegacyAesTextProtector` 제거 | 기존 데이터 호환 — Obsolete만 적용 |

---

## 부록 B. 권장 구현 순서

1. **P0:** M-01, M-02, M-03 (Security 감사/세션, ProcessLog ReadAll cap)
2. **P1:** M-06, M-07, M-08 (Secret, DB/File async), M-04, M-11
3. **P2:** M-13, M-17, M-18 (Store 분할, 문서, Integration)
4. **P3:** M-20 (어셈블리 분리)

---

## 부록 C. 관련 문서

| 문서 | 관계 |
|---|---|
| [`MAI.IX_COMPREHENSIVE_REPORT.md`](MAI.IX_COMPREHENSIVE_REPORT.md) | 분석 근거·OmniView 이슈 |
| [`MAI.IX/MAI.IX_FULL_ANALYSIS_REPORT.md`](../MAI.IX/MAI.IX_FULL_ANALYSIS_REPORT.md) | Security P0 상세 |
| [`GatewayPilotProgram/MAI.IX_USAGE_FEEDBACK.md`](../GatewayPilotProgram/MAI.IX_USAGE_FEEDBACK.md) | 실사용 gap |

---

*본 문서는 “무엇을 어떻게 고칠지”에 대한 **수정 설계서**이며, 실제 PR은 항목별로 분리(단일 관심사 원칙)하는 것을 권장합니다.*
