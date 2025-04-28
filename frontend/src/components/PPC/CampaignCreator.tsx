import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Input,
  Link as ChakraLink,
  Stack,
  Text,
} from "@chakra-ui/react"
import type React from "react"
import { useState } from "react"
import { FiDownload, FiInfo, FiPlus, FiTrash, FiX } from "react-icons/fi"

interface CampaignData {
  id: number
  sku: string
  productIdentifier: string
  campaignType: "Automatic" | "Manual"
  matchType: "Exact" | "Phrase" | "Broad" | ""
  startingBid: number
  targetingTypes: string[]
  keywords: string
  includeThisCampaign: boolean
}

const CampaignCreator: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [downloadId, setDownloadId] = useState<string | null>(null)
  
  const initialCampaign: CampaignData = {
    id: 1,
    sku: "",
    productIdentifier: "",
    campaignType: "Automatic",
    matchType: "",
    startingBid: 0.75,
    targetingTypes: ["close match"],
    keywords: "",
    includeThisCampaign: true,
  }
  
  const [campaigns, setCampaigns] = useState<CampaignData[]>([initialCampaign])
  const [activeCampaign, setActiveCampaign] = useState(0)

  const decreaseBid = (campaignIndex: number) => {
    setCampaigns(prevCampaigns => {
      const newCampaigns = [...prevCampaigns]
      const newBid = Math.max(0.1, Number.parseFloat((newCampaigns[campaignIndex].startingBid - 0.01).toFixed(2)))
      newCampaigns[campaignIndex].startingBid = newBid
      return newCampaigns
    })
  }

  const increaseBid = (campaignIndex: number) => {
    setCampaigns(prevCampaigns => {
      const newCampaigns = [...prevCampaigns]
      const newBid = Number.parseFloat((newCampaigns[campaignIndex].startingBid + 0.01).toFixed(2))
      newCampaigns[campaignIndex].startingBid = newBid
      return newCampaigns
    })
  }

  const handleTargetingTypeChange = (campaignIndex: number, targetingType: string, isChecked: boolean) => {
    const updatedCampaigns = [...campaigns];
    const campaign = { ...updatedCampaigns[campaignIndex] };
    
    // Convert display names to backend format
    const typeMap: Record<string, string> = {
      'Close Match': 'close-match',
      'Loose Match': 'loose-match',
      'Substitutes': 'substitutes',
      'Complements': 'complements'
    };
    
    const backendType = typeMap[targetingType] || targetingType;
    
    if (isChecked) {
      // If "All" is selected, add all targeting types
      if (targetingType === 'All') {
        campaign.targetingTypes = Object.values(typeMap);
      } else {
        // Add the specific targeting type if not already included
        if (!campaign.targetingTypes.includes(backendType)) {
          campaign.targetingTypes = [...campaign.targetingTypes, backendType];
        }
        
        // If we now have all types selected, we should also check the "All" checkbox in UI
        if (campaign.targetingTypes.length === 4) {
          // This is just for UI state, we'll use the individual types in the API call
          if (!campaign.targetingTypes.includes('all')) {
            campaign.targetingTypes = [...campaign.targetingTypes, 'all'];
          }
        }
      }
    } else {
      // If unchecking "All", remove all targeting types
      if (targetingType === 'All') {
        campaign.targetingTypes = [];
      } else {
        // Remove the specific targeting type
        campaign.targetingTypes = campaign.targetingTypes.filter(
          type => type !== backendType && type !== 'all'
        );
      }
    }
    
    updatedCampaigns[campaignIndex] = campaign;
    setCampaigns(updatedCampaigns);
  }

  const handleCampaignTypeChange = (campaignIndex: number, type: "Automatic" | "Manual") => {
    setCampaigns(prevCampaigns => {
      const newCampaigns = [...prevCampaigns]
      newCampaigns[campaignIndex].campaignType = type
      
      // Reset match type if switching to automatic
      if (type === "Automatic") {
        newCampaigns[campaignIndex].matchType = ""
      } else {
        // Default to Exact match for manual campaigns
        newCampaigns[campaignIndex].matchType = "Exact"
      }
      
      return newCampaigns
    })
  }

  const handleMatchTypeChange = (campaignIndex: number, type: "Exact" | "Phrase" | "Broad") => {
    setCampaigns(prevCampaigns => {
      const newCampaigns = [...prevCampaigns]
      newCampaigns[campaignIndex].matchType = type
      return newCampaigns
    })
  }

  const handleInputChange = (campaignIndex: number, field: keyof CampaignData, value: string | number | boolean) => {
    setCampaigns(prevCampaigns => {
      const newCampaigns = [...prevCampaigns]
      newCampaigns[campaignIndex][field] = value as never
      return newCampaigns
    })
  }

  const addNewCampaign = () => {
    if (campaigns.length >= 10) {
      alert("Maximum limit reached")
      return
    }
    
    const newId = Math.max(...campaigns.map(c => c.id)) + 1
    setCampaigns([...campaigns, {
      ...initialCampaign,
      id: newId,
    }])
    setActiveCampaign(campaigns.length) // Set the new campaign as active
  }

  const removeCampaign = (campaignIndex: number) => {
    if (campaigns.length <= 1) {
      alert("Cannot remove")
      return
    }
    
    const newCampaigns = campaigns.filter((_, index) => index !== campaignIndex)
    setCampaigns(newCampaigns)
    
    // Adjust active campaign if needed
    if (activeCampaign >= newCampaigns.length) {
      setActiveCampaign(newCampaigns.length - 1)
    }
  }

  const validateCampaigns = () => {
    // Filter out campaigns that are not included
    const includedCampaigns = campaigns.filter(c => c.includeThisCampaign)
    
    if (includedCampaigns.length === 0) {
      setError("You need at least one active campaign")
      return false
    }
    
    for (const campaign of includedCampaigns) {
      if (!campaign.sku) {
        setError("SKU is required for all campaigns")
        return false
      }
      
      if (!campaign.productIdentifier) {
        setError("Product Identifier is required for all campaigns")
        return false
      }
      
      if (campaign.campaignType === "Manual" && !campaign.keywords) {
        setError("Keywords are required for manual campaigns")
        return false
      }
      
      if (campaign.campaignType === "Automatic" && campaign.targetingTypes.length === 0) {
        setError("At least one targeting type is required for automatic campaigns")
        return false
      }
    }
    
    return true
  }

  const generateCampaigns = async (): Promise<void> => {
    if (!validateCampaigns()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    setDownloadId('');

    try {
      // Filter out campaigns that are not included
      const activeCampaigns = campaigns.filter(campaign => campaign.includeThisCampaign);
      
      // Format campaigns for the API
      const formattedCampaigns = activeCampaigns.map(campaign => ({
        sku: campaign.sku,
        productIdentifier: campaign.productIdentifier,
        isAutoCampaign: campaign.campaignType === 'Automatic',
        matchType: campaign.matchType,
        startingBid: parseFloat(campaign.startingBid.toString()),
        targetingTypes: campaign.targetingTypes,
        keywords: campaign.keywords
      }));

      // Make API call to backend
      const response = await fetch('/api/ppc/create-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaigns: formattedCampaigns
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create campaigns');
      }

      const data = await response.json();
      setSuccessMessage('Campaigns created successfully! Download your file.');
      setDownloadId(data.download_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Average CPC for recommendation (normally this would come from API/data)
  const averageCpc = 0.67

  return (
    <Stack direction="column" gap={10} maxW="1200px" mx="auto">
      <Box>
        <Heading as="h2" size="md" mb={4}>
          Create Campaign
        </Heading>
        <Text color="gray.600" fontSize="lg">
          Create up to 10 campaigns at once
        </Text>
        <Text color="gray.600" fontSize="md" mt={2}>
          Fill in the details for each campaign below
        </Text>
      </Box>
      
      {/* Campaign Tabs */}
      <Flex gap={2} overflowX="auto" pb={2}>
        {campaigns.map((campaign, index) => (
          <Box
            key={campaign.id}
            as="button"
            borderBottom="2px solid"
            borderColor={activeCampaign === index ? "purple.500" : "transparent"}
            color={activeCampaign === index ? "purple.500" : "gray.600"}
            fontWeight="medium"
            pb={3}
            px={4}
            fontSize="md"
            onClick={() => setActiveCampaign(index)}
            position="relative"
          >
            Campaign {campaign.id}
            {campaigns.length > 1 && (
              <Box 
                position="absolute" 
                top="-8px" 
                right="-8px"
                onClick={(e) => {
                  e.stopPropagation()
                  removeCampaign(index)
                }}
                cursor="pointer"
                color="gray.500"
                _hover={{ color: "red.500" }}
              >
                <FiTrash size={14} />
              </Box>
            )}
          </Box>
        ))}
      </Flex>

      {/* Active Campaign Form */}
      {campaigns.map((campaign, index) => (
        <Box 
          key={campaign.id} 
          bg="white" 
          borderRadius="lg" 
          boxShadow="md" 
          p={8}
          display={activeCampaign === index ? "block" : "none"}
        >
          <Flex justify="space-between" align="center" mb={6}>
            <Text fontSize="lg" fontWeight="medium">Campaign {campaign.id}</Text>
            <Flex align="center">
              <input
                type="checkbox"
                id={`include-campaign-${campaign.id}`}
                checked={campaign.includeThisCampaign}
                onChange={(e) => handleInputChange(index, "includeThisCampaign", e.target.checked)}
                style={{ marginRight: "10px", width: "18px", height: "18px" }}
              />
              <label
                htmlFor={`include-campaign-${campaign.id}`}
                style={{
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                }}
              >
                Include this campaign
              </label>
            </Flex>
          </Flex>

          <Box mb={8}>
            <Text fontSize="md" mb={3}>
              SKU
            </Text>
            <Input 
              placeholder="Enter SKU" 
              size="lg" 
              value={campaign.sku}
              onChange={(e) => handleInputChange(index, "sku", e.target.value)}
            />
          </Box>

          <Grid templateColumns="repeat(2, 1fr)" gap={8} mb={8}>
            <GridItem>
              <Text fontSize="md" mb={3}>
                Product Identifier
              </Text>
              <Input 
                placeholder="Enter product identifier" 
                size="lg" 
                value={campaign.productIdentifier}
                onChange={(e) => handleInputChange(index, "productIdentifier", e.target.value)}
              />
            </GridItem>

            <GridItem>
              <Text fontSize="md" mb={3}>
                Starting Bid
              </Text>
              <Flex align="center">
                <Input
                  type="number"
                  value={campaign.startingBid}
                  onChange={(e) => handleInputChange(index, "startingBid", Number(e.target.value))}
                  min={0.1}
                  step={0.01}
                  size="lg"
                  width="160px"
                />
                <Button variant="ghost" size="lg" ml={2} onClick={() => decreaseBid(index)}>
                  −
                </Button>
                <Button variant="ghost" size="lg" onClick={() => increaseBid(index)}>
                  +
                </Button>
                <Box
                  display="inline-flex"
                  alignItems="center"
                  ml={3}
                  cursor="help"
                  title="Recommended starting bid based on average CPC"
                >
                  <FiInfo size={18} color="#718096" />
                </Box>
              </Flex>
              <Text fontSize="sm" color="gray.500" mt={2}>
                Start with your average Cost-per-click (CPC)
              </Text>
            </GridItem>
          </Grid>

          <Box mb={8}>
            <Text fontSize="md" mb={3}>
              Campaign Targeting Type
            </Text>
            <Flex gap={8} mt={3}>
              <Flex align="center">
                <input
                  type="radio"
                  id={`automatic-${campaign.id}`}
                  name={`targetingType-${campaign.id}`}
                  value="Automatic"
                  checked={campaign.campaignType === "Automatic"}
                  onChange={() => handleCampaignTypeChange(index, "Automatic")}
                  style={{ marginRight: "10px", width: "18px", height: "18px" }}
                />
                <label
                  htmlFor={`automatic-${campaign.id}`}
                  style={{
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                  }}
                >
                  Automatic
                </label>
              </Flex>
              <Flex align="center">
                <input
                  type="radio"
                  id={`manual-${campaign.id}`}
                  name={`targetingType-${campaign.id}`}
                  value="Manual"
                  checked={campaign.campaignType === "Manual"}
                  onChange={() => handleCampaignTypeChange(index, "Manual")}
                  style={{ marginRight: "10px", width: "18px", height: "18px" }}
                />
                <label
                  htmlFor={`manual-${campaign.id}`}
                  style={{
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                  }}
                >
                  Manual
                </label>
              </Flex>
            </Flex>
          </Box>

          {campaign.campaignType === "Automatic" ? (
            <Box mb={8}>
              <Heading as="h3" size="sm" mb={4}>
                Auto-targeting Options
              </Heading>
              <Box mb={5}>
                <Text fontSize="md" mb={3}>
                  Targeting Types
                </Text>
                <Flex flexWrap="wrap" gap={2} mb={3}>
                  {campaign.targetingTypes.map((type) => (
                    <Box
                      key={type}
                      bg="purple.100"
                      color="purple.700"
                      px={3}
                      py={1}
                      borderRadius="md"
                      fontSize="sm"
                      display="inline-flex"
                      alignItems="center"
                    >
                      {type}
                      <Button
                        variant="ghost"
                        ml={1}
                        height="auto"
                        minWidth="auto"
                        lineHeight="1"
                        fontWeight="bold"
                        fontSize="md"
                        color="gray.500"
                        p={0}
                        _hover={{ color: "gray.700" }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTargetingTypeChange(index, type, (e.target as HTMLInputElement).checked)
                        }}
                      >
                        ×
                      </Button>
                    </Box>
                  ))}
                </Flex>
                <Box>
                  <Text fontWeight="medium" mb={2}>Select targeting types:</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                    <Button 
                      size="sm" 
                      variant={campaign.targetingTypes.includes("close match") ? "solid" : "outline"}
                      colorScheme="purple"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTargetingTypeChange(index, "Close Match", true)
                      }}
                    >
                      Close Match
                    </Button>
                    <Button 
                      size="sm" 
                      variant={campaign.targetingTypes.includes("loose match") ? "solid" : "outline"}
                      colorScheme="purple"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTargetingTypeChange(index, "Loose Match", true)
                      }}
                    >
                      Loose Match
                    </Button>
                    <Button 
                      size="sm" 
                      variant={campaign.targetingTypes.includes("substitutes") ? "solid" : "outline"}
                      colorScheme="purple"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTargetingTypeChange(index, "Substitutes", true)
                      }}
                    >
                      Substitutes
                    </Button>
                    <Button 
                      size="sm" 
                      variant={campaign.targetingTypes.includes("complements") ? "solid" : "outline"}
                      colorScheme="purple"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTargetingTypeChange(index, "Complements", true)
                      }}
                    >
                      Complements
                    </Button>
                  </Grid>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    colorScheme="blue" 
                    mt={2}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTargetingTypeChange(index, "All", true)
                    }}
                  >
                    Select All
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box mb={8}>
              <Heading as="h3" size="sm" mb={4}>
                Manual Campaign Options
              </Heading>
              
              <Box mb={5}>
                <Text fontSize="md" mb={3}>
                  Match Type
                </Text>
                <Flex gap={4}>
                  <Button
                    size="md"
                    variant={campaign.matchType === "Exact" ? "solid" : "outline"}
                    colorScheme="purple"
                    onClick={() => handleMatchTypeChange(index, "Exact")}
                  >
                    Exact Match
                  </Button>
                  <Button
                    size="md"
                    variant={campaign.matchType === "Phrase" ? "solid" : "outline"}
                    colorScheme="purple"
                    onClick={() => handleMatchTypeChange(index, "Phrase")}
                  >
                    Phrase Match
                  </Button>
                  <Button
                    size="md"
                    variant={campaign.matchType === "Broad" ? "solid" : "outline"}
                    colorScheme="purple"
                    onClick={() => handleMatchTypeChange(index, "Broad")}
                  >
                    Broad Match
                  </Button>
                </Flex>
              </Box>
              
              <Box mb={5}>
                <Text fontSize="md" mb={3}>
                  Keywords (comma-separated)
                </Text>
                <Input
                  as="textarea"
                  placeholder="Enter keywords, separated by commas"
                  size="lg"
                  height="100px"
                  value={campaign.keywords}
                  onChange={(e) => handleInputChange(index, "keywords", e.target.value)}
                />
              </Box>
            </Box>
          )}
        </Box>
      ))}

      <Box>
        <Button 
          colorScheme="purple" 
          mb={5} 
          py={6} 
          px={8} 
          fontSize="md"
          onClick={addNewCampaign}
          disabled={campaigns.length >= 10}
        >
          <Box mr={2} display="inline-flex" alignItems="center">
            <FiPlus />
          </Box>
          Add New Campaign
        </Button>
      </Box>

      <Box
        bg="linear-gradient(90deg, #9C27B0 0%, #E91E63 100%)"
        borderRadius="md"
        p={6}
        color="white"
        fontWeight="medium"
        textAlign="center"
        cursor={loading ? "not-allowed" : "pointer"}
        fontSize="lg"
        _hover={{ opacity: loading ? 1 : 0.9 }}
        onClick={!loading ? generateCampaigns : undefined}
        opacity={loading ? 0.7 : 1}
      >
        {loading ? "Generating Campaigns..." : "Generate Campaigns"}
      </Box>
      
      {error && (
        <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
          <Text color="red.500">{error}</Text>
        </Box>
      )}
      
      {successMessage && !error && (
        <Box p={4} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
          <Text color="green.500">{successMessage}</Text>
        </Box>
      )}
      
      {downloadId && !error && (
        <Box textAlign="center">
          <ChakraLink
            href={`${import.meta.env.VITE_API_BASE_URL}/api/v1/ppc/download/${downloadId}`}
            target="_blank"
            _hover={{ textDecoration: "none" }}
          >
            <Button colorScheme="green" size="lg">
              <Box mr={2} display="inline-flex" alignItems="center">
                <FiDownload />
              </Box>
              Download Campaign Templates
            </Button>
          </ChakraLink>
        </Box>
      )}
    </Stack>
  )
}

export default CampaignCreator
