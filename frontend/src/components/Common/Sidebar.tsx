import { Box, Flex, IconButton, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { FaBars } from "react-icons/fa"
import { FiLogOut } from "react-icons/fi"
import styled from "styled-components"

import type { UserPublic } from "@/client"
import useAuth from "@/hooks/useAuth"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer"
import SidebarItems from "./SidebarItems"

const SidebarContainer = styled(Box)`
  background: rgba(26, 15, 46, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  height: 100vh;
  min-width: 240px;
  padding: 20px 10px;
`

const LogoutButton = styled(Flex)`
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 24px;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(156, 39, 176, 0.1);
    transform: translateY(-2px);
  }
  
  svg {
    color: #9c27b0;
  }
`

const UserText = styled(Text)`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 24px;
`

const MobileDrawer = styled(DrawerContent)`
  background: rgba(26, 15, 46, 0.98);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
`

const Sidebar = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile */}
      <DrawerRoot
        placement="start"
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
      >
        <DrawerBackdrop />
        <DrawerTrigger asChild>
          <IconButton
            variant="ghost"
            color="white"
            display={{ base: "flex", md: "none" }}
            aria-label="Open Menu"
            position="absolute"
            zIndex="100"
            m={4}
          >
            <FaBars />
          </IconButton>
        </DrawerTrigger>
        <MobileDrawer maxW="xs">
          <DrawerCloseTrigger />
          <DrawerBody>
            <Flex flexDir="column" justify="space-between" h="100%">
              <Box>
                <SidebarItems onClose={() => setOpen(false)} />
                <LogoutButton
                  as="button"
                  onClick={() => {
                    logout()
                  }}
                >
                  <FiLogOut />
                  <Text color="white">Log Out</Text>
                </LogoutButton>
              </Box>
              {currentUser?.email && (
                <UserText truncate maxW="sm">
                  Logged in as: {currentUser.email}
                </UserText>
              )}
            </Flex>
          </DrawerBody>
          <DrawerCloseTrigger />
        </MobileDrawer>
      </DrawerRoot>

      {/* Desktop */}
      <SidebarContainer
        display={{ base: "none", md: "flex" }}
        position="sticky"
        top={0}
      >
        <Flex flexDirection="column" justifyContent="space-between" h="100%">
          <Box>
            <SidebarItems />
            <LogoutButton
              as="button"
              onClick={() => {
                logout()
              }}
            >
              <FiLogOut />
              <Text color="white">Log Out</Text>
            </LogoutButton>
          </Box>
          {currentUser?.email && (
            <UserText truncate maxW="sm">
              Logged in as: {currentUser.email}
            </UserText>
          )}
        </Flex>
      </SidebarContainer>
    </>
  )
}

export default Sidebar
