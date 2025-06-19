# Progressive Insurance Quote Form Structure

**Fingerprinted using MCP Playwright Tools**
**Date**: January 2025
**Base URL**: `https://autoinsurance5.progressivedirect.com`

## Overview

Progressive uses a 5-step quote flow with comprehensive form validation and dynamic field enabling based on previous selections.

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

### Navigation Options
- **"No thanks, just auto"** - proceeds to rates
- **Bundle selections** - additional forms

---

## Step 7: Final Rates (`/0/UQA/Quote/Rates`)

### Quote Options (3 tiers)
1. **Basic** - Lowest cost option
2. **Choice** - Mid-tier (often default selected)
3. **Recommended** - Highest coverage

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