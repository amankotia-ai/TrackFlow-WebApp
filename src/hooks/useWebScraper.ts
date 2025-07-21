import { useState, useCallback } from 'react';
import { ScrapingResult, ScrapedElement } from '../utils/scraper';

export interface UseWebScraperReturn {
  isScraping: boolean;
  scrapingResult: ScrapingResult | null;
  scrapeUrl: (url: string) => Promise<void>;
  clearResult: () => void;
}

/**
 * Custom hook for web scraping functionality
 * @returns UseWebScraperReturn - Object with scraping state and functions
 */
export function useWebScraper(): UseWebScraperReturn {
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingResult, setScrapingResult] = useState<ScrapingResult | null>(null);

  const scrapeUrl = useCallback(async (url: string) => {
    if (!url || !url.trim()) {
      setScrapingResult({
        success: false,
        error: 'URL is required',
        url: url,
        timestamp: new Date()
      });
      return;
    }

    setIsScraping(true);
    setScrapingResult(null);

    try {
      // Use server-side scraping to avoid CORS issues
      const response = await fetch('https://trackflow-webapp-production.up.railway.app/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setScrapingResult(result);
    } catch (error) {
      console.error('Scraping error:', error);
      setScrapingResult({
        success: false,
        error: 'An unexpected error occurred while scraping',
        url: url,
        timestamp: new Date()
      });
    } finally {
      setIsScraping(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setScrapingResult(null);
  }, []);

  return {
    isScraping,
    scrapingResult,
    scrapeUrl,
    clearResult
  };
} 