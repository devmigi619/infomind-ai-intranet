from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings

# Spring의 Keys.hmacShaKeyFor는 시크릿 바이트 길이에 따라 HS256/384/512를 자동 선택.
# 현재 시크릿(49바이트)은 HS384로 서명되므로 세 알고리즘을 모두 허용해 길이 변경에 유연하게 대응.
_ALLOWED_ALGS = ["HS256", "HS384", "HS512"]

bearer = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=_ALLOWED_ALGS)
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
