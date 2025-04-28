import React from 'react';
import { Box, Heading, Text, Button, VStack } from "@chakra-ui/react";
import { Link, createRoute } from "@tanstack/react-router";
import styled from "styled-components";
import { Route as rootRoute } from "../__root"; // Import and rename root route

const Container = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
  padding: 2rem;
`;

const StyledHeading = styled(Heading)`
  color: #3a1a5e;
  margin-bottom: 1rem;
`;

const StyledText = styled(Text)`
  color: #555;
  margin-bottom: 2rem;
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  color: white;
  border: none;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(156, 39, 176, 0.3);
  }
`;

// Define the route (Corrected syntax)
const LinkAmazonSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'success',
  component: LinkAmazonSuccess, // Provide component directly in options
});

function LinkAmazonSuccess() {
  return (
    <Container>
      <VStack gap={4}>
        <StyledHeading size="lg">Amazon Account Linked Successfully!</StyledHeading>
        <StyledText>Your Amazon Ads account has been successfully linked.</StyledText>
        {/* Ensure '/settings' is the correct path */}
        <PrimaryButton as={Link} to="/settings">
          Return to Settings
        </PrimaryButton>
      </VStack>
    </Container>
  );
}

// Export the route definition for TanStack Router
export const Route = LinkAmazonSuccessRoute;
