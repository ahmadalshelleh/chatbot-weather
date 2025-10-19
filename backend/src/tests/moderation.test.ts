import { ModerationService } from '../services/moderation.service';

/**
 * Test suite for edge case scenarios
 * Run these tests to verify moderation handling
 */

const moderationService = new ModerationService();

// Test scenarios
const testScenarios = [
  {
    name: 'Angry Customer - Weather Forecast Wrong',
    input: 'YOU SAID IT WOULDN\'T RAIN AND MY WEDDING WAS RUINED!!! THIS IS UNACCEPTABLE!!!',
    expectedTone: 'angry',
    expectedScope: true,
    shouldBlock: false
  },
  {
    name: 'Angry Customer - Caps and Blame',
    input: 'THE WEATHER APP SAID IT WOULD BE SUNNY AND I PLANNED A PICNIC AND IT POURED! YOU WERE WRONG!',
    expectedTone: 'angry',
    expectedScope: true,
    shouldBlock: false
  },
  {
    name: 'Distressed - Urgent Weather',
    input: 'I\'m scared there\'s going to be a tornado! Help! What do I do?!',
    expectedTone: 'distressed',
    expectedScope: true,
    shouldBlock: false
  },
  {
    name: 'Out of Scope - Cooking',
    input: 'How do I bake a chocolate cake?',
    expectedTone: 'neutral',
    expectedScope: false,
    shouldBlock: true
  },
  {
    name: 'Out of Scope - Math',
    input: 'What is 25 + 37?',
    expectedTone: 'neutral',
    expectedScope: false,
    shouldBlock: true
  },
  {
    name: 'Out of Scope - Travel Booking',
    input: 'Can you book me a hotel in Paris?',
    expectedTone: 'neutral',
    expectedScope: false,
    shouldBlock: true
  },
  {
    name: 'Out of Scope - Stock Market',
    input: 'What\'s the stock price of Apple?',
    expectedTone: 'neutral',
    expectedScope: false,
    shouldBlock: true
  },
  {
    name: 'In Scope - Weather Query',
    input: 'What\'s the weather like in New York?',
    expectedTone: 'neutral',
    expectedScope: true,
    shouldBlock: false
  },
  {
    name: 'In Scope - Casual Greeting',
    input: 'Hello! How are you?',
    expectedTone: 'neutral',
    expectedScope: true,
    shouldBlock: false
  },
  {
    name: 'Combined - Angry + Out of Scope',
    input: 'THIS IS RIDICULOUS! I need to book a flight NOW and the airline website is down!!!',
    expectedTone: 'angry',
    expectedScope: false,
    shouldBlock: true
  },
  {
    name: 'Weather - Polite Temperature Request',
    input: 'Can you tell me the temperature in London?',
    expectedTone: 'neutral',
    expectedScope: true,
    shouldBlock: false
  },
  {
    name: 'Weather - Frustrated but In Scope',
    input: 'Ugh, the forecast keeps changing! What\'s the actual weather going to be tomorrow?',
    expectedTone: 'neutral',
    expectedScope: true,
    shouldBlock: false
  }
];

/**
 * Run all test scenarios
 */
async function runTests() {
  console.log('🧪 Starting Moderation Tests\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const scenario of testScenarios) {
    console.log(`\n📝 Test: ${scenario.name}`);
    console.log(`Input: "${scenario.input}"\n`);

    try {
      // Run moderation checks
      const [moderationResult, scopeResult, emotionalTone] = await Promise.all([
        moderationService.checkContent(scenario.input),
        Promise.resolve(moderationService.isWithinScope(scenario.input)),
        Promise.resolve(moderationService.detectEmotionalTone(scenario.input))
      ]);

      // Check results
      const toneMatch = emotionalTone.tone === scenario.expectedTone;
      const scopeMatch = scopeResult.isWithinScope === scenario.expectedScope;
      const shouldBlock = !moderationResult.isAppropriate || !scopeResult.isWithinScope;
      const blockMatch = shouldBlock === scenario.shouldBlock;

      // Get moderation response if needed
      const moderationResponse = moderationService.getModerationResponse(
        moderationResult,
        scopeResult,
        emotionalTone
      );

      // Display results
      console.log('Results:');
      console.log(`  Tone Detected: ${emotionalTone.tone} ${toneMatch ? '✅' : '❌ Expected: ' + scenario.expectedTone}`);
      console.log(`  In Scope: ${scopeResult.isWithinScope} ${scopeMatch ? '✅' : '❌ Expected: ' + scenario.expectedScope}`);
      console.log(`  Should Block: ${shouldBlock} ${blockMatch ? '✅' : '❌ Expected: ' + scenario.shouldBlock}`);

      if (moderationResponse) {
        console.log(`  Moderation Response: "${moderationResponse}"`);
      } else {
        console.log(`  Moderation Response: None (passes to LLM)`);
      }

      if (emotionalTone.indicators.length > 0) {
        console.log(`  Indicators: ${emotionalTone.indicators.join(', ')}`);
      }

      if (scopeResult.suggestion) {
        console.log(`  Suggestion: "${scopeResult.suggestion}"`);
      }

      // Check if test passed
      if (toneMatch && scopeMatch && blockMatch) {
        console.log('\n✅ PASS');
        passed++;
      } else {
        console.log('\n❌ FAIL');
        failed++;
      }

    } catch (error: any) {
      console.log(`\n❌ ERROR: ${error.message}`);
      failed++;
    }

    console.log('='.repeat(80));
  }

  // Summary
  console.log(`\n📊 Test Summary:`);
  console.log(`Total Tests: ${testScenarios.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / testScenarios.length) * 100).toFixed(1)}%\n`);
}

// Run tests
runTests().catch(console.error);
