import Transport from 'winston-transport';

/**
 * 알림 서비스로 로그를 전송하기 위한 트랜스포트 옵션
 */
interface NotifyTransportOptions extends Transport.TransportStreamOptions {
  webhookUrl?: string; // 예: http://localhost:7232/api/notify/send
  username?: string;
  password?: string;
}

interface NotifyLogInfo {
  level?: unknown;
  message?: unknown;
  stack?: unknown;
  context?: unknown;
}

/**
 * 에러 로그 발생 시 외부 알림 서비스(Webhook)로 메시지를 전송하는 Winston 트랜스포트
 */
export class NotifyTransport extends Transport {
  private readonly webhookUrl: string;
  private readonly authHeader: string;

  constructor(opts?: NotifyTransportOptions) {
    super(opts);

    // 알림 서비스 URL 설정
    this.webhookUrl =
      opts?.webhookUrl ||
      process.env.NOTIFY_SERVICE_URL ||
      'http://localhost:7232/api/notify/send';

    // 인증 정보 설정
    const user = opts?.username || process.env.NOTIFY_SERVICE_USER || 'admin';
    const pass =
      opts?.password || process.env.NOTIFY_SERVICE_PASSWORD || 'admin';

    this.authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  }

  /**
   * 로그 기록 시 호출되는 메서드
   */
  log(info: unknown, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const logInfo = info as NotifyLogInfo;

    // 에러 레벨인 경우에만 알림 전송
    if (logInfo.level === 'error') {
      const message =
        typeof logInfo.message === 'string'
          ? logInfo.message
          : JSON.stringify(logInfo.message);

      // 스택 트레이스 및 컨텍스트 추출
      const stack =
        typeof logInfo.stack === 'string' ? `\nStack: ${logInfo.stack}` : '';
      const context =
        typeof logInfo.context === 'string' ? `[${logInfo.context}] ` : '';

      const payload = {
        message: `🚨 **Server Error** 🚨\n${context}${message}${stack}`,
      };

      // Webhook 호출
      fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) {
            // 알림 전송 실패 시 표준 에러 출력으로 기록
            process.stderr.write(
              `NotifyTransport: Failed to send notification. Status: ${res.status}\n`,
            );
          }
        })
        .catch((err: unknown) => {
          // 로깅 자체 실패 시 무한 루프 방지를 위해 stderr로 기록
          const errorMessage = err instanceof Error ? err.message : String(err);
          process.stderr.write(
            `NotifyTransport: Network error: ${errorMessage}\n`,
          );
        });
    }

    callback();
  }
}
