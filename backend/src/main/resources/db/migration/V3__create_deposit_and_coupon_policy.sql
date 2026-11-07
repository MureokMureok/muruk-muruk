-- 가맹점 입금 내역 (블록 확정된 것만 기록)
-- 입금 반영 = 이 테이블 INSERT + merchant.issue_limit 증가를 한 트랜잭션으로 처리
CREATE TABLE merchant_deposit (
                                  id          BIGINT      NOT NULL AUTO_INCREMENT,
                                  merchant_id BIGINT      NOT NULL,
                                  amount      BIGINT      NOT NULL,                                -- 원 단위
                                  tx_hash     CHAR(66)    NOT NULL,                                -- 체인 거래 해시 (0x + 64자)
                                  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                  PRIMARY KEY (id),
                                  UNIQUE KEY uk_merchant_deposit_tx_hash (tx_hash),                -- 같은 입금 중복 반영 방지
                                  KEY idx_merchant_deposit_merchant_id (merchant_id),
                                  CONSTRAINT fk_merchant_deposit_merchant FOREIGN KEY (merchant_id) REFERENCES merchant (id),
                                  CONSTRAINT ck_merchant_deposit_amount CHECK (amount > 0)
);

-- 쿠폰 정책 (가맹점이 만드는 쿠폰 규칙, 정액권만)
CREATE TABLE coupon_policy (
                               id               BIGINT       NOT NULL AUTO_INCREMENT,
                               merchant_id      BIGINT       NOT NULL,
                               name             VARCHAR(100) NOT NULL,
                               discount_amount  BIGINT       NOT NULL,                          -- 1장당 할인 금액(원)
                               receive_type     VARCHAR(20)  NOT NULL,                          -- 받는 조건
                               receive_amount   BIGINT       NULL,                              -- MIN_AMOUNT일 때만
                               min_order_amount BIGINT       NOT NULL DEFAULT 0,                -- 쿠폰 사용 조건(최소 주문 금액)
                               valid_days       INT          NULL,                              -- 발급 후 유효 일수 (기획전 쿠폰만 NULL)
                               usable_scope     VARCHAR(20)  NOT NULL DEFAULT 'OWN_SHOP',
                               quantity         INT          NOT NULL,                          -- 발행 수량
                               issued_count     INT          NOT NULL DEFAULT 0,                -- 지금까지 사용자에게 발급된 수량
                               created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                               updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                               PRIMARY KEY (id),
                               KEY idx_coupon_policy_merchant_id (merchant_id),
                               CONSTRAINT fk_coupon_policy_merchant FOREIGN KEY (merchant_id) REFERENCES merchant (id),
                               CONSTRAINT ck_coupon_policy_receive_type CHECK (receive_type IN ('DIRECT','FIRST_PURCHASE','MIN_AMOUNT','CAMPAIGN')),
                               CONSTRAINT ck_coupon_policy_usable_scope CHECK (usable_scope IN ('OWN_SHOP','CAMPAIGN_MERCHANTS')),
                               CONSTRAINT ck_coupon_policy_discount CHECK (discount_amount > 0),
                               CONSTRAINT ck_coupon_policy_min_order CHECK (min_order_amount >= 0),
                               CONSTRAINT ck_coupon_policy_quantity CHECK (quantity > 0 AND issued_count >= 0 AND issued_count <= quantity),
                               CONSTRAINT ck_coupon_policy_valid_days CHECK (valid_days IS NULL OR valid_days > 0),
    -- 기획전이 아닌 쿠폰은 유효기간(일) 필수
                               CONSTRAINT ck_coupon_policy_valid_days_required CHECK (receive_type = 'CAMPAIGN' OR valid_days IS NOT NULL),
    -- receive_amount는 MIN_AMOUNT일 때만 필수, 그 외에는 NULL
                               CONSTRAINT ck_coupon_policy_receive_amount CHECK (
                                   (receive_type = 'MIN_AMOUNT' AND receive_amount IS NOT NULL AND receive_amount > 0)
                                       OR (receive_type <> 'MIN_AMOUNT' AND receive_amount IS NULL)
                                   )
);