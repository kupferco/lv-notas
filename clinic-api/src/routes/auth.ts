// clinic-api/src/routes/auth.ts
// Authentication routes following the existing pattern

import express, { Router, Request, Response, NextFunction } from "express";
import {
    authenticateUser,
    createUser,
    createUserSession,
    requestPasswordReset,
    resetPassword,
    terminateSession,
    extendSession,
    getUserByToken,
    updateSessionActivity,
    verifyJWTToken
} from "../services/auth-service.js";
import pool from "../config/database.js";

const router: Router = Router();

// Use the same asyncHandler pattern as patients.ts
const asyncHandler = (
    handler: (req: Request, res: Response) => Promise<Response | void>
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res);
        } catch (error) {
            next(error);
        }
    };
};

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: 'Email and password are required'
        });
    }

    try {
        const user = await authenticateUser(email, password);

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Create session
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        const { sessionId, sessionToken } = await createUserSession(
            user.id,
            clientIP,
            userAgent
        );

        // Update last login time
        await pool.query(
            'UPDATE user_credentials SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName
            },
            sessionToken,
            sessionId,
            permissions: user.permissions,
            expiresIn: '1h'
        });

    } catch (error: any) {
        if (error.message === 'EMAIL_NOT_VERIFIED') {
            return res.status(401).json({
                error: 'Email verification required',
                code: 'EMAIL_NOT_VERIFIED',
                action: 'verify_email'
            });
        }

        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));

/**
 * POST /api/auth/register
 * Register new user account
 */
router.post("/register", asyncHandler(async (req, res) => {
    const { email, password, displayName, invitationToken } = req.body;

    if (!email || !password || !displayName) {
        return res.status(400).json({
            error: 'Email, password, and display name are required'
        });
    }

    try {
        const newUser = await createUser(email, password, displayName, invitationToken);

        res.status(201).json({
            message: 'Account created successfully',
            user: newUser,
            requiresEmailVerification: true
        });

    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return res.status(400).json({
                error: 'User already exists with this email'
            });
        }

        if (error.message.includes('Password must be')) {
            return res.status(400).json({
                error: error.message
            });
        }

        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post("/forgot-password", asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            error: 'Email is required'
        });
    }

    const resetToken = await requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.json({
        message: 'If an account exists, a password reset email has been sent',
        // TODO: Remove this in production, send via email instead
        resetToken: resetToken
    });
}));

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({
            error: 'Token and new password are required'
        });
    }

    try {
        const success = await resetPassword(token, newPassword);

        if (success) {
            res.json({
                message: 'Password reset successful. Please login with your new password.'
            });
        } else {
            res.status(400).json({
                error: 'Invalid or expired reset token'
            });
        }

    } catch (error: any) {
        if (error.message.includes('Password must be')) {
            return res.status(400).json({
                error: error.message
            });
        }

        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));

/**
 * POST /api/auth/logout
 * Logout and terminate session
 */
router.post("/logout", asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(400).json({ error: 'No session token provided' });
    }

    const user = await getUserByToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const terminated = await terminateSession(user.sessionId, 'logout');

    if (terminated) {
        res.json({ message: 'Logout successful' });
    } else {
        res.status(400).json({ error: 'Session not found or already terminated' });
    }
}));

/**
 * POST /api/auth/extend-session
 * Extend session when user chooses to continue
 */
router.post("/extend-session", asyncHandler(async (req, res) => {
    const { sessionToken } = req.body;

    if (!sessionToken) {
        return res.status(400).json({
            error: 'Session token is required'
        });
    }

    const extended = await extendSession(sessionToken);

    if (extended) {
        res.json({
            message: 'Session extended successfully',
            extendsFor: '1h'
        });
    } else {
        res.status(400).json({
            error: 'Session not found or cannot be extended',
            code: 'SESSION_EXPIRED',
            action: 'redirect_to_login'
        });
    }
}));

/**
 * GET /api/auth/me
 * Get current user information - REAL SESSION VALIDATION
 */
router.get("/me", asyncHandler(async (req, res) => {
    console.log('🔍 /api/auth/me endpoint called');
    console.log('Origin:', req.headers.origin);

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Token present:', !!token);

    // IMPORTANT: Always validate session, even for localhost
    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ error: 'No session token' });
    }

    try {
        const user = await getUserByToken(token);
        if (!user) {
            console.log('❌ Invalid or expired session token');
            return res.status(401).json({
                error: 'Invalid or expired session',
                code: 'SESSION_EXPIRED'
            });
        }

        console.log('✅ Valid session for user:', user.email);
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName
            },
            permissions: user.permissions,
            session: {
                id: user.sessionId,
                lastActivity: new Date(),
                valid: true
            }
        });

    } catch (error) {
        console.error('Error validating session:', error);
        return res.status(401).json({
            error: 'Session validation failed',
            code: 'SESSION_EXPIRED'
        });
    }
}));

/**
 * REPLACE the current session-status section (lines ~278-350) with this single read-only version:
 */

/**
 * GET /api/auth/session-status
 * Check session status for frontend session management - READ ONLY, NO ACTIVITY UPDATE
 */
router.get("/session-status", asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // CRITICAL FIX: Verify token WITHOUT updating activity
    const decoded = verifyJWTToken(token);
    if (!decoded) {
        return res.status(401).json({
            error: 'Invalid token',
            code: 'SESSION_EXPIRED'
        });
    }

    // Get session data WITHOUT calling updateSessionActivity
    const sessionResult = await pool.query(`
        SELECT 
            last_activity_at, expires_at, 
            inactive_timeout_minutes, warning_timeout_minutes,
            status, created_at, user_id
        FROM user_sessions 
        WHERE id = $1 AND status = 'active'
    `, [decoded.sessionId]);

    if (sessionResult.rows.length === 0) {
        return res.status(401).json({
            error: 'Session not found or expired',
            code: 'SESSION_EXPIRED'
        });
    }

    const session = sessionResult.rows[0];
    const now = new Date();

    // Check if session is actually expired (but don't update it yet)
    const lastActivity = new Date(session.last_activity_at);
    const sessionDurationMs = session.inactive_timeout_minutes * 60 * 1000;
    const sessionExpiresAt = new Date(lastActivity.getTime() + sessionDurationMs);

    if (now >= sessionExpiresAt) {
        // Mark as expired but don't update activity
        await pool.query(`
            UPDATE user_sessions 
            SET status = 'expired', terminated_at = CURRENT_TIMESTAMP,
                termination_reason = 'inactivity_timeout'
            WHERE id = $1
        `, [decoded.sessionId]);

        return res.status(401).json({
            error: 'Session expired due to inactivity',
            code: 'SESSION_EXPIRED'
        });
    }

    // Calculate timing WITHOUT updating last_activity_at
    const warningDurationMs = session.warning_timeout_minutes * 60 * 1000;
    const warningStartsAt = new Date(sessionExpiresAt.getTime() - warningDurationMs);

    const timeUntilExpiry = Math.max(0, sessionExpiresAt.getTime() - now.getTime());
    const timeUntilWarning = Math.max(0, warningStartsAt.getTime() - now.getTime());

    const warningActive = now >= warningStartsAt && now < sessionExpiresAt;

    console.log('⏱️ Session timing (READ-ONLY):', {
        sessionId: decoded.sessionId,
        now: now.toISOString(),
        lastActivity: lastActivity.toISOString(),
        sessionExpiresAt: sessionExpiresAt.toISOString(),
        warningStartsAt: warningStartsAt.toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000),
        timeUntilWarning: Math.round(timeUntilWarning / 1000),
        warningActive,
        // IMPORTANT: No activity update performed
        activityUpdated: false
    });

    res.json({
        status: session.status,
        timeUntilWarningMs: timeUntilWarning,
        timeUntilExpiryMs: timeUntilExpiry,
        warningTimeoutMinutes: session.warning_timeout_minutes,
        inactiveTimeoutMinutes: session.inactive_timeout_minutes,
        shouldShowWarning: warningActive,
        sessionCreatedAt: session.created_at,
        lastActivityAt: session.last_activity_at,
        warningStartsAt: warningStartsAt.toISOString(),
        sessionExpiresAt: sessionExpiresAt.toISOString(),
        // Debug info
        readOnly: true // Confirms this endpoint doesn't update activity
    });
}));

/**
 * GET /api/auth/session-config
 * Get current session configuration from database
 */
router.get("/session-config", asyncHandler(async (req, res) => {
    console.log('🔍 /api/auth/session-config endpoint called');

    if (req.headers.origin?.includes('localhost')) {
        console.log('✅ Localhost detected - returning session configuration');

        try {
            // Import and run the session cleanup
            const { markExpiredSessions } = await import('../services/auth-service.js');
            await markExpiredSessions();

            // Get database defaults
            const defaultConfigQuery = await pool.query(`
                SELECT column_default as timeout_default
                FROM information_schema.columns 
                WHERE table_name = 'user_sessions' 
                AND column_name = 'inactive_timeout_minutes'
            `);

            const defaultWarningQuery = await pool.query(`
                SELECT column_default as warning_default
                FROM information_schema.columns 
                WHERE table_name = 'user_sessions' 
                AND column_name = 'warning_timeout_minutes'
            `);

            // Get ONLY truly active sessions (excluding expired)
            const activeSessionsQuery = await pool.query(`
                SELECT 
                    COUNT(*) as active_count,
                    inactive_timeout_minutes,
                    warning_timeout_minutes
                FROM user_sessions 
                WHERE status = 'active'
                GROUP BY inactive_timeout_minutes, warning_timeout_minutes
            `);

            // Parse defaults
            const defaultInactiveTimeout = parseInt(
                (defaultConfigQuery.rows[0]?.timeout_default || '10').toString()
            );
            const defaultWarningTimeout = parseInt(
                (defaultWarningQuery.rows[0]?.warning_default || '1').toString()
            );

            // Get accurate active session count
            const activeSessionCount = activeSessionsQuery.rows.reduce(
                (total, row) => total + parseInt(row.active_count), 0
            );

            const currentSession = activeSessionsQuery.rows[0];

            const config = {
                defaultInactiveTimeoutMinutes: defaultInactiveTimeout,
                defaultWarningTimeoutMinutes: defaultWarningTimeout,
                activeSessionCount: activeSessionCount,
                currentSessionInactiveTimeout: currentSession?.inactive_timeout_minutes || null,
                currentSessionWarningTimeout: currentSession?.warning_timeout_minutes || null
            };

            console.log('📊 Session configuration response:', config);
            return res.json(config);

        } catch (error) {
            console.error('Error fetching session configuration:', error);
            return res.status(500).json({
                error: 'Failed to fetch session configuration',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // For production, validate token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    return res.status(401).json({ error: 'Authentication required' });
}));

export default router;