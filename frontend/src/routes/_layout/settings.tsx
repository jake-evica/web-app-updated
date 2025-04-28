import { Container, Heading, Tabs } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"

import Appearance from "@/components/UserSettings/Appearance"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import useAuth from "@/hooks/useAuth"

const StyledHeading = styled(Heading)`
  color: #3a1a5e;
  position: relative;
  display: inline-block;
  margin-bottom: 30px;
  
  &:after {
    content: '';
    position: absolute;
    width: 50px;
    height: 3px;
    background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
    bottom: -10px;
    left: 0;
  }
`

const StyledTabsList = styled(Tabs.List)`
  border-bottom: 1px solid rgba(156, 39, 176, 0.2);
  margin-bottom: 24px;
`

const StyledTabTrigger = styled(Tabs.Trigger)`
  padding: 12px 24px;
  font-weight: medium;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    color: #9c27b0;
  }
  
  &[data-state="active"] {
    color: #9c27b0;
    border-bottom: 2px solid #9c27b0;
  }
`

const StyledContainer = styled(Container)`
  padding-top: 10px;
  padding-bottom: 40px;
`

const tabsConfig = [
  { value: "my-profile", title: "My profile", component: UserInformation },
  { value: "password", title: "Password", component: ChangePassword },
  { value: "appearance", title: "Appearance", component: Appearance },
  { value: "danger-zone", title: "Danger zone", component: DeleteAccount },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  const { user: currentUser } = useAuth()
  const finalTabs = currentUser?.is_superuser
    ? tabsConfig.slice(0, 3)
    : tabsConfig

  if (!currentUser) {
    return null
  }

  return (
    <StyledContainer maxW="full">
      <StyledHeading size="lg" textAlign={{ base: "center", md: "left" }}>
        User Settings
      </StyledHeading>

      <Tabs.Root defaultValue="my-profile" variant="subtle">
        <StyledTabsList>
          {finalTabs.map((tab) => (
            <StyledTabTrigger key={tab.value} value={tab.value}>
              {tab.title}
            </StyledTabTrigger>
          ))}
        </StyledTabsList>
        {finalTabs.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value}>
            <tab.component />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </StyledContainer>
  )
}
