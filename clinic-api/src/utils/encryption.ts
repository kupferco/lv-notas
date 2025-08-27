// clinic-api/src/utils/encryption.ts

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import forge from 'node-forge';

export interface EncryptionResult {
    encryptedData: string;
    iv: string;
    salt: string;
}

export interface DecryptionResult {
    decryptedData: Buffer;
}

export interface CertificateInfo {
    isValid: boolean;
    commonName?: string;
    issuer?: string;
    notBefore?: Date;
    notAfter?: Date;
    serialNumber?: string;
    cnpj?: string;
    companyName?: string;
    email?: string;
    state?: string;
    city?: string;
    error?: string;
}

export class EncryptionService {
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly KEY_LENGTH = 32; // 256 bits
    private static readonly IV_LENGTH = 16; // 128 bits
    private static readonly SALT_LENGTH = 32; // 256 bits
    private static readonly TAG_LENGTH = 16; // 128 bits

    /**
     * Generates a secure encryption key from password and salt
     */
    private static deriveKey(password: string, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, 'sha512');
    }

    /**
     * Encrypts data using AES-256-GCM
     */
    static encrypt(data: Buffer, password: string): EncryptionResult {
        try {
            // Generate random salt and IV
            const salt = crypto.randomBytes(this.SALT_LENGTH);
            const iv = crypto.randomBytes(this.IV_LENGTH);

            // Derive key from password and salt
            const key = this.deriveKey(password, salt);

            // Create cipher
            const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
            cipher.setAAD(salt); // Use salt as additional authenticated data

            // Encrypt the data
            const encrypted = Buffer.concat([
                cipher.update(data),
                cipher.final()
            ]);

            // Get authentication tag
            const tag = cipher.getAuthTag();

            // Combine encrypted data with tag
            const encryptedWithTag = Buffer.concat([encrypted, tag]);

            return {
                encryptedData: encryptedWithTag.toString('base64'),
                iv: iv.toString('base64'),
                salt: salt.toString('base64')
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Decrypts data using AES-256-GCM
     */
    static decrypt(encryptedData: string, iv: string, salt: string, password: string): DecryptionResult {
        try {
            // Convert from base64
            const encryptedBuffer = Buffer.from(encryptedData, 'base64');
            const ivBuffer = Buffer.from(iv, 'base64');
            const saltBuffer = Buffer.from(salt, 'base64');

            // Split encrypted data and authentication tag
            const encrypted = encryptedBuffer.subarray(0, -this.TAG_LENGTH);
            const tag = encryptedBuffer.subarray(-this.TAG_LENGTH);

            // Derive key from password and salt
            const key = this.deriveKey(password, saltBuffer);

            // Create decipher
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
            decipher.setAAD(saltBuffer); // Use salt as additional authenticated data
            decipher.setAuthTag(tag);

            // Decrypt the data
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);

            return { decryptedData: decrypted };
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Encrypts a string password
     */
    static encryptPassword(password: string, masterKey: string): EncryptionResult {
        const passwordBuffer = Buffer.from(password, 'utf8');
        return this.encrypt(passwordBuffer, masterKey);
    }

    /**
     * Decrypts a string password
     */
    static decryptPassword(encryptedData: string, iv: string, salt: string, masterKey: string): string {
        const result = this.decrypt(encryptedData, iv, salt, masterKey);
        return result.decryptedData.toString('utf8');
    }

    /**
     * Generates a secure random password for master key
     */
    static generateMasterKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Hashes data using SHA-256
     */
    static hash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
 * Validates certificate file format and extracts basic information
 */
    static validateCertificateFormat(certificateBuffer: Buffer, password: string): CertificateInfo {
        try {
            console.log('🔍 Certificate validation debug:');
            console.log('- Buffer length:', certificateBuffer.length);
            console.log('- Buffer first 50 bytes as hex:', certificateBuffer.subarray(0, 50).toString('hex'));
            console.log('- Buffer first 50 bytes as string:', certificateBuffer.subarray(0, 50).toString('utf8'));
            console.log('- Password provided:', password ? 'Yes' : 'No');

            // Try to parse as PKCS#12 (.p12/.pfx file)
            try {
                console.log('🔄 Attempting PKCS#12 parsing...');

                // Convert buffer to binary string for node-forge
                const p12Der = forge.util.encode64(certificateBuffer.toString('binary'));
                const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(p12Der));
                const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

                console.log('✅ PKCS#12 parsing successful');

                // Extract certificate information
                const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
                const certBagArray = certBags[forge.pki.oids.certBag];

                if (certBagArray && certBagArray.length > 0 && certBagArray[0].cert) {
                    const cert = certBagArray[0].cert;

                    // Safely get field values
                    const commonNameField = cert.subject.getField('CN');
                    const issuerField = cert.issuer.getField('CN');

                    // ADD THE CNPJ EXTRACTION HERE:
                    const cnValue = commonNameField?.value || '';

                    // Extract CNPJ and company name from CN field
                    let cnpj: string | undefined;
                    let companyName: string | undefined;

                    const cnpjMatch = cnValue.match(/\d{14}/);
                    if (cnpjMatch) {
                        cnpj = cnpjMatch[0];
                        companyName = cnValue.replace(/:?\d{14}:?/g, '').trim();
                    }

                    console.log('✅ Certificate info extracted successfully');

                    return {
                        isValid: true,
                        commonName: commonNameField?.value || 'Unknown',
                        issuer: issuerField?.value || 'Unknown',
                        notBefore: cert.validity.notBefore,
                        notAfter: cert.validity.notAfter,
                        serialNumber: cert.serialNumber,
                        cnpj: cnpj,
                        companyName: companyName,
                        email: cert.subject.getField('emailAddress')?.value,
                        state: cert.subject.getField('ST')?.value,
                        city: cert.subject.getField('L')?.value
                    };
                }
            } catch (forgeError) {
                console.log('❌ PKCS#12 parsing failed:', forgeError instanceof Error ? forgeError.message : 'Unknown error');

                // Check if it's a password error specifically
                if (forgeError instanceof Error &&
                    (forgeError.message.includes('MAC could not be verified') ||
                        forgeError.message.includes('Invalid password'))) {
                    return {
                        isValid: false,
                        error: 'Invalid certificate password. Please check your password and try again.'
                    };
                }

                // For other forge errors, log but continue to try PEM
                console.log('Full forge error:', forgeError);
            }

            // If PKCS#12 parsing failed, try as PEM
            const certificateString = certificateBuffer.toString('utf8');
            if (certificateString.includes('-----BEGIN CERTIFICATE-----')) {
                // Basic PEM validation
                const certMatch = certificateString.match(/-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s);
                if (certMatch) {
                    return {
                        isValid: true,
                        commonName: 'PEM Certificate',
                        issuer: 'Unknown',
                        error: 'PEM certificates require additional parsing for full details'
                    };
                }
            }

            return {
                isValid: false,
                error: 'Unsupported certificate format. Please use PKCS#12 (.p12/.pfx) format.'
            };
        } catch (error) {
            console.error('Certificate validation error:', error);
            return {
                isValid: false,
                error: `Certificate validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}

export class CertificateStorageService {
    private static readonly STORAGE_PATH = process.env.CERTIFICATE_STORAGE_PATH || './certificates';
    private static readonly MASTER_KEY = process.env.CERTIFICATE_ENCRYPTION_KEY || 'default-development-key-change-in-production';

    /**
     * Ensures the certificate storage directory exists
     */
    private static async ensureStorageDirectory(): Promise<void> {
        try {
            await fs.access(this.STORAGE_PATH);
        } catch {
            await fs.mkdir(this.STORAGE_PATH, { recursive: true, mode: 0o700 });
            console.log(`Created certificate storage directory: ${this.STORAGE_PATH}`);
        }
    }

    /**
     * Stores an encrypted certificate file
     */
    static async storeCertificate(
        therapistId: number,
        certificateBuffer: Buffer,
        password: string
    ): Promise<{
        filePath: string;
        encryptedPassword: EncryptionResult;
        certificateInfo: CertificateInfo;
    }> {
        try {
            await this.ensureStorageDirectory();

            // Validate certificate first
            const certificateInfo = EncryptionService.validateCertificateFormat(certificateBuffer, password);
            if (!certificateInfo.isValid) {
                throw new Error(certificateInfo.error || 'Invalid certificate');
            }

            // Generate file path
            // Use consistent filename per therapist (overwrite existing)
            const fileName = `therapist_${therapistId}_certificate.p12.enc`;
            const filePath = path.join(this.STORAGE_PATH, fileName);

            // Encrypt certificate
            const encryptedCertificate = EncryptionService.encrypt(certificateBuffer, this.MASTER_KEY);

            // Store encrypted certificate
            const fileData = JSON.stringify(encryptedCertificate);
            await fs.writeFile(filePath, fileData, { mode: 0o600 });

            // Encrypt password separately
            const encryptedPassword = EncryptionService.encryptPassword(password, this.MASTER_KEY);

            console.log(`Certificate stored securely for therapist ${therapistId}: ${fileName}`);

            return {
                filePath: fileName, // Store only filename, not full path
                encryptedPassword,
                certificateInfo
            };
        } catch (error) {
            console.error('Error storing certificate:', error);
            throw new Error(`Failed to store certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieves and decrypts a certificate file
     */
    static async retrieveCertificate(
        filePath: string,
        encryptedPassword: EncryptionResult
    ): Promise<{
        certificateBuffer: Buffer;
        password: string;
    }> {
        try {
            const fullPath = path.join(this.STORAGE_PATH, filePath);

            // Read encrypted certificate file
            const fileData = await fs.readFile(fullPath, 'utf8');
            const encryptedCertificate = JSON.parse(fileData) as EncryptionResult;

            // Decrypt certificate
            const { decryptedData } = EncryptionService.decrypt(
                encryptedCertificate.encryptedData,
                encryptedCertificate.iv,
                encryptedCertificate.salt,
                this.MASTER_KEY
            );

            // Decrypt password
            const password = EncryptionService.decryptPassword(
                encryptedPassword.encryptedData,
                encryptedPassword.iv,
                encryptedPassword.salt,
                this.MASTER_KEY
            );

            return {
                certificateBuffer: decryptedData,
                password
            };
        } catch (error) {
            console.error('Error retrieving certificate:', error);
            throw new Error(`Failed to retrieve certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Deletes a certificate file
     */
    static async deleteCertificate(filePath: string): Promise<void> {
        try {
            const fullPath = path.join(this.STORAGE_PATH, filePath);
            await fs.unlink(fullPath);
            console.log(`Certificate deleted: ${filePath}`);
        } catch (error) {
            if ((error as any).code !== 'ENOENT') {
                console.error('Error deleting certificate:', error);
                throw new Error(`Failed to delete certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }

    /**
     * Lists all certificate files for a therapist
     */
    static async listCertificates(therapistId: number): Promise<string[]> {
        try {
            await this.ensureStorageDirectory();
            const files = await fs.readdir(this.STORAGE_PATH);
            return files.filter(file => file.startsWith(`therapist_${therapistId}_`));
        } catch (error) {
            console.error('Error listing certificates:', error);
            return [];
        }
    }

    /**
     * Validates that the master encryption key is properly configured
     */
    static validateConfiguration(): boolean {
        if (this.MASTER_KEY === 'default-development-key-change-in-production') {
            console.warn('⚠️  WARNING: Using default encryption key! Set CERTIFICATE_ENCRYPTION_KEY in production!');
            return process.env.NODE_ENV === 'development';
        }
        return this.MASTER_KEY.length >= 32;
    }

    /**
     * Gets storage statistics
     */
    static async getStorageStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        oldestFile?: string;
        newestFile?: string;
    }> {
        try {
            await this.ensureStorageDirectory();
            const files = await fs.readdir(this.STORAGE_PATH);

            let totalSize = 0;
            let oldestTime = Infinity;
            let newestTime = 0;
            let oldestFile = '';
            let newestFile = '';

            for (const file of files) {
                const filePath = path.join(this.STORAGE_PATH, file);
                const stats = await fs.stat(filePath);

                totalSize += stats.size;

                if (stats.mtime.getTime() < oldestTime) {
                    oldestTime = stats.mtime.getTime();
                    oldestFile = file;
                }

                if (stats.mtime.getTime() > newestTime) {
                    newestTime = stats.mtime.getTime();
                    newestFile = file;
                }
            }

            return {
                totalFiles: files.length,
                totalSize,
                oldestFile: oldestFile || undefined,
                newestFile: newestFile || undefined
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                totalFiles: 0,
                totalSize: 0
            };
        }
    }
}