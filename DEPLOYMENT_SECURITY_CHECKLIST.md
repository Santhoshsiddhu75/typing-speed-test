# Production Deployment Security Checklist

## Pre-Deployment Security Verification

### ✅ Environment Configuration
- [ ] **JWT Secrets**: Generate cryptographically secure JWT secrets
  ```bash
  # Generate secure secrets (64 characters each)
  openssl rand -hex 64  # For JWT_SECRET
  openssl rand -hex 64  # For JWT_REFRESH_SECRET
  ```
- [ ] **Environment Variables**: Copy `.env.example` to `.env` and update all values
- [ ] **Google OAuth**: Configure Google OAuth credentials (if using)
- [ ] **CORS Origins**: Update CORS origins to match your domain
- [ ] **NODE_ENV**: Set to `production`

### ✅ Infrastructure Security
- [ ] **HTTPS**: Enable HTTPS with valid SSL certificate
- [ ] **Reverse Proxy**: Configure Nginx/Apache with security headers
- [ ] **Firewall**: Configure firewall to allow only necessary ports (80, 443)
- [ ] **Redis**: Set up Redis for production rate limiting (recommended)
- [ ] **Database**: Secure database with proper user permissions

### ✅ Application Security
- [ ] **Dependencies**: Update all dependencies to latest versions
  ```bash
  npm audit fix
  npm update
  ```
- [ ] **Security Headers**: Verify all security headers are working
- [ ] **Rate Limiting**: Test rate limiting functionality
- [ ] **Authentication**: Test all authentication flows
- [ ] **Input Validation**: Verify all input validation is working

## Security Testing Commands

### Test Authentication Endpoints
```bash
# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"SecurePass123"}'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"SecurePass123"}'

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}' &
done
```

### Security Headers Verification
```bash
# Check security headers
curl -I https://yourdomain.com/api/auth/me

# Expected headers:
# X-XSS-Protection: 1; mode=block
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
# Strict-Transport-Security: ... (if HTTPS)
```

## Production Server Configuration

### Nginx Configuration Example
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    
    location /api/auth {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'typing-speed-test',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

## Database Security

### SQLite Security (Current Setup)
```bash
# Set proper file permissions
chmod 640 database.sqlite
chown app:app database.sqlite

# Create secure backup
sqlite3 database.sqlite ".backup /secure/path/backup.db"
```

### PostgreSQL Migration (Recommended for Production)
```sql
-- Create dedicated user
CREATE USER typing_app WITH PASSWORD 'secure_random_password';
CREATE DATABASE typing_speed_test OWNER typing_app;

-- Grant minimal permissions
GRANT CONNECT ON DATABASE typing_speed_test TO typing_app;
GRANT USAGE ON SCHEMA public TO typing_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO typing_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO typing_app;
```

## Monitoring and Logging

### Log Rotation Configuration
```bash
# /etc/logrotate.d/typing-speed-test
/path/to/your/app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 app app
    postrotate
        pm2 reload ecosystem.config.js --update-env
    endscript
}
```

### Security Monitoring
```bash
# Monitor failed login attempts
tail -f logs/combined.log | grep "Failed login"

# Monitor rate limit hits
tail -f logs/combined.log | grep "Rate limit"

# Monitor authentication events
tail -f logs/combined.log | grep "Authentication"
```

## Backup Strategy

### Database Backup
```bash
#!/bin/bash
# backup-database.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
mkdir -p $BACKUP_DIR

# SQLite backup
sqlite3 database.sqlite ".backup $BACKUP_DIR/backup_$DATE.db"

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --symmetric \
    --output "$BACKUP_DIR/backup_$DATE.db.gpg" \
    "$BACKUP_DIR/backup_$DATE.db"

# Remove unencrypted backup
rm "$BACKUP_DIR/backup_$DATE.db"

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.db.gpg" -mtime +30 -delete
```

## Security Incident Response

### Common Security Issues
1. **Rate Limit Bypassed**
   - Check Nginx/proxy configuration
   - Verify IP forwarding headers
   - Consider implementing distributed rate limiting

2. **JWT Token Compromised**
   - Rotate JWT secrets immediately
   - Implement token blacklisting
   - Force all users to re-authenticate

3. **Database Breach**
   - Change all database credentials
   - Review access logs
   - Notify users to change passwords

### Emergency Contacts
- **System Administrator**: [Your contact]
- **Security Team**: [Your contact]
- **Database Administrator**: [Your contact]

## Post-Deployment Verification

### Security Scan
```bash
# Run security audit
npm audit
npm audit --audit-level high

# Check for outdated packages
npm outdated

# SSL/TLS configuration check
curl -I https://yourdomain.com
```

### Performance and Security Testing
- [ ] **Load Testing**: Test with realistic user load
- [ ] **Security Scanning**: Run OWASP ZAP or similar
- [ ] **Penetration Testing**: Consider professional security assessment
- [ ] **Code Review**: Final security code review

## Maintenance Schedule

### Daily
- [ ] Check application logs for errors
- [ ] Monitor system resources
- [ ] Verify backup completion

### Weekly
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Check SSL certificate expiration

### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification
- [ ] Access review

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular monitoring, updates, and assessments are crucial for maintaining a secure application.