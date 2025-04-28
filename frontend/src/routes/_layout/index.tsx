import { Box, Container, Grid, Heading, SimpleGrid, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { FiTrendingUp } from "react-icons/fi"
import { RiRobot2Line, RiSearchEyeLine } from "react-icons/ri"
import styled from "styled-components"

import useAuth from "@/hooks/useAuth"

const DashboardCard = styled(Box)`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 24px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  }
`

const StatCard = styled(Box)`
  background: white;
  border-radius: 12px;
  border-left: 4px solid #9c27b0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  }
`

const IconBox = styled(Box)`
  background: rgba(156, 39, 176, 0.1);
  border-radius: 10px;
  padding: 12px;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  
  svg {
    color: #9c27b0;
    font-size: 20px;
  }
`

const StatLabel = styled(Text)`
  color: #718096;
  font-size: 0.875rem;
`

const StatNumber = styled(Text)`
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0.5rem;
`

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <>
      <Container maxW="full" p={0}>
        <Box mb={6}>
          <Heading as="h1" size="xl" mb={1}>
            Hi, {currentUser?.full_name || currentUser?.email} 👋
          </Heading>
          <Text color="gray.600">Welcome back, nice to see you again!</Text>
        </Box>
        
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={8}>
          <StatCard>
            <StatLabel>PPC Campaign Clicks</StatLabel>
            <StatNumber>1,245</StatNumber>
            <Text color="green.500" fontSize="sm" mt={1}>
              <FiTrendingUp style={{ display: 'inline', marginRight: '4px' }} />
              +12.5% from last week
            </Text>
          </StatCard>
          
          <StatCard>
            <StatLabel>SEO Rankings</StatLabel>
            <StatNumber>Top 10</StatNumber>
            <Text color="green.500" fontSize="sm" mt={1}>
              <FiTrendingUp style={{ display: 'inline', marginRight: '4px' }} />
              +3 positions
            </Text>
          </StatCard>
          
          <StatCard>
            <StatLabel>Conversions</StatLabel>
            <StatNumber>42</StatNumber>
            <Text color="green.500" fontSize="sm" mt={1}>
              <FiTrendingUp style={{ display: 'inline', marginRight: '4px' }} />
              +8.3% conversion rate
            </Text>
          </StatCard>
        </SimpleGrid>
        
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
          <DashboardCard>
            <IconBox>
              <RiRobot2Line />
            </IconBox>
            <Heading as="h3" size="md" mb={3}>PPC Agent</Heading>
            <Text color="gray.600" mb={4}>
              Optimize your campaigns automatically with our AI-powered PPC agent. Currently managing 3 active campaigns.
            </Text>
            <Text color="#9c27b0" fontWeight="bold">View campaigns →</Text>
          </DashboardCard>
          
          <DashboardCard>
            <IconBox>
              <RiSearchEyeLine />
            </IconBox>
            <Heading as="h3" size="md" mb={3}>SEO Agent</Heading>
            <Text color="gray.600" mb={4}>
              Track and improve your organic rankings with AI-powered recommendations. Currently monitoring 15 keywords.
            </Text>
            <Text color="#9c27b0" fontWeight="bold">View keywords →</Text>
          </DashboardCard>
        </Grid>
      </Container>
    </>
  )
}
