import {
    AmazonAdsBidOptimizationAPI
} from './amazon-ads-api.types';
import mockAmazonAdsApi from './amazon-ads-api.mock';
import realAmazonAdsApi from './amazon-ads-api.real';

// Read the environment variable provided by Vite
const apiMode = import.meta.env.VITE_API_MODE;

let amazonAdsApi: AmazonAdsBidOptimizationAPI;

if (apiMode === 'mock') {
    console.log('Using Mock Amazon Ads API');
    amazonAdsApi = mockAmazonAdsApi;
} else if (apiMode === 'real') {
    console.log('Using Real Amazon Ads API (Placeholder)');
    amazonAdsApi = realAmazonAdsApi;
} else {
    console.error(`Invalid VITE_API_MODE: ${apiMode}. Defaulting to mock API.`);
    amazonAdsApi = mockAmazonAdsApi;
}

// Export the selected API implementation
export { amazonAdsApi };

// Optionally, re-export types for convenience
export * from './amazon-ads-api.types'; 