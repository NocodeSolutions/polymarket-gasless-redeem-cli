/**
 * Secure Key Management System
 * Encrypts sensitive data instead of storing plain text
 */

import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class KeyManager {
  constructor() {
    this.keyFile = path.join(__dirname, '.encrypted_keys');
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(data, password) {
    const salt = crypto.randomBytes(32);
    const key = this.deriveKey(password, salt);
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    cipher.setAAD(salt);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      encrypted,
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  decrypt(encryptedData, password) {
    const { salt, iv, encrypted, tag } = encryptedData;

    const saltBuffer = Buffer.from(salt, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');

    const key = this.deriveKey(password, saltBuffer);

    const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
    decipher.setAAD(saltBuffer);
    decipher.setAuthTag(tagBuffer);

    try {
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Invalid password or corrupted key file');
    }
  }

  /**
   * Store encrypted keys to file
   */
  storeKeys(keys, password) {
    const encrypted = this.encrypt(keys, password);
    fs.writeFileSync(this.keyFile, JSON.stringify(encrypted, null, 2));
    // Set restrictive permissions
    try {
      fs.chmodSync(this.keyFile, 0o600);
    } catch (error) {
      // Ignore on Windows
    }
  }

  /**
   * Load encrypted keys from file
   */
  loadKeys(password) {
    if (!fs.existsSync(this.keyFile)) {
      throw new Error('Key file not found. Run setup first.');
    }

    const encryptedData = JSON.parse(fs.readFileSync(this.keyFile, 'utf8'));
    return this.decrypt(encryptedData, password);
  }

  /**
   * Setup wizard for first-time key storage
   */
  async setupWizard() {
    const readline = (await import('readline')).default;
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve, reject) => {
      const ask = (question) => new Promise((res) => rl.question(question, res));

      (async () => {
        try {
          console.log('Secure Key Setup Wizard');
          console.log('==========================');

          const privateKey = await ask('Enter your wallet private key: ');
          const funderAddress = await ask('Enter your Polymarket proxy wallet address: ');
          const apiKey = await ask('Enter your Builder API key: ');
          const apiSecret = await ask('Enter your Builder API secret: ');
          const apiPassphrase = await ask('Enter your Builder API passphrase: ');

          console.log('\nPassword Protection Setup');
          const password = await ask('Create a password to encrypt your keys: ');
          const confirmPassword = await ask('Confirm password: ');

          if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
          }

          if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
          }

          const keys = {
            privateKey: privateKey.trim(),
            funderAddress: funderAddress.trim(),
            apiKey: apiKey.trim(),
            apiSecret: apiSecret.trim(),
            apiPassphrase: apiPassphrase.trim()
          };

          this.storeKeys(keys, password);

          console.log('[OK] Keys encrypted and stored securely!');
          console.log('Key file created:', this.keyFile);

          rl.close();
          resolve(keys);
        } catch (error) {
          rl.close();
          reject(error);
        }
      })();
    });
  }

  /**
   * Get keys (with password prompt if needed)
   */
  async getKeys(password = null) {
    if (!password) {
      const readline = (await import('readline')).default;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      return new Promise((resolve, reject) => {
        rl.question('Enter your encryption password: ', (pwd) => {
          rl.close();
          try {
            const keys = this.loadKeys(pwd);
            resolve(keys);
          } catch (error) {
            reject(error);
          }
        });
      });
    } else {
      return this.loadKeys(password);
    }
  }

  /**
   * Check if keys are already set up
   */
  isSetup() {
    return fs.existsSync(this.keyFile);
  }
}

export default new KeyManager();
