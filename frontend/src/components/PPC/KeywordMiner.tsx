import React, { useState } from "react"
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Input,
  Stack,
  Text
} from "@chakra-ui/react"
import { FiUpload } from "react-icons/fi"

const KeywordMiner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [maxAcosThreshold, setMaxAcosThreshold] = useState(30)
  const [matchType, setMatchType] = useState("exact")
  const [brandsToExclude, setBrandsToExclude] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const decreaseValue = () => {
    if (maxAcosThreshold > 1) {
      setMaxAcosThreshold(maxAcosThreshold - 1)
    }
  }

  const increaseValue = () => {
    if (maxAcosThreshold < 100) {
      setMaxAcosThreshold(maxAcosThreshold + 1)
    }
  }

  const handleMatchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMatchType(e.target.value)
  }

  return (
    <Stack direction="column" gap={8}>
      <Box>
        <Heading as="h2" size="md" mb={4}>Mine Keywords</Heading>
        <Text color="gray.600" fontSize="lg">
          Discover profitable keywords for your Amazon PPC campaigns with our AI-powered keyword mining tool.
        </Text>
      </Box>
      
      <Box>
        <Heading as="h3" size="sm" mb={5}>Campaign Settings</Heading>
        
        <Box mb={6}>
          <Text fontWeight="medium" fontSize="lg" mb={2}>Max ACOS Threshold (%)</Text>
          <Flex align="center">
            <Input
              type="number"
              value={maxAcosThreshold}
              onChange={(e) => setMaxAcosThreshold(Number(e.target.value))}
              min={1}
              max={100}
              maxW="200px"
              size="lg"
            />
            <Button variant="ghost" size="lg" ml={4} onClick={decreaseValue}>−</Button>
            <Button variant="ghost" size="lg" onClick={increaseValue}>+</Button>
          </Flex>
        </Box>
        
        <Box mb={6}>
          <Text fontWeight="medium" fontSize="lg" mb={2}>Brand Names to Exclude (comma-separated)</Text>
          <Input
            placeholder="e.g. Nike, Adidas"
            value={brandsToExclude}
            onChange={(e) => setBrandsToExclude(e.target.value)}
            size="lg"
          />
        </Box>
        
        <Box mb={6}>
          <Text fontWeight="medium" fontSize="lg" mb={2}>Match Type</Text>
          <select
            value={matchType}
            onChange={handleMatchTypeChange}
            style={{
              fontSize: "1rem",
              padding: "12px 16px",
              borderWidth: "1px",
              borderRadius: "0.375rem",
              borderColor: "#E2E8F0",
              backgroundColor: "white",
              width: "100%", 
              maxWidth: "calc(100% - 10px)",
              height: "50px",
              appearance: "none",
              backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23A0AEC0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              backgroundSize: "20px",
              outline: "none",
              boxSizing: "border-box",
              marginLeft: "0",
              marginRight: "10px"
            }}
          >
            <option value="exact">Exact Match</option>
            <option value="phrase">Phrase Match</option>
            <option value="broad">Broad Match</option>
          </select>
        </Box>
      </Box>
      
      <Box>
        <Heading as="h3" size="sm" mb={5}>Upload PPC Data</Heading>
        <Box
          borderWidth="1px"
          borderRadius="md"
          borderStyle="dashed"
          borderColor="gray.300"
          p={10}
          bg="gray.50"
          cursor="pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <Stack direction="column" gap={4} align="center">
            <Icon as={FiUpload} boxSize={8} color="purple.500" />
            <Text fontSize="lg" fontWeight="medium">Drag and drop file here</Text>
            <Text fontSize="md" color="gray.500">Limit 200MB per file • XLSX, XLS, CSV</Text>
            <Input
              type="file"
              id="file-upload"
              display="none"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
            />
            <Button variant="outline" colorScheme="purple" size="md" px={6} py={5} mt={2}>
              Browse files
            </Button>
          </Stack>
        </Box>
      </Box>
      
      <Box mt={4}>
        <Button 
          colorScheme="purple" 
          size="lg" 
          width="full"
          disabled={!file}
        >
          Process File
        </Button>
      </Box>
      
      {!file && (
        <Box p={5} borderRadius="md" bg="blue.50" borderWidth="1px" borderColor="blue.200">
          <Text color="blue.800" fontSize="md">
            Please upload an Amazon PPC Search Term Report to analyze keywords and create campaigns.
          </Text>
        </Box>
      )}
    </Stack>
  )
}

export default KeywordMiner 