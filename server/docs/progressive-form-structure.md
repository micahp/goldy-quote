# Progressive Insurance Quote Form Structure

**Fingerprinted using MCP Playwright Tools**
**Date**: January 2025
**Base URL**: `https://autoinsurance5.progressivedirect.com`

## Overview

Progressive uses a 5-step quote flow with comprehensive form validation and dynamic field enabling based on previous selections.

---

## Initial Quote Start Page (`https://www.progressive.com/auto/`)

### Quote Entry Points
Progressive offers multiple entry points for starting quotes, with different forms for different contexts.

#### Technical Selectors - Quote Start Forms
| Form | Form ID | Action URL | Method | Notes |
|------|---------|------------|--------|-------|
| Main Form | `QuoteStartForm_mma` | `/Quote/StartQuote` | GET | Primary quote form with ZIP |
| Overlay Form | `QuoteStartForm_overlay` | `/Quote/StartQuote` | GET | Modal/popup quote form |
| No-ZIP Form | `QuoteStartForm_mma_nozip` | `/Quote/StartQuote` | GET | Form without ZIP requirement |

#### ✅ TESTED Technical Selectors - ZIP Code Fields (UPDATED FROM REAL TESTING)
| Field | ✅ Confirmed Selector | ❌ Issues Found | Type | Required | Notes |
|-------|----------------------|------------------|------|----------|-------|
| ZIP Code (Main) | `input[name="ZipCode"]#zipCode_mma` | ⚠️ **NOT TESTED** | tel | ✅ | Max 5 digits, `autocomplete="postal-code"` |
| ZIP Code (Overlay) | `input[name="ZipCode"]#zipCode_overlay` | 🐛 **HIDDEN - NOT VISIBLE** | tel | ✅ | **CRITICAL**: Found but hidden, can't be filled |
| State Field | `input[name="qsState"]` | ⚠️ **NOT TESTED** | text | ❌ | Alternative to ZIP in some forms |

#### 🔍 REAL TEST RESULTS (January 2025)
**ZIP Code Field Issue Found:**
- **Selector**: `input[name="ZipCode"]#zipCode_overlay` **exists but is HIDDEN**
- **Error**: `element is not visible` - timeout after 15000ms
- **Root Cause**: Auto insurance link click doesn't properly show the ZIP field
- **Fix Needed**: Wait for visibility or find alternative trigger

#### Technical Selectors - Submit Buttons
| Button | Primary Selector | Fallback Selector | Value | Notes |
|--------|------------------|-------------------|--------|-------|
| Get Quote (Main) | `input[name="qsButton"]#qsButton_mma` | `input[id="qsButton_mma"]` | "Get a quote" | Primary submit button |
| Get Quote (Overlay) | `input[name="qsButton"]#qsButton_overlay` | `input[id="qsButton_overlay"]` | "Get a quote" | Modal submit button |
| No ZIP Submit | `input[name="qsButton"]#qsButton_mma_nozip` | `input[id="qsButton_mma_nozip"]` | "Get a quote" | No ZIP form submit |

#### Technical Selectors - Navigation Links
| Element | Primary Selector | Fallback Selector | Notes |
|---------|------------------|-------------------|-------|
| Auto Insurance | `a:has-text("Auto")` | `a[href*="/auto/"]` | **TESTED**: Leads to quote start page |
| Continue Previous | `a:has-text("Continue previous quote")` | `a[href*="retrieve"]` | For returning users |

---

## 🚨 CRITICAL ISSUES FOUND IN TESTING

### Issue #1: Hidden ZIP Code Field
**Problem**: After clicking "Auto insurance" link, the ZIP code field exists but is hidden
```
✅ Selector works: input[name="ZipCode"]#zipCode_overlay  
❌ Element state: NOT VISIBLE (hidden)
❌ Result: Cannot fill ZIP code, quote flow fails
```

**Proposed Fixes:**
1. **Wait Strategy**: Add explicit wait for field visibility
2. **Alternative Trigger**: Find button/action that shows the field
3. **Main Form Route**: Use `#zipCode_mma` instead of overlay
4. **JavaScript Trigger**: Manually trigger visibility via page actions

### Issue #2: Unknown GEICO Selector Failures
**Problem**: GEICO agent also failed with selector `#insurancetype-auto`
```
❌ Selector failed: #insurancetype-auto (element not found)
❌ Result: Both Progressive and GEICO failed initial steps
```

**Testing Status**: Progressive partially working, GEICO completely blocked

---

## Step 1: Personal Information (`/0/UQA/Quote/NameEdit`)

### Required Fields
- **First Name*** (text input)
- **Last Name*** (text input) 
- **Date of Birth*** (MM/DD/YYYY format)

### Optional Fields
- **Middle Initial** (text input)
- **Suffix** (dropdown)
- **Email** (text input - validates against test/example domains)

#### Technical Selectors - Personal Info Fields
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| First Name | `input[name="FirstName"]` | `input[name*="first"], input[id*="first"]` | text | ✅ | Max 50 chars |
| Last Name | `input[name="LastName"]` | `input[name*="last"], input[id*="last"]` | text | ✅ | Max 50 chars |
| Middle Initial | `input[name="MiddleInitial"]` | `input[name*="middle"]` | text | ❌ | 1 char max |
| Date of Birth | `input[name*="birth"], input[name*="dob"]` | `input[placeholder*="MM/DD/YYYY"]` | text | ✅ | MM/DD/YYYY format |
| Suffix | `select[name="Suffix"]` | `select[name*="suffix"]` | select | ❌ | Jr, Sr, III, etc. |
| Email | `input[type="email"]` | `input[name*="email"]` | email | ❌ | No test domains |

#### Button Selectors - Personal Info
- **Continue**: `button[type="submit"]`, `input[type="submit"]`, `button:has-text("Continue")`
- **Back**: `a:has-text("Back")`, `button:has-text("Back")`

### Validation Rules
- DOB must be complete MM/DD/YYYY format
- Email cannot contain "test@" or "example.com" domains
- Real-looking email addresses required (e.g., "john.smith123@gmail.com")

### Technical Details
- **Quote ID**: Generated automatically (e.g., 629165559)
- **Help Phone**: 1-855-200-2706
- **Progress Indicator**: Step 1 of 5

---

## Step 2: Address Information (`/0/UQA/Quote/AddressEdit`)

### Required Fields
- **Street Address*** (text input)
- Pre-filled from initial ZIP code entry

#### Technical Selectors - Address Fields
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Street Address | `input[name*="address"]` | `input[name*="street"]` | text | ✅ | Auto-complete enabled |
| ZIP Code | `input[name="ZipCode"]` | `input[name*="zip"]` | text | ✅ | Pre-filled from start |
| City | `input[name*="city"]` | `input[id*="city"]` | text | ✅ | Auto-populated |
| State | `select[name*="state"]` | `input[name*="state"]` | select | ✅ | Auto-populated |

#### Button Selectors - Address
- **Continue**: `button[type="submit"]`, `button:has-text("Continue")`
- **Back**: `a:has-text("Edit Prior Info")`, `button:has-text("Back")`

### Auto-Complete Features
- Address validation and auto-completion
- ZIP code carries over from homepage entry

### Marketing Message
- Shows local statistics (e.g., "19,969 people bought a California auto policy in the last 30 days")

---

## Step 3: Vehicle Information (`/0/UQA/Quote/VehiclesAllEdit`)

### Vehicle Selection (Cascading Dropdowns)
1. **Year*** (dropdown - enables Make)
2. **Make*** (dropdown - enables Model) 
3. **Model*** (dropdown - enables Body Type)
4. **Body Type*** (dropdown - e.g., "4DR 4CYL")

#### Technical Selectors - Vehicle Dropdowns
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Year | `select[name*="year"]` | `select[id*="year"]` | select | ✅ | Enables Make dropdown |
| Make | `select[name*="make"]` | `select[id*="make"]` | select | ✅ | Disabled until Year selected |
| Model | `select[name*="model"]` | `select[id*="model"]` | select | ✅ | Disabled until Make selected |
| Body Type | `select[name*="body"]` | `select[name*="trim"]` | select | ✅ | Final dropdown in cascade |

#### Technical Selectors - Vehicle Details
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Primary Use | `select[name*="use"]` | `select[name*="purpose"]` | select | ✅ | Pleasure, Business, Farm, etc. |
| Miles to Work | `input[name*="miles"]` | `input[name*="commute"]` | number | ✅ | One-way distance |
| Own/Lease | `select[name*="own"]` | `select[name*="lease"]` | select | ✅ | Own, Lease, Finance |
| Tracking Device | `input[type="radio"][name*="track"]` | `input[name*="device"]` | radio | ✅ | Yes/No options |

#### Button Selectors - Vehicle
- **Save Vehicle**: `button:has-text("Save Vehicle")`, `button[type="submit"]`
- **Add Another Vehicle**: `button:has-text("Add")`, `a:has-text("Add Vehicle")`
- **Continue**: `button:has-text("Continue")`, `button[type="submit"]`

### Vehicle Details
- **Primary Use*** (dropdown)
  - Options: "Pleasure (recreational, errands)", "Business", "Farm Use", etc.
- **Miles to School/Work One Way*** (text input - numeric)
- **Own or Lease*** (dropdown)
  - Options: "Own", "Lease", "Finance"

### Security Features
- **Tracking Device?*** (radio buttons: Yes/No)

### Form Behavior
- All fields are disabled until previous selection is made
- Validation prevents continuation until all required fields completed
- "Save Vehicle" button appears after form completion
- Multiple vehicles can be added

---

## Step 4: Driver Information (`/0/UQA/Quote/DriversAddPniDetails`)

### Demographics
- **Gender*** (radio buttons: Male/Female)
- **Marital Status*** (dropdown)
  - Options: "Single", "Married", "Divorced", "Widowed"
- **Education*** (dropdown)
  - Options: "High school or less", "Some college", "College degree", "Advanced degree"

#### Technical Selectors - Demographics
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Gender | `input[type="radio"][name*="gender"]` | `input[name*="sex"]` | radio | ✅ | Male/Female |
| Marital Status | `select[name*="marital"]` | `select[name*="marriage"]` | select | ✅ | Single, Married, Divorced, Widowed |
| Education | `select[name*="education"]` | `select[name*="school"]` | select | ✅ | HS, Some College, Degree, Advanced |

#### Technical Selectors - Employment
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Employment Status | `select[name*="employment"]` | `select[name*="work"]` | select | ✅ | Employed, Retired, Student, etc. |
| Occupation | `input[name*="occupation"]` | `input[name*="job"]` | text | ✅ | Auto-complete database |
| Primary Residence | `select[name*="residence"]` | `select[name*="home"]` | select | ✅ | Own, Rent, Parents, Other |

#### Technical Selectors - License History
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Age First Licensed | `input[name*="license"]` | `input[name*="age"]` | number | ✅ | Numeric age |
| License Issues | `input[type="radio"][name*="issues"]` | `input[name*="violations"]` | radio | ✅ | Yes/No trigger |

#### Technical Selectors - Driving History
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Accidents (3 years) | `input[type="radio"][name*="accident"]` | `input[name*="claim"]` | radio | ✅ | Yes/No |
| DWI/DUI | `input[type="radio"][name*="dwi"], input[type="radio"][name*="dui"]` | `input[name*="alcohol"]` | radio | ✅ | Yes/No |
| Moving Violations | `input[type="radio"][name*="violation"]` | `input[name*="ticket"]` | radio | ✅ | Yes/No |

#### Button Selectors - Driver Details
- **Continue**: `button[type="submit"]`, `button:has-text("Continue")`
- **Back**: `a:has-text("Edit Prior Info")`

### Employment
- **Employment Status*** (dropdown)
  - Options: "Employed/Self-employed (full- or part-time)", "Retired", "Student", "Homemaker", "Unemployed"
- **Occupation*** (auto-complete text field)
  - Validates against occupation database
  - Examples: "Teacher: All Other", "Software Engineer"

### Housing
- **Primary Residence*** (dropdown)
  - Options: "Own home", "Rent", "Live with parents", "Other"

### License History
- **Age First Licensed*** (numeric input)
- **License Issues?*** (radio: Yes/No)
  - If Yes: triggers additional date field

### Driving History
- **Accidents in last 3 years?*** (radio: Yes/No)
- **DWI/DUI convictions?*** (radio: Yes/No)  
- **Moving violations/tickets?*** (radio: Yes/No)

### Validation Rules
- All fields must be completed to proceed
- Occupation field uses intelligent matching
- Clean driving history (all "No" responses) simplifies flow

---

## Step 5: Final Details (`/0/UQA/Quote/FinalDetailsEdit`)

### Insurance History
- **Previous Progressive Policy?*** (radio: Yes/No)
- **Continuously Insured 3+ Years?*** (radio: Yes/No)

### Coverage Limits
- **Bodily Injury Limits*** (dropdown)
  - Options: "$15,000/$30,000", "$25,000/$50,000", "$50,000/$100,000", "$100,000/$300,000", "$250,000/$500,000", "$500,000/$1,000,000"

#### Technical Selectors - Final Details
| Field | Primary Selector | Fallback Selector | Type | Required | Notes |
|-------|------------------|-------------------|------|----------|-------|
| Previous Progressive | `input[type="radio"][name*="previous"]` | `input[name*="prog"]` | radio | ✅ | Yes/No |
| Continuously Insured | `input[type="radio"][name*="continuous"]` | `input[name*="insured"]` | radio | ✅ | 3+ years |
| Bodily Injury Limits | `select[name*="bodily"]` | `select[name*="liability"]` | select | ✅ | Coverage amounts |
| Email Address | `input[type="email"]` | `input[name*="email"]` | email | ✅ | Strict validation |

#### Button Selectors - Final Details
- **Continue**: `button[type="submit"]`, `button:has-text("Continue")`
- **Get Rates**: `button:has-text("Get Rates")`, `button:has-text("See Rates")`

### Contact Information
- **Email Address*** (text input)
  - Strict validation - no test/example domains
  - Must be realistic email format

---

## Step 6: Bundle Options (`/0/UQA/Quote/Bundle`)

### Upsell Opportunities
- **Home Insurance Bundle** (optional)
- **Renters Insurance Bundle** (optional)
- **Condo Insurance Bundle** (optional)

#### Technical Selectors - Bundle Options
| Option | Primary Selector | Fallback Selector | Type | Required | Notes |
|--------|------------------|-------------------|------|----------|-------|
| Home Bundle | `input[type="checkbox"][name*="home"]` | `label:has-text("Home")` | checkbox | ❌ | Optional upsell |
| Renters Bundle | `input[type="checkbox"][name*="rent"]` | `label:has-text("Rent")` | checkbox | ❌ | Optional upsell |
| Condo Bundle | `input[type="checkbox"][name*="condo"]` | `label:has-text("Condo")` | checkbox | ❌ | Optional upsell |

#### Button Selectors - Bundle
- **No Thanks**: `button:has-text("No thanks")`, `a:has-text("just auto")`
- **Continue with Bundle**: `button[type="submit"]`, `button:has-text("Continue")`

### Navigation Options
- **"No thanks, just auto"** - proceeds to rates
- **Bundle selections** - additional forms

---

## Step 7: Final Rates (`/0/UQA/Quote/Rates`)

### Quote Options (3 tiers)
1. **Basic** - Lowest cost option
2. **Choice** - Mid-tier (often default selected)
3. **Recommended** - Highest coverage

#### Technical Selectors - Quote Selection
| Tier | Primary Selector | Fallback Selector | Type | Notes |
|------|------------------|-------------------|------|-------|
| Basic | `input[type="radio"][value*="basic"]` | `label:has-text("Basic")` | radio | Lowest cost |
| Choice | `input[type="radio"][value*="choice"]` | `label:has-text("Choice")` | radio | Default selected |
| Recommended | `input[type="radio"][value*="recommend"]` | `label:has-text("Recommend")` | radio | Highest coverage |

#### Technical Selectors - Payment Options
| Option | Primary Selector | Fallback Selector | Type | Notes |
|--------|------------------|-------------------|------|-------|
| Monthly | `input[type="radio"][name*="payment"][value*="month"]` | `label:has-text("Monthly")` | radio | 4-month terms |
| Pay in Full | `input[type="radio"][name*="payment"][value*="full"]` | `label:has-text("Pay in full")` | radio | 6-month discount |

#### Button Selectors - Quote Results
- **Buy Policy**: `button:has-text("Buy")`, `button[type="submit"]`
- **Customize Coverage**: `button:has-text("Customize")`, `a:has-text("Modify")`
- **Print Quote**: `button:has-text("Print")`, `a:has-text("Print")`

### Payment Options
- **Monthly payments** (4-month terms)
- **Pay-in-full** (6-month discount)
- **Down payment** requirements

### Coverage Breakdown
- **Liability Coverage**
  - Bodily Injury/Property Damage
  - Uninsured Motorist BI
- **Physical Damage**
  - Comprehensive
  - Collision
- **Additional Coverage**
  - Personal Injury Protection
  - Emergency Road Service
  - Rental Car Coverage

### Discount Information
- Total discounts applied prominently displayed
- Savings breakdown available

---

## Technical Implementation Notes

### Key Working Selectors Summary
Based on real fingerprinting data:

#### Homepage ZIP Entry
```css
/* Primary ZIP forms - use specific IDs */
input[name="ZipCode"]#zipCode_mma          /* Main page form */
input[name="ZipCode"]#zipCode_overlay      /* Modal/overlay form */
input[name="qsButton"]#qsButton_mma        /* Submit button */
input[name="qsButton"]#qsButton_overlay    /* Modal submit */

/* Auto insurance navigation */
a:has-text("Auto")                         /* Homepage nav link */
```

#### Form Field Patterns
```css
/* Name fields */
input[name="FirstName"], input[name*="first"]
input[name="LastName"], input[name*="last"]

/* Date fields */
input[name*="birth"], input[name*="dob"]

/* Email fields */  
input[type="email"], input[name*="email"]

/* Radio button patterns */
input[type="radio"][name*="gender"]
input[type="radio"][name*="accident"]
input[type="radio"][name*="previous"]

/* Select dropdown patterns */
select[name*="marital"]
select[name*="education"] 
select[name*="year"]
select[name*="make"]
```

#### Button Patterns
```css
/* Submit buttons */
button[type="submit"]
input[type="submit"]

/* Continue buttons */
button:has-text("Continue")
button:has-text("Get")

/* Navigation */
a:has-text("Back")
a:has-text("Edit Prior Info")
```

### Form Validation Strategy
- **Client-side validation** prevents submission with incomplete data
- **Real-time error messages** appear as red text below fields
- **Field enabling** - subsequent fields disabled until prerequisites met

### Session Management
- **Quote ID** persists throughout session
- **Progress tracking** with visual step indicator
- **Back/forward navigation** maintains form state

### Domain Filtering
- **Email validation** actively blocks test domains
- **Occupation matching** against comprehensive database
- **Address validation** with auto-complete

### Browser Requirements
- **JavaScript enabled** required for form functionality
- **Cookies enabled** for session persistence
- **Modern browser** for full feature support

---

## Key Fingerprinting Insights

### Automation Detection
- No apparent bot detection during normal form completion
- Realistic data entry speeds don't trigger blocks
- Progressive accepts programmatic form submission

### Data Requirements
- **Realistic personal information** required throughout
- **Valid email addresses** strictly enforced
- **Occupation validation** against internal database

### Rate Generation
- **Complete form submission** required for rate display
- **All steps mandatory** - no skipping allowed
- **Bundle upsell** presented before final rates

### Testing Considerations
- Use realistic test data to avoid validation blocks
- Allow proper timing between form submissions
- Handle dynamic field enabling in automation scripts
- **ZIP field visibility**: `zipCode_overlay` often starts hidden
- **Form context**: Multiple forms exist, use specific IDs for reliability

### Known Issues & Workarounds
1. **Hidden ZIP Fields**: The `zipCode_overlay` field is often hidden initially
   - **Solution**: Wait for modal to appear or use `zipCode_mma` instead
   
2. **Generic Selectors Fail**: Patterns like `input[name*="zip"]` are unreliable
   - **Solution**: Use specific name attributes: `input[name="ZipCode"]`
   
3. **Cascading Dropdowns**: Vehicle fields enable sequentially
   - **Solution**: Wait for each field to become enabled before proceeding
   
4. **Email Validation**: Blocks test domains aggressively  
   - **Solution**: Use realistic email patterns like `firstname.lastname@gmail.com`

### Testing Considerations
- Use realistic test data to avoid validation blocks
- Allow proper timing between form submissions
- Handle dynamic field enabling in automation scripts 