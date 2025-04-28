import { Badge, Container, Flex, Heading, Table } from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import styled from "styled-components"
import { z } from "zod"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { UserActionsMenu } from "@/components/Common/UserActionsMenu"
import PendingUsers from "@/components/Pending/PendingUsers"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"

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

const StyledTableHeader = styled(Table.Header)`
  background: rgba(156, 39, 176, 0.05);
  
  th {
    color: #3a1a5e;
    font-weight: 600;
  }
`

const StyledTableRow = styled(Table.Row)`
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(156, 39, 176, 0.03);
  }
`

const StyledBadge = styled(Badge)`
  background: #673ab7;
  color: white;
`

const StyledContainer = styled(Container)`
  padding-top: 10px;
  padding-bottom: 40px;
`

const usersSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 5

function getUsersQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      UsersService.readUsers({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["users", { page }],
  }
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  validateSearch: (search) => usersSearchSchema.parse(search),
})

function UsersTable() {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()
  const setPage = Route.useSearch()[1]

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getUsersQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const onPageChange = (newPage: number) => {
    setPage({ page: newPage.toString() })
  }

  const users = data?.data.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingUsers />
  }

  return (
    <>
      <Table.Root size={{ base: "sm", md: "md" }}>
        <StyledTableHeader>
          <Table.Row>
            <Table.ColumnHeader w="sm">Full name</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Email</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Role</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Status</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Actions</Table.ColumnHeader>
          </Table.Row>
        </StyledTableHeader>
        <Table.Body>
          {users?.map((user) => (
            <StyledTableRow key={user.id} opacity={isPlaceholderData ? 0.5 : 1}>
              <Table.Cell color={!user.full_name ? "gray" : "inherit"}>
                {user.full_name || "N/A"}
                {currentUser?.id === user.id && (
                  <StyledBadge ml="1">You</StyledBadge>
                )}
              </Table.Cell>
              <Table.Cell truncate maxW="sm">
                {user.email}
              </Table.Cell>
              <Table.Cell>
                {user.is_superuser ? "Superuser" : "User"}
              </Table.Cell>
              <Table.Cell>{user.is_active ? "Active" : "Inactive"}</Table.Cell>
              <Table.Cell>
                <UserActionsMenu
                  user={user}
                  disabled={currentUser?.id === user.id}
                />
              </Table.Cell>
            </StyledTableRow>
          ))}
        </Table.Body>
      </Table.Root>
      <Flex justifyContent="flex-end" mt={4}>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          onPageChange={({ page }) => onPageChange(page)}
        >
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </>
  )
}

function Admin() {
  return (
    <StyledContainer maxW="full">
      <StyledHeading size="lg">Users Management</StyledHeading>

      <AddUser />
      <UsersTable />
    </StyledContainer>
  )
}
