// Type definitions for the Amazon Ads API abstraction will go here. 

// Common response type for API calls
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Campaign Types
export interface Campaign {
  campaignId: string;
  name: string;
  state: 'ENABLED' | 'PAUSED' | 'ARCHIVED';
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  targetingType: 'MANUAL' | 'AUTO';
  bidding: BiddingStrategy;
  portfolioId?: string;
  // Performance metrics
  impressions?: number;
  clicks?: number;
  cost?: number;
  sales?: number;
  acos?: number;
  roas?: number;
}

export interface BiddingStrategy {
  strategy: 'FIXED_BID' | 'DYNAMIC_BIDS_DOWN_ONLY' | 'DYNAMIC_BIDS_UP_AND_DOWN';
  adjustments?: {
    placementTop?: number;
    placementProductPage?: number;
  };
}

// Campaign Details - Extended information for a specific campaign
export interface CampaignDetails extends Campaign {
  adGroups: AdGroup[];
  keywords?: Keyword[];
  targetingExpression?: TargetingExpression[];
  negativeKeywords?: NegativeKeyword[];
  performanceHistory?: CampaignPerformanceMetrics[];
}

// Campaign Creation Request
export interface CreateCampaignRequest {
  name: string;
  state: 'ENABLED' | 'PAUSED';
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  targetingType: 'MANUAL' | 'AUTO';
  bidding: BiddingStrategy;
  portfolioId?: string;
}

// Ad Group Types
export interface AdGroup {
  adGroupId: string;
  campaignId: string;
  name: string;
  state: 'ENABLED' | 'PAUSED' | 'ARCHIVED';
  defaultBid: number;
  // Performance metrics
  impressions?: number;
  clicks?: number;
  cost?: number;
  sales?: number;
  acos?: number;
}

// Ad Types
export interface Ad {
  adId: string;
  adGroupId: string;
  state: 'ENABLED' | 'PAUSED' | 'ARCHIVED';
  type: 'PRODUCT' | 'SPONSORED_BRAND' | 'SPONSORED_DISPLAY';
  asin?: string;
  sku?: string;
  // Performance metrics
  impressions?: number;
  clicks?: number;
  cost?: number;
  sales?: number;
  acos?: number;
}

// Keyword Types
export interface Keyword {
  keywordId: string;
  campaignId: string;
  adGroupId: string;
  keywordText: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  state: 'ENABLED' | 'PAUSED' | 'ARCHIVED';
  bid: number;
  // Performance metrics
  impressions?: number;
  clicks?: number;
  cost?: number;
  sales?: number;
  orders?: number;
  acos?: number;
  ctr?: number;
  cpc?: number;
}

export interface NegativeKeyword {
  keywordId: string;
  campaignId: string;
  adGroupId?: string;
  keywordText: string;
  matchType: 'EXACT' | 'PHRASE';
  state: 'ENABLED' | 'PAUSED' | 'ARCHIVED';
}

// Product Targeting Types
export interface TargetingExpression {
  expressionId: string;
  campaignId: string;
  adGroupId: string;
  expression: string; // e.g., "asin=\"B0EXAMPLE\"" or "category=\"Books\""
  expressionType: 'ASIN' | 'CATEGORY' | 'BRAND';
  state: 'ENABLED' | 'PAUSED' | 'ARCHIVED';
  bid: number;
  // Performance metrics
  impressions?: number;
  clicks?: number;
  cost?: number;
  sales?: number;
  orders?: number;
  acos?: number;
  ctr?: number;
  cpc?: number;
}

// Performance Metrics
export interface CampaignPerformanceMetrics {
  date: string; // Consider using Date type if preferred
  impressions: number;
  clicks: number;
  cost: number;
  sales: number;
  acos: number;
  roas: number;
  orders: number;
  units: number;
  conversions: number;
  conversionRate: number;
}

// Combined type for Keywords/Targets with performance (useful for bid optimization)
export type OptimizableTarget = (Keyword | TargetingExpression) & {
  // You might want more specific performance metrics here,
  // possibly fetched from a separate report endpoint.
  // The Keyword/TargetingExpression types already include some basic metrics.
};

// Type for updating bids
export interface BidAdjustment {
  targetId: string; // Can be keywordId or expressionId
  bid: number;
}

// Type for the result of batch updates
export interface BatchUpdateResultItem {
  targetId: string;
  success: boolean;
  message?: string;
}
export type BatchUpdateResult = BatchUpdateResultItem[];


// API Function Interface - This defines the contract for our API implementations
export interface AmazonAdsAPI {
  // Campaign Functions
  getCampaigns(filters?: Record<string, any>): Promise<ApiResponse<Campaign[]>>;
  getCampaignById(campaignId: string): Promise<ApiResponse<CampaignDetails>>;
  createCampaign(campaign: CreateCampaignRequest): Promise<ApiResponse<Campaign>>;
  updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<ApiResponse<Campaign>>;

  // Ad Group Functions
  getAdGroups(campaignId: string, filters?: Record<string, any>): Promise<ApiResponse<AdGroup[]>>;
  getAdGroupById(adGroupId: string): Promise<ApiResponse<AdGroup>>;
  createAdGroup(campaignId: string, adGroup: Partial<AdGroup>): Promise<ApiResponse<AdGroup>>;
  updateAdGroup(adGroupId: string, updates: Partial<AdGroup>): Promise<ApiResponse<AdGroup>>;

  // Ad Functions
  getAds(adGroupId: string, filters?: Record<string, any>): Promise<ApiResponse<Ad[]>>;
  getAdById(adId: string): Promise<ApiResponse<Ad>>;
  createAd(adGroupId: string, ad: Partial<Ad>): Promise<ApiResponse<Ad>>;
  updateAd(adId: string, updates: Partial<Ad>): Promise<ApiResponse<Ad>>;

  // Keyword Functions
  getKeywords(filters: { campaignId?: string; adGroupId?: string; [key: string]: any }): Promise<ApiResponse<Keyword[]>>;
  getKeywordById(keywordId: string): Promise<ApiResponse<Keyword>>;
  createKeyword(adGroupId: string, keyword: Partial<Keyword>): Promise<ApiResponse<Keyword>>;
  updateKeywords(keywords: Partial<Keyword>[]): Promise<ApiResponse<BatchUpdateResult>>; // Batch update is preferred

  // Negative Keyword Functions
  getNegativeKeywords(filters: { campaignId?: string; adGroupId?: string; [key: string]: any }): Promise<ApiResponse<NegativeKeyword[]>>;
  createNegativeKeywords(negativeKeywords: Partial<NegativeKeyword>[]): Promise<ApiResponse<BatchUpdateResult>>;

  // Targeting Expression Functions
  getTargetingExpressions(filters: { campaignId?: string; adGroupId?: string; [key: string]: any }): Promise<ApiResponse<TargetingExpression[]>>;
  getTargetingExpressionById(expressionId: string): Promise<ApiResponse<TargetingExpression>>;
  createTargetingExpressions(targets: Partial<TargetingExpression>[]): Promise<ApiResponse<BatchUpdateResult>>;
  updateTargetingExpressions(targets: Partial<TargetingExpression>[]): Promise<ApiResponse<BatchUpdateResult>>; // Batch update

  // Report Functions - Simplified for now, might need more specific types
  getPerformanceReport(options: {
    reportType: 'campaign' | 'adGroup' | 'keyword' | 'target';
    startDate: string;
    endDate: string;
    metrics?: string[];
    filters?: Record<string, any>;
  }): Promise<ApiResponse<any[]>>; // Return type 'any[]' needs refinement

  getSearchTermReport(options: {
    campaignId?: string;
    adGroupId?: string;
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<any[]>>; // Return type 'any[]' needs refinement
}

// Specific types for your bid optimization use case
export type GetOptimizableTargetsRequest = {
  campaignId?: string;
  adGroupId?: string;
  // Add other filters like state, performance thresholds etc.
};

// Note: Performance data might come from the main Keyword/TargetingExpression
// fetch or require a separate report fetch depending on the real API structure.
// Let's assume for now it's included in Keyword/TargetingExpression types.
export type GetOptimizableTargetsResponse = (Keyword | TargetingExpression)[];

export type UpdateTargetBidsRequest = {
  targetType: 'keyword' | 'targetingExpression';
  adjustments: BidAdjustment[];
};

export type UpdateTargetBidsResponse = BatchUpdateResult;


// Re-defining the interface specifically for Bid Optimization focus
export interface AmazonAdsBidOptimizationAPI {
  getOptimizableTargets(
    request: GetOptimizableTargetsRequest
  ): Promise<ApiResponse<GetOptimizableTargetsResponse>>;

  updateTargetBids(
    request: UpdateTargetBidsRequest
  ): Promise<ApiResponse<UpdateTargetBidsResponse>>;
} 