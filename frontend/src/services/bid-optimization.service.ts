import {
  amazonAdsApi,
  type GetOptimizableTargetsRequest,
  type GetOptimizableTargetsResponse,
  type UpdateTargetBidsRequest,
  type UpdateTargetBidsResponse,
  type Keyword,
  type TargetingExpression,
  type BidAdjustment,
  type ApiResponse,
} from '../amazon-ads-api'; // Adjust path as necessary

// --- Configuration Constants (Example) ---
// These should ideally be configurable, maybe passed into the function or stored elsewhere
const MIN_IMPRESSIONS_THRESHOLD = 100;
const MIN_CLICKS_THRESHOLD = 5;
const HIGH_ACOS_THRESHOLD = 0.40; // 40%
const TARGET_ACOS = 0.25; // 25%
const BID_ADJUSTMENT_INCREMENT = 0.05; // Bid adjustment step
const MAX_BID_INCREASE_FACTOR = 1.5; // Don't increase bid by more than 50% at once
const MIN_BID_DECREASE_FACTOR = 0.7; // Don't decrease bid by more than 30% at once

// --- Service Function ---

interface OptimizationResult {
  analyzedTargets: number;
  adjustmentsAttempted: number;
  successfulAdjustments: number;
  failedAdjustments: number;
  fetchError?: string;
  updateError?: string;
  details: UpdateTargetBidsResponse | null;
}

// Add type for the parameters expected by performBidOptimization
interface PerformBidOptimizationParams {
  filters?: GetOptimizableTargetsRequest;
  targetAcos?: number; // Target ACOS as a decimal (e.g., 0.30 for 30%)
  increaseSpend?: boolean; // Flag corresponding to the Python logic
  averageOrderValue?: number; // Optional AOV for fallback calculation
}

/**
 * Fetches optimizable targets and applies bid optimization logic.
 * 
 * @param params Parameters including filters, target ACOS, etc.
 * @returns Promise<OptimizationResult> A summary of the optimization process.
 */
export async function performBidOptimization(
  params: PerformBidOptimizationParams = {}
): Promise<OptimizationResult> {
  const { 
      filters = {}, 
      targetAcos = TARGET_ACOS, // Default from constants if not provided
      increaseSpend = true, // Default behavior, adjust as needed
      averageOrderValue // No default AOV, logic needs to handle its absence 
  } = params;

  const resultSummary: OptimizationResult = {
    analyzedTargets: 0,
    adjustmentsAttempted: 0,
    successfulAdjustments: 0,
    failedAdjustments: 0,
    details: null,
  };

  // 1. Fetch Data
  let fetchResponse: ApiResponse<GetOptimizableTargetsResponse>;
  try {
    fetchResponse = await amazonAdsApi.getOptimizableTargets(filters);
  } catch (error: any) {
    console.error('Error fetching optimizable targets:', error);
    resultSummary.fetchError = error.message || 'Unknown error during fetch';
    return resultSummary;
  }

  if (!fetchResponse.success || !fetchResponse.data) {
    console.error('Failed to fetch optimizable targets:', fetchResponse.error);
    resultSummary.fetchError = fetchResponse.error || 'API returned failure but no error message';
    return resultSummary;
  }

  const targets = fetchResponse.data;
  resultSummary.analyzedTargets = targets.length;
  console.log(`Fetched ${targets.length} targets for optimization with Target ACOS: ${targetAcos * 100}%`);

  const bidAdjustments: BidAdjustment[] = [];
  const keywordAdjustments: BidAdjustment[] = [];
  const targetingAdjustments: BidAdjustment[] = [];

  // 2. Apply Optimization Rules (Translated from Python)
  for (const target of targets) {
    // Ensure basic data exists
    const currentBid = target.bid;
    const impressions = target.impressions ?? 0;
    const clicks = target.clicks ?? 0;
    const spend = target.cost ?? 0; // Using cost as spend
    const sales = target.sales ?? 0;
    const orders = target.orders ?? 0;
    const acos = target.acos; // Can be undefined if sales are 0
    const ctr = target.ctr ?? (impressions > 0 ? clicks / impressions : 0);
    const cpc = target.cpc ?? (clicks > 0 ? spend / clicks : 0);

    // Skip paused/archived or targets below thresholds
    if (target.state !== 'ENABLED' || 
        impressions < MIN_IMPRESSIONS_THRESHOLD ||
        clicks < MIN_CLICKS_THRESHOLD)
     {
      continue;
    }

    const targetId = ('keywordId' in target) ? target.keywordId : target.expressionId;
    const targetType: 'keyword' | 'targetingExpression' = ('keywordId' in target) ? 'keyword' : 'targetingExpression';

    let newBid = currentBid; // Initialize with current bid
    let updateRequired = false;

    // --- Translated Python Logic --- 

    // Calculate AOV and % of AOV (Simplified compared to Python's ASIN fallback)
    const currentAov = orders > 0 && sales > 0 ? sales / orders : (averageOrderValue ?? 0);
    const aovPercent = currentAov > 0 ? spend / currentAov : 0;

    // Condition 1: ACOS >= Target ACOS * 1.1
    if (acos !== undefined && acos >= targetAcos * 1.1) {
      console.log(`Target ${targetId}: Condition 1 (High ACOS ${acos.toFixed(3)} >= ${targetAcos * 1.1})`);
      if (clicks > 0 && sales > 0) {
        const rpcRow = sales / clicks; // Revenue Per Click
        const effectiveCpc = cpc > 0 ? cpc : (clicks > 0 ? spend / clicks : 0);
        if (effectiveCpc > 0) {
          // Formula: Bid = (RPC * Target ACOS) * (Current Bid / CPC)
          newBid = (rpcRow * targetAcos) * (currentBid / effectiveCpc);
          console.log(` -> Calculated new bid based on RPC/Target ACOS: ${newBid.toFixed(2)}`);
        }
      }
      updateRequired = true;
    }
    // Condition 2: ACOS <= Target ACOS * 0.9 AND Orders > 1
    else if (acos !== undefined && acos <= targetAcos * 0.9 && orders > 1) {
       console.log(`Target ${targetId}: Condition 2 (Low ACOS ${acos.toFixed(3)} <= ${targetAcos * 0.9} AND Orders > 1)`);
      const increaseFactor = acos <= targetAcos * 0.5 ? 1.15 : 1.1;
      newBid = currentBid * increaseFactor;
       console.log(` -> Increasing bid by factor ${increaseFactor}: ${newBid.toFixed(2)}`);
      updateRequired = true;
    }
    // Condition 3: ACOS <= Target ACOS * 0.9 AND Orders == 1
    else if (acos !== undefined && acos <= targetAcos * 0.9 && orders === 1) {
      console.log(`Target ${targetId}: Condition 3 (Low ACOS ${acos.toFixed(3)} <= ${targetAcos * 0.9} AND Orders == 1)`);
      const increaseFactor = acos <= targetAcos * 0.5 ? 1.06 : 1.05;
      newBid = currentBid * increaseFactor;
       console.log(` -> Increasing bid by factor ${increaseFactor}: ${newBid.toFixed(2)}`);
      updateRequired = true;
    }
    // Condition 4: ACOS is 0 (or undefined) AND % of AOV >= Target ACOS * 0.9
    else if (acos === undefined && aovPercent >= targetAcos * 0.9) {
       console.log(`Target ${targetId}: Condition 4 (Zero Sales AND High %AOV ${aovPercent.toFixed(3)} >= ${targetAcos * 0.9})`);
      newBid = currentBid * 0.8; // Reduce bid by 20%
       console.log(` -> Decreasing bid by 20%: ${newBid.toFixed(2)}`);
      updateRequired = true;
    }
    // Condition 5: increaseSpend=true AND ACOS is 0 (or undefined) AND % of AOV <= 0.1 AND CTR >= 0.003
    else if (increaseSpend && acos === undefined && aovPercent <= 0.1 && ctr >= 0.003) {
      console.log(`Target ${targetId}: Condition 5 (Promising: Zero Sales, Low %AOV ${aovPercent.toFixed(3)}, OK CTR ${ctr.toFixed(3)})`);
      newBid = currentBid * 1.05; // Increase bid by 5%
      console.log(` -> Increasing bid by 5%: ${newBid.toFixed(2)}`);
      updateRequired = true;
    }

    // --- End of Translated Logic ---

    // Finalize Bid: Ensure minimum bid and round
    newBid = parseFloat(Math.max(0.02, newBid).toFixed(2));

    // Add to adjustments list if bid changed significantly
    if (updateRequired && Math.abs(newBid - currentBid) > 0.001) {
      console.log(`Target ${targetId}: Final adjusted bid: ${newBid} (Original: ${currentBid})`);
       const adjustment = { targetId, bid: newBid };
       bidAdjustments.push(adjustment);
       if (targetType === 'keyword') {
           keywordAdjustments.push(adjustment);
       } else {
           targetingAdjustments.push(adjustment);
       }
    } else if (updateRequired) {
        console.log(`Target ${targetId}: Bid change negligible or no update condition met. Keeping bid: ${currentBid}`);
    }
  }

  resultSummary.adjustmentsAttempted = bidAdjustments.length;

  // 3. Execute Updates (if any adjustments are needed)
  if (bidAdjustments.length > 0) {
    console.log(`Attempting to update bids for ${bidAdjustments.length} targets...`);

    let keywordUpdateResponse: ApiResponse<UpdateTargetBidsResponse> | null = null;
    let targetingUpdateResponse: ApiResponse<UpdateTargetBidsResponse> | null = null;

    try {
      // Separate calls for keywords and targeting expressions
      if(keywordAdjustments.length > 0) {
        const keywordRequest: UpdateTargetBidsRequest = { targetType: 'keyword', adjustments: keywordAdjustments };
        console.log("Sending keyword bid updates:", keywordRequest);
        keywordUpdateResponse = await amazonAdsApi.updateTargetBids(keywordRequest);
        console.log("Keyword update response:", keywordUpdateResponse);
      }
      if(targetingAdjustments.length > 0) {
         const targetingRequest: UpdateTargetBidsRequest = { targetType: 'targetingExpression', adjustments: targetingAdjustments };
         console.log("Sending targeting expression bid updates:", targetingRequest);
         targetingUpdateResponse = await amazonAdsApi.updateTargetBids(targetingRequest);
         console.log("Targeting update response:", targetingUpdateResponse);
      }

      // Combine results
      const allResults = [
          ...(keywordUpdateResponse?.data ?? []),
          ...(targetingUpdateResponse?.data ?? [])
      ];
      resultSummary.details = allResults;
      resultSummary.successfulAdjustments = allResults.filter(r => r.success).length;
      resultSummary.failedAdjustments = allResults.filter(r => !r.success).length;

      const kwSuccess = keywordUpdateResponse?.success ?? (keywordAdjustments.length === 0);
      const tgSuccess = targetingUpdateResponse?.success ?? (targetingAdjustments.length === 0);

      if (!kwSuccess || !tgSuccess) {
          resultSummary.updateError = `Keyword update success: ${kwSuccess}, Targeting update success: ${tgSuccess}`;
          if (keywordUpdateResponse?.error) resultSummary.updateError += ` | KW Error: ${keywordUpdateResponse.error}`;
          if (targetingUpdateResponse?.error) resultSummary.updateError += ` | TG Error: ${targetingUpdateResponse.error}`;
          console.error('Bid update API call failed or reported errors:', resultSummary.updateError);
      }

    } catch (error: any) {
      console.error('Error updating target bids:', error);
      resultSummary.updateError = error.message || 'Unknown error during update';
      resultSummary.failedAdjustments = resultSummary.adjustmentsAttempted;
      resultSummary.successfulAdjustments = 0;
    }
  } else {
    console.log('No bid adjustments required based on current logic.');
  }

  // 4. Return Status/Summary
  console.log('Bid optimization process completed.', resultSummary);
  return resultSummary;
} 