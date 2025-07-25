// clinic-api/src/services/auth-service.ts
// Authentication service for credential-based auth with session management

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '1h';

export interface UserPermission {
    therapistId: number;
    therapistName: string;
    therapistEmail: string;
    role: 'owner' | 'manager' | 'viewer' | 'super_admin';
    grantedAt: Date;
}

export interface SessionConfig {
    inactiveTimeoutMinutes: number;
    warningTimeoutMinutes: number;
    maxSessionHours: number;
    tokenRefreshMinutes: number;
}

export interface UserInfo {
    id: number;
    email: string;
    displayName: string;
    sessionId: number;
    permissions: UserPermission[];
}

/**
 * Get authentication configuration from database
 */
export async function getAuthConfig(): Promise<SessionConfig> {
    try {
        const result = await pool.query('SELECT * FROM get_session_timeouts()');
        return result.rows[0];
    } catch (error) {
        console.error('Error getting auth config:', error);
        // Fallback defaults
        return {
            inactiveTimeoutMinutes: 10,
            warningTimeoutMinutes: 1,
            maxSessionHours: 8,
            tokenRefreshMinutes: 55
        };
    }
}

/**
 * Create JWT token
 */
export function createJWTToken(userId: number, sessionId: number): string {
    return jwt.sign(
        { 
            userId, 
            sessionId, 
            type: 'session',
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
export function verifyJWTToken(token: string): { userId: number; sessionId: number } | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        };
    } catch (error) {
        return null;
    }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create user session in database
 */
export async function createUserSession(
    userId: number, 
    ipAddress: string, 
    userAgent: string
): Promise<{ sessionId: number; sessionToken: string }> {
    const config = await getAuthConfig();
    
    // Create session in database
    const result = await pool.query(`
        INSERT INTO user_sessions (
            user_id, session_token, inactive_timeout_minutes, 
            warning_timeout_minutes, max_session_hours, 
            expires_at, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `, [
        userId,
        'temp', // Will update with real token
        config.inactiveTimeoutMinutes,
        config.warningTimeoutMinutes,
        config.maxSessionHours,
        new Date(Date.now() + config.maxSessionHours * 60 * 60 * 1000),
        ipAddress,
        userAgent
    ]);
    
    const sessionId = result.rows[0].id;
    const sessionToken = createJWTToken(userId, sessionId);
    
    // Update with real token
    await pool.query(
        'UPDATE user_sessions SET session_token = $1 WHERE id = $2',
        [sessionToken, sessionId]
    );
    
    // Log session creation
    await pool.query(`
        INSERT INTO session_activity_log (session_id, user_id, activity_type, ip_address, user_agent)
        VALUES ($1, $2, 'login', $3, $4)
    `, [sessionId, userId, ipAddress, userAgent]);
    
    return { sessionId, sessionToken };
}

/**
 * Get user permissions
 */
export async function getUserPermissions(userId: number): Promise<UserPermission[]> {
    const result = await pool.query(`
        SELECT 
            t.id as therapist_id,
            t.nome as therapist_name,
            t.email as therapist_email,
            up.role,
            up.granted_at
        FROM user_permissions up
        JOIN therapists t ON up.therapist_id = t.id
        WHERE up.user_id = $1 
        AND up.is_active = true
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
        ORDER BY up.granted_at ASC
    `, [userId]);
    
    return result.rows.map(row => ({
        therapistId: row.therapist_id,
        therapistName: row.therapist_name,
        therapistEmail: row.therapist_email,
        role: row.role,
        grantedAt: row.granted_at
    }));
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId: number, endpoint?: string): Promise<void> {
    try {
        await pool.query(
            'UPDATE user_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
            [sessionId]
        );
        
        await pool.query(`
            INSERT INTO session_activity_log (session_id, activity_type, endpoint, timestamp)
            VALUES ($1, 'activity', $2, CURRENT_TIMESTAMP)
        `, [sessionId, endpoint || 'unknown']);
    } catch (error) {
        console.error('Error updating session activity:', error);
    }
}

/**
 * Validate session
 */
export async function validateSession(sessionId: number): Promise<boolean> {
    const result = await pool.query(`
        SELECT 
            id, expires_at, last_activity_at, 
            inactive_timeout_minutes, status
        FROM user_sessions 
        WHERE id = $1 AND status = 'active'
    `, [sessionId]);
    
    if (result.rows.length === 0) {
        return false;
    }
    
    const session = result.rows[0];
    const now = new Date();
    
    // Check if session has expired
    if (session.expires_at < now) {
        await pool.query(
            `UPDATE user_sessions 
             SET status = 'expired', terminated_at = CURRENT_TIMESTAMP, 
                 termination_reason = 'max_time_exceeded'
             WHERE id = $1`,
            [sessionId]
        );
        return false;
    }
    
    // Check if session is inactive
    const inactiveLimit = new Date(
        session.last_activity_at.getTime() + 
        session.inactive_timeout_minutes * 60 * 1000
    );
    
    if (now > inactiveLimit) {
        await pool.query(
            `UPDATE user_sessions 
             SET status = 'expired', terminated_at = CURRENT_TIMESTAMP,
                 termination_reason = 'inactivity_timeout'
             WHERE id = $1`,
            [sessionId]
        );
        return false;
    }
    
    return true;
}

/**
 * Authenticate user with email/password
 */
export async function authenticateUser(email: string, password: string): Promise<UserInfo | null> {
    try {
        // Get user from database
        const userResult = await pool.query(
            'SELECT id, email, password_hash, display_name, is_active, email_verified FROM user_credentials WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return null;
        }
        
        const user = userResult.rows[0];
        
        // Verify password
        const validPassword = await comparePassword(password, user.password_hash);
        if (!validPassword) {
            return null;
        }
        
        // Check email verification if required
        const emailVerificationRequired = await pool.query(
            "SELECT value FROM app_configuration WHERE key = 'auth_require_email_verification'"
        );
        
        if (emailVerificationRequired.rows[0]?.value === 'true' && !user.email_verified) {
            throw new Error('EMAIL_NOT_VERIFIED');
        }
        
        // Get permissions
        const permissions = await getUserPermissions(user.id);
        
        return {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            sessionId: 0, // Will be set when session is created
            permissions
        };
    } catch (error) {
        if (error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED') {
            throw error;
        }
        console.error('Authentication error:', error);
        return null;
    }
}

/**
 * Create new user account
 */
export async function createUser(
    email: string, 
    password: string, 
    displayName: string, 
    invitationToken?: string
): Promise<{ id: number; email: string; displayName: string }> {
    // Validate input
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }
    
    // Check if user exists
    const existingUser = await pool.query(
        'SELECT id FROM user_credentials WHERE email = $1',
        [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
        throw new Error('User already exists with this email');
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateSecureToken();
    
    // Create user
    const userResult = await pool.query(`
        INSERT INTO user_credentials (
            email, password_hash, display_name, email_verification_token, is_active
        ) VALUES ($1, $2, $3, $4, true)
        RETURNING id, email, display_name
    `, [email.toLowerCase(), passwordHash, displayName, emailVerificationToken]);
    
    const newUser = userResult.rows[0];
    
    // Handle invitation if provided
    if (invitationToken) {
        const invitationResult = await pool.query(`
            SELECT id, therapist_id, invited_role, invited_by
            FROM practice_invitations
            WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
        `, [invitationToken]);
        
        if (invitationResult.rows.length > 0) {
            const invitation = invitationResult.rows[0];
            
            // Grant permission
            await pool.query(`
                INSERT INTO user_permissions (user_id, therapist_id, role, granted_by, notes)
                VALUES ($1, $2, $3, $4, 'Granted via invitation acceptance')
            `, [newUser.id, invitation.therapist_id, invitation.invited_role, invitation.invited_by]);
            
            // Mark invitation as accepted
            await pool.query(`
                UPDATE practice_invitations 
                SET status = 'accepted', responded_at = CURRENT_TIMESTAMP, accepted_by = $1
                WHERE id = $2
            `, [newUser.id, invitation.id]);
        }
    }
    
    return newUser;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
    const userResult = await pool.query(
        'SELECT id FROM user_credentials WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
        return null; // Don't reveal if user exists
    }
    
    const resetToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await pool.query(`
        UPDATE user_credentials 
        SET password_reset_token = $1, password_reset_expires_at = $2
        WHERE id = $3
    `, [resetToken, expiresAt, userResult.rows[0].id]);
    
    return resetToken;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }
    
    const userResult = await pool.query(`
        SELECT id FROM user_credentials 
        WHERE password_reset_token = $1 
        AND password_reset_expires_at > CURRENT_TIMESTAMP
        AND is_active = true
    `, [token]);
    
    if (userResult.rows.length === 0) {
        return false;
    }
    
    const passwordHash = await hashPassword(newPassword);
    const userId = userResult.rows[0].id;
    
    // Update password and clear reset token
    await pool.query(`
        UPDATE user_credentials 
        SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL,
            email_verified = true
        WHERE id = $2
    `, [passwordHash, userId]);
    
    // Terminate all existing sessions for security
    await pool.query(`
        UPDATE user_sessions 
        SET status = 'terminated', terminated_at = CURRENT_TIMESTAMP, 
            termination_reason = 'password_reset'
        WHERE user_id = $1 AND status = 'active'
    `, [userId]);
    
    return true;
}

/**
 * Terminate session
 */
export async function terminateSession(sessionId: number, reason: string = 'logout'): Promise<boolean> {
    try {
        const result = await pool.query(`
            UPDATE user_sessions 
            SET status = 'terminated', terminated_at = CURRENT_TIMESTAMP, termination_reason = $1
            WHERE id = $2 AND status = 'active'
        `, [reason, sessionId]);
        
        await pool.query(`
            INSERT INTO session_activity_log (session_id, activity_type, metadata)
            VALUES ($1, 'logout', $2)
        `, [sessionId, JSON.stringify({ reason, terminated_at: new Date() })]);
        
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error terminating session:', error);
        return false;
    }
}

/**
 * Extend session
 */
export async function extendSession(sessionToken: string): Promise<boolean> {
    try {
        const result = await pool.query('SELECT extend_user_session($1)', [sessionToken]);
        return result.rows[0].extend_user_session;
    } catch (error) {
        console.error('Error extending session:', error);
        return false;
    }
}

/**
 * Get user by session token
 */
export async function getUserByToken(token: string): Promise<UserInfo | null> {
    const decoded = verifyJWTToken(token);
    if (!decoded) return null;
    
    const isValid = await validateSession(decoded.sessionId);
    if (!isValid) return null;
    
    const userResult = await pool.query(
        'SELECT id, email, display_name FROM user_credentials WHERE id = $1 AND is_active = true',
        [decoded.userId]
    );
    
    if (userResult.rows.length === 0) return null;
    
    const user = userResult.rows[0];
    const permissions = await getUserPermissions(user.id);
    
    return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        sessionId: decoded.sessionId,
        permissions
    };
}