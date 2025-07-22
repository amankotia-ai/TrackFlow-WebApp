# 🎯 TrackFlow Production Integration Guide

## ⚡ Quick Start (2 Minutes)

Add these 2 lines to your website's `<head>` section:

```html
<!-- TrackFlow Integration - Add to <head> section -->
<script src="https://trackflow-webapp-production.up.railway.app/api/anti-flicker.js"></script>
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
```

That's it! Your site now has:
- ✅ Comprehensive analytics tracking
- ✅ Automatic workflow execution
- ✅ Real-time personalization
- ✅ UTM parameter tracking
- ✅ Device-based targeting

## 🎮 Test Your Integration

1. **Test Page**: Visit [https://trackflow-webapp-production.up.railway.app/test-production-ready.html](test-production-ready.html)
2. **Check Console**: Open browser console (F12) and look for 🎯 TrackFlow messages
3. **Verify Tracking**: Check your analytics dashboard for incoming events

## 📊 What Gets Tracked Automatically

### Page Analytics
- Page views and sessions
- Time on page and bounce rate  
- Referrer URLs and UTM parameters
- Device type and screen resolution

### User Interactions
- Button and link clicks
- Form submissions and inputs
- Scroll depth and engagement
- Element visibility events

### Conversion Tracking
- Goal completions and values
- Attribution to traffic sources
- Workflow-triggered events
- Custom event properties

## 🎯 Workflow Integration

### How It Works
1. **Automatic Detection**: System loads all active workflows for your page
2. **URL Matching**: Workflows with matching target URLs are loaded
3. **Trigger Evaluation**: System checks device type, UTM params, user behavior
4. **Action Execution**: Connected actions run when triggers fire

### Universal Workflows
Set target URL to `*` for site-wide workflows:
- Mobile optimization
- UTM-based personalization  
- Time-based offers
- Device-specific content

### Page-Specific Workflows
Set specific target URLs for targeted personalization:
- `/pricing` → Pricing page optimization
- `/landing/*` → Landing page variants
- `/product/` → Product page enhancements

## 🔧 Advanced Configuration

### Custom Tracking Events
```javascript
// Track custom events
if (window.elementTracker) {
  window.elementTracker.addEvent({
    eventType: 'custom_conversion',
    conversionValue: 99.99,
    productId: 'prod_123',
    category: 'premium'
  });
}
```

### Manual Workflow Triggers
```javascript
// Trigger specific workflows manually
if (window.workflowSystem) {
  window.workflowSystem.executeWorkflow('workflow-id-here');
}
```

### Debug Mode
Add `?debug=true` to your URL to see detailed console logs.

## 🚀 Production Checklist

### Before Going Live
- [ ] Test integration on staging site
- [ ] Verify analytics events are being received
- [ ] Test workflows on different devices
- [ ] Check page load performance
- [ ] Validate UTM parameter tracking

### Performance Optimization
- [ ] Scripts load asynchronously (automatic)
- [ ] Anti-flicker timeout set to 3 seconds
- [ ] Event batching reduces server requests
- [ ] Lightweight payload (~100KB total)

### Analytics Setup
- [ ] Create workflows in TrackFlow dashboard
- [ ] Set appropriate target URLs for each workflow
- [ ] Configure triggers (device, UTM, behavior)
- [ ] Connect actions (text replacement, visibility, etc.)
- [ ] Test workflow execution

## 📈 Analytics Dashboard

### Key Metrics Available
- **Traffic**: Visitors, pageviews, sessions, bounce rate
- **Sources**: Direct, search, social, email, referral traffic
- **Devices**: Desktop vs mobile breakdown
- **Conversions**: Goal completions and revenue attribution
- **Workflows**: Execution counts and performance metrics

### Real-Time Data
- Live visitor tracking
- Real-time event processing
- Instant workflow execution
- Live personalization updates

## 🛠️ Troubleshooting

### "No tracking events visible"
1. Check browser console for JavaScript errors
2. Verify script URLs are loading correctly
3. Test with `?debug=true` parameter
4. Check network tab for analytics requests

### "Workflows not executing"  
1. Verify workflows are active in dashboard
2. Check target URL patterns match your page
3. Test trigger conditions (device, UTM, etc.)
4. Look for console messages about workflow loading

### "Page loading slowly"
1. Check anti-flicker timeout (default: 3 seconds)
2. Optimize workflow trigger complexity
3. Consider page-specific loading
4. Monitor total script size

## 📞 Support

- **Documentation**: [GitHub Repository](https://github.com/your-repo)
- **Dashboard**: [TrackFlow App](https://trackflow-webapp-production.up.railway.app)
- **Test Page**: [Integration Test](test-production-ready.html)

---

## 🎯 Example Integrations

### E-commerce Site
```html
<head>
  <!-- TrackFlow for conversion optimization -->
  <script src="https://trackflow-webapp-production.up.railway.app/api/anti-flicker.js"></script>
  <script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
</head>
```

### Landing Pages
```html
<head>
  <!-- TrackFlow for UTM-based personalization -->
  <script src="https://trackflow-webapp-production.up.railway.app/api/anti-flicker.js"></script>
  <script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
</head>
```

### SaaS Platform
```html
<head>
  <!-- TrackFlow for user behavior tracking -->
  <script src="https://trackflow-webapp-production.up.railway.app/api/anti-flicker.js"></script>
  <script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
</head>
``` 