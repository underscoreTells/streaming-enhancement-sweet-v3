import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { PKCEManager } from '../../../platforms/pkce/PKCEManager';

describe('PKCEManager', () => {
  let pkceManager: PKCEManager;

  beforeEach(() => {
    pkceManager = new PKCEManager();
  });

  describe('generateCodeVerifier', () => {
    it('should generate code verifier with default length (64)', () => {
      const verifier = pkceManager.generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(verifier.length).toBe(64);
      expect(verifier).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should generate code verifier with custom length', () => {
      const verifier = pkceManager.generateCodeVerifier(43);
      expect(verifier).toBeDefined();
      expect(verifier.length).toBe(43);
    });

    it('should generate code verifier with maximum length (128)', () => {
      const verifier = pkceManager.generateCodeVerifier(128);
      expect(verifier).toBeDefined();
      expect(verifier.length).toBe(128);
    });

    it('should generate URL-safe base64 characters', () => {
      const verifier = pkceManager.generateCodeVerifier();
      expect(verifier).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should generate unique verifiers', () => {
      const verifier1 = pkceManager.generateCodeVerifier();
      const verifier2 = pkceManager.generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate code challenge from verifier', () => {
      const verifier = 'test-verifier-12345';
      const challenge = pkceManager.generateCodeChallenge(verifier);

      expect(challenge).toBeDefined();
      expect(challenge).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should generate consistent challenge for same verifier', () => {
      const verifier = 'consistent-verifier';
      const challenge1 = pkceManager.generateCodeChallenge(verifier);
      const challenge2 = pkceManager.generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
    });

    it('should generate different challenges for different verifiers', () => {
      const verifier1 = 'verifier-one';
      const verifier2 = 'verifier-two';
      const challenge1 = pkceManager.generateCodeChallenge(verifier1);
      const challenge2 = pkceManager.generateCodeChallenge(verifier2);

      expect(challenge1).not.toBe(challenge2);
    });

    it('should generate challenge that is SHA256 hash of verifier', () => {
      const verifier = 'test-verifier';
      const challenge = pkceManager.generateCodeChallenge(verifier);

      const expectedHash = createHash('sha256').update(verifier).digest('base64url');
      expect(challenge).toBe(expectedHash);
    });

    it('should generate URL-safe base64 challenge', () => {
      const verifier = pkceManager.generateCodeVerifier();
      const challenge = pkceManager.generateCodeChallenge(verifier);
      expect(challenge).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');
    });
  });

  describe('storeVerifier and getVerifier', () => {
    it('should store and retrieve verifier', async () => {
      const state = 'test-state-123';
      const verifier = 'test-verifier-456';

      await pkceManager.storeVerifier(state, verifier);
      const retrieved = await pkceManager.getVerifier(state);

      expect(retrieved).toBe(verifier);
    });

    it('should return null for non-existent state', async () => {
      const retrieved = await pkceManager.getVerifier('non-existent-state');
      expect(retrieved).toBeNull();
    });

    it('should store multiple verifiers', async () => {
      await pkceManager.storeVerifier('state1', 'verifier1');
      await pkceManager.storeVerifier('state2', 'verifier2');
      await pkceManager.storeVerifier('state3', 'verifier3');

      const retrieved1 = await pkceManager.getVerifier('state1');
      const retrieved2 = await pkceManager.getVerifier('state2');
      const retrieved3 = await pkceManager.getVerifier('state3');

      expect(retrieved1).toBe('verifier1');
      expect(retrieved2).toBe('verifier2');
      expect(retrieved3).toBe('verifier3');
    });

    it('should overwrite verifier for same state', async () => {
      const state = 'test-state';
      await pkceManager.storeVerifier(state, 'verifier1');
      await pkceManager.storeVerifier(state, 'verifier2');

      const retrieved = await pkceManager.getVerifier(state);
      expect(retrieved).toBe('verifier2');
    });
  });

  describe('clearVerifier', () => {
    it('should clear stored verifier', async () => {
      const state = 'test-state';
      const verifier = 'test-verifier';

      await pkceManager.storeVerifier(state, verifier);
      expect(await pkceManager.getVerifier(state)).toBe(verifier);

      await pkceManager.clearVerifier(state);
      expect(await pkceManager.getVerifier(state)).toBeNull();
    });

    it('should not throw when clearing non-existent verifier', async () => {
      await expect(pkceManager.clearVerifier('non-existent-state')).resolves.not.toThrow();
    });

    it('should only clear specific verifier', async () => {
      await pkceManager.storeVerifier('state1', 'verifier1');
      await pkceManager.storeVerifier('state2', 'verifier2');
      await pkceManager.storeVerifier('state3', 'verifier3');

      await pkceManager.clearVerifier('state2');

      expect(await pkceManager.getVerifier('state1')).toBe('verifier1');
      expect(await pkceManager.getVerifier('state2')).toBeNull();
      expect(await pkceManager.getVerifier('state3')).toBe('verifier3');
    });
  });

  describe('PKCE Flow Integration', () => {
    it('should complete full PKCE flow', async () => {
      const verifier = pkceManager.generateCodeVerifier();
      const challenge = pkceManager.generateCodeChallenge(verifier);
      const state = pkceManager.generateCodeVerifier();

      await pkceManager.storeVerifier(state, verifier);
      const retrieved = await pkceManager.getVerifier(state);

      expect(retrieved).toBe(verifier);
      expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));

      await pkceManager.clearVerifier(state);
      expect(await pkceManager.getVerifier(state)).toBeNull();
    });

    it('should generate verifier of correct length for PKCE', async () => {
      const verifier = pkceManager.generateCodeVerifier(64);
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });
  });
});
