package com.murukmuruk.global.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 화면에 내려줄 시간 글자. 프론트 모의 데이터와 같은 모양으로 맞춘다.
 *  - 날짜+시각: "2026-11-03 18:20"
 *  - 날짜:      "2026-11-03"
 */
public final class TimeText {

    private static final DateTimeFormatter AT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private TimeText() {
    }

    public static String at(LocalDateTime time) {
        return time == null ? null : time.format(AT);
    }

    public static String date(LocalDate date) {
        return date == null ? null : date.toString();
    }

    public static String date(LocalDateTime time) {
        return time == null ? null : time.toLocalDate().toString();
    }
}