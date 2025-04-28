import React, { useState } from "react"
import { Box, Container, Heading, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"

import BidOptimizer from "@/components/PPC/BidOptimizer"
import KeywordMiner from "@/components/PPC/KeywordMiner"
import CampaignCreator from "@/components/PPC/CampaignCreator"

// Since Chakra UI tabs don't seem to work correctly, let's create a simple tabs component
const TabsContainer = styled.div`
  margin-bottom: 32px;
`

const TabsList = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(156, 39, 176, 0.2);
  margin-bottom: 24px;
`

const TabButton = styled.button<{ isActive: boolean }>`
  padding: 12px 24px;
  font-weight: 500;
  color: ${(props) => (props.isActive ? "#9c27b0" : "#666")};
  border-bottom: 2px solid ${(props) => (props.isActive ? "#9c27b0" : "transparent")};
  background: transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    color: #9c27b0;
  }
`

const TabPanel = styled.div<{ isActive: boolean }>`
  display: ${(props) => (props.isActive ? "block" : "none")};
`

const tabsConfig = [
  { id: "bid-optimizer", title: "Bid Optimizer", component: BidOptimizer },
  { id: "keyword-miner", title: "Keyword Miner", component: KeywordMiner },
  { id: "campaign-creator", title: "Campaign Creator", component: CampaignCreator },
]

function PPCAgentPage() {
  const [activeTab, setActiveTab] = React.useState("bid-optimizer")

  return (
    <Box>
      <Box mb={6}>
        <Heading as="h1" size="xl" mb={2}>PPC Agent</Heading>
        <Text color="gray.500">
          Optimize your Amazon PPC campaigns with our AI-powered tools.
        </Text>
      </Box>

      <TabsContainer>
        <TabsList>
          {tabsConfig.map((tab) => (
            <TabButton 
              key={tab.id} 
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.title}
            </TabButton>
          ))}
        </TabsList>
        
        {tabsConfig.map((tab) => (
          <TabPanel key={tab.id} isActive={activeTab === tab.id}>
            <tab.component />
          </TabPanel>
        ))}
      </TabsContainer>
    </Box>
  )
}

export const Route = createFileRoute("/_layout/ppc-agent")({
  component: PPCAgentPage,
}) 