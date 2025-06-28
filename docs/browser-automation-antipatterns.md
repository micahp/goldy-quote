# Browser Automation Anti-Patterns

This document captures proven **failures** and **anti-patterns** discovered during development. Use this as a negative prompt guide when making changes to agents.

## GEICO Agent Anti-Patterns

### ❌ INCORRECT: Over-engineered Step Handlers

**Status:** TESTED AND FAILED - Do not use this approach

```typescript
private async handleDateOfBirth(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    
    // If we don't have dateOfBirth in stepData, we need to wait for it
    if (!stepData.dateOfBirth) {
      return this.createWaitingResponse(this.getDateOfBirthFields());
    }

    console.log(`[${this.name}] Attempting to fill date of birth: ${stepData.dateOfBirth}`);
    
    try {
      await this.smartType(taskId, 'Date of Birth', 'dateOfBirth', stepData.dateOfBirth);
      console.log(`[${this.name}] Date of birth filled successfully`);
      
      await this.clickNextButton(page, taskId);
      console.log(`[${this.name}] Next button clicked successfully`);
      
      // After date of birth, GEICO usually goes to name collection
      return this.createWaitingResponse(this.getNameCollectionFields());
    } catch (error) {
      console.error(`[${this.name}] Error handling date of birth:`, error);
      await this.browserActions.takeScreenshot(taskId, 'date-of-birth-error');
      return this.createErrorResponse(`Failed to handle date of birth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleNameCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    
    console.log(`[${this.name}] Attempting to fill name: ${stepData.firstName} ${stepData.lastName}`);
    
    try {
      await this.smartType(taskId, 'First Name', 'firstName', stepData.firstName);
      await this.smartType(taskId, 'Last Name', 'lastName', stepData.lastName);
      await this.clickNextButton(page, taskId);
      
      console.log(`[${this.name}] Name collection completed successfully`);
      return this.createWaitingResponse(this.getAddressCollectionFields());
    } catch (error) {
      console.error(`[${this.name}] Error handling name collection:`, error);
      await this.browserActions.takeScreenshot(taskId, 'name-collection-error');
      return this.createErrorResponse(`Failed to handle name collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleAddressCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    
    console.log(`[${this.name}] Attempting to fill address: ${stepData.streetAddress}`);
    
    try {
      await this.smartType(taskId, 'Street Address', 'address', stepData.streetAddress);
      // GEICO often auto-fills city/state from ZIP, so we just continue
      await this.clickNextButton(page, taskId);
      
      console.log(`[${this.name}] Address collection completed successfully`);
      
      // This is a guess, the flow after address is complex.
      // Returning an empty waiting response to signal the frontend to ask for the next logical step.
      return this.createWaitingResponse({});
    } catch (error) {
      console.error(`[${this.name}] Error handling address collection:`, error);
      await this.browserActions.takeScreenshot(taskId, 'address-collection-error');
      return this.createErrorResponse(`Failed to handle address collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
```

**Why this fails:**
- Unnecessary validation duplicates BaseCarrierAgent functionality
- Over-engineered error handling interferes with the flow
- Redundant logging clutters console output
- Extracting `taskId` is unnecessary when `context.taskId` is available
- Try-catch blocks at this level interfere with upstream error handling

### ✅ CORRECT: Simple Direct Step Handlers

**Status:** TESTED AND WORKING - Use this approach

```typescript
private async handleDateOfBirth(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'Date of Birth', 'dateOfBirth', stepData.dateOfBirth);
    await this.clickNextButton(page, context.taskId);
    return this.createWaitingResponse(this.getNameCollectionFields());
  }

  private async handleNameCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'First Name', 'firstName', stepData.firstName);
    await this.smartType(context.taskId, 'Last Name', 'lastName', stepData.lastName);
    await this.clickNextButton(page, context.taskId);
    return this.createWaitingResponse(this.getAddressCollectionFields());
  }

  private async handleAddressCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'Street Address', 'address', stepData.streetAddress);
    // GEICO often auto-fills city/state from ZIP, so we just continue
    await this.clickNextButton(page, context.taskId);
    
    // This is a guess, the flow after address is complex.
    // Returning an empty waiting response to signal the frontend to ask for the next logical step.
    return this.createWaitingResponse({});
  }
```

## General Browser Automation Anti-Patterns

### ❌ Selector Modification Without Testing

**Never do this:**
- Change working selectors without explicit verification
- Replace tested selectors with "improved" generic ones
- Modify selector strategies that are proven to work

### ❌ Over-Engineering Simple Operations

**Avoid:**
- Complex conditional logic in step handlers
- Redundant validation that duplicates base class functionality
- Unnecessary abstraction layers
- Verbose error handling for simple operations

### ❌ Inconsistent Method Signatures

**Don't:**
- Change established method signatures across agents
- Add parameters that aren't used consistently
- Break the established pattern without strong justification

### ❌ Premature Optimization

**Avoid:**
- "Improving" code that already works
- Adding features not requested by the user
- Changing working implementations for theoretical benefits

## Progressive Agent Anti-Patterns

*To be added as failures are discovered*

## State Farm Agent Anti-Patterns

*To be added as failures are discovered*

## Liberty Mutual Agent Anti-Patterns

*To be added as failures are discovered*

## General Rules When Modifying Agents

1. **If it works, don't "improve" it** - Working automation is fragile
2. **Test every change** - Browser automation breaks easily
3. **Keep changes minimal** - Small, focused changes are safer
4. **Preserve working selectors** - They were hard-won through testing
5. **Document failures** - Add to this file when something doesn't work
6. **Use this file as negative prompts** - Check against these patterns before making changes

## Memory Integration

When using this file:
- Reference specific anti-patterns when reviewing code changes
- Use as a checklist before modifying working agents
- Add new failures immediately when discovered
- Cross-reference with existing memories about working implementations 