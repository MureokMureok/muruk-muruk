-- 연합 기획전 (KCP 운영팀이 만들고, 참여 가게들이 쿠폰 조건을 등록한 뒤 시작 승인)
-- 상태: PREPARING(준비 중) → ACTIVE(진행 중) ⇄ PAUSED(일시 중지) → ENDED(종료)
CREATE TABLE campaign (
                          id         BIGINT       NOT NULL AUTO_INCREMENT,
                          title      VARCHAR(100) NOT NULL,
                          starts_on  DATE         NOT NULL,                                -- 기록·표시용 (시작은 KCP 승인으로 결정)
                          ends_on    DATE         NOT NULL,                                -- 마지막으로 발급할 수 있는 날 (이 날 23:59:59까지)
                          status     VARCHAR(20)  NOT NULL DEFAULT 'PREPARING',
                          created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                          updated_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                          PRIMARY KEY (id),
                          CONSTRAINT ck_campaign_status CHECK (status IN ('PREPARING', 'ACTIVE', 'PAUSED', 'ENDED')),
                          CONSTRAINT ck_campaign_period CHECK (ends_on >= starts_on)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 기획전에 참여하는 가게 한 곳의 쿠폰 조건 (예치금 없음: 가게는 "할인 한도(cap)"만 정한다)
-- 최대 발급 수 = cap ÷ discount_amount (내림). 시작 승인(ACTIVE) 때 coupon_policy 한 행을 만들어 연결한다.
CREATE TABLE campaign_term (
                               id               BIGINT      NOT NULL AUTO_INCREMENT,
                               campaign_id      BIGINT      NOT NULL,
                               merchant_id      BIGINT      NOT NULL,
                               coupon_policy_id BIGINT      NULL,                                -- 시작 승인 때 채워짐
                               discount_amount  BIGINT      NOT NULL,                            -- 1장당 할인 금액 (정액만)
                               min_order_amount BIGINT      NOT NULL,                            -- 최소 주문 금액
                               validity         VARCHAR(10) NOT NULL,                            -- DAYS30 받은 날부터 30일 / END 기획전 종료일까지
                               cap              BIGINT      NOT NULL,                            -- 할인 한도(상한)
                               registered_at    DATETIME(6) NULL,                                -- "기획전에 등록하기"를 누른 시각 (NULL이면 미등록)
                               created_at       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                               updated_at       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                               PRIMARY KEY (id),
                               UNIQUE KEY uk_campaign_term_campaign_merchant (campaign_id, merchant_id),
                               UNIQUE KEY uk_campaign_term_policy (coupon_policy_id),
                               KEY idx_campaign_term_merchant (merchant_id),
                               CONSTRAINT fk_campaign_term_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
                               CONSTRAINT fk_campaign_term_merchant FOREIGN KEY (merchant_id) REFERENCES merchant (id),
                               CONSTRAINT fk_campaign_term_policy FOREIGN KEY (coupon_policy_id) REFERENCES coupon_policy (id),
                               CONSTRAINT ck_campaign_term_validity CHECK (validity IN ('DAYS30', 'END')),
                               CONSTRAINT ck_campaign_term_amount CHECK (discount_amount > 0 AND min_order_amount >= discount_amount AND cap >= discount_amount)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 기록 (실제로는 체인에 남는 이벤트를 화면용으로 미리 쌓아 두는 표). 한 번 쌓으면 고치지 않는다.
-- type: ISSUE 발급 / CONFIRM 구매 확정 / APPLY 결제에 쿠폰 적용 / USE 사용 완료 / REFUND 취소·환불 / REJECT 거절 / ADMIN 관리
CREATE TABLE ledger (
                        id              BIGINT       NOT NULL AUTO_INCREMENT,
                        type            VARCHAR(20)  NOT NULL,
                        detail          VARCHAR(255) NOT NULL,
                        actor           VARCHAR(100) NOT NULL,                            -- 예: KCP, 과수원집, 소비자 지*
                        merchant_id     BIGINT       NULL,
                        user_id         BIGINT       NULL,
                        campaign_id     BIGINT       NULL,
                        coupon_id       BIGINT       NULL,
                        order_id        BIGINT       NULL,
                        discount_amount BIGINT       NULL,
                        order_amount    BIGINT       NULL,
                        tx_hash         CHAR(66)     NULL,
                        created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                        PRIMARY KEY (id),
                        KEY idx_ledger_coupon_id (coupon_id),
                        KEY idx_ledger_merchant_id (merchant_id),
                        KEY idx_ledger_campaign_id (campaign_id),
                        KEY idx_ledger_created_at (created_at),
                        CONSTRAINT ck_ledger_type CHECK (type IN ('ISSUE', 'CONFIRM', 'APPLY', 'USE', 'REFUND', 'REJECT', 'ADMIN'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 주문 상태에 구매 확정(CONFIRMED) / 취소·환불(CANCELLED) 추가
-- 기획전 주문은 PAID(결제됨) → CONFIRMED(구매 확정) 또는 CANCELLED(취소·환불). 일반 쿠폰 주문은 PAID로 끝난다.
ALTER TABLE orders DROP CHECK ck_orders_status;
ALTER TABLE orders ADD CONSTRAINT ck_orders_status
    CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CONFIRMED', 'CANCELLED'));

-- 쿠폰: 기획전 쿠폰 정보(기획전, 구매한 가게) 추가
ALTER TABLE coupon
    ADD COLUMN campaign_id      BIGINT NULL,                          -- 기획전 쿠폰만
    ADD COLUMN from_merchant_id BIGINT NULL,                          -- 쿠폰을 받게 한 구매 가게 ("어디서 온 손님")
    ADD CONSTRAINT fk_coupon_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    ADD CONSTRAINT fk_coupon_from_merchant FOREIGN KEY (from_merchant_id) REFERENCES merchant (id);

-- 쿠폰 상태 5종
--  PENDING 확정 대기(구매 확정 전) / ACTIVE 사용 가능 / IN_USE 결제 중(쿠폰 사용 락업) / USED 사용 완료 / VOIDED 무효(구매 취소)
ALTER TABLE coupon DROP CHECK ck_coupon_status;
ALTER TABLE coupon DROP CHECK ck_coupon_used;
ALTER TABLE coupon ADD CONSTRAINT ck_coupon_status
    CHECK (status IN ('PENDING', 'ACTIVE', 'IN_USE', 'USED', 'VOIDED'));
-- 상태와 사용 정보가 어긋나지 않게
--  확정 대기·사용 가능·무효: 사용 주문과 사용 시각이 없다
--  결제 중: 사용 주문만 있다 / 사용 완료: 사용 주문과 사용 시각이 모두 있다
ALTER TABLE coupon ADD CONSTRAINT ck_coupon_used CHECK (
    (status IN ('PENDING', 'ACTIVE', 'VOIDED') AND used_order_id IS NULL AND used_at IS NULL)
        OR (status = 'IN_USE' AND used_order_id IS NOT NULL AND used_at IS NULL)
        OR (status = 'USED' AND used_order_id IS NOT NULL AND used_at IS NOT NULL)
    );

-- 기획전에서는 같은 가게 쿠폰을 구매할 때마다 받을 수 있어서 "사용자당 정책 1장" 유일 제약을 없앤다.
-- 일반 쿠폰의 중복 받기는 서비스에서 사용자 잠금 + 중복 검사로 막는다 (CouponClaimService).
ALTER TABLE coupon DROP INDEX uk_coupon_user_policy;
ALTER TABLE coupon ADD KEY idx_coupon_user_policy (user_id, coupon_policy_id);