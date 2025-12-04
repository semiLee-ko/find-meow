const { test, expect } = require('@playwright/test');

test('Game Flow Test', async ({ page }) => {
    // 1. Navigate to the game
    await page.goto('http://localhost:8000');

    // 2. Check Title
    await expect(page).toHaveTitle(/Find Meow/);

    // 3. Click Game Start
    await page.click('button.btn-primary');

    // 4. Verify Remote Control appears
    const remoteControl = page.locator('#remoteControl');
    await expect(remoteControl).toBeVisible();
    await expect(remoteControl).toHaveClass(/slide-in/);

    // 5. Enter Player Name
    await page.fill('#playerName', 'TestUser');

    // 6. Press Numbers (1, 2)
    await page.click('#btn1');
    await page.click('#btn2');

    // Verify Channel Display
    const channelDisplay = page.locator('#channelDisplay');
    await expect(channelDisplay).toHaveText('012');

    // 7. Change Channel
    // Mock the image loading to avoid waiting for real network if needed, 
    // but since it's localhost python server, it should be fine.
    // We'll just click and wait for the image to be visible.
    await page.click('#btnChannel');

    const tvImage = page.locator('#tvImage');
    await expect(tvImage).toBeVisible({ timeout: 5000 });

    // 8. Click Next
    const btnNext = page.locator('#btnNext');
    await expect(btnNext).toBeEnabled({ timeout: 10000 });
    await btnNext.click();

    // 9. Verify Reset for Next Player
    // Player name should be empty
    await expect(page.locator('#playerName')).toBeEmpty();
    // Channel display should be reset (not active or 000)
    await expect(channelDisplay).not.toHaveClass(/active/);

    console.log('Game flow test passed!');
});
