// TODO: Triển khai E2EE helpers (Signal Protocol / X25519)

export const encryptionService = {
  generateKeyPair: async (): Promise<{ publicKey: string; privateKey: string }> => {
    // TODO: Tạo cặp key (Diffie-Hellman / X25519)
    throw new Error('Chưa triển khai');
  },

  encrypt: async (_plaintext: string, _recipientPublicKey: string): Promise<string> => {
    // TODO: Mã hóa tin nhắn bằng shared secret
    throw new Error('Chưa triển khai');
  },

  decrypt: async (_ciphertext: string, _senderPublicKey: string): Promise<string> => {
    // TODO: Giải mã tin nhắn
    throw new Error('Chưa triển khai');
  },
};
