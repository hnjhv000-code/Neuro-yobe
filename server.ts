import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  checkDevLogin,
  verifyDevSessionToken,
  revokeDevSessionToken,
  scanPayload,
  checkUserAgent,
  checkApiRateLimit,
  logSecurityEvent,
  getSecurityEvents,
  clearSecurityEvents,
  calculateSecurityMetrics,
  runComprehensiveSecurityAudit
} from './server/security.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// Trust proxy headers for accurate client IP behind Cloud Run / reverse proxies
app.set('trust proxy', 1);

// Helper to extract client IP safely
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// 1. Strict Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent clickjacking while allowing necessary frames
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // HSTS (Strict-Transport-Security) when on HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy (allows AdSense, Google Identity Services, Firebase, YouTube, Fonts, and blobs)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://accounts.google.com/gsi/ https://apis.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' https: data: blob:; " +
    "media-src 'self' https: data: blob:; " +
    "connect-src 'self' https: wss: data: blob: https://*.firebasedatabase.app https://*.firebaseio.com https://accounts.google.com https://pagead2.googlesyndication.com; " +
    "frame-src 'self' https: http:; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );

  next();
});

// 2. Request body parsing with strict size limits (10MB max to prevent payload bombs)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Security Inspection & IPS / IDS Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Check rate limiting on API endpoints
  if (req.path.startsWith('/api/')) {
    if (!checkApiRateLimit(ip, 120)) {
      logSecurityEvent({
        eventType: 'Attack',
        attackType: 'API Rate Limit Violation / Flood Attempt',
        severity: 'Medium',
        ip,
        userAgent,
        endpoint: req.path,
        result: 'Blocked',
        details: 'تجاوز العميل الحد الأقصى المسموح به من الطلبات البرمجية في الدقيقة (120 req/min).',
        actionTaken: 'حظر الطلب وإعادة كود 429'
      });
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
  }

  // Check for malicious scanner bots
  if (checkUserAgent(userAgent)) {
    logSecurityEvent({
      eventType: 'Attack',
      attackType: 'Automated Vulnerability Scanner',
      severity: 'High',
      ip,
      userAgent,
      endpoint: req.path,
      result: 'Blocked',
      details: `تم رصد أداة فحص آلية مشبوهة في ترويسة User-Agent: ${userAgent}`,
      actionTaken: 'إسقاط الاتصال وحظر الطلب فورا مع كود 403'
    });
    return res.status(403).json({ error: 'Access denied: Automated scanners are blocked.' });
  }

  // Scan Query Parameters for SQLi, XSS, Path Traversal, Command Injection
  const queryString = JSON.stringify(req.query || {});
  const queryScan = scanPayload(queryString);
  if (queryScan.isMalicious) {
    logSecurityEvent({
      eventType: 'Attack',
      attackType: queryScan.type || 'Malicious Payload',
      severity: 'Critical',
      ip,
      userAgent,
      endpoint: req.path,
      result: 'Blocked',
      details: `رصد محاولة هجوم ${queryScan.type} في معاملات الرابط (Query Params). النمط: ${queryScan.pattern}`,
      actionTaken: 'اعتراض وحظر الطلب فورياً مع كود 400'
    });
    return res.status(400).json({ error: 'Bad Request: Malicious parameters detected.' });
  }

  // Scan Body for attacks (excluding safe data like developer password auth which is handled securely)
  if (req.body && req.path !== '/api/auth/dev-login') {
    const bodyString = JSON.stringify(req.body);
    const bodyScan = scanPayload(bodyString);
    if (bodyScan.isMalicious) {
      logSecurityEvent({
        eventType: 'Attack',
        attackType: bodyScan.type || 'Malicious Payload In Body',
        severity: 'Critical',
        ip,
        userAgent,
        endpoint: req.path,
        result: 'Blocked',
        details: `رصد محاولة هجوم ${bodyScan.type} في جسم الطلب (Request Body).`,
        actionTaken: 'اعتراض وحظر الطلب فورياً ومنع تمريره'
      });
      return res.status(400).json({ error: 'Bad Request: Malicious payload detected.' });
    }
  }

  next();
});

// --- API ROUTES ---

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now(), secure: true });
});

// Developer Login (Authentication + Brute Force Protection)
app.post('/api/auth/dev-login', (req: Request, res: Response) => {
  const { password } = req.body || {};
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'كلمة المرور مطلوبة.' });
  }

  const result = checkDevLogin(password, ip, userAgent);
  if (result.success) {
    return res.json({ success: true, token: result.token });
  } else {
    return res.status(401).json({ success: false, error: result.error });
  }
});

// Verify Developer Session Token
app.post('/api/auth/dev-verify', (req: Request, res: Response) => {
  const { token } = req.body || {};
  const ip = getClientIp(req);

  const isValid = verifyDevSessionToken(token, ip);
  return res.json({ valid: isValid });
});

// Developer Logout
app.post('/api/auth/dev-logout', (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (token) {
    revokeDevSessionToken(token);
  }
  return res.json({ success: true });
});

// Security Dashboard Data (Metrics, Score, Status)
app.get('/api/security/dashboard', (req: Request, res: Response) => {
  const data = calculateSecurityMetrics();
  res.json(data);
});

// Security Events Log
app.get('/api/security/events', (req: Request, res: Response) => {
  const events = getSecurityEvents();
  res.json(events);
});

// Run Real Comprehensive Security Audit
app.post('/api/security/run-audit', (req: Request, res: Response) => {
  const report = runComprehensiveSecurityAudit();
  res.json(report);
});

// Clear Security Events (Requires Developer Token)
app.post('/api/security/clear-events', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace('Bearer ', '') : req.body?.token;
  const ip = getClientIp(req);

  if (!verifyDevSessionToken(token, ip)) {
    return res.status(403).json({ error: 'غير مصرح: يلزم جلسة مطور مصادق عليها لتصفير السجلات.' });
  }

  clearSecurityEvents();
  res.json({ success: true });
});

// File Upload Validator (MIME types, magic byte headers, extensions)
app.post('/api/security/validate-upload', (req: Request, res: Response) => {
  const { fileName, fileType, fileSize } = req.body || {};
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ allowed: false, reason: 'اسم الملف غير صالح.' });
  }

  // Dangerous executable / script extensions
  const dangerousExtensions = [
    '.exe', '.sh', '.bat', '.cmd', '.php', '.phtml', '.jsp', '.asp', '.aspx',
    '.js', '.mjs', '.cjs', '.vbs', '.py', '.rb', '.pl', '.cgi', '.jar', '.com'
  ];

  const ext = path.extname(fileName).toLowerCase();
  if (dangerousExtensions.includes(ext)) {
    logSecurityEvent({
      eventType: 'Attack',
      attackType: 'Dangerous Executable Upload Attempt',
      severity: 'Critical',
      ip,
      userAgent,
      endpoint: '/api/security/validate-upload',
      result: 'Blocked',
      details: `محاولة رفع ملف تنفيذي خبيث بامتداد محظور (${ext}): ${fileName}`,
      actionTaken: 'حظر الملف ورفض الاستلام فورياً'
    });
    return res.status(400).json({ allowed: false, reason: 'ممنوع رفع الملفات التنفيذية أو البرمجية لأسباب أمنية.' });
  }

  // Check file size (e.g. 50MB max)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (fileSize && fileSize > MAX_SIZE) {
    return res.status(400).json({ allowed: false, reason: 'حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت).' });
  }

  // Filename path traversal sanitization
  if (fileName.includes('../') || fileName.includes('..\\') || fileName.includes('\0')) {
    logSecurityEvent({
      eventType: 'Attack',
      attackType: 'Filename Path Traversal Attempt',
      severity: 'High',
      ip,
      userAgent,
      endpoint: '/api/security/validate-upload',
      result: 'Blocked',
      details: `محاولة استخدام رموز مسار غير مصرح بها في اسم الملف: ${fileName}`,
      actionTaken: 'حظر الملف ورفض الاستلام'
    });
    return res.status(400).json({ allowed: false, reason: 'اسم الملف يحتوي على مسارات غير مصرح بها.' });
  }

  return res.json({ allowed: true, sanitizedName: path.basename(fileName).replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_') });
});

// Client-side Security Event Report (CSP violation, anomalies)
app.post('/api/security/report-event', (req: Request, res: Response) => {
  const { eventType, attackType, details, severity } = req.body || {};
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  logSecurityEvent({
    eventType: eventType || 'Suspicious',
    attackType: attackType || 'Client Anomaly Reported',
    severity: severity || 'Low',
    ip,
    userAgent,
    endpoint: req.headers['referer'] || '/client',
    result: 'Detected',
    details: typeof details === 'string' ? details.slice(0, 300) : 'تقرير أمني مرسل من العميل',
    actionTaken: 'تسجيل الحدث الأمني للمراجعة والتدقيق'
  });

  res.json({ recorded: true });
});

// Specific handler for ads.txt to ensure text/plain header and root accessibility
app.get('/ads.txt', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const adsTxtPath = path.join(__dirname, 'public', 'ads.txt');
  res.sendFile(adsTxtPath, (err) => {
    if (err) {
      // Fallback content if file read fails
      res.send('# Google AdSense ads.txt\n# Publisher: pub-3905915653534385\ngoogle.com, pub-3905915653534385, DIRECT, f08c47fec0942fa0\n');
    }
  });
});

// Start Server and mount Vite / Static handlers
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Security Shield] Cosmic Tube secure server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
