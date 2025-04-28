import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import styled from "styled-components"

import { type UserCreate, UsersService } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, handleError } from "@/utils"
import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { FaPlus } from "react-icons/fa"
import { Checkbox } from "../ui/checkbox"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

const AddButton = styled(Button)`
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  color: white;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(156, 39, 176, 0.3);
  }
  
  svg {
    margin-right: 8px;
  }
`

const StyledInput = styled(Input)`
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(156, 39, 176, 0.2);
  transition: all 0.2s ease;
  
  &:focus {
    border-color: #9c27b0;
    box-shadow: 0 0 0 1px rgba(156, 39, 176, 0.3);
  }
`

const StyledDialogTitle = styled(DialogTitle)`
  color: #3a1a5e;
  font-weight: 600;
`

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  color: white;
  border: none;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(156, 39, 176, 0.3);
  }
  
  &:disabled {
    opacity: 0.7;
    background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
    color: white;
  }
`

const SecondaryButton = styled(DialogCloseTrigger)`
  background: transparent;
  color: #666;
  border: 1px solid rgba(156, 39, 176, 0.3);
  
  &:hover {
    background: rgba(156, 39, 176, 0.05);
  }
`

const StyledDialogContent = styled(DialogContent)`
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  
  header {
    border-bottom: 1px solid rgba(156, 39, 176, 0.1);
  }
  
  footer {
    border-top: 1px solid rgba(156, 39, 176, 0.1);
  }
`

interface UserCreateForm extends UserCreate {
  confirm_password: string
}

const AddUser = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isValid, isSubmitting },
  } = useForm<UserCreateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
      is_superuser: false,
      is_active: false,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UserCreate) =>
      UsersService.createUser({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("User created successfully.")
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit: SubmitHandler<UserCreateForm> = (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <AddButton value="add-user" my={4}>
          <FaPlus fontSize="16px" />
          Add User
        </AddButton>
      </DialogTrigger>
      <StyledDialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <StyledDialogTitle>Add User</StyledDialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              Fill in the form below to add a new user to the system.
            </Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.email}
                errorText={errors.email?.message}
                label="Email"
              >
                <StyledInput
                  id="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: emailPattern,
                  })}
                  placeholder="Email"
                  type="email"
                />
              </Field>

              <Field
                invalid={!!errors.full_name}
                errorText={errors.full_name?.message}
                label="Full Name"
              >
                <StyledInput
                  id="name"
                  {...register("full_name")}
                  placeholder="Full name"
                  type="text"
                />
              </Field>

              <Field
                required
                invalid={!!errors.password}
                errorText={errors.password?.message}
                label="Set Password"
              >
                <StyledInput
                  id="password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                  placeholder="Password"
                  type="password"
                />
              </Field>

              <Field
                required
                invalid={!!errors.confirm_password}
                errorText={errors.confirm_password?.message}
                label="Confirm Password"
              >
                <StyledInput
                  id="confirm_password"
                  {...register("confirm_password", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === getValues().password ||
                      "The passwords do not match",
                  })}
                  placeholder="Password"
                  type="password"
                />
              </Field>
            </VStack>

            <Flex mt={4} direction="column" gap={4}>
              <Controller
                control={control}
                name="is_superuser"
                render={({ field }) => (
                  <Field disabled={field.disabled} colorPalette="teal">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={({ checked }) => field.onChange(checked)}
                    >
                      Is superuser?
                    </Checkbox>
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Field disabled={field.disabled} colorPalette="teal">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={({ checked }) => field.onChange(checked)}
                    >
                      Is active?
                    </Checkbox>
                  </Field>
                )}
              />
            </Flex>
          </DialogBody>
          <DialogFooter>
            <SecondaryButton>Cancel</SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </StyledDialogContent>
    </DialogRoot>
  )
}

export default AddUser
