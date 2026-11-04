package com.murukmuruk.domain.wallet.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlaceholderWalletProvisionerTest {

    private final PlaceholderWalletProvisioner provisioner = new PlaceholderWalletProvisioner();

    @Test
    void 주소는_0x와_소문자_16진수_40자리다() {
        String address = provisioner.createWalletAddress();
        assertTrue(address.matches("^0x[0-9a-f]{40}$"));
    }

    @Test
    void 호출할_때마다_다른_주소가_나온다() {
        assertNotEquals(provisioner.createWalletAddress(), provisioner.createWalletAddress());
    }
}