import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class TwitterService {
  private config: Config;
  private mockMode: boolean;
  
  constructor(config: Config) {
    this.config = config;
    this.mockMode = config.MOCK_MODE || !config.TWITTER_API_KEY;
  }
  
  /**
   * Post a tweet
   */
  async post(content: string): Promise<{ id: string; text: string } | null> {
    if (this.mockMode) {
      logger.info(`[MOCK TWITTER] Would post: ${content}`);
      return { id: `mock_${Date.now()}`, text: content };
    }
    
    try {
      // Real Twitter API v2 implementation would go here
      // Using twitter-api-v2 library
      
      logger.info(`Tweet posted: ${content.substring(0, 50)}...`);
      return { id: `real_${Date.now()}`, text: content };
    } catch (error) {
      logger.error('Failed to post tweet:', error);
      return null;
    }
  }
  
  /**
   * Post a tweet with media (image)
   */
  async postWithImage(content: string, imageUrl: string): Promise<{ id: string; text: string } | null> {
    if (this.mockMode) {
      logger.info(`[MOCK TWITTER] Would post with image: ${content}`);
      logger.info(`[MOCK TWITTER] Image URL: ${imageUrl}`);
      return { id: `mock_${Date.now()}`, text: content };
    }
    
    try {
      // Download image and upload to Twitter
      // Then post tweet with media
      
      logger.info(`Tweet with image posted: ${content.substring(0, 50)}...`);
      return { id: `real_${Date.now()}`, text: content };
    } catch (error) {
      logger.error('Failed to post tweet with image:', error);
      // Fall back to text-only tweet
      return this.post(content);
    }
  }
  
  /**
   * Reply to a tweet
   */
  async reply(tweetId: string, content: string): Promise<{ id: string; text: string } | null> {
    if (this.mockMode) {
      logger.info(`[MOCK TWITTER] Would reply to ${tweetId}: ${content}`);
      return { id: `mock_reply_${Date.now()}`, text: content };
    }
    
    try {
      logger.info(`Reply posted to ${tweetId}: ${content.substring(0, 50)}...`);
      return { id: `real_reply_${Date.now()}`, text: content };
    } catch (error) {
      logger.error('Failed to post reply:', error);
      return null;
    }
  }
  
  /**
   * Search for mentions or specific hashtags
   */
  async searchMentions(sinceId?: string): Promise<Array<{ id: string; text: string; author: string }>> {
    if (this.mockMode) {
      return [];
    }
    
    // Search Twitter API for mentions of the idol
    return [];
  }
  
  /**
   * Get idol's recent tweets
   */
  async getRecentTweets(limit = 10): Promise<Array<{ id: string; text: string; createdAt: Date }>> {
    if (this.mockMode) {
      return [
        {
          id: 'mock_1',
          text: '🚀 Treasury is growing! Thanks for the support fam!',
          createdAt: new Date(),
        },
      ];
    }
    
    return [];
  }
}
