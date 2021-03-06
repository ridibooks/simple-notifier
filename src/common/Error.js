class SSSError extends Error {
  constructor(type, context, originalError) {
    super(type.message(context));
    this.name = 'SSSError';
    this.type = type.type;
    this.errorCode = type.code;
    this.message = type.message(context);
    this.serverMessage = this.message;
    this.statusCode = Math.floor(this.errorCode / 1000);
    if (originalError) {
      this.originalError = originalError;
      this.serverMessage = `${this.message}: ${this.originalError.message}`;
    }
  }
}

SSSError.Types = Object.freeze({
  BAD_REQUEST: { code: 400000, message: () => '잘못된 요청입니다.' },
  BAD_REQUEST_INVALID: { code: 400100, message: context => `요청이 유효하지 않습니다: ${context.message}` },
  AUTH: { code: 401000, message: () => '로그인이 실패하였습니다.' },
  AUTH_TOKEN: { code: 401100, message: () => '인증 토큰에 문제가 있습니다.' },
  AUTH_TOKEN_INVALID: { code: 401110, message: () => '인증 토큰이 유효하지 않습니다.' },
  AUTH_TOKEN_EXPIRED: { code: 401120, message: () => '인증 토큰이 만료되었습니다.' },
  AUTH_USER: { code: 401200, message: () => '사용자 인증에 문제가 발생했습니다.' },
  AUTH_USER_NOT_EXIST: { code: 401210, message: context => `${context.username}은 존재하지 않는 사용자 입니다.` },
  AUTH_MISSING_PARAMS: { code: 401220, message: () => '사용자 이름 또는 패스워드를 입력하지 않았습니다.' },
  AUTH_INVALID_PARAMS: { code: 401230, message: () => '사용자 이름 또는 패스워드가 맞지 않습니다.' },
  FORBIDDEN: { code: 403000, message: () => '허가되지 않았습니다.' },
  FORBIDDEN_IP_ADDRESS: { code: 403100, message: context => `사용자의 IP(${context.remoteAddress})는 허가되지 않았습니다.` },
  FORBIDDEN_OPERATION: { code: 403200, message: () => '허가되지 않은 작업입니다.' },
  INVALID_PARAMS: { code: 400000, message: () => '파라미터가 잘못되었습니다.' },
  CONFLICT: { code: 409000, message: context => `${context.value}는 이미 존재하는 값입니다. 다른 값을 입력해 주세요.` },
  SERVER: { code: 500000, message: context => `서버 에러가 발생했습니다${context.message ? `: ${context.message}` : '.'}` },
  DB: { code: 500100, message: () => 'DB 에러가 발생했습니다.' },
});

Object.keys(SSSError.Types).forEach((type) => {
  SSSError.Types[type].type = type;
});

module.exports = SSSError;
