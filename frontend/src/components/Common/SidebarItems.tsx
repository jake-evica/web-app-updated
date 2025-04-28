import { Box, Flex, Icon, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { FiHome, FiSettings, FiUsers } from "react-icons/fi"
import { RiRobot2Line, RiSearchEyeLine } from "react-icons/ri"
import type { IconType } from "react-icons/lib"
import styled from "styled-components"

import type { UserPublic } from "@/client"

const MenuText = styled(Text)`
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.7rem;
`

const MenuItemFlex = styled(Flex)`
  gap: 4px;
  padding: 12px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  
  &:hover {
    background: rgba(156, 39, 176, 0.1);
    transform: translateY(-2px);
  }
  
  svg {
    color: #9c27b0;
  }
`

const MenuItemText = styled(Text)`
  color: rgba(255, 255, 255, 0.9);
  font-weight: medium;
`

const items = [
  { icon: FiHome, title: "Dashboard", path: "/" },
  { icon: RiRobot2Line, title: "PPC Agent", path: "/ppc-agent" },
  { icon: RiSearchEyeLine, title: "SEO Agent", path: "/seo-agent" },
  { icon: FiSettings, title: "User Settings", path: "/settings" },
]

interface SidebarItemsProps {
  onClose?: () => void
}

interface Item {
  icon: IconType
  title: string
  path: string
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])

  const finalItems: Item[] = currentUser?.is_superuser
    ? [...items, { icon: FiUsers, title: "Admin", path: "/admin" }]
    : items

  const listItems = finalItems.map(({ icon, title, path }) => (
    <RouterLink key={title} to={path} onClick={onClose}>
      <MenuItemFlex alignItems="center">
        <Icon as={icon} alignSelf="center" boxSize="20px" />
        <MenuItemText ml={3}>{title}</MenuItemText>
      </MenuItemFlex>
    </RouterLink>
  ))

  return (
    <>
      <MenuText px={4} py={3} fontWeight="bold">
        Menu
      </MenuText>
      <Box>{listItems}</Box>
    </>
  )
}

export default SidebarItems
