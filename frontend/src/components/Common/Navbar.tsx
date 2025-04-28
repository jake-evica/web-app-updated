import { Flex, Image, Text, useBreakpointValue } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import styled from "styled-components"

import UserMenu from "./UserMenu"

const NavbarContainer = styled(Flex)`
  background: linear-gradient(135deg, #2d1b4e 0%, #1a0f2e 100%);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`

const LogoText = styled(Text)`
  font-weight: bold;
  font-size: 1.2rem;
  margin-left: 1rem;
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

function Navbar() {
  const display = useBreakpointValue({ base: "none", md: "flex" })

  return (
    <NavbarContainer
      display={display}
      justify="space-between"
      position="sticky"
      color="white"
      align="center"
      w="100%"
      top={0}
      p={4}
    >
      <Link to="/">
        <Flex align="center">
          <Image src="/assets/images/systems-lab-logo.png" alt="SystemsLab Logo" maxW="40px" p={1} />
          <LogoText>SystemsLab Dashboard</LogoText>
        </Flex>
      </Link>
      <Flex gap={2} alignItems="center">
        <UserMenu />
      </Flex>
    </NavbarContainer>
  )
}

export default Navbar
