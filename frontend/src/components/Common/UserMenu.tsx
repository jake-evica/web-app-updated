import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FaUserAstronaut } from "react-icons/fa"
import { FiLogOut, FiUser } from "react-icons/fi"
import styled from "styled-components"

import useAuth from "@/hooks/useAuth"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"

const StyledButton = styled(Button)`
  background: rgba(156, 39, 176, 0.2);
  border: 1px solid rgba(156, 39, 176, 0.3);
  color: white;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(156, 39, 176, 0.3);
    transform: translateY(-2px);
  }
  
  svg {
    color: #9c27b0;
    margin-right: 8px;
  }
`

const StyledMenuItem = styled(MenuItem)`
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(156, 39, 176, 0.1);
  }
  
  svg {
    color: #9c27b0;
  }
`

const UserMenu = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Desktop */}
      <Flex>
        <MenuRoot>
          <MenuTrigger asChild p={2}>
            <StyledButton data-testid="user-menu" maxW="sm" truncate>
              <FaUserAstronaut fontSize="18" />
              <Text>{user?.full_name || "User"}</Text>
            </StyledButton>
          </MenuTrigger>

          <MenuContent>
            <Link to="settings">
              <StyledMenuItem
                closeOnSelect
                value="user-settings"
                gap={2}
                py={2}
                style={{ cursor: "pointer" }}
              >
                <FiUser fontSize="18px" />
                <Box flex="1">My Profile</Box>
              </StyledMenuItem>
            </Link>

            <StyledMenuItem
              value="logout"
              gap={2}
              py={2}
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              <FiLogOut />
              Log Out
            </StyledMenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </>
  )
}

export default UserMenu
