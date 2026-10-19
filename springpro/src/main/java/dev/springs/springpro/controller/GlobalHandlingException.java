package dev.springs.springpro.controller;

import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalHandlingException {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handlingExceptionGlobal(ResponseStatusException e) {
        System.out.println("GLOBAL EXCEPTION HANDLER CALLED");
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                e.getStatusCode(),
                e.getReason());

        return ResponseEntity.status(e.getStatusCode()).body(problem);

    }

}
