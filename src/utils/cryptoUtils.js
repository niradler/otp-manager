const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

function encrypt(text, masterPassword) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(masterPassword, 'salt', 32);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

function decrypt(text, masterPassword) {
  const [iv, encryptedText, tag] = text.split(':').map(part => Buffer.from(part, 'hex'));
  const key = crypto.scryptSync(masterPassword, 'salt', 32);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
