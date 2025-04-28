import React from 'react';
import { Box, Heading, Text, Button, VStack, Code } from "@chakra-ui/react";
import { Link, useSearch, createRoute } from "@tanstack/react-router";
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
  color: #c53030; /* Red for error */
  margin-bottom: 1rem;
`;

const StyledText = styled(Text)`
  color: #555;
  margin-bottom: 0.5rem;
`;

const ErrorMessage = styled(Code)`
  color: #c53030;
  background-color: #fed7d7;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  margin-bottom: 2rem;
  max-width: 80%;
  overflow-wrap: break-word;
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

// Type for search parameters passed in the URL (e.g., ?message=...)
interface LinkErrorSearch {
  message?: string;
}

// Define the route (Corrected syntax)
const LinkAmazonErrorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'error',
  validateSearch: (search: Record<string, unknown>): LinkErrorSearch => {
    return {
      message: typeof search.message === 'string' ? search.message : undefined,
    };
  },
  component: LinkAmazonError, // Provide component directly in options
});

function LinkAmazonError() {
  // Hook to read search parameters, typed with validateSearch
  const search: LinkErrorSearch = useSearch({ from: LinkAmazonErrorRoute.id });
  const errorMessage = search.message || "An unknown error occurred.";

  return (
    <Container>
      <VStack gap={4}>
        <StyledHeading size="lg">Error Linking Amazon Account</StyledHeading>
        <StyledText>Something went wrong while trying to link your Amazon Ads account:</StyledText>
        <ErrorMessage>{errorMessage}</ErrorMessage>
        {/* Ensure '/settings' is the correct path */}
        <PrimaryButton as={Link} to="/settings">
          Return to Settings
        </PrimaryButton>
      </VStack>
    </Container>
  );
}

// Export the route definition for TanStack Router
export const Route = LinkAmazonErrorRoute;
