import { Container, Heading, Stack } from "@chakra-ui/react"
import { useTheme } from "next-themes"
import type { ChangeEvent } from "react"

import { Radio, RadioGroup } from "@/components/ui/radio"

const Appearance = () => {
  const { theme, setTheme } = useTheme()

  const handleThemeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTheme(event.target.value)
  }

  return (
    <>
      <Container maxW="full">
        <Heading size="sm" py={4}>
          Appearance
        </Heading>

        <RadioGroup
          onValueChange={(e) => e.value && setTheme(e.value)}
          value={theme}
          colorPalette="teal"
        >
          <Stack>
            <Radio value="system">System</Radio>
            <Radio value="light">Light Mode</Radio>
            <Radio value="dark">Dark Mode</Radio>
          </Stack>
        </RadioGroup>
      </Container>
    </>
  )
}
export default Appearance
