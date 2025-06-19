# Carrier Fingerprinting Strategic Plan

## Overview
This document outlines our systematic approach to fingerprinting all major auto insurance carriers to build accurate automation agents for quote retrieval.

## 🎯 Methodology
After successfully fingerprinting GEICO with real quote results ($45.59/month and $177.01/month), we've established a proven methodology:

### Phase 1: Automated Discovery
- Launch browser with monitoring scripts
- Navigate to carrier homepage
- Identify quote entry points automatically
- Capture screenshots at each step
- Log URL changes and form structures

### Phase 2: Manual Exploration
- Manual navigation through complete quote flow
- Document each form step and field requirements
- Capture exact selectors and validation patterns
- Note wait times and loading behaviors
- Extract real quote data structures

### Phase 3: Documentation & Implementation
- Create detailed fingerprint documents
- Update agent implementations with real patterns
- Validate automation sequences
- Document quote extraction patterns

## 🚀 Current Status

### ✅ GEICO - COMPLETE
- **Status**: Fully fingerprinted with real quote extraction
- **Results**: $45.59/month (Less Coverage) and $177.01/month (More Coverage)
- **Documentation**: `docs/geico-fingerprint.md`
- **Agent**: Updated with 47 distinct steps across 6 major sections
- **Quote Page**: `https://sales.geico.com/quote` (title: "GEICO Quote")

### 🔄 Progressive - IN PROGRESS
- **Status**: Fingerprinting script running
- **Script**: `server/fingerprint-progressive.js`
- **Target URL**: `https://www.progressive.com`
- **Expected Entry**: Auto insurance section
- **Monitoring**: Automatic screenshots and URL tracking

### 📋 State Farm - READY
- **Status**: Script prepared, ready to execute
- **Script**: `server/fingerprint-statefarm.js`
- **Target URL**: `https://www.statefarm.com`
- **Notes**: Known for agent-focused model, may have different flow

### 📋 Liberty Mutual - READY
- **Status**: Script prepared, ready to execute
- **Script**: `server/fingerprint-libertymutual.js`
- **Target URL**: `https://www.libertymutual.com`
- **Notes**: Large carrier with potentially complex quote flow

## 🔍 Key Discovery Areas

### Entry Points
- Homepage ZIP code fields
- "Get Quote" / "Start Quote" buttons
- Auto insurance navigation paths
- Modal popups and overlays

### Form Flow Patterns
- Single-page vs multi-page flows
- Progress indicators and step tracking
- Field validation requirements
- Required vs optional information

### Technical Implementation Details
- Button state management (disabled/enabled)
- Loading and wait patterns
- Error handling and validation messages
- Cross-sell and upsell flows

### Quote Results Structure
- Price presentation formats
- Coverage option variations
- Term options (monthly/6-month/annual)
- Additional product offerings

## 📊 Data Collection Framework

### Automated Capture
```javascript
// URL tracking with timestamps
// Form field analysis (names, types, validation)
// Screenshot automation on page changes
// Error message collection
// Progress indicator analysis
```

### Manual Documentation
- User experience flow notes
- Business logic requirements
- Edge cases and error scenarios
- Alternative path discovery

## 🎯 Success Criteria

For each carrier, we need:
1. **Complete flow documentation** - Every step from start to quote
2. **Real quote extraction** - Actual pricing data capture
3. **Technical implementation guide** - Exact selectors and automation patterns
4. **Error handling patterns** - Validation and failure scenarios
5. **Performance benchmarks** - Load times and wait requirements

## 📅 Execution Timeline

### Day 1 (Today)
- ✅ GEICO completed
- 🔄 Progressive in progress
- 📋 State Farm and Liberty Mutual scripts ready

### Day 2
- Complete Progressive fingerprinting
- Execute State Farm fingerprinting
- Begin Liberty Mutual fingerprinting
- Document initial findings

### Day 3
- Complete all carrier fingerprinting
- Create comprehensive comparison analysis
- Update all agent implementations
- Validate end-to-end quote retrieval

## 🔧 Technical Infrastructure

### Fingerprinting Scripts
- ES module compatibility for server environment
- Automated screenshot capture with timestamps
- URL change monitoring and logging
- Form field analysis and documentation
- Error capture and logging

### Documentation Templates
- Consistent fingerprint document structure
- Technical implementation sections
- Business flow descriptions
- Quote extraction patterns

### Agent Implementation
- Unified base class with common patterns
- Carrier-specific step handlers
- Real quote data extraction
- Error handling and retry logic

## 🎉 Expected Outcomes

### For Each Carrier
- Complete technical fingerprint document
- Updated agent implementation with real patterns
- Validated quote extraction capability
- Performance and reliability benchmarks

### Overall System
- Multi-carrier quote comparison capability
- Accurate price data for users
- Reliable automation across all major carriers
- Scalable foundation for additional carriers

## 🚨 Risk Mitigation

### Bot Detection
- Human-like interaction patterns
- Realistic wait times between actions
- Varied user agent and session management

### Site Changes
- Robust selector strategies (multiple fallbacks)
- Error handling and graceful degradation
- Regular re-fingerprinting schedule

### Rate Limiting
- Respectful request timing
- Session management
- IP rotation if needed

---

*This document will be updated as fingerprinting progresses and new insights are discovered.* 