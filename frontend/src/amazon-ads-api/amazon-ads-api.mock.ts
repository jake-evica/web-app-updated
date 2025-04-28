import {
  AmazonAdsBidOptimizationAPI,
  GetOptimizableTargetsRequest,
  GetOptimizableTargetsResponse,
  UpdateTargetBidsRequest,
  UpdateTargetBidsResponse,
  ApiResponse,
  Keyword,
  TargetingExpression,
  BatchUpdateResult,
} from './amazon-ads-api.types';

// --- Mock Data ---

const mockKeywords: Keyword[] = [
  {
    keywordId: 'kw-001',
    campaignId: 'camp-abc',
    adGroupId: 'ag-123',
    keywordText: 'running shoes',
    matchType: 'BROAD',
    state: 'ENABLED',
    bid: 0.75,
    impressions: 1500,
    clicks: 50,
    cost: 37.5,
    sales: 250,
    orders: 5,
    acos: 0.15, // 15%
    ctr: 50 / 1500,
    cpc: 37.5 / 50,
  },
  {
    keywordId: 'kw-002',
    campaignId: 'camp-abc',
    adGroupId: 'ag-123',
    keywordText: 'best running shoes',
    matchType: 'PHRASE',
    state: 'ENABLED',
    bid: 1.20,
    impressions: 800,
    clicks: 60,
    cost: 72.0,
    sales: 600,
    orders: 8,
    acos: 0.12, // 12%
    ctr: 60 / 800,
    cpc: 72.0 / 60,
  },
  {
    keywordId: 'kw-003',
    campaignId: 'camp-abc',
    adGroupId: 'ag-456',
    keywordText: 'nike air zoom',
    matchType: 'EXACT',
    state: 'PAUSED',
    bid: 2.50,
    impressions: 50,
    clicks: 5,
    cost: 12.5,
    sales: 0,
    orders: 0,
    acos: undefined,
    ctr: 5 / 50,
    cpc: 12.5 / 5,
  },
  {
    keywordId: 'kw-004',
    campaignId: 'camp-abc',
    adGroupId: 'ag-456',
    keywordText: 'cheap running shoes',
    matchType: 'BROAD',
    state: 'ENABLED',
    bid: 0.50,
    impressions: 3000,
    clicks: 30,
    cost: 15.0,
    sales: 0,
    orders: 0,
    acos: undefined,
    ctr: 30 / 3000,
    cpc: 15.0 / 30,
  },
  {
    keywordId: 'kw-005',
    campaignId: 'camp-def',
    adGroupId: 'ag-789',
    keywordText: 'high acos example',
    matchType: 'EXACT',
    state: 'ENABLED',
    bid: 1.00,
    impressions: 1000,
    clicks: 100,
    cost: 100.0,
    sales: 200.0,
    orders: 4,
    acos: 0.50,
    ctr: 100 / 1000,
    cpc: 100.0 / 100,
  },
  {
    keywordId: 'kw-006',
    campaignId: 'camp-def',
    adGroupId: 'ag-789',
    keywordText: 'promising keyword example',
    matchType: 'PHRASE',
    state: 'ENABLED',
    bid: 0.30,
    impressions: 1000,
    clicks: 5,
    cost: 1.50,
    sales: 0,
    orders: 0,
    acos: undefined,
    ctr: 5 / 1000,
    cpc: 1.50 / 5,
  },
];

const mockTargets: TargetingExpression[] = [
  {
    expressionId: 'tgt-001',
    campaignId: 'camp-xyz',
    adGroupId: 'ag-789',
    expression: 'asin="B0EXAMPLE1"',
    expressionType: 'ASIN',
    state: 'ENABLED',
    bid: 0.90,
    impressions: 2000,
    clicks: 80,
    cost: 72.0,
    sales: 400,
    orders: 10,
    acos: 0.18,
    ctr: 80 / 2000,
    cpc: 72.0 / 80,
  },
  {
    expressionId: 'tgt-002',
    campaignId: 'camp-xyz',
    adGroupId: 'ag-789',
    expression: 'category="Shoes & Bags"',
    expressionType: 'CATEGORY',
    state: 'ENABLED',
    bid: 0.50,
    impressions: 5000,
    clicks: 100,
    cost: 50.0,
    sales: 300,
    orders: 6,
    acos: 0.1667,
    ctr: 100 / 5000,
    cpc: 50.0 / 100,
  },
];

const allOptimizableTargets: GetOptimizableTargetsResponse = [
  ...mockKeywords,
  ...mockTargets,
];

// --- Mock API Implementation ---

const mockAmazonAdsApi: AmazonAdsBidOptimizationAPI = {
  async getOptimizableTargets(
    request: GetOptimizableTargetsRequest
  ): Promise<ApiResponse<GetOptimizableTargetsResponse>> {
    console.log('Mock API: getOptimizableTargets called with request:', request);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // In a real mock, you might filter `allOptimizableTargets` based on `request`
    const filteredTargets = allOptimizableTargets.filter(target => {
        let match = true;
        if (request.campaignId && target.campaignId !== request.campaignId) {
            match = false;
        }
        if (request.adGroupId && target.adGroupId !== request.adGroupId) {
            match = false;
        }
        // Add more filtering based on request properties if needed
        return match;
    });

    return {
      success: true,
      data: filteredTargets,
      timestamp: new Date().toISOString(),
    };
  },

  async updateTargetBids(
    request: UpdateTargetBidsRequest
  ): Promise<ApiResponse<BatchUpdateResult>> {
    console.log('Mock API: updateTargetBids called with request:', request);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const results: BatchUpdateResult = request.adjustments.map((adj) => {
      // Simulate finding the target and updating (or failing)
      const targetExists = allOptimizableTargets.some(t => 
        ('keywordId' in t && t.keywordId === adj.targetId) ||
        ('expressionId' in t && t.expressionId === adj.targetId)
      );
      
      // Simulate occasional failure for demonstration
      const succeed = targetExists && Math.random() > 0.1; // 90% success rate if target exists

      console.log(`Mock updating ${request.targetType} ${adj.targetId} to bid ${adj.bid} -> ${succeed ? 'Success' : 'Failed'}`);

      return {
        targetId: adj.targetId,
        success: succeed,
        message: succeed ? undefined : 'Failed to update bid (Simulated Error)',
      };
    });

    return {
      success: true, // The batch operation itself succeeded
      data: results,
      timestamp: new Date().toISOString(),
    };
  },
};

export default mockAmazonAdsApi; 