import OpenAI from 'openai';

/**
 * Content Moderation Service
 * Handles content moderation, scope checking, and emotional tone detection
 */
export class ModerationService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Check if content is appropriate using OpenAI Moderation API
   */
  async checkContent(text: string): Promise<ModerationResult> {
    try {
      const response = await this.client.moderations.create({
        input: text
      });

      const result = response.results[0];
      const isFlagged = result.flagged;
      const categoryScores = result.category_scores;

      // Find the highest scoring category if flagged
      let primaryViolation = 'none';
      let highestScore = 0;

      if (isFlagged) {
        for (const [category, score] of Object.entries(categoryScores)) {
          if (score > highestScore) {
            highestScore = score;
            primaryViolation = category;
          }
        }
      }

      // Apply custom threshold: only block if scores are high
      // This allows mild frustration words like "stupid" but blocks serious violations
      const THRESHOLD = 0.7; // Scores above 0.7 are considered serious violations

      // Check if any category exceeds the threshold
      const hasSeriousViolation = Object.values(categoryScores).some(
        (score: any) => score > THRESHOLD
      );

      // Log for debugging
      if (isFlagged) {
        console.log('🔍 Moderation Scores:', {
          maxScore: highestScore,
          threshold: THRESHOLD,
          hasSeriousViolation
        });
      }

      return {
        isAppropriate: !hasSeriousViolation,
        flagged: isFlagged,
        primaryViolation,
        categories: result.categories,
        categoryScores: result.category_scores
      };
    } catch (error: any) {
      console.error('Moderation API error:', error);
      // Fail open for availability (allow content if moderation fails)
      return {
        isAppropriate: true,
        flagged: false,
        primaryViolation: 'none',
        categories: {} as any,
        categoryScores: {} as any,
        error: error.message
      };
    }
  }

  /**
   * Check if query is within chatbot scope (weather-related)
   * Only blocks CLEARLY out-of-scope topics - lets LLM handle the rest
   */
  isWithinScope(text: string): ScopeCheckResult {
    const lowerText = text.toLowerCase();

    // Only block CLEARLY out-of-scope topics that are definitely not weather-related
    const clearlyOutOfScopePatterns = [
      /stock price|stock market|trading|investment|cryptocurrency|bitcoin/i,
      /recipe|cook|bake|ingredients/i,
      /hotel|booking|reservation|flight|airline|airport|ticket/i,
      /\d+\s*[\+\-\*\/]\s*\d+/i, // Math calculations like "25 + 37"
      /capital of [a-z]+|who invented|when was [a-z]+ (founded|created|invented)/i,
      /write (me )?a poem|write (me )?a story|write (me )?an essay/i,
      /how to (make|build|create|fix|repair) [a-z]/i
    ];

    const isOutOfScope = clearlyOutOfScopePatterns.some(pattern => pattern.test(text));

    // Only block if CLEARLY out of scope
    if (isOutOfScope) {
      return {
        isWithinScope: false,
        reason: 'out_of_scope',
        suggestion: 'I specialize in weather information and can\'t help with that topic. However, if you have any weather-related questions, I\'d be happy to assist!'
      };
    }

    // Allow everything else - let the LLM handle it with system prompts
    return {
      isWithinScope: true,
      reason: 'allowed'
    };
  }

  /**
   * Detect emotional tone in user message
   */
  detectEmotionalTone(text: string): EmotionalTone {
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    const hasExclamation = (text.match(/!/g) || []).length;
    const hasMultiplePunctuation = /[!?]{2,}/.test(text);

    // Anger/frustration indicators
    const angryWords = /angry|furious|mad|frustrated|unacceptable|terrible|awful|worst|horrible|disaster|ruined|wrong|useless|pathetic|ridiculous|stupid|idiot|dumb/i;
    const blameWords = /you said|you told|your fault|you promised|you were wrong/i;
    const hasAngryWords = angryWords.test(text);
    const hasBlameLanguage = blameWords.test(text);

    // Distress indicators
    const distressWords = /help|urgent|emergency|please|desperate|scared|worried|anxious/i;
    const hasDistressWords = distressWords.test(text);

    // Detect anger/frustration
    if (upperCaseRatio > 0.5 || hasExclamation >= 3 || hasAngryWords || hasMultiplePunctuation || hasBlameLanguage) {
      return {
        tone: 'angry',
        confidence: 0.8,
        indicators: [
          upperCaseRatio > 0.5 ? 'caps' : null,
          hasExclamation >= 3 ? 'exclamation' : null,
          hasAngryWords ? 'angry_words' : null,
          hasBlameLanguage ? 'blame_language' : null
        ].filter(Boolean) as string[]
      };
    }

    // Detect distress
    if (hasDistressWords) {
      return {
        tone: 'distressed',
        confidence: 0.7,
        indicators: ['urgent_language']
      };
    }

    // Neutral/calm
    return {
      tone: 'neutral',
      confidence: 0.7,
      indicators: []
    };
  }

  /**
   * Generate appropriate response based on moderation results
   */
  getModerationResponse(
    moderationResult: ModerationResult,
    scopeResult: ScopeCheckResult,
    emotionalTone: EmotionalTone,
    originalText: string
  ): string | null {
    // Check if message contains weather-related content
    const hasWeatherContent = /weather|temperature|forecast|rain|snow|wind|sunny|cloudy|storm|hot|cold|warm|cool|humidity|precipitation|conditions|degrees|celsius|fahrenheit|wear|dress|clothing|amman|london|paris|new york|tonight|today|tomorrow/i.test(originalText);

    // Handle inappropriate content
    if (!moderationResult.isAppropriate) {
      // If it's a weather question with profanity, allow it through with a warning flag
      // The LLM will handle it professionally
      if (hasWeatherContent) {
        console.log('⚠️ Inappropriate language detected, but allowing due to weather content');
        return null; // Allow through to LLM
      }

      // Pure profanity with no weather content - block it
      return "I'm sorry, but I can't respond to that type of content. I'm here to provide helpful weather information. How can I assist you with weather conditions today?";
    }

    // Handle out-of-scope queries
    if (!scopeResult.isWithinScope) {
      return scopeResult.suggestion || "I specialize in weather information and can't help with that topic. Is there any weather information I can provide for you?";
    }

    // No moderation needed, content is appropriate and in scope
    return null;
  }

  /**
   * Get enhanced system prompt based on emotional tone
   */
  getEmotionallyAwarePrompt(baseTone: EmotionalTone): string {
    if (baseTone.tone === 'angry') {
      return `The user appears frustrated or upset. Be extra empathetic and professional. Acknowledge their frustration, stay calm, and focus on being helpful. Example: "I understand this is frustrating. Let me provide you with the most accurate current information..."`;
    }

    if (baseTone.tone === 'distressed') {
      return `The user seems concerned or anxious. Be reassuring and provide clear, helpful information. Stay calm and professional.`;
    }

    return '';
  }
}

export interface ModerationResult {
  isAppropriate: boolean;
  flagged: boolean;
  primaryViolation: string;
  categories: any;
  categoryScores: any;
  error?: string;
}

export interface ScopeCheckResult {
  isWithinScope: boolean;
  reason: string;
  suggestion?: string;
}

export interface EmotionalTone {
  tone: 'angry' | 'distressed' | 'neutral' | 'positive';
  confidence: number;
  indicators: string[];
}
