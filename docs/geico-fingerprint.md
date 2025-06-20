# GEICO Insurance Quote Flow Fingerprint

## Overview
This document contains a detailed fingerprint of GEICO's online auto insurance quote process, captured through live browser automation on January 2025.

## URLs and Entry Points
- **Homepage**: `https://www.geico.com`
- **Quote Engine**: `https://sales.geico.com/quote`
- **Entry Pattern**: ZIP code → Modal → Redirect to sales subdomain

## Complete Flow Sequence

### 1. Homepage Entry
- **ZIP Code Field**: Main homepage has prominent ZIP input
- **CTA Button**: "Start My Quote" 
- **Modal**: Triggers popup with ZIP confirmation
- **Redirect**: Takes to `sales.geico.com/quote`

### 2. Personal Information Section
**Page Title**: "GEICO Driver Details"

#### Step 2a: Date of Birth
- **Field**: Date input (MM/DD/YYYY format)
- **Validation**: Real-time validation
- **Example**: "01/01/1990"

#### Step 2b: Name Collection  
- **Fields**: First Name, Last Name
- **Layout**: Side-by-side text inputs
- **Progression**: Auto-advances after completion

#### Step 2c: Address Collection
- **Address Field**: Searchbox with autocomplete
- **ZIP Code**: Pre-populated from homepage entry
- **Apartment**: Optional additional field
- **Validation**: Address verification with auto-progression

### 3. Vehicle Information Section
**Page Title**: "GEICO Vehicle Details"

#### Step 3a: VIN Question
- **Question**: "Do you have your automobile VIN?"
- **Options**: Yes/No radio buttons
- **Flow**: Different paths based on selection

#### Step 3b: Vehicle Details (No VIN Path)
- **Year**: Dropdown (2026 down to Pre-1981)
- **Make**: Dropdown (enabled after year selection)
- **Model**: Dropdown (enabled after make selection)
- **Body Style**: Radio buttons (Coupe, Hatchback, Sedan, etc.)

#### Step 3c: Vehicle Characteristics
- **Anti-theft**: Dropdown with device types
- **Ownership**: Radio buttons (Owned, Financed, Leased)
- **Primary Use**: Radio buttons (Commute, Pleasure, Business)
- **Ownership Length**: Dropdown
- **Odometer**: Text input with formatting

#### Step 3d: Multi-Vehicle Upsell
- **Question**: "Do you want to insure any other vehicles?"
- **Display**: Shows current vehicle summary
- **Upsell Message**: "You could be eligible for a multi-car discount"
- **Options**: Add Vehicle or Continue

### 4. Driver Details Section
**Page Title**: "GEICO Driver Details"

#### Step 4a: Basic Demographics
- **Gender**: Dropdown (Female, Male, Unknown, Non-Binary)
- **Marital Status**: Dropdown (Single, Divorced, Married, etc.)

#### Step 4b: Residence Information
- **Question**: "Do you own or rent your home at [ADDRESS]?"
- **Options**: Own, Rent, I decline to provide
- **Upsell**: Homeowners insurance cross-sell when "Own" selected

#### Step 4c: Current Insurance
- **Question**: "Do you currently have auto insurance?"
- **Options**: Yes, No (various reasons), I decline to provide
- **Follow-up**: Bodily injury limits dropdown if Yes selected

#### Step 4d: Driving History
- **License Age**: Text input for age when first licensed
- **Foreign License**: Yes/No radio buttons

#### Step 4e: Demographics for Discounts
- **Education**: Comprehensive dropdown (High School through PhD)
- **Government/Military**: Multiple checkboxes for affiliations
- **Employment Status**: Dropdown with various employment types
- **Industry**: Detailed industry categorization
- **Occupation**: Specific job titles within industry

#### Step 4f: Additional Drivers
- **Question**: "Do you want to add any other drivers?"
- **Display**: Current driver summary
- **Note**: "Please add all drivers in your household"

#### Step 4g: Driving Record
- **Incidents**: List of potential violations/accidents
- **Timeframes**: 5-year and 10-year lookback periods
- **Types**: Accidents, tickets, DUIs, suspensions, theft/vandalism
- **Action**: "Add Incident" if applicable

### 5. Savings Opportunities
**Page Title**: "GEICO Savings"

#### Step 5a: Organizational Discounts
- **Partners**: Alumni, professional groups, military, etc.
- **Selection**: Dropdown for organization selection
- **Skip Option**: Continue without selection allowed

#### Step 5b: Quote Finalization
- **Heading**: "Almost done! Let's save your quote"
- **Email**: Required text input
- **Phone**: Required with formatting (___) ___-____
- **Text Consent**: Optional checkbox for marketing
- **CTA**: "Take Me To My Quote" button

### 6. Quote Results Page
**Page Title**: "GEICO Quote"

#### Loading Sequence
- **Messages**: 
  - "Drum roll please..."
  - "Crunching the numbers"
  - "Adding a special ingredient"  
  - "Customizing an offer just for you"
- **Visual**: Gecko mascot image

#### Quote Display Structure
**Heading**: "Choose a starting point for your coverage"

**Coverage Options** (Radio button selection):

1. **Less Coverage**
   - **Monthly**: $45.59/Mo.
   - **6-Month Premium**: $243.50
   - **Description**: "Coverages meet or exceed your state's minimum auto limits"

2. **More Coverage** (Default selected)
   - **Monthly**: $177.01/Mo.
   - **6-Month Premium**: $1,032.00
   - **Description**: "Coverages offer additional auto protection"

**Additional Elements**:
- Link to "California Minimum Auto Limits" information
- Important messages about installment fees
- "Next" button to proceed with selected coverage

## Technical Implementation Notes

### Form Field Patterns
- **Consistent Structure**: Label → Input → Validation
- **Progressive Enhancement**: Fields enable/disable based on selections
- **Auto-formatting**: Phone numbers, addresses, currency
- **Validation**: Real-time client-side validation
- **Accessibility**: Proper ARIA labels and roles

### Page Navigation
- **Back Button**: "Edit Prior Info" link on each page
- **Progress**: No visible progress indicator
- **State Management**: Form data persisted across pages
- **URL Stability**: Single URL with dynamic content updates

### Quote Data Structure
```javascript
{
  "quotes": [
    {
      "type": "Less Coverage",
      "monthly": "$45.59",
      "sixMonth": "$243.50",
      "description": "Coverages meet or exceed your state's minimum auto limits"
    },
    {
      "type": "More Coverage", 
      "monthly": "$177.01",
      "sixMonth": "$1,032.00",
      "description": "Coverages offer additional auto protection"
    }
  ],
  "vehicle": "2022 Honda Civic",
  "location": "123 Main St, San Francisco, CA 94105"
}
```

### Automation Considerations
- **Button States**: Buttons frequently disable during processing
- **Wait Patterns**: 3-5 second delays common between steps
- **Dynamic Loading**: Pages update content without URL changes
- **Element Stability**: Form elements may shift during loading
- **Error Handling**: Validation errors appear inline

## Cross-Selling Patterns
1. **Multi-car discount** during vehicle section
2. **Homeowners insurance** when selecting "Own" residence
3. **Organizational discounts** in savings section

## Competitive Intelligence
- **Price Range**: $45.59 - $177.01 monthly for 2022 Honda Civic
- **Coverage Tiers**: Two main options (Minimum vs Enhanced)
- **Discount Focus**: Heavy emphasis on demographic-based discounts
- **User Experience**: Comprehensive data collection with gradual disclosure

## Agent Implementation Strategy
1. **Entry Point**: Start at homepage with ZIP code
2. **Data Collection**: Gather all required fields systematically
3. **Wait Management**: Implement proper delays for page transitions
4. **Quote Extraction**: Target final quote page structure
5. **Error Handling**: Account for validation failures and retries
6. **State Management**: Handle multi-step form progression 

## Submit data after each step
onNextStep = async (stepData) => {
  await fetch('/api/quotes/validate-step', {
    body: JSON.stringify({ step: currentStep, data: stepData })
  });
  // ✅ Early validation, progress saved
}; 