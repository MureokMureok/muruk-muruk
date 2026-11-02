// 쿠폰 컨트랙트 배포 모듈 (Hardhat Ignition)
// 로컬 체인: npx hardhat ignition deploy ignition/modules/MurukCoupon.js --network localhost
// admin(KCP 지갑)·operator(백엔드 서버 지갑) 주소를 바꾸려면 --parameters 파일을 쓴다.
// 기본값은 배포 계정이 두 역할을 모두 갖는다 (로컬 테스트용).
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MurukCouponModule", (m) => {
  const deployer = m.getAccount(0);
  const admin = m.getParameter("admin", deployer);
  const operator = m.getParameter("operator", deployer);

  const coupon = m.contract("MurukCoupon", [admin, operator]);
  return { coupon };
});
