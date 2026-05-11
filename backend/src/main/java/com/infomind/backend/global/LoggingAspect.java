package com.infomind.backend.global;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

@Slf4j
@Aspect
@Component
public class LoggingAspect {

    /**
     * com.infomind.backend.domain 하위 모든 *Service 메서드에 적용
     */
    @Around("execution(* com.infomind.backend.domain..*Service.*(..))")
    public Object logService(ProceedingJoinPoint pjp) throws Throwable {
        String className  = pjp.getTarget().getClass().getSimpleName();
        String methodName = pjp.getSignature().getName();
        String args       = summarizeArgs(pjp.getArgs());

        log.debug("[SERVICE] {}.{}({})", className, methodName, args);

        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long elapsed  = System.currentTimeMillis() - start;
            log.debug("[SERVICE] {}.{} → {}ms", className, methodName, elapsed);
            return result;
        } catch (IllegalArgumentException e) {
            // 비즈니스 예외: WARN (스택 트레이스 불필요)
            log.warn("[SERVICE] {}.{} → {}", className, methodName, e.getMessage());
            throw e;
        } catch (Exception e) {
            // 예상치 못한 예외: ERROR + 스택 트레이스
            log.error("[SERVICE] {}.{} → {}: {}", className, methodName,
                    e.getClass().getSimpleName(), e.getMessage(), e);
            throw e;
        }
    }

    /** 파라미터를 간단히 요약 (민감정보 길이 제한) */
    private String summarizeArgs(Object[] args) {
        if (args == null || args.length == 0) return "";
        return Arrays.stream(args)
                .map(arg -> {
                    if (arg == null) return "null";
                    String str = arg.toString();
                    // 너무 긴 파라미터는 잘라서 표시
                    return str.length() > 100 ? str.substring(0, 100) + "..." : str;
                })
                .collect(Collectors.joining(", "));
    }
}
