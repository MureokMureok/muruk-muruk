// 쿠폰 컨트랙트 배포 모듈 (Hardhat Ignition)
// admin(KCP 지갑)·operator(백엔드 서버 지갑) 주소는 기본값 없이 반드시 --parameters 파일로 넣는다.
// (실수로 배포 계정 하나가 모든 권한을 갖지 않게 — 11/4 보안 점검)
// 로컬 체인: npx hardhat ignition deploy ignition/modules/MurukCoupon.js --network localhost --parameters ignition/parameters.local.json
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MurukCouponModule", (m) => {
  const admin = m.getParameter("admin");
  const operator = m.getParameter("operator");

  const coupon = m.contract("MurukCoupon", [admin, operator]);
  return { coupon };
});
