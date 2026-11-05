-- 가맹점 테이블. 발행 한도(issue_limit)와 발행 금액(issued_amount)을 함께 둔다.
CREATE TABLE merchant (
                          id             BIGINT       NOT NULL AUTO_INCREMENT,
                          google_sub     VARCHAR(255) NOT NULL,
                          name           VARCHAR(100) NOT NULL,
                          category       VARCHAR(20)  NOT NULL,
                          business_no    CHAR(10)     NOT NULL,
                          wallet_address CHAR(42)     NOT NULL,
                          status         VARCHAR(20)  NOT NULL DEFAULT 'APPLIED',
                          issue_limit    BIGINT       NOT NULL DEFAULT 0,
                          issued_amount  BIGINT       NOT NULL DEFAULT 0,
                          created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                          updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                          PRIMARY KEY (id),
                          UNIQUE KEY uk_merchant_google_sub (google_sub),
                          UNIQUE KEY uk_merchant_business_no (business_no),
                          UNIQUE KEY uk_merchant_wallet_address (wallet_address),
                          CONSTRAINT ck_merchant_category CHECK (category IN ('FLOWER_PLANT', 'FRUIT', 'SEAFOOD', 'FARM_PRODUCE', 'SIDE_DISH')),
                          CONSTRAINT ck_merchant_status CHECK (status IN ('APPLIED', 'ACTIVE', 'SUSPENDED')),
                          CONSTRAINT ck_merchant_business_no CHECK (business_no REGEXP '^[0-9]{10}$'),
                          CONSTRAINT ck_merchant_limit CHECK (issue_limit >= 0 AND issued_amount >= 0 AND issued_amount <= issue_limit)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;