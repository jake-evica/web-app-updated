import { Flex } from "@chakra-ui/react"
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import styled from "styled-components"

import Navbar from "@/components/Common/Navbar"
import Sidebar from "@/components/Common/Sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

const ContentContainer = styled(Flex)`
  background: white;
  overflow: auto;
`

const MainContentWrapper = styled(Flex)`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(156, 39, 176, 0.6);
    border-radius: 3px;
  }
`

const MainContent = styled(Flex)`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 24px;
  width: 100%;
  height: 100%;
  flex-direction: column;
`

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <Flex direction="column" h="100vh">
      <Navbar />
      <ContentContainer flex="1" overflow="hidden">
        <Sidebar />
        <MainContentWrapper>
          <MainContent>
            <Outlet />
          </MainContent>
        </MainContentWrapper>
      </ContentContainer>
    </Flex>
  )
}

export default Layout
