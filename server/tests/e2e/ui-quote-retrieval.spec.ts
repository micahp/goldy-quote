import { test, expect } from '@playwright/test';

// Ensure UI tests talk to Vite dev server on 5173 while API tests default to 3001
test.use({ baseURL: 'http://localhost:5173' });

const userData = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    maritalStatus: 'Single',
    email: 'john.doe.test@example.com',
    phone: '555-123-4567',
    streetAddress: '123 Main St',
    apt: '4B',
    city: 'Anytown',
    state: 'CA',
    zipCode: '90210',
    housingType: 'Apartment',
    vehicleYear: '2022',
    vehicleMake: 'Honda',
    vehicleModel: 'Civic',
    vehicleTrim: 'LX 4D SED GAS',
    ownership: 'Finance (making payments)',
    primaryUse: 'Commuting to work/school',
    annualMileage: '10,000 - 15,000',
    commuteMiles: '16-25 miles',
    antiTheftDevice: 'Yes',
    education: "Bachelor's degree",
    employmentStatus: 'Employed/Self-employed',
    occupation: 'Engineer',
    licenseAge: '21-25',
    accidents: '0',
    violations: '0',
    continuousCoverage: 'Currently insured (3+ years)',
    liabilityLimit: '100/300/100 ($100K/$300K/$100K)',
    collisionDeductible: '$500',
    comprehensiveDeductible: '$500',
    medicalPayments: '$5,000',
    roadsideAssistance: 'Yes',
};

test.describe('UI Quote Retrieval', () => {

    test('should retrieve a quote from Geico through the UI', async ({ page }) => {
        // Navigate to home page to start the flow
        await page.goto('/');

        // Enter ZIP code in the hero section
        await page.locator('#zipCode').fill('90210');
        await page.getByRole('button', { name: /get quotes/i }).click();

        // Should now be on the carrier selection page
        await page.waitForURL('/carriers?zip=90210&type=auto');

        // Deselect Progressive so only GEICO remains selected
        await page.getByTestId('carrier-card-progressive').click();

        // Start quote process
        await page.getByRole('button', { name: /continue with.*carrier/i }).click();

        // We should be on the quote form page now, verify title
        await expect(page.getByRole('heading', { name: 'Get Your Auto Insurance Quotes' })).toBeVisible();

        // Fill out step 1
        await page.locator('#firstName').fill(userData.firstName);
        await page.locator('#lastName').fill(userData.lastName);
        await page.locator('#dateOfBirth').fill(userData.dateOfBirth);
        await page.locator('#gender').selectOption(userData.gender);
        await page.locator('#maritalStatus').selectOption(userData.maritalStatus);
        await page.locator('#email').fill(userData.email);
        await page.locator('#phone').fill(userData.phone);
        await page.getByRole('button', { name: /next/i }).click();

        // Fill out step 2
        await page.locator('#streetAddress').fill(userData.streetAddress);
        await page.locator('#apt').fill(userData.apt);
        await page.locator('#city').fill(userData.city);
        await page.locator('#state').selectOption(userData.state);
        await page.locator('#zipCode').fill(userData.zipCode);
        await page.locator('#housingType').selectOption(userData.housingType);
        await page.getByRole('button', { name: /next/i }).click();

        // Fill out step 3
        await page.locator('#vehicleYear').selectOption(userData.vehicleYear);
        await page.locator('#vehicleMake').selectOption(userData.vehicleMake);
        await page.locator('#vehicleModel').fill(userData.vehicleModel);
        await page.locator('#vehicleTrim').fill(userData.vehicleTrim);
        await page.locator('#ownership').selectOption(userData.ownership);
        await page.locator('#primaryUse').selectOption(userData.primaryUse);
        await page.locator('#annualMileage').selectOption(userData.annualMileage);
        await page.locator('#commuteMiles').selectOption(userData.commuteMiles);
        await page.getByLabel(userData.antiTheftDevice, { exact: true }).check();
        await page.getByRole('button', { name: /next/i }).click();
        
        // Fill out step 4
        await page.locator('#education').selectOption(userData.education);
        await page.locator('#employmentStatus').selectOption(userData.employmentStatus);
        await page.locator('#occupation').fill(userData.occupation);
        await page.locator('#licenseAge').selectOption(userData.licenseAge);
        await page.locator('#accidents').selectOption(userData.accidents);
        await page.locator('#violations').selectOption(userData.violations);
        await page.locator('#continuousCoverage').selectOption(userData.continuousCoverage);
        await page.getByRole('button', { name: /next/i }).click();
        
        // Fill out step 5
        await page.locator('#liabilityLimit').selectOption(userData.liabilityLimit);
        await page.locator('#collisionDeductible').selectOption(userData.collisionDeductible);
        await page.locator('#comprehensiveDeductible').selectOption(userData.comprehensiveDeductible);
        await page.locator('#medicalPayments').selectOption(userData.medicalPayments);
        await page.getByLabel(userData.roadsideAssistance, { exact: true }).check();
        
        // Submit form
        await page.getByRole('button', { name: /get quotes/i }).click();

        // After submission, the page should navigate to the quotes display page.
        await page.waitForURL('/quotes');
        
        // Wait for quote to be displayed
        const geicoCard = page.locator(`[data-testid="quote-card-geico"]`);
        await expect(geicoCard).toBeVisible({ timeout: 120000 });

        const price = await geicoCard.locator('[data-testid="quote-price"]').innerText();
        expect(price).toMatch(/^\$\d+\.\d{2}$/);
    });

    test('should retrieve a quote from Progressive through the UI', async ({ page }) => {
        // Navigate to home page to start the flow
        await page.goto('/');

        // Enter ZIP code in the hero section
        await page.locator('#zipCode').fill('90210');
        await page.getByRole('button', { name: /get quotes/i }).click();

        // Should now be on the carrier selection page
        await page.waitForURL('/carriers?zip=90210&type=auto');

        // Deselect GEICO so only Progressive remains selected
        await page.getByTestId('carrier-card-geico').click();

        // Start quote process
        await page.getByRole('button', { name: /continue with.*carrier/i }).click();

        // We should be on the quote form page now, verify title
        await expect(page.getByRole('heading', { name: 'Get Your Auto Insurance Quotes' })).toBeVisible();

        // Fill out step 1
        await page.locator('#firstName').fill(userData.firstName);
        await page.locator('#lastName').fill(userData.lastName);
        await page.locator('#dateOfBirth').fill(userData.dateOfBirth);
        await page.locator('#gender').selectOption(userData.gender);
        await page.locator('#maritalStatus').selectOption(userData.maritalStatus);
        await page.locator('#email').fill(userData.email);
        await page.locator('#phone').fill(userData.phone);
        await page.getByRole('button', { name: /next/i }).click();

        // Fill out step 2
        await page.locator('#streetAddress').fill(userData.streetAddress);
        await page.locator('#apt').fill(userData.apt);
        await page.locator('#city').fill(userData.city);
        await page.locator('#state').selectOption(userData.state);
        await page.locator('#zipCode').fill(userData.zipCode);
        await page.locator('#housingType').selectOption(userData.housingType);
        await page.getByRole('button', { name: /next/i }).click();

        // Fill out step 3
        await page.locator('#vehicleYear').selectOption(userData.vehicleYear);
        await page.locator('#vehicleMake').selectOption(userData.vehicleMake);
        await page.locator('#vehicleModel').fill(userData.vehicleModel);
        await page.locator('#vehicleTrim').fill(userData.vehicleTrim);
        await page.locator('#ownership').selectOption(userData.ownership);
        await page.locator('#primaryUse').selectOption(userData.primaryUse);
        await page.locator('#annualMileage').selectOption(userData.annualMileage);
        await page.locator('#commuteMiles').selectOption(userData.commuteMiles);
        await page.getByLabel(userData.antiTheftDevice, { exact: true }).check();
        await page.getByRole('button', { name: /next/i }).click();
        
        // Fill out step 4
        await page.locator('#education').selectOption(userData.education);
        await page.locator('#employmentStatus').selectOption(userData.employmentStatus);
        await page.locator('#occupation').fill(userData.occupation);
        await page.locator('#licenseAge').selectOption(userData.licenseAge);
        await page.locator('#accidents').selectOption(userData.accidents);
        await page.locator('#violations').selectOption(userData.violations);
        await page.locator('#continuousCoverage').selectOption(userData.continuousCoverage);
        await page.getByRole('button', { name: /next/i }).click();
        
        // Fill out step 5
        await page.locator('#liabilityLimit').selectOption(userData.liabilityLimit);
        await page.locator('#collisionDeductible').selectOption(userData.collisionDeductible);
        await page.locator('#comprehensiveDeductible').selectOption(userData.comprehensiveDeductible);
        await page.locator('#medicalPayments').selectOption(userData.medicalPayments);
        await page.getByLabel(userData.roadsideAssistance, { exact: true }).check();
        
        // Submit form
        await page.getByRole('button', { name: /get quotes/i }).click();

        // After submission, the page should navigate to the quotes display page.
        await page.waitForURL('/quotes');

        // Wait for quote to be displayed
        const progressiveCard = page.locator(`[data-testid="quote-card-progressive"]`);
        await expect(progressiveCard).toBeVisible({ timeout: 120000 });

        const price = await progressiveCard.locator('[data-testid="quote-price"]').innerText();
        expect(price).toMatch(/^\$\d+\.\d{2}$/);
    });

    test('should retrieve quotes from Geico and Progressive through the UI', async ({ page }) => {
        // Navigate to home page to start the flow
        await page.goto('/');

        // Enter ZIP code in the hero section
        await page.locator('#zipCode').fill('90210');
        await page.getByRole('button', { name: /get quotes/i }).click();

        // Should now be on the carrier selection page
        await page.waitForURL('/carriers?zip=90210&type=auto');

        // Both GEICO and Progressive are pre-selected by default; no action needed

        // Start quote process
        await page.getByRole('button', { name: /continue with.*carrier/i }).click();

        // We should be on the quote form page now, verify title
        await expect(page.getByRole('heading', { name: 'Get Your Auto Insurance Quotes' })).toBeVisible();

        // Fill out step 1
        await page.locator('#firstName').fill(userData.firstName);
        await page.locator('#lastName').fill(userData.lastName);
        await page.locator('#dateOfBirth').fill(userData.dateOfBirth);
        await page.locator('#gender').selectOption(userData.gender);
        await page.locator('#maritalStatus').selectOption(userData.maritalStatus);
        await page.locator('#email').fill(userData.email);
        await page.locator('#phone').fill(userData.phone);
        await page.getByRole('button', { name: /next/i }).click();

        // Fill out step 2
        await page.locator('#streetAddress').fill(userData.streetAddress);
        await page.locator('#apt').fill(userData.apt);
        await page.locator('#city').fill(userData.city);
        await page.locator('#state').selectOption(userData.state);
        await page.locator('#zipCode').fill(userData.zipCode);
        await page.locator('#housingType').selectOption(userData.housingType);
        await page.getByRole('button', { name: /next/i }).click();

        // Fill out step 3
        await page.locator('#vehicleYear').selectOption(userData.vehicleYear);
        await page.locator('#vehicleMake').selectOption(userData.vehicleMake);
        await page.locator('#vehicleModel').fill(userData.vehicleModel);
        await page.locator('#vehicleTrim').fill(userData.vehicleTrim);
        await page.locator('#ownership').selectOption(userData.ownership);
        await page.locator('#primaryUse').selectOption(userData.primaryUse);
        await page.locator('#annualMileage').selectOption(userData.annualMileage);
        await page.locator('#commuteMiles').selectOption(userData.commuteMiles);
        await page.getByLabel(userData.antiTheftDevice, { exact: true }).check();
        await page.getByRole('button', { name: /next/i }).click();
        
        // Fill out step 4
        await page.locator('#education').selectOption(userData.education);
        await page.locator('#employmentStatus').selectOption(userData.employmentStatus);
        await page.locator('#occupation').fill(userData.occupation);
        await page.locator('#licenseAge').selectOption(userData.licenseAge);
        await page.locator('#accidents').selectOption(userData.accidents);
        await page.locator('#violations').selectOption(userData.violations);
        await page.locator('#continuousCoverage').selectOption(userData.continuousCoverage);
        await page.getByRole('button', { name: /next/i }).click();
        
        // Fill out step 5
        await page.locator('#liabilityLimit').selectOption(userData.liabilityLimit);
        await page.locator('#collisionDeductible').selectOption(userData.collisionDeductible);
        await page.locator('#comprehensiveDeductible').selectOption(userData.comprehensiveDeductible);
        await page.locator('#medicalPayments').selectOption(userData.medicalPayments);
        await page.getByLabel(userData.roadsideAssistance, { exact: true }).check();
        
        // Submit form
        await page.getByRole('button', { name: /get quotes/i }).click();

        // After submission, the page should navigate to the quotes display page.
        await page.waitForURL('/quotes');

        // Wait for quotes to be displayed
        const geicoCard = page.locator(`[data-testid="quote-card-geico"]`);
        await expect(geicoCard).toBeVisible({ timeout: 120000 });
        const geicoPrice = await geicoCard.locator('[data-testid="quote-price"]').innerText();
        expect(geicoPrice).toMatch(/^\$\d+\.\d{2}$/);

        const progressiveCard = page.locator(`[data-testid="quote-card-progressive"]`);
        await expect(progressiveCard).toBeVisible({ timeout: 120000 });
        const progressivePrice = await progressiveCard.locator('[data-testid="quote-price"]').innerText();
        expect(progressivePrice).toMatch(/^\$\d+\.\d{2}$/);
    });
}); 