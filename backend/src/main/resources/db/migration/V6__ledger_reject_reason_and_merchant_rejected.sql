-- 기록(ledger)에 거절 사유와 그때의 쿠폰 상태를 남긴다 (쿠폰 기록 화면에서 "재사용 시도 · 거절 기록됨"을 구분하는 데 쓴다)
ALTER TABLE ledger
    ADD COLUMN reason_code   VARCHAR(40) NULL,  -- REJECT 기록의 에러 코드 (예: COUPON_ALREADY_USED)
    ADD COLUMN coupon_status VARCHAR(20) NULL;  -- REJECT 기록 당시 쿠폰 화면 상태 (예: PROCESSING, USED)

-- 가맹점 신청 반려(REJECTED) 상태 추가
ALTER TABLE merchant DROP CHECK ck_merchant_status;
ALTER TABLE merchant ADD CONSTRAINT ck_merchant_status
    CHECK (status IN ('APPLIED', 'ACTIVE', 'SUSPENDED', 'REJECTED'));